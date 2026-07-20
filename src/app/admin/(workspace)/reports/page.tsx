'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/utils/supabase';
import { getActiveProgramId } from '@/action/admin';
import styles from '@/styles/reports.module.css';
import {
  Loader2, FileText, TrendingUp, Users, Calendar,
  Quote, Target, AlertTriangle, X, Printer, Edit
} from 'lucide-react';
import { DbCohort, DbCohortReport } from '@/types';

interface DashboardCohort extends DbCohort {
  student_count: number;
}

interface ImpactMetrics {
  preAverage: number;
  finalAverage: number;
  growthPercentage: number;
}

export default function CohortReportsPage() {
  const router = useRouter();

  const [isLoading, setIsLoading] = useState(true);
  const [cohorts, setCohorts] = useState<DashboardCohort[]>([]);

  // Drawer & Data State
  const [selectedCohort, setSelectedCohort] = useState<DashboardCohort | null>(null);
  const [cohortReport, setCohortReport] = useState<DbCohortReport | null>(null);
  const [impactMetrics, setImpactMetrics] = useState<ImpactMetrics | null>(null);
  const [isLoadingReport, setIsLoadingReport] = useState(false);

  // ─── 1. LOAD ALL COHORTS ───
  useEffect(() => {
    let isMounted = true;
    async function fetchDashboard() {
      const programId = await getActiveProgramId();
      if (!programId) return router.replace('/admin/programs');

      const { data: cohortsData } = await supabase
        .from('cohorts')
        .select('*')
        .eq('program_id', programId)
        .order('start_date', { ascending: false });

      if (cohortsData && isMounted) {
        // Resolve student counts concurrently for UI
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
      if (isMounted) setIsLoading(false);
    }
    fetchDashboard();
    return () => { isMounted = false; };
  }, [router]);

  // ─── 2. ON-DEMAND IMPACT DATA FETCHING ───
  useEffect(() => {
    if (!selectedCohort) return;

    let isMounted = true;
    setIsLoadingReport(true);

    async function generateImpactReport() {
      // Fetch Qualitative Report Data
      const { data: reportData } = await supabase
        .from('cohort_reports')
        .select('*')
        .eq('cohort_id', selectedCohort!.id)
        .single();

      if (isMounted) {
        setCohortReport(reportData);
      }

      // Fetch Quantitative Scores mapped to the Cohort
      const { data: scoresData } = await supabase
        .from('assessment_scores')
        .select(`
          score, assessment_type,
          rubric:rubrics(max_score),
          student:students!inner(cohort_id)
        `)
        .eq('student.cohort_id', selectedCohort!.id);

      if (scoresData && scoresData.length > 0 && isMounted) {
        let preTotal = 0, preMax = 0, finalTotal = 0, finalMax = 0;

        scoresData.forEach((record: any) => {
          const score = record.score || 0;
          const max = record.rubric?.max_score || 0;
          if (record.assessment_type.toLowerCase() === 'pre') {
            preTotal += score; preMax += max;
          } else if (record.assessment_type.toLowerCase() === 'final') {
            finalTotal += score; finalMax += max;
          }
        });

        const preAvg = preMax > 0 ? (preTotal / preMax) * 100 : 0;
        const finalAvg = finalMax > 0 ? (finalTotal / finalMax) * 100 : 0;
        const growth = finalAvg - preAvg;

        setImpactMetrics({
          preAverage: preAvg,
          finalAverage: finalAvg,
          growthPercentage: growth > 0 ? growth : 0
        });
      }

      if (isMounted) setIsLoadingReport(false);
    }

    generateImpactReport();
    return () => { isMounted = false; };
  }, [selectedCohort]);

  // ─── RENDER HELPERS ───
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
          <h1>Cohorts & Impact Reports</h1>
          <p>Measure academic growth and generate stakeholder reports.</p>
        </div>
      </header>

      {/* ─── COHORT GRID ─── */}
      <div className={styles.grid}>
        {cohorts.map(cohort => (
          <div key={cohort.id} className={styles.cohortCard}>
            <div className={styles.cardHeader}>
              <div className={styles.cardTitle}>{cohort.name}</div>
              <div className={`${styles.statusBadge} ${cohort.end_date ? styles.statusCompleted : styles.statusActive}`}>
                {cohort.end_date ? 'Completed' : 'Active'}
              </div>
            </div>

            <div className={styles.metaGrid}>
              <div className={styles.metaItem}>
                <span className={styles.metaLabel}>Total Enrolled</span>
                <span className={styles.metaValue}><Users size={16} color="var(--brand-green)"/> {cohort.student_count} Students</span>
              </div>
              <div className={styles.metaItem}>
                <span className={styles.metaLabel}>Start Date</span>
                <span className={styles.metaValue}><Calendar size={16} color="var(--text-muted)"/> {cohort.start_date ? new Date(cohort.start_date).toLocaleDateString() : 'TBD'}</span>
              </div>
            </div>

            <button className={styles.actionBtn} onClick={() => setSelectedCohort(cohort)} type="button">
              <FileText size={18} /> View Impact Report
            </button>
          </div>
        ))}
      </div>

      {/* ─── IMPACT REPORT DRAWER (VIEW MODE ONLY) ─── */}
      {selectedCohort && (
        <div className={styles.drawerOverlay} onClick={() => setSelectedCohort(null)}>
          <div className={styles.drawerPanel} onClick={e => e.stopPropagation()}>
            <div className={styles.drawerHeader}>
              <div>
                <h2 style={{ fontSize: '1.75rem', marginBottom: '0.25rem' }}>{selectedCohort.name} Impact Report</h2>
                <p>Generated on {new Date().toLocaleDateString()}</p>
              </div>
              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <button
                  className={styles.actionBtn}
                  style={{ width: 'auto', padding: '0.5rem 1rem' }}
                  onClick={() => router.push(`/admin/reports/edit?cohort=${selectedCohort.id}`)}
                  type="button"
                >
                  <Edit size={16} /> Edit Report
                </button>
                <button className={styles.actionBtn} style={{ width: 'auto', padding: '0.5rem 1rem' }} onClick={() => window.print()} type="button">
                  <Printer size={16} /> Print
                </button>
                <button className={styles.actionBtn} style={{ width: 'auto', border: 'none' }} onClick={() => setSelectedCohort(null)} type="button">
                  <X size={24} />
                </button>
              </div>
            </div>

            <div className={styles.drawerBody}>
              {isLoadingReport ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: '4rem', color: 'var(--text-muted)' }}>
                  <Loader2 className="animate-spin" size={40} style={{ marginBottom: '1rem' }} />
                  <p>Calculating longitudinal data...</p>
                </div>
              ) : (
                <>
                  <div className={styles.impactHighlight}>
                    <div className={styles.impactStat}>
                      <span>Baseline Competency</span>
                      <span style={{ color: 'var(--text-secondary)' }}>{impactMetrics?.preAverage.toFixed(1) || '0'}%</span>
                    </div>
                    <TrendingUp size={48} color="var(--brand-green)" style={{ opacity: 0.5 }} />
                    <div className={styles.impactStat}>
                      <span>Final Outcomes</span>
                      <span style={{ color: 'var(--text-primary)' }}>{impactMetrics?.finalAverage.toFixed(1) || '0'}%</span>
                    </div>
                    <div className={styles.impactStat} style={{ textAlign: 'right' }}>
                      <span>Overall Growth</span>
                      <span>+{impactMetrics?.growthPercentage.toFixed(1) || '0'}%</span>
                    </div>
                  </div>

                  {cohortReport ? (
                    <>
                      {cohortReport.program_overview && (
                        <div className={styles.reportSection}>
                          <h3><Target size={20} color="var(--brand-green)" /> Executive Summary</h3>
                          <p className={styles.narrativeText}>{cohortReport.program_overview}</p>
                        </div>
                      )}

                      {cohortReport.outcomes_reached && (
                        <div className={styles.reportSection}>
                          <h3><TrendingUp size={20} color="var(--brand-green)" /> Key Outcomes Reached</h3>
                          <p className={styles.narrativeText}>{cohortReport.outcomes_reached}</p>
                        </div>
                      )}

                      {cohortReport.mission_moment && (
                        <div className={styles.reportSection}>
                          <h3><Quote size={20} color="var(--brand-green)" /> Mission Moment</h3>
                          <div className={styles.quoteBlock}>"{cohortReport.mission_moment}"</div>
                        </div>
                      )}

                      {cohortReport.challenges_encountered && (
                        <div className={styles.reportSection}>
                          <h3><AlertTriangle size={20} color="#ef4444" /> Challenges & Adjustments</h3>
                          <p className={styles.narrativeText}>{cohortReport.challenges_encountered}</p>
                        </div>
                      )}

                      {cohortReport.participant_testimonials && cohortReport.participant_testimonials.length > 0 && (
                        <div className={styles.reportSection}>
                          <h3><Users size={20} color="var(--brand-green)" /> Participant Voices</h3>
                          {cohortReport.participant_testimonials.map((testimony, idx) => (
                            <div key={idx} className={styles.quoteBlock}>"{testimony}"</div>
                          ))}
                        </div>
                      )}

                      {cohortReport.volunteer_testimonials && cohortReport.volunteer_testimonials.length > 0 && (
                        <div className={styles.reportSection}>
                          <h3><Users size={20} color="var(--brand-green)" /> Volunteer Voices</h3>
                          {cohortReport.volunteer_testimonials.map((testimony, idx) => (
                            <div key={idx} className={styles.quoteBlock}>"{testimony}"</div>
                          ))}
                        </div>
                      )}

                      <div className={styles.reportSection}>
                        <h3><Users size={20} color="var(--brand-green)" /> Operations & Engagement</h3>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', background: 'var(--bg-surface)', padding: '1.5rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-light)' }}>
                          <div>
                            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Average Attendance</div>
                            <div style={{ fontSize: '1.25rem', fontWeight: 600 }}>{cohortReport.average_attendance_rate || 0}%</div>
                          </div>
                          <div>
                            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Volunteer Enrollment</div>
                            <div style={{ fontSize: '1.25rem', fontWeight: 600 }}>{cohortReport.volunteer_enrollment || 0} / {cohortReport.volunteer_capacity || 0}</div>
                          </div>
                          <div>
                            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Total Applicants</div>
                            <div style={{ fontSize: '1.25rem', fontWeight: 600 }}>{cohortReport.total_applicants || 0}</div>
                          </div>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div style={{ textAlign: 'center', padding: '3rem', border: '1px dashed var(--border-medium)', borderRadius: 'var(--radius-md)' }}>
                      <FileText size={32} color="var(--text-muted)" style={{ margin: '0 auto 1rem' }} />
                      <p style={{ color: 'var(--text-secondary)' }}>No qualitative report has been written for this cohort yet.</p>
                      <button
                        className={styles.actionBtn}
                        onClick={() => router.push(`/admin/reports/edit?cohort=${selectedCohort.id}`)}
                        style={{ maxWidth: '200px', margin: '1rem auto 0' }}
                        type="button"
                      >
                        <Edit size={16} /> Draft Report
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}