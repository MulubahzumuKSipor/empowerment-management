'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/utils/supabase';
import { setProgramContext, deleteProgram } from '@/action/admin';
import styles from '@/styles/programs.module.css';
import { LayoutGrid, Plus, ArrowRight, Loader2, Trash2, Building2 } from 'lucide-react';
import Image from 'next/image';

// ─── Strict Type Definitions ───────────────────────────────────────────────
interface Program {
  id: string;
  name: string;
  description: string;
  created_at?: string;
}

// Defines the exact shape of the relational join to avoid `any`
type AssignmentRow = {
  program_id: string;
  programs: Program | Program[] | null;
};

export default function ProgramSelectionPage() {
  const router = useRouter();
  const [programs, setPrograms] = useState<Program[]>([]);
  const [userRole, setUserRole] = useState('');
  const [userId, setUserId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // ─── Data Initialization ──────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;

    const fetchInitialData = async () => {
      setIsLoading(true);

      const { data: { user } } = await supabase.auth.getUser();

      if (!cancelled && user) {
        setUserId(user.id);

        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single();

        const role = profile?.role || '';
        setUserRole(role);

        let fetchedPrograms: Program[] = [];

        if (role === 'super_admin' || role === 'auditor') {
          // Admins see everything
          const { data } = await supabase
            .from('programs')
            .select('id, name, description, created_at')
            .order('created_at', { ascending: true });

          if (data) fetchedPrograms = data as Program[];
        } else {
          // Standard Staff only see explicitly assigned workspaces
          const { data } = await supabase
            .from('program_assignments')
            .select(`
              program_id,
              programs ( id, name, description, created_at )
            `)
            .eq('user_id', user.id);

          if (data) {
            const rows = data as unknown as AssignmentRow[];
            
            fetchedPrograms = rows
              .map((row) => Array.isArray(row.programs) ? row.programs[0] : row.programs)
              .filter((p): p is Program => p !== null && p !== undefined);

            // Sort by creation date
            fetchedPrograms.sort((a, b) => {
              const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
              const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
              return dateA - dateB;
            });
          }
        }

        if (!cancelled) {
          setPrograms(fetchedPrograms);
          setIsLoading(false);
        }
      }
    };

    fetchInitialData();

    return () => {
      cancelled = true;
    };
  }, []);

  // ─── Mutations & Routing ──────────────────────────────────────────────────
  const refreshPrograms = async () => {
    if (userRole === 'super_admin' || userRole === 'auditor') {
      const { data } = await supabase
        .from('programs')
        .select('id, name, description, created_at')
        .order('created_at', { ascending: true });
      if (data) setPrograms(data as Program[]);
    } else if (userId) {
      const { data } = await supabase
        .from('program_assignments')
        .select('program_id, programs(id, name, description, created_at)')
        .eq('user_id', userId);

      if (data) {
        const rows = data as unknown as AssignmentRow[];
        const mapped = rows
          .map((row) => Array.isArray(row.programs) ? row.programs[0] : row.programs)
          .filter((p): p is Program => p !== null && p !== undefined);
          
        setPrograms(mapped);
      }
    }
  };

  const handleSelectProgram = async (programId: string) => {
    setIsLoading(true); 
    await setProgramContext(programId);

    // Dynamic routing based on RBAC
    if (userRole === 'admin') {
      router.push('/dashboard');
    } else {
      router.push('/admin');
    }
  };

  const handleDeleteProgram = async (e: React.MouseEvent, programId: string, programName: string) => {
    e.stopPropagation(); // Prevents the card click event from routing the user

    const isConfirmed = window.confirm(
      `WARNING: Are you absolutely sure you want to delete the "${programName}" Workspace? \n\nThis will permanently destroy all cohorts, students, and attendance logs associated with this program. This action cannot be reversed.`
    );

    if (isConfirmed) {
      setIsLoading(true);
      const result = await deleteProgram(programId);
      if (result.success) {
        await refreshPrograms();
      } else {
        alert(result.error);
      }
      setIsLoading(false);
    }
  };

  // ─── Render States ────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.spinnerWrapper}>
          <Loader2 size={48} strokeWidth={2} />
        </div>
        <h2 className={styles.loadingTitle}>Initializing Workspace</h2>
        <p className={styles.loadingSubtitle}>Securing your organization data...</p>
      </div>
    );
  }

  return (
    <div className={styles.pageWrapper}>
      <header className={styles.header}>
        <div className={styles.brand}>
          {/* Fallback to Lucide icon if the logo.png is missing from public folder */}
          <Building2 size={24} color="var(--brand-green)" />
          <span>Empowerment Workspace</span>
        </div>
      </header>

      <main className={styles.mainContent}>
        <div className={styles.contentHeader}>
          <div>
            <h1 className={styles.title}>Select a Workspace</h1>
            <p className={styles.subtitle}>
              Choose a program to manage cohorts, student rosters, and intelligence tracking.
            </p>
          </div>

          {userRole === 'super_admin' && (
            <button onClick={() => router.push('/admin/programs/builder')} className={styles.createBtn} type="button">
              <Plus size={18} /> New Workspace
            </button>
          )}
        </div>

        <div className={styles.grid}>
          {programs.map((program) => (
            <div
              key={program.id}
              className={styles.programCard}
              onClick={() => handleSelectProgram(program.id)}
            >
              {userRole === 'super_admin' && (
                <button
                  onClick={(e) => handleDeleteProgram(e, program.id, program.name)}
                  className={styles.deleteProgramBtn}
                  title="Delete Workspace"
                  type="button"
                >
                  <Trash2 size={18} />
                </button>
              )}

              <div className={styles.cardIcon}>
                <LayoutGrid size={24} />
              </div>
              
              <h3 className={styles.cardTitle}>{program.name}</h3>
              <p className={styles.cardDesc}>
                {program.description || 'No description provided for this workspace.'}
              </p>

              <div className={styles.cardFooter}>
                <span>Enter Workspace</span>
                <ArrowRight size={16} />
              </div>
            </div>
          ))}

          {programs.length === 0 && (
            <div className={styles.emptyState}>
              No workspaces assigned to your account. Please contact a system administrator.
            </div>
          )}
        </div>
      </main>
    </div>
  );
}