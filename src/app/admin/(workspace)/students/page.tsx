'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/utils/supabase';
import { getActiveProgramId } from '@/action/admin';
import styles from '@/styles/student.module.css';
import {
  Loader2, Search, Edit, GraduationCap,
  AlertCircle, ShieldAlert, X, Check, CheckCircle2,
  TrendingUp, BookOpen
} from 'lucide-react';

// Perfectly matched to your Supabase `students.Row` type
interface RosterStudent {
  id: string;
  name: string;
  email: string | null;
  phone_number: string | null;
  status: string | null;
  current_level: string;
  cohort_id: string;
  cohort_name?: string; // Appended from the Supabase Join
}

// Interface for the dynamically fetched grades inside the Drawer
interface FetchedGrade {
  score: number;
  assessment_type: string;
  rubric: {
    name: string;
    subject: string;
    max_score: number;
  };
}

export default function StudentRosterPage() {
  const router = useRouter();

  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);

  // Data State
  const [students, setStudents] = useState<RosterStudent[]>([]);
  const [programLevels, setProgramLevels] = useState<string[]>([]);
  const [cohorts, setCohorts] = useState<{ id: string, name: string }[]>([]);

  // UI Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [cohortFilter, setCohortFilter] = useState('all');
  const [levelFilter, setLevelFilter] = useState('all');

  // Modals & Drawer State
  const [selectedStudentForEdit, setSelectedStudentForEdit] = useState<RosterStudent | null>(null);
  const [drawerStudentId, setDrawerStudentId] = useState<string | null>(null);
  const [studentGrades, setStudentGrades] = useState<FetchedGrade[]>([]);
  const [isLoadingGrades, setIsLoadingGrades] = useState(false);

  // Form State for Updates
  const [editLevel, setEditLevel] = useState('');
  const [editStatus, setEditStatus] = useState<string>('active');

  // ─── INITIAL DATA FETCH ───
  useEffect(() => {
    let isMounted = true;

    async function fetchRoster() {
      const programId = await getActiveProgramId();
      if (!programId) {
        router.replace('/admin/programs');
        return;
      }

      // Parallel fetch of required dimension data
      const [programReq, cohortsReq] = await Promise.all([
        supabase.from('programs').select('levels').eq('id', programId).single(),
        supabase.from('cohorts').select('id, name').eq('program_id', programId)
      ]);

      if (programReq.data && isMounted) setProgramLevels(programReq.data.levels || []);
      if (cohortsReq.data && isMounted) setCohorts(cohortsReq.data);

      // Fetch students using exact Supabase columns + Join for cohort_name
      const { data: studentsData, error } = await supabase
        .from('students')
        .select(`
          id, name, email, phone_number, status, current_level, cohort_id,
          cohort:cohorts(name)
        `)
        .eq('program_id', programId)
        .order('name', { ascending: true });

      if (!error && studentsData && isMounted) {
        const flattened: RosterStudent[] = studentsData.map((s: any) => ({
          id: s.id,
          name: s.name,
          email: s.email,
          phone_number: s.phone_number,
          status: s.status,
          current_level: s.current_level,
          cohort_id: s.cohort_id,
          cohort_name: s.cohort?.name || 'Unassigned'
        }));
        setStudents(flattened);
      }

      if (isMounted) setIsLoading(false);
    }

    fetchRoster();
    return () => { isMounted = false; };
  }, [router]);

  // ─── ON-DEMAND GRADE FETCHING (For Drawer) ───
  useEffect(() => {
    if (!drawerStudentId) {
      setStudentGrades([]);
      return;
    }


    let isMounted = true;
    setIsLoadingGrades(true);

    async function fetchGrades() {
      // Joins the rubrics table to get human-readable names and max scores
      const { data, error } = await supabase
        .from('assessment_scores')
        .select(`
          score,
          assessment_type,
          rubric:rubrics(name, subject, max_score)
        `)
        .eq('student_id', drawerStudentId);

      if (!error && data && isMounted) {
        setStudentGrades(data as unknown as FetchedGrade[]);
      }
      if (isMounted) setIsLoadingGrades(false);
    }

    fetchGrades();
    return () => { isMounted = false; };
  }, [drawerStudentId]);


  // ─── CLIENT-SIDE FILTERING ───
  const filteredStudents = useMemo(() => {
    return students.filter(student => {
      const searchTarget = `${student.name} ${student.email || ''}`.toLowerCase();
      const matchesSearch = searchTarget.includes(searchQuery.toLowerCase());

      const normalizedStatus = student.status || 'active';
      const matchesStatus = statusFilter === 'all' || normalizedStatus === statusFilter;
      const matchesCohort = cohortFilter === 'all' || student.cohort_id === cohortFilter;
      const matchesLevel  = levelFilter === 'all' || student.current_level === levelFilter;

      return matchesSearch && matchesStatus && matchesCohort && matchesLevel;
    });
  }, [students, searchQuery, statusFilter, cohortFilter, levelFilter]);


  // ─── UPDATE HANDLER ───
  const handleUpdateStudent = async () => {
    if (!selectedStudentForEdit) return;
    setIsProcessing(true);

    const { error } = await supabase
      .from('students')
      .update({ current_level: editLevel, status: editStatus })
      .eq('id', selectedStudentForEdit.id);

    if (error) {
      alert("Failed to update student profile.");
    } else {
      setStudents(prev => prev.map(s =>
        s.id === selectedStudentForEdit.id
          ? { ...s, current_level: editLevel, status: editStatus }
          : s
      ));
      setSelectedStudentForEdit(null);
    }
    setIsProcessing(false);
  };

  const openEditModal = (student: RosterStudent) => {
    setSelectedStudentForEdit(student);
    setEditLevel(student.current_level);
    setEditStatus(student.status || 'active');
  };

  const getStatusBadge = (status: string | null) => {
    const s = status || 'active';
    switch(s) {
      case 'active': return <span className={`${styles.statusBadge} ${styles.active}`}><CheckCircle2 size={14} /> Active</span>;
      case 'suspended': return <span className={`${styles.statusBadge} ${styles.suspended}`}><ShieldAlert size={14} /> Suspended</span>;
      case 'graduated': return <span className={`${styles.statusBadge} ${styles.graduated}`}><GraduationCap size={14} /> Graduated</span>;
      default: return <span className={styles.statusBadge}>{s}</span>;
    }
  };

  // Group grades by assessment type (e.g., pre, mid, final)
  const gradesByPeriod = useMemo(() => {
    return studentGrades.reduce((acc, grade) => {
      const type = grade.assessment_type;
      if (!acc[type]) acc[type] = [];
      acc[type].push(grade);
      return acc;
    }, {} as Record<string, FetchedGrade[]>);
  }, [studentGrades]);

  const activeDrawerStudent = useMemo(() =>
    students.find(s => s.id === drawerStudentId),
  [students, drawerStudentId]);


  if (isLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <Loader2 className="animate-spin" size={48} color="var(--brand-green)" />
      </div>
    );
  }

  return (
    <div className={styles.pageContainer}>
      <header className={styles.header}>
        <h1>Student Roster</h1>
        <p>Manage enrolled students, track their class levels, and view academic records.</p>
      </header>

      {/* ─── TOOLBAR ─── */}
      <div className={styles.toolbar}>
        <div className={styles.searchBox}>
          <Search size={18} />
          <input
            type="text"
            placeholder="Search by name or email..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </div>

        <select className={styles.filterSelect} value={cohortFilter} onChange={e => setCohortFilter(e.target.value)}>
          <option value="all">All Cohorts</option>
          {cohorts.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>

        <select className={styles.filterSelect} value={levelFilter} onChange={e => setLevelFilter(e.target.value)}>
          <option value="all">All Levels</option>
          {programLevels.map(lvl => <option key={lvl} value={lvl}>{lvl}</option>)}
        </select>

        <select className={styles.filterSelect} value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
          <option value="all">All Statuses</option>
          <option value="active">Active</option>
          <option value="suspended">Suspended</option>
          <option value="graduated">Graduated</option>
        </select>
      </div>

      {/* ─── DATA TABLE ─── */}
      {filteredStudents.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '4rem', background: 'var(--bg-surface)', borderRadius: 'var(--radius-lg)' }}>
          <AlertCircle size={48} color="var(--border-medium)" style={{ margin: '0 auto 1rem' }} />
          <h3 style={{ color: 'var(--text-primary)' }}>No Students Found</h3>
          <p style={{ color: 'var(--text-secondary)' }}>Adjust your filters or search query.</p>
        </div>
      ) : (
        <div className={styles.tableContainer}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Student</th>
                <th>Contact Info</th>
                <th>Cohort</th>
                <th>Class Level</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredStudents.map(student => (
                <tr
                  key={student.id}
                  className={styles.clickableRow}
                  onClick={() => setDrawerStudentId(student.id)}
                >
                  <td><strong>{student.name}</strong></td>
                  <td style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                    {student.phone_number || 'No Phone'}<br/>{student.email || 'No Email'}
                  </td>
                  <td>{student.cohort_name}</td>
                  <td>{student.current_level}</td>
                  <td>{getStatusBadge(student.status)}</td>
                  <td style={{ textAlign: 'right' }}>
                    <button
                      className={styles.actionBtn}
                      onClick={(e) => {
                        e.stopPropagation();
                        openEditModal(student);
                      }}
                      style={{ marginLeft: 'auto' }}
                      type="button"
                    >
                      <Edit size={16} /> Manage
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ─── GRADES DRAWER (View Journey) ─── */}
      {activeDrawerStudent && (
        <div className={styles.drawerOverlay} onClick={() => setDrawerStudentId(null)}>
          <div className={styles.drawerPanel} onClick={e => e.stopPropagation()}>
            <div className={styles.drawerHeader}>
              <div>
                <h2>{activeDrawerStudent.name}</h2>
                <p>Academic Performance • {activeDrawerStudent.current_level}</p>
              </div>
              <button className={styles.closeBtn} onClick={() => setDrawerStudentId(null)} type="button"><X size={24} /></button>
            </div>

            <div className={styles.drawerBody}>
              {isLoadingGrades ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: '4rem', color: 'var(--text-muted)' }}>
                  <Loader2 className="animate-spin" size={40} style={{ marginBottom: '1rem' }} />
                  <p>Retrieving academic records...</p>
                </div>
              ) : studentGrades.length === 0 ? (
                <div style={{ textAlign: 'center', marginTop: '4rem', color: 'var(--text-muted)' }}>
                  <BookOpen size={48} style={{ opacity: 0.2, marginBottom: '1rem' }} />
                  <h3>No Grades Recorded</h3>
                  <p>This student has not received any assessment scores yet.</p>
                </div>
              ) : (
                <>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem', color: 'var(--text-secondary)' }}>
                    <TrendingUp size={20} />
                    <h3 style={{ fontSize: '1.1rem' }}>Assessment Timeline</h3>
                  </div>

                  {Object.entries(gradesByPeriod).map(([period, grades]) => {
                    const periodTotal = grades.reduce((sum, g) => sum + g.score, 0);
                    const periodMax = grades.reduce((sum, g) => sum + (g.rubric?.max_score || 0), 0);

                    return (
                      <div key={period} className={styles.gradeSection}>
                        <div className={styles.sectionTitle} style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span>{period} Assessment</span>
                          <span style={{ color: 'var(--text-primary)', fontSize: '0.9rem' }}>
                            Total: {periodTotal} / {periodMax}
                          </span>
                        </div>
                        {grades.map((grade, idx) => (
                          <div key={idx} className={styles.gradeRow}>
                            <div className={styles.subjectInfo}>
                              <div className={styles.rubricName}>{grade.rubric?.name || 'Unknown Assessment'}</div>
                              <div className={styles.subjectName}>{grade.rubric?.subject || 'General'}</div>
                            </div>
                            <div className={styles.scorePill}>
                              {grade.score} <span style={{ color: 'var(--text-muted)', fontWeight: 500 }}>/ {grade.rubric?.max_score}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    );
                  })}
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ─── MANAGE STUDENT MODAL (Edit Status/Level) ─── */}
      {selectedStudentForEdit && (
        <div className={styles.modalOverlay} onClick={() => setSelectedStudentForEdit(null)}>
          <div className={styles.modalPanel} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <div>
                <h2>{selectedStudentForEdit.name}</h2>
                <p>Manage Enrollment Data</p>
              </div>
              <button className={styles.closeBtn} onClick={() => setSelectedStudentForEdit(null)} type="button">
                <X size={20} />
              </button>
            </div>

            <div className={styles.modalBody}>
              <div className={styles.modalFormGroup}>
                <label>Academic Level</label>
                <select value={editLevel} onChange={e => setEditLevel(e.target.value)}>
                  <option value="" disabled>Select Level...</option>
                  {programLevels.map(lvl => (
                    <option key={lvl} value={lvl}>{lvl}</option>
                  ))}
                </select>
                <p className={styles.helperText}>
                  Updating this level will automatically change which grading rubrics are assigned to this student in the gradebook.
                </p>
              </div>

              <div className={styles.modalFormGroup}>
                <label>Enrollment Status</label>
                <select value={editStatus} onChange={e => setEditStatus(e.target.value)}>
                  <option value="active">Active (Currently Enrolled)</option>
                  <option value="suspended">Suspended / Dropped</option>
                  <option value="graduated">Graduated / Alumni</option>
                </select>
                <p className={styles.helperText}>
                  Suspended students will remain in the database but will be filtered out of active reporting views.
                </p>
              </div>
            </div>

            <div className={styles.modalFooter}>
              <button
                className={styles.cancelBtn}
                onClick={() => setSelectedStudentForEdit(null)}
                disabled={isProcessing}
                type="button"
              >
                Cancel
              </button>
              <button
                className={styles.approve}
                onClick={handleUpdateStudent}
                disabled={isProcessing}
                type="button"
              >
                {isProcessing ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}