'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/utils/supabase';
import { getActiveProgramId } from '@/action/admin';
import styles from '@/styles/application.module.css';
import { ApplicationQuestion } from '@/types';
import { Loader2, Eye, Check, X, Clock, AlertCircle } from 'lucide-react';

// Database Schema Interfaces
interface DbApplication {
  id: string;
  program_id: string;
  first_name: string;
  last_name: string;
  phone: string;
  email: string;
  gender: string;
  date_of_birth: string;
  home_address: string;
  education_level: string;
  primary_motivation: string;
  status: 'pending' | 'approved' | 'rejected';
  custom_answers: Record<string, string | string[]>; // Maps question ID to answer
  created_at: string;
}

type FilterStatus = 'all' | 'pending' | 'approved' | 'rejected';

export default function ApplicationsPage() {
  const router = useRouter();

  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [applications, setApplications] = useState<DbApplication[]>([]);
  const [schema, setSchema] = useState<ApplicationQuestion[]>([]);
  const [filter, setFilter] = useState<FilterStatus>('pending');
  const [selectedApp, setSelectedApp] = useState<DbApplication | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function fetchData() {
      const programId = await getActiveProgramId();
      if (!programId) {
        router.replace('/admin/programs');
        return;
      }

      const { data: program } = await supabase
        .from('programs')
        .select('registration_schema')
        .eq('id', programId)
        .single();

      if (program && program.registration_schema && isMounted) {
        setSchema(program.registration_schema as ApplicationQuestion[]);
      }

      const { data: apps, error } = await supabase
        .from('applications')
        .select('*')
        .eq('program_id', programId)
        .order('created_at', { ascending: false });

      if (!error && apps && isMounted) {
        setApplications(apps as DbApplication[]);
      }

      if (isMounted) setIsLoading(false);
    }

    fetchData();
    return () => { isMounted = false; };
  }, [router]);

  const handleUpdateStatus = async (appId: string, newStatus: 'approved' | 'rejected') => {
    setIsProcessing(true);

    const { error } = await supabase
      .from('applications')
      .update({ status: newStatus })
      .eq('id', appId);

    if (error) {
      alert("Failed to update status.");
    } else {
      setApplications(prev => prev.map(app => app.id === appId ? { ...app, status: newStatus } : app));
      setSelectedApp(null);
    }

    setIsProcessing(false);
  };

  const filteredApps = applications.filter(app => filter === 'all' || app.status === filter);

  const getStatusBadge = (status: string) => {
    switch(status) {
      case 'approved': return <span className={`${styles.statusBadge} ${styles.approved}`}><Check size={14} /> Approved</span>;
      case 'rejected': return <span className={`${styles.statusBadge} ${styles.rejected}`}><X size={14} /> Rejected</span>;
      default: return <span className={`${styles.statusBadge} ${styles.pending}`}><Clock size={14} /> Pending</span>;
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
        <h1>Inbox & Applications</h1>
        <p>Review prospective students and manage admissions.</p>
      </header>

      <div className={styles.filterTabs}>
        <button className={filter === 'pending' ? styles.active : ''} onClick={() => setFilter('pending')} type="button">Pending Review</button>
        <button className={filter === 'approved' ? styles.active : ''} onClick={() => setFilter('approved')} type="button">Approved</button>
        <button className={filter === 'rejected' ? styles.active : ''} onClick={() => setFilter('rejected')} type="button">Rejected</button>
        <button className={filter === 'all' ? styles.active : ''} onClick={() => setFilter('all')} type="button">All Applicants</button>
      </div>

      {filteredApps.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '4rem', background: 'var(--bg-surface)', borderRadius: 'var(--radius-lg)', border: '1px dashed var(--border-medium)' }}>
          <AlertCircle size={48} color="var(--border-medium)" style={{ margin: '0 auto 1rem' }} />
          <h3 style={{ color: 'var(--text-primary)', marginBottom: '0.5rem' }}>No Applications Found</h3>
          <p style={{ color: 'var(--text-secondary)' }}>There are no students in this status category.</p>
        </div>
      ) : (
        <div className={styles.tableContainer}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Applicant Name</th>
                <th>Contact</th>
                <th>Date Applied</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredApps.map(app => (
                <tr key={app.id}>
                  <td>
                    <strong>{app.first_name} {app.last_name}</strong>
                  </td>
                  <td style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                    {app.phone}<br/>{app.email}
                  </td>
                  <td>{new Date(app.created_at).toLocaleDateString()}</td>
                  <td>{getStatusBadge(app.status)}</td>
                  <td style={{ textAlign: 'right' }}>
                    <button className={styles.actionBtn} onClick={() => setSelectedApp(app)} style={{ marginLeft: 'auto' }} type="button">
                      <Eye size={16} /> Review
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {selectedApp && (
        <div className={styles.modalOverlay} onClick={() => setSelectedApp(null)}>
          <div className={styles.modalPanel} onClick={e => e.stopPropagation()}>

            <div className={styles.modalHeader}>
              <div>
                <h2>{selectedApp.first_name} {selectedApp.last_name}</h2>
                <p>Applied on {new Date(selectedApp.created_at).toLocaleDateString()}</p>
              </div>
              <button className={styles.closeBtn} onClick={() => setSelectedApp(null)} type="button"><X size={24} /></button>
            </div>

            <div className={styles.modalBody}>

              {/* 1. MANDATORY STANDARD FIELDS */}
              <div className={styles.dataSection}>
                <h3 style={{ color: 'var(--brand-green)' }}>Required Enrollment Data</h3>

                <div className={styles.dataRow}>
                  <div className={styles.label}>Full Name</div>
                  <div className={styles.value}>{selectedApp.first_name} {selectedApp.last_name}</div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className={styles.dataRow}>
                    <div className={styles.label}>Email Address</div>
                    <div className={styles.value}>{selectedApp.email || 'N/A'}</div>
                  </div>
                  <div className={styles.dataRow}>
                    <div className={styles.label}>Phone Number</div>
                    <div className={styles.value}>{selectedApp.phone || 'N/A'}</div>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className={styles.dataRow}>
                    <div className={styles.label}>Gender</div>
                    <div className={styles.value}>{selectedApp.gender || 'N/A'}</div>
                  </div>
                  <div className={styles.dataRow}>
                    <div className={styles.label}>Date of Birth</div>
                    <div className={styles.value}>{selectedApp.date_of_birth || 'N/A'}</div>
                  </div>
                </div>

                <div className={styles.dataRow}>
                  <div className={styles.label}>Education Level</div>
                  <div className={styles.value}>{selectedApp.education_level || 'N/A'}</div>
                </div>

                <div className={styles.dataRow}>
                  <div className={styles.label}>Home Address</div>
                  <div className={styles.value} style={{ whiteSpace: 'pre-wrap' }}>{selectedApp.home_address || 'N/A'}</div>
                </div>

                <div className={styles.dataRow}>
                  <div className={styles.label}>Primary Motivation</div>
                  <div className={styles.value} style={{ whiteSpace: 'pre-wrap' }}>{selectedApp.primary_motivation || 'N/A'}</div>
                </div>
              </div>

              {/* 2. CUSTOM QUESTIONNAIRE */}
              <div className={styles.dataSection}>
                <h3>Custom Questionnaire</h3>
                {schema.length === 0 ? (
                  <p style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>No custom questions were asked.</p>
                ) : (
                  schema.map(question => {
                    const answer = selectedApp.custom_answers?.[question.id];
                    const displayAnswer = Array.isArray(answer) ? answer.join(', ') : (answer?.toString().trim() || '');

                    return (
                      <div className={styles.dataRow} key={question.id}>
                        <div className={styles.label}>
                          {question.label}
                          {question.required && <span style={{ color: '#ef4444', marginLeft: '4px' }} title="Required Question">*</span>}
                        </div>
                        <div className={styles.value} style={{ whiteSpace: 'pre-wrap' }}>
                          {displayAnswer ? (
                            displayAnswer
                          ) : question.required ? (
                            <span style={{ color: '#ef4444', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                              <AlertCircle size={14} /> Missing Required Answer
                            </span>
                          ) : (
                            <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>Optional — Skipped</span>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* ACTION FOOTER */}
            {selectedApp.status === 'pending' ? (
              <div className={styles.modalFooter}>
                <button
                  className={styles.reject}
                  disabled={isProcessing}
                  onClick={() => handleUpdateStatus(selectedApp.id, 'rejected')}
                  type="button"
                >
                  <X size={18} /> Reject
                </button>
                <button
                  className={styles.approve}
                  disabled={isProcessing}
                  onClick={() => handleUpdateStatus(selectedApp.id, 'approved')}
                  type="button"
                >
                  <Check size={18} /> Approve & Admit
                </button>
              </div>
            ) : (
              <div className={styles.modalFooter} style={{ justifyContent: 'center', color: 'var(--text-muted)' }}>
                Application already {selectedApp.status}.
              </div>
            )}

          </div>
        </div>
      )}
    </div>
  );
}