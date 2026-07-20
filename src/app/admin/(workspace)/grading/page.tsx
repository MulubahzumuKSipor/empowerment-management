'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/utils/supabase';
import { getActiveProgramId } from '@/action/admin';
import styles from '@/styles/grading.module.css';
import {
  Loader2, Calculator, Save, AlertCircle, CheckCircle2, Download
} from 'lucide-react';
import { DbCohort, DbRubric, DbStudent } from '@/types';

interface MatrixStudent {
  id: string;
  name: string;
}

export default function GradingMatrixPage() {
  const router = useRouter();

  // Context State
  const [isLoadingContext, setIsLoadingContext] = useState(true);
  const [cohorts, setCohorts] = useState<DbCohort[]>([]);
  const [programLevels, setProgramLevels] = useState<string[]>([]);

  // Filter State
  const [selectedCohortId, setSelectedCohortId] = useState('');
  const [selectedLevel, setSelectedLevel] = useState('');
  const [assessmentType, setAssessmentType] = useState('mid');

  // Grid Data State
  const [isGridLoading, setIsGridLoading] = useState(false);
  const [isGridLoaded, setIsGridLoaded] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [students, setStudents] = useState<MatrixStudent[]>([]);
  const [rubrics, setRubrics] = useState<DbRubric[]>([]);

  // Core Matrix State
  // Map: "studentId-rubricId" => score value
  const [scoreMatrix, setScoreMatrix] = useState<Record<string, number | ''>>({});
  // Map: "studentId-rubricId" => database ID of the existing score (used for pure updates)
  const [existingRecordIds, setExistingRecordIds] = useState<Record<string, string>>({});

  // ─── 1. LOAD CONTEXT (Cohorts & Levels) ───
  useEffect(() => {
    let isMounted = true;
    async function loadContext() {
      const programId = await getActiveProgramId();
      if (!programId) return router.replace('/admin/programs');

      const [programRes, cohortsRes] = await Promise.all([
        supabase.from('programs').select('levels').eq('id', programId).single(),
        supabase.from('cohorts').select('*').eq('program_id', programId).order('start_date', { ascending: false })
      ]);

      if (isMounted) {
        if (programRes.data) setProgramLevels(programRes.data.levels || []);
        if (cohortsRes.data) setCohorts(cohortsRes.data);
        setIsLoadingContext(false);
      }
    }
    loadContext();
    return () => { isMounted = false; };
  }, [router]);

  // ─── 2. LOAD MATRIX DATA ───
  // We trigger this manually via button so changing a dropdown doesn't instantly wipe unsaved data
  const handleLoadGrid = async () => {
    if (!selectedCohortId || !selectedLevel || !assessmentType) return;

    setIsGridLoading(true);
    setIsGridLoaded(false);
    const programId = await getActiveProgramId();

    // Fetch the students in this cohort who are AT this specific level
    const { data: studentData } = await supabase
      .from('students')
      .select('id, name')
      .eq('cohort_id', selectedCohortId)
      .eq('current_level', selectedLevel)
      .eq('status', 'active')
      .order('name', { ascending: true });

    // Fetch the rubrics assigned to this specific level
    const { data: rubricData } = await supabase
      .from('rubrics')
      .select('*')
      .eq('program_id', programId)
      .eq('level', selectedLevel)
      .order('subject', { ascending: true });

    if (studentData && rubricData) {
      setStudents(studentData);
      setRubrics(rubricData);

      // Now fetch any existing scores so we can pre-populate the matrix
      const studentIds = studentData.map(s => s.id);

      const { data: scoresData } = await supabase
        .from('assessment_scores')
        .select('id, student_id, rubric_id, score')
        .eq('assessment_type', assessmentType)
        .in('student_id', studentIds);

      const loadedScores: Record<string, number> = {};
      const loadedIds: Record<string, string> = {};

      if (scoresData) {
        scoresData.forEach(record => {
          const key = `${record.student_id}-${record.rubric_id}`;
          loadedScores[key] = record.score;
          loadedIds[key] = record.id;
        });
      }

      setScoreMatrix(loadedScores);
      setExistingRecordIds(loadedIds);
      setIsGridLoaded(true);
    }

    setIsGridLoading(false);
  };

  // ─── 3. CELL INPUT HANDLER ───
  const handleScoreChange = (studentId: string, rubricId: string, maxScore: number, value: string) => {
    const key = `${studentId}-${rubricId}`;

    if (value === '') {
      setScoreMatrix(prev => ({ ...prev, [key]: '' }));
      return;
    }

    const numValue = parseInt(value);
    // UI Validation Check (won't save if invalid)
    if (isNaN(numValue) || numValue < 0) return;

    setScoreMatrix(prev => ({ ...prev, [key]: numValue }));
  };

  // ─── 4. BULK SAVE LOGIC ───
  const handleSaveMatrix = async () => {
    setIsSaving(true);
    const inserts: any[] = [];
    const updates: any[] = [];

    // Diff the current grid against the known database state
    Object.keys(scoreMatrix).forEach(key => {
      const val = scoreMatrix[key];
      if (val === '' || val === undefined) return;

      const [studentId, rubricId] = key.split('-');
      const recordId = existingRecordIds[key];

      const payload = {
        student_id: studentId,
        rubric_id: rubricId,
        assessment_type: assessmentType,
        score: val
      };

      if (recordId) {
        // We know this existed in the DB, so it's a guaranteed pure update
        updates.push({ id: recordId, ...payload });
      } else {
        // Brand new score entry
        inserts.push(payload);
      }
    });

    let hasError = false;

    // 1. Process Updates (Supabase handles array updates if you pass the primary key 'id')
    if (updates.length > 0) {
      const { error } = await supabase.from('assessment_scores').upsert(updates);
      if (error) hasError = true;
    }

    // 2. Process Inserts
    if (inserts.length > 0 && !hasError) {
      const { data: newRecords, error } = await supabase.from('assessment_scores').insert(inserts).select();
      if (error) {
        hasError = true;
      } else if (newRecords) {
        // Cache the newly generated IDs so subsequent saves don't duplicate them
        const newIds: Record<string, string> = { ...existingRecordIds };
        newRecords.forEach(r => {
          newIds[`${r.student_id}-${r.rubric_id}`] = r.id;
        });
        setExistingRecordIds(newIds);
      }
    }

    if (hasError) {
      alert("Failed to save some scores. Please check your connection and try again.");
    } else {
      alert("Gradebook saved successfully!");
    }

    setIsSaving(false);
  };

  // ─── RENDER ───
  if (isLoadingContext) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <Loader2 className="animate-spin" size={48} color="var(--brand-green)" />
      </div>
    );
  }

  return (
    <div className={styles.pageContainer}>
      <header className={styles.header}>
        <div>
          <h1>Master Gradebook</h1>
          <p>Bulk enter and update assessment scores across cohorts and levels.</p>
        </div>
      </header>

      {/* ─── FILTERS ─── */}
      <div className={styles.toolbar}>
        <div className={styles.formGroup}>
          <label>Target Cohort</label>
          <select value={selectedCohortId} onChange={e => { setSelectedCohortId(e.target.value); setIsGridLoaded(false); }}>
            <option value="" disabled>Select Cohort...</option>
            {cohorts.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>

        <div className={styles.formGroup}>
          <label>Academic Level</label>
          <select value={selectedLevel} onChange={e => { setSelectedLevel(e.target.value); setIsGridLoaded(false); }}>
            <option value="" disabled>Select Level...</option>
            {programLevels.map(l => <option key={l} value={l}>{l}</option>)}
          </select>
        </div>

        <div className={styles.formGroup}>
          <label>Assessment Period</label>
          <select value={assessmentType} onChange={e => { setAssessmentType(e.target.value); setIsGridLoaded(false); }}>
            <option value="pre">Pre-Assessment (Baseline)</option>
            <option value="mid">Mid-term Evaluation</option>
            <option value="final">Final Assessment</option>
          </select>
        </div>

        <button
          className={styles.loadBtn}
          onClick={handleLoadGrid}
          disabled={!selectedCohortId || !selectedLevel || isGridLoading}
          type="button"
        >
          {isGridLoading ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
          Load Matrix
        </button>
      </div>

      {/* ─── THE MATRIX ─── */}
      {isGridLoaded && (
        <>
          {students.length === 0 || rubrics.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '4rem', background: 'var(--bg-surface)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-light)' }}>
              <AlertCircle size={48} color="var(--border-medium)" style={{ margin: '0 auto 1rem' }} />
              <h3>Data Missing</h3>
              <p style={{ color: 'var(--text-secondary)', maxWidth: '400px', margin: '0 auto' }}>
                We couldn't find any students or rubrics matching these exact filters. Ensure rubrics are assigned to this level in Settings, and students are enrolled in this cohort.
              </p>
            </div>
          ) : (
            <div className={styles.matrixWrapper}>
              <div className={styles.tableContainer}>
                <table className={styles.matrixTable}>
                  <thead>
                    <tr>
                      <th className={styles.stickyCol}>Student Name</th>
                      {rubrics.map(rubric => (
                        <th key={rubric.id}>
                          {rubric.name}
                          <span className={styles.maxScore}>Max: {rubric.max_score}</span>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {students.map(student => (
                      <tr key={student.id}>
                        <td className={styles.stickyCol}>{student.name}</td>
                        {rubrics.map(rubric => {
                          const key = `${student.id}-${rubric.id}`;
                          const val = scoreMatrix[key] !== undefined ? scoreMatrix[key] : '';
                          const isOverMax = val !== '' && Number(val) > rubric.max_score;

                          return (
                            <td key={key}>
                              <input
                                type="number"
                                min="0"
                                max={rubric.max_score}
                                value={val}
                                onChange={e => handleScoreChange(student.id, rubric.id, rubric.max_score, e.target.value)}
                                className={`${styles.scoreInput} ${isOverMax ? styles.invalid : ''}`}
                                placeholder="-"
                              />
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ─── ACTIONS ─── */}
          {students.length > 0 && rubrics.length > 0 && (
            <div className={styles.actionFooter}>
              <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Calculator size={16} /> Matrix tracks {students.length} students across {rubrics.length} grading criteria.
              </span>
              <button
                className={styles.saveBtn}
                onClick={handleSaveMatrix}
                disabled={isSaving}
                type="button"
              >
                {isSaving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                {isSaving ? 'Saving...' : 'Save Gradebook'}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}