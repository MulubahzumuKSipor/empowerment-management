'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/utils/supabase';
import Image from 'next/image';
import { ArrowLeft, Loader2, AlertCircle } from 'lucide-react';
import styles from '@/styles/attendance.module.css';

interface Program {
  id: string;
  name: string;
  levels: string[];
}

interface Cohort {
  id: string;
  name: string;
}

interface Student {
  id: string;
  name: string;
  current_level: string;
  cohort_id: string;     // Added to support double-filtering
}

type AttendanceStatus = 'present' | 'late' | 'absent';

export default function AttendancePage() {
  // --- UI State ---
  const [step, setStep] = useState<'select' | 'track'>('select');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // --- Core Data Structures ---
  const [programs, setPrograms] = useState<Program[]>([]);
  const [selectedProgram, setSelectedProgram] = useState<Program | null>(null);
  const [cohorts, setCohorts] = useState<Cohort[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  
  // --- Selected Segment States ---
  const [activeCohortId, setActiveCohortId] = useState<string>('');
  const [activeLevel, setActiveLevel] = useState<string>('');

  // --- Form Matrix Elements ---
  const [attendanceData, setAttendanceData] = useState<Record<string, AttendanceStatus>>({});
  const [targetDate, setTargetDate] = useState(new Date().toISOString().split('T')[0]);

  // 1. Fetch Workspaces and Programs via RBAC Routing
  useEffect(() => {
    const fetchProgramsForUser = async () => {
      setIsLoading(true);
      setFetchError(null);

      const { data: { user }, error: authError } = await supabase.auth.getUser();

      if (authError || !user) {
        setFetchError('Authentication failed. Please log in again.');
        setIsLoading(false);
        return;
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      const role = profile?.role || '';
      let fetchedPrograms: Program[] = [];

      if (role === 'super_admin' || role === 'auditor') {
        const { data, error } = await supabase
          .from('programs')
          .select('id, name, levels');

        if (error) {
          setFetchError('Failed to load workspaces.');
        } else if (data) {
          fetchedPrograms = data as Program[];
        }
      } else {
        const { data, error } = await supabase
          .from('program_assignments')
          .select(`
            program_id,
            programs ( id, name, levels )
          `)
          .eq('user_id', user.id);

        if (error) {
          setFetchError('Failed to load assigned workspaces.');
        } else if (data) {
          type AssignmentRow = { program_id: string; programs: Program | Program[] | null };
          const rows = data as unknown as AssignmentRow[];

          fetchedPrograms = rows
            .map((row) => Array.isArray(row.programs) ? row.programs[0] : row.programs)
            .filter((p): p is Program => p !== null && p !== undefined);
        }
      }

      setPrograms(fetchedPrograms);
      setIsLoading(false);
    };

    fetchProgramsForUser();
  }, []);

  // 2. Hydrate Isolated Cohorts and Student Rosters Contextually
  const handleSelectProgram = async (program: Program) => {
    setSelectedProgram(program);
    setIsLoading(true);
    
    // Set dynamic fallback levels
    if (program.levels && program.levels.length > 0) {
      setActiveLevel(program.levels[0]);
    } else {
      setActiveLevel('');
    }

    try {
      // A. Pull matching cohorts matching tenant isolation boundaries
      const { data: cohortData, error: cohortError } = await supabase
        .from('cohorts')
        .select('id, name')
        .eq('program_id', program.id)
        .order('created_at', { ascending: false });

      if (cohortError) throw cohortError;
      
      const verifiedCohorts = (cohortData || []) as Cohort[];
      setCohorts(verifiedCohorts);

      if (verifiedCohorts.length > 0) {
        setActiveCohortId(verifiedCohorts[0].id);
      } else {
        setActiveCohortId('');
      }

      // B. Pull active student profile keys
      const { data: studentData, error: studentError } = await supabase
        .from('students')
        .select('id, name, current_level, cohort_id')
        .eq('program_id', program.id)
        .eq('status', 'active')
        .order('name', { ascending: true });

      if (studentError) throw studentError;

      if (studentData) {
        const verifiedStudents = studentData as Student[];
        setStudents(verifiedStudents);

        // Form default structural mappings
        const initialRecord: Record<string, AttendanceStatus> = {};
        verifiedStudents.forEach(s => {
          initialRecord[s.id] = 'present';
        });
        setAttendanceData(initialRecord);
      }

      setStep('track');
    } catch (err: any) {
      console.error("Hydration Error:", err.message);
      alert('Could not isolate contextual data vectors for this program selection.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleStatusChange = (studentId: string, status: AttendanceStatus) => {
    setAttendanceData(prev => ({ ...prev, [studentId]: status }));
  };

  const handleSaveAttendance = async () => {
    setIsSaving(true);
    
    const recordsToInsert = Object.entries(attendanceData)
      .filter(([studentId]) => displayedStudents.some(s => s.id === studentId))
      .map(([studentId, status]) => ({
        program_id: selectedProgram?.id,
        student_id: studentId,
        date: targetDate,
        status: status
      }));

    if (recordsToInsert.length === 0) {
      alert("No attendance metrics parsed within current slice parameters.");
      setIsSaving(false);
      return;
    }

    const { error } = await supabase.from('attendance_logs').insert(recordsToInsert);

    if (error) {
      alert(`Failed to save attendance: ${error.message}`);
    } else {
      alert('Attendance context mapped successfully.');
    }
    
    setIsSaving(false);
  };

  // ─── Dual Filter Array Splitting Strategy ───────────────────────────
  const displayedStudents = students.filter(s =>
    s.cohort_id === activeCohortId && s.current_level === activeLevel
  );

  const summary = {
    present: displayedStudents.filter(s => attendanceData[s.id] === 'present').length,
    late: displayedStudents.filter(s => attendanceData[s.id] === 'late').length,
    absent: displayedStudents.filter(s => attendanceData[s.id] === 'absent').length,
  };

  if (isLoading && step === 'select') {
    return (
      <div className={styles.container} style={{ justifyContent: 'center' }}>
        <Loader2 className="animate-spin text-muted" size={48} color="var(--brand-green)" />
      </div>
    );
  }

  return (
    <main className={styles.container}>
      <div className={styles.wrapper}>

        {/* --- STEP 1: SELECT PROGRAM --- */}
        {step === 'select' && (
          <div className="animate-fade-in">
            <div className={styles.header}>
              <h1>Select a Workspace</h1>
              <p>Choose a program to log today&apos;s attendance.</p>
            </div>

            {fetchError && (
              <div className={styles.errorBanner} style={{ marginBottom: '2rem', padding: '1rem', background: '#fef2f2', color: '#991b1b', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <AlertCircle size={20} />
                {fetchError}
              </div>
            )}

            <div className={styles.programGrid}>
              {programs.map(program => (
                <button 
                  key={program.id} 
                  className={styles.programCard}
                  onClick={() => handleSelectProgram(program)}
                  type="button"
                >
                  <div className={styles.iconWrapper}>
                    <Image src="/logo.png" alt="Program Icon" width={48} height={48} loading='eager' />
                  </div>
                  <div className={styles.cardInfo}>
                    <h3>{program.name}</h3>
                    <span>{program.levels?.length || 0} Class Levels</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* --- STEP 2: MULTI-LAYERED TRACKER GRID --- */}
        {step === 'track' && selectedProgram && (
          <div className="animate-fade-in">
            <div className={styles.trackerHeader}>
              <div className={styles.leftGroup}>
                <button className={styles.backBtn} onClick={() => setStep('select')} type="button">
                  <ArrowLeft size={20} />
                </button>
                <h2>{selectedProgram.name}</h2>
              </div>
              
              <input 
                type="date" 
                className={styles.datePicker}
                value={targetDate}
                max={new Date().toISOString().split('T')[0]}
                onChange={(e) => setTargetDate(e.target.value)}
              />
            </div>

            {/* SEGMENT FILTERS CANVAS */}
            <div className={styles.filterControls}>
              {/* Row A: Cohort Selection Vectors */}
              <div className={styles.filterGroup}>
                <span className={styles.filterLabel}>Active Cohort:</span>
                <select
                  className={styles.cohortDropdown}
                  value={activeCohortId}
                  onChange={(e) => setActiveCohortId(e.target.value)}
                >
                  {cohorts.length === 0 && <option value="">No Active Cohorts Found</option>}
                  {cohorts.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              {/* Row B: Dynamic Academic Level Controls */}
              {selectedProgram.levels && selectedProgram.levels.length > 0 && (
                <div className={styles.filterGroup}>
                  <span className={styles.filterLabel}>Class Level:</span>
                  {selectedProgram.levels.map(level => (
                    <button
                      key={level}
                      className={`${styles.levelTab} ${activeLevel === level ? styles.activeTab : ''}`}
                      onClick={() => setActiveLevel(level)}
                      type="button"
                    >
                      {level}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {isLoading ? (
              <div style={{ textAlign: 'center', padding: '3rem' }}>
                <Loader2 className="animate-spin" size={32} color="var(--brand-green)" />
              </div>
            ) : (
              <>
                <div className={styles.tableContainer}>
                  <table className={styles.table}>
                    <thead>
                      <tr>
                        <th>Student Roster</th>
                        <th style={{ textAlign: 'center' }}>Attendance Verification</th>
                      </tr>
                    </thead>
                    <tbody>
                      {displayedStudents.map((student) => {
                        const currentStatus = attendanceData[student.id];
                        return (
                          <tr key={student.id}>
                            <td>
                              <span className={styles.studentName}>{student.name}</span>
                            </td>
                            <td style={{ textAlign: 'center' }}>
                              <div className={styles.segmentControl}>
                                <button 
                                  className={currentStatus === 'present' ? styles.activePresent : ''}
                                  onClick={() => handleStatusChange(student.id, 'present')}
                                  type="button"
                                >
                                  Present
                                </button>
                                <button 
                                  className={currentStatus === 'late' ? styles.activeLate : ''}
                                  onClick={() => handleStatusChange(student.id, 'late')}
                                  type="button"
                                >
                                  Late
                                </button>
                                <button 
                                  className={currentStatus === 'absent' ? styles.activeAbsent : ''}
                                  onClick={() => handleStatusChange(student.id, 'absent')}
                                  type="button"
                                >
                                  Absent
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                      {displayedStudents.length === 0 && (
                        <tr>
                          <td colSpan={2} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                            No active entries match this Cohort and Level intersection slice.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* PERSISTENCE TRIGGER ACTION BAR */}
                {displayedStudents.length > 0 && (
                  <div className={styles.stickyFooter}>
                    <div className={styles.summary}>
                      <span>Slice Roster: {displayedStudents.length}</span>
                      <span className={styles.countPresent}>Present: {summary.present}</span>
                      <span className={styles.countLate}>Late: {summary.late}</span>
                      <span className={styles.countAbsent}>Absent: {summary.absent}</span>
                    </div>
                    
                    <button 
                      className={styles.saveBtn} 
                      onClick={handleSaveAttendance}
                      disabled={isSaving}
                      type="button"
                    >
                      {isSaving ? <Loader2 className="animate-spin" size={18} /> : 'Save Segment Attendance'}
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        )}

      </div>
    </main>
  );
}