'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/utils/supabase';
import { getActiveProgramId } from '@/action/admin';
import styles from '@/styles/admin.module.css';
import {
  Loader2,
  LayoutGrid,
  Users,
  BookOpen,
  FileText,
  ArrowRight,
  GraduationCap
} from 'lucide-react';

interface ProgramMetrics {
  name: string;
  activeCohorts: number;
  activeStudents: number;
  pendingApplications: number;
}

export default function AdminDashboardPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [metrics, setMetrics] = useState<ProgramMetrics | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadDashboardContext() {
      try {
        // 1. Enforce Tenant Isolation Check
        const programId = await getActiveProgramId();
        if (!programId) {
          router.replace('/admin/programs');
          return;
        }

        // 2. Fetch Base Program Identity
        const { data: program, error: programError } = await supabase
          .from('programs')
          .select('name')
          .eq('id', programId)
          .single();

        if (programError || !program) throw new Error("Workspace identity lost.");

        // 3. Execute Parallel Metric Queries (Optimized Runtime)
        // We use exact count configurations to avoid pulling entire arrays into browser memory
        const [cohortsReq, studentsReq, applicationsReq] = await Promise.all([
          supabase
            .from('cohorts')
            .select('*', { count: 'exact', head: true })
            .eq('program_id', programId)
            .is('end_date', null), // Assumes active cohorts lack an end date

          supabase
            .from('students')
            .select('*', { count: 'exact', head: true })
            .eq('program_id', programId)
            .eq('status', 'active'),

          supabase
            .from('applications')
            .select('*', { count: 'exact', head: true })
            .eq('program_id', programId)
            .eq('status', 'pending')
        ]);

        if (isMounted) {
          setMetrics({
            name: program.name,
            activeCohorts: cohortsReq.count || 0,
            activeStudents: studentsReq.count || 0,
            pendingApplications: applicationsReq.count || 0,
          });
          setIsLoading(false);
        }
      } catch (error) {
        console.error("Dashboard initialization failed:", error);
        if (isMounted) {
          alert("A secure context error occurred. Returning to hub.");
          router.replace('/admin/programs');
        }
      }
    }

    loadDashboardContext();

    return () => {
      isMounted = false;
    };
  }, [router]);

  if (isLoading || !metrics) {
    return (
      <div className={styles.loadingContainer}>
        <Loader2 className="animate-spin" size={48} strokeWidth={2} />
        <h2 style={{ marginTop: '1rem', color: 'var(--text-primary)' }}>Loading Workspace Context...</h2>
      </div>
    );
  }

  return (
    <div className={styles.dashboardContainer}>
      <div className={styles.wrapper}>

        {/* ─── HEADER ─── */}
        <header className={styles.header}>
          <div>
            <h1>{metrics.name} Overview</h1>
            <p>Welcome to your administrative command center.</p>
          </div>

          <button
            className={styles.switchBtn}
            onClick={() => router.push('/admin/programs')}
            type="button"
          >
            <LayoutGrid size={18} /> Switch Workspace
          </button>
        </header>

        {/* ─── METRIC CARDS ─── */}
        <div className={styles.metricsGrid}>
          <div className={styles.metricCard}>
            <div className={`${styles.iconWrapper} ${styles.blue}`}>
              <BookOpen size={24} />
            </div>
            <div className={styles.metricData}>
              <h3>Active Cohorts</h3>
              <span className={styles.value}>{metrics.activeCohorts}</span>
            </div>
          </div>

          <div className={styles.metricCard}>
            <div className={`${styles.iconWrapper} ${styles.green}`}>
              <Users size={24} />
            </div>
            <div className={styles.metricData}>
              <h3>Active Students</h3>
              <span className={styles.value}>{metrics.activeStudents}</span>
            </div>
          </div>

          <div className={styles.metricCard}>
            <div className={`${styles.iconWrapper} ${styles.orange}`}>
              <FileText size={24} />
            </div>
            <div className={styles.metricData}>
              <h3>Pending Applications</h3>
              <span className={styles.value}>{metrics.pendingApplications}</span>
            </div>
          </div>

          <div className={styles.metricCard}>
            <div className={`${styles.iconWrapper} ${styles.purple}`}>
              <GraduationCap size={24} />
            </div>
            <div className={styles.metricData}>
              <h3>Intelligence Reports</h3>
              <span className={styles.value}>{metrics.activeCohorts}</span> {/* 1 Report per active cohort default */}
            </div>
          </div>
        </div>

        {/* ─── QUICK ACTIONS ─── */}
        <h2 className={styles.sectionTitle}>Administrative Routing</h2>
        <div className={styles.actionGrid}>

          <div className={styles.actionCard} onClick={() => router.push('/admin/applications')}>
            <h4><FileText size={20} color="var(--brand-orange, #f97316)" /> Review Applications</h4>
            <p>Approve or reject prospective students based on your program&apos;s custom criteria.</p>
            <div className={styles.actionLink}>Process Inbox <ArrowRight size={16} /></div>
          </div>

          <div className={styles.actionCard} onClick={() => router.push('/admin/students')}>
            <h4><Users size={20} color="var(--brand-green)" /> Roster Management</h4>
            <p>View active students, update their class levels, or archive suspended accounts.</p>
            <div className={styles.actionLink}>Manage Roster <ArrowRight size={16} /></div>
          </div>

          <div className={styles.actionCard} onClick={() => router.push('/admin/cohorts')}>
            <h4><BookOpen size={20} color="var(--brand-blue, #3b82f6)" /> Cohort Configuration</h4>
            <p>Create new academic cohorts or close out completed terms and generate intelligence reports.</p>
            <div className={styles.actionLink}>Manage Cohorts <ArrowRight size={16} /></div>
          </div>

        </div>

      </div>
    </div>
  );
}