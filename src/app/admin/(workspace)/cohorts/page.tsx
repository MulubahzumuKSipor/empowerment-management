// src/app/admin/cohorts/page.tsx
'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/utils/supabase';
import { getActiveProgramId } from '@/action/admin';
import styles from '@/styles/cohort.module.css';
import {
  Loader2, Plus, Edit, Trash2, X, AlertTriangle,
  Calendar, CheckCircle2, Clock, Users
} from 'lucide-react';
import { DbCohort } from '@/types';

// Extend DbCohort to include the aggregated student count
interface CohortWithCount extends DbCohort {
  student_count: number;
}

const EMPTY_COHORT: Partial<DbCohort> = {
  name: '',
  start_date: '',
  end_date: '',
  status: 'planning',
};

export default function CohortsManagementPage() {
  const router = useRouter();

  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [cohorts, setCohorts] = useState<CohortWithCount[]>([]);
  const [programId, setProgramId] = useState<string | null>(null);

  // Modal States
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  // Data States
  const [formData, setFormData] = useState<Partial<DbCohort>>(EMPTY_COHORT);
  const [targetCohort, setTargetCohort] = useState<CohortWithCount | null>(null);
  const [deleteConfirmation, setDeleteConfirmation] = useState('');

  // ─── 1. FETCH ALL COHORTS ───
  const fetchCohorts = async (pid: string) => {
    setIsLoading(true);
    const { data: cohortsData } = await supabase
      .from('cohorts')
      .select('*')
      .eq('program_id', pid)
      .order('start_date', { ascending: false });

    if (cohortsData) {
      // Append student count for deletion safeguards and UI transparency
      const cohortsWithCounts = await Promise.all(
        cohortsData.map(async (cohort) => {
          const { count } = await supabase
            .from('students')
            .select('id', { count: 'exact', head: true })
            .eq('cohort_id', cohort.id);
          return { ...cohort, student_count: count || 0 };
        })
      );
      setCohorts(cohortsWithCounts);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    async function init() {
      const pid = await getActiveProgramId();
      if (!pid) return router.replace('/admin/programs');
      setProgramId(pid);
      await fetchCohorts(pid);
    }
    init();
  }, [router]);

  // ─── 2. CREATE / UPDATE HANDLER ───
  const handleOpenEditor = (cohort?: CohortWithCount) => {
    if (cohort) {
      setFormData({
        id: cohort.id,
        name: cohort.name,
        start_date: cohort.start_date || '',
        end_date: cohort.end_date || '',
        status: cohort.status || 'planning',
      });
    } else {
      setFormData(EMPTY_COHORT);
    }
    setIsEditorOpen(true);
  };

  const handleSaveCohort = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!programId) return;
    setIsProcessing(true);

    const payload = {
      name: formData.name!,
      start_date: formData.start_date || null,
      end_date: formData.end_date || null,
      status: formData.status || 'planning',
      program_id: programId,
    };

    let error;
    if (formData.id) {
      const res = await supabase.from('cohorts').update(payload).eq('id', formData.id);
      error = res.error;
    } else {
      const res = await supabase.from('cohorts').insert([payload]);
      error = res.error;
    }

    if (error) {
      alert(`Error saving cohort: ${error.message}`);
    } else {
      await fetchCohorts(programId);
      setIsEditorOpen(false);
    }
    setIsProcessing(false);
  };

  // ─── 3. DELETE HANDLER ───
  const handleOpenDelete = (cohort: CohortWithCount) => {
    // Hard Safeguard: Prevent deleting cohorts with enrolled students
    if (cohort.student_count > 0) {
      alert(`Cannot delete ${cohort.name}. There are ${cohort.student_count} students enrolled. You must reassign or remove these students first to prevent data loss.`);
      return;
    }
    setTargetCohort(cohort);
    setDeleteConfirmation('');
    setIsDeleteModalOpen(true);
  };

  const handleDeleteCohort = async () => {
    if (!targetCohort || deleteConfirmation !== targetCohort.name || !programId) return;
    setIsProcessing(true);

    // Delete cohort_reports safely first, then delete cohort.
    await supabase.from('cohort_reports').delete().eq('cohort_id', targetCohort.id);
    const { error } = await supabase.from('cohorts').delete().eq('id', targetCohort.id);

    if (error) {
      alert(`Error deleting cohort: ${error.message}`);
    } else {
      await fetchCohorts(programId);
      setIsDeleteModalOpen(false);
      setTargetCohort(null);
    }
    setIsProcessing(false);
  };

  // ─── UI HELPERS ───
  const getStatusBadge = (status: string | null) => {
    switch(status) {
      case 'active': return <span className={`${styles.statusBadge} ${styles.active}`}><Clock size={14} /> Active</span>;
      case 'completed': return <span className={`${styles.statusBadge} ${styles.completed}`}><CheckCircle2 size={14} /> Completed</span>;
      default: return <span className={`${styles.statusBadge} ${styles.planning}`}><Calendar size={14} /> Planning</span>;
    }
  };

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
        <div>
          <h1>Cohort Management</h1>
          <p>Create and structure academic terms and operational timelines.</p>
        </div>
        <button className={styles.createBtn} onClick={() => handleOpenEditor()} type="button">
          <Plus size={18} /> New Cohort
        </button>
      </header>

      {/* ─── COHORTS TABLE ─── */}
      <div className={styles.tableContainer}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Cohort Name</th>
              <th>Status</th>
              <th>Timeline</th>
              <th>Enrolled</th>
              <th style={{ textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {cohorts.length === 0 ? (
              <tr>
                <td colSpan={5} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                  No cohorts have been created for this program yet.
                </td>
              </tr>
            ) : (
              cohorts.map(cohort => (
                <tr key={cohort.id}>
                  <td><strong>{cohort.name}</strong></td>
                  <td>{getStatusBadge(cohort.status)}</td>
                  <td style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                    {cohort.start_date ? new Date(cohort.start_date).toLocaleDateString() : 'TBD'}
                    {' → '}
                    {cohort.end_date ? new Date(cohort.end_date).toLocaleDateString() : 'TBD'}
                  </td>
                  <td>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                      <Users size={16} /> {cohort.student_count}
                    </span>
                  </td>
                  <td>
                    <div className={styles.actionCell}>
                      <button className={styles.iconBtn} onClick={() => handleOpenEditor(cohort)} title="Edit Cohort" type="button">
                        <Edit size={16} />
                      </button>
                      <button
                        className={`${styles.iconBtn} ${styles.danger}`}
                        onClick={() => handleOpenDelete(cohort)}
                        disabled={cohort.student_count > 0}
                        title={cohort.student_count > 0 ? "Cannot delete cohort with active students" : "Delete Cohort"}
                        type="button"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* ─── CREATE / EDIT MODAL ─── */}
      {isEditorOpen && (
        <div className={styles.modalOverlay} onClick={() => !isProcessing && setIsEditorOpen(false)}>
          <div className={styles.modalPanel} onClick={e => e.stopPropagation()}>
            <form onSubmit={handleSaveCohort}>
              <div className={styles.modalHeader}>
                <div>
                  <h2>{formData.id ? 'Edit Cohort' : 'Create New Cohort'}</h2>
                  <p>Define the operational timeline for this term.</p>
                </div>
                <button type="button" className={styles.closeBtn} onClick={() => !isProcessing && setIsEditorOpen(false)}>
                  <X size={24} />
                </button>
              </div>

              <div className={styles.modalBody}>
                <div className={styles.formGroup}>
                  <label>Cohort Name</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g., Spring 2026 Batch"
                  />
                </div>

                <div className={styles.formGroup}>
                  <label>Operational Status</label>
                  <select
                    value={formData.status || 'planning'}
                    onChange={e => setFormData({ ...formData, status: e.target.value })}
                  >
                    <option value="planning">Planning (Pre-launch)</option>
                    <option value="active">Active (In Session)</option>
                    <option value="completed">Completed (Graduated)</option>
                  </select>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className={styles.formGroup}>
                    <label>Start Date</label>
                    <input
                      type="date"
                      value={formData.start_date || ''}
                      onChange={e => setFormData({ ...formData, start_date: e.target.value })}
                    />
                  </div>
                  <div className={styles.formGroup}>
                    <label>End Date (Optional)</label>
                    <input
                      type="date"
                      value={formData.end_date || ''}
                      onChange={e => setFormData({ ...formData, end_date: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              <div className={styles.modalFooter}>
                <button type="button" className={styles.cancelBtn} onClick={() => setIsEditorOpen(false)} disabled={isProcessing}>
                  Cancel
                </button>
                <button type="submit" className={styles.approveBtn} disabled={isProcessing || !formData.name}>
                  {isProcessing ? <Loader2 size={16} className="animate-spin" /> : null}
                  {formData.id ? 'Save Changes' : 'Create Cohort'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── DELETE CONFIRMATION MODAL ─── */}
      {isDeleteModalOpen && targetCohort && (
        <div className={styles.modalOverlay} onClick={() => !isProcessing && setIsDeleteModalOpen(false)}>
          <div className={styles.modalPanel} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <div>
                <h2>Delete Cohort</h2>
                <p>This action cannot be undone.</p>
              </div>
              <button type="button" className={styles.closeBtn} onClick={() => !isProcessing && setIsDeleteModalOpen(false)}>
                <X size={24} />
              </button>
            </div>

            <div className={styles.modalBody}>
              <div className={styles.warningBanner}>
                <p>
                  <AlertTriangle size={16} style={{ display: 'inline', marginBottom: '-2px', marginRight: '0.25rem' }} />
                  You are about to permanently delete <strong>{targetCohort.name}</strong> and its associated executive reports.
                </p>
              </div>
              <div className={styles.formGroup}>
                <label>Type <strong>{targetCohort.name}</strong> to confirm:</label>
                <input
                  type="text"
                  value={deleteConfirmation}
                  onChange={e => setDeleteConfirmation(e.target.value)}
                  placeholder="Confirm cohort name..."
                  autoComplete="off"
                />
              </div>
            </div>

            <div className={styles.modalFooter}>
              <button type="button" className={styles.cancelBtn} onClick={() => setIsDeleteModalOpen(false)} disabled={isProcessing}>
                Cancel
              </button>
              <button
                type="button"
                className={`${styles.approveBtn} ${styles.dangerBtn}`}
                onClick={handleDeleteCohort}
                disabled={isProcessing || deleteConfirmation !== targetCohort.name}
              >
                {isProcessing ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                Permanently Delete
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}