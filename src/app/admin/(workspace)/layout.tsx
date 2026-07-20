'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { supabase } from '@/utils/supabase';
import styles from '@/styles/layout.module.css';
import {
  Users, Layers, LogOut, Home, Building2,
  Settings, GraduationCap, ClipboardList, BookOpen, Inbox,
  Shield, Calendar
} from 'lucide-react';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();

  const [userRole, setUserRole] = useState<string>('');
  const [drawerOpen, setDrawerOpen] = useState(false);

  // ─── Fetch Role for Access Control ───
  useEffect(() => {
    let isMounted = true;

    async function fetchRole() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user && isMounted) {
        const { data } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single();

        if (data) setUserRole(data.role);
      }
    }

    fetchRole();

    return () => { isMounted = false; };
  }, []);

  // ─── Drawer Management ───
  // Auto-close drawer when navigating to a new route on mobile
  useEffect(() => {
    setDrawerOpen(false);
  }, [pathname]);


  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') setDrawerOpen(false);
  }, []);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  // Lock body scroll when mobile drawer is open to prevent background scrolling
  useEffect(() => {
    if (typeof window !== 'undefined') {
      document.body.style.overflow = drawerOpen ? 'hidden' : '';
    }
    return () => {
      if (typeof window !== 'undefined') document.body.style.overflow = '';
    };
  }, [drawerOpen]);

  // ─── Handlers ───
  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/');
  };

  const canEdit = userRole === 'super_admin' || userRole === 'admin';

  // Helper to determine if a nav link is currently active
  const isActive = (href: string, exact = false) =>
    exact ? pathname === href : pathname.startsWith(href);

  return (
    <div className={styles.appContainer}>

      {/* ─── MOBILE TOP BAR ─── */}
      <div className={styles.mobileTopBar}>
        <Link href="/admin" className={styles.mobileTopBarBrand}>
          <Building2 size={24} color="var(--brand-green)" />
          <span>Liberian Learning Center</span>
        </Link>

        <button
          className={`${styles.hamburger} ${drawerOpen ? styles.hamburgerOpen : ''}`}
          onClick={() => setDrawerOpen(prev => !prev)}
          aria-label={drawerOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={drawerOpen}
        >
          <span className={styles.hamburgerLine} />
          <span className={styles.hamburgerLine} />
          <span className={styles.hamburgerLine} />
        </button>
      </div>

      {/* ─── MOBILE OVERLAY ─── */}
      <div
        className={`${styles.mobileOverlay} ${drawerOpen ? styles.mobileOverlayVisible : ''}`}
        onClick={() => setDrawerOpen(false)}
        aria-hidden="true"
      />

      {/* ─── SIDEBAR ─── */}
      <aside
        className={`${styles.sidebar} ${drawerOpen ? styles.sidebarOpen : ''}`}
        aria-label="Main navigation"
      >
        <Link href="/admin" className={styles.brandLink}>
          <div className={styles.brand}>
            <Image src="/logo.png" alt="LLC Workspace" width={32} height={32} />
            <span>LLC Workspace</span>
          </div>
        </Link>

        <nav className={styles.navSection} style={{ flex: 1 }}>
          <div className={styles.navLabel}>Overview</div>

          <Link
            href="/admin"
            className={`${styles.navLink} ${isActive('/admin', true) ? styles.navActive : ''}`}
          >
            <Home size={18} /> Command Center
          </Link>

          <Link
            href="/admin/applications"
            className={`${styles.navLink} ${isActive('/admin/applications') ? styles.navActive : ''}`}
          >
            <Inbox size={18} /> Applications
          </Link>

          <Link
            href="/admin/students"
            className={`${styles.navLink} ${isActive('/admin/students') ? styles.navActive : ''}`}
          >
            <Users size={18} /> Student Roster
          </Link>

          <Link
            href="/admin/grading"
            className={`${styles.navLink} ${isActive('/admin/grading') ? styles.navActive : ''}`}
          >
            <ClipboardList size={18} /> Grading Matrix
          </Link>

          <Link
            href="/admin/reports"
            className={`${styles.navLink} ${isActive('/admin/reports') ? styles.navActive : ''}`}
          >
            <Layers size={18} /> Impact Reports
          </Link>

          {canEdit && (
            <>
              <div className={styles.navLabel} style={{ marginTop: '1.5rem' }}>
                System Config
              </div>

              <Link
                href="/admin/cohorts"
                className={`${styles.navLink} ${isActive('/admin/cohorts') ? styles.navActive : ''}`}
              >
                <Calendar size={18} /> Cohort Management
              </Link>

              <Link
                href="/admin/team"
                className={`${styles.navLink} ${isActive('/admin/team') ? styles.navActive : ''}`}
              >
                <Shield size={18} /> Team Management
              </Link>

              <Link
                href="/admin/settings"
                className={`${styles.navLink} ${isActive('/admin/settings') ? styles.navActive : ''}`}
              >
                <Settings size={18} /> Program Settings
              </Link>
            </>
          )}
        </nav>

        {/* ─── FOOTER ACTIONS ─── */}
        <div className={styles.navFooter}>
          <Link href="/admin/programs" className={styles.navLink} style={{ marginBottom: '0.25rem' }}>
            <BookOpen size={18} /> Switch Program
          </Link>

          <button onClick={handleLogout} className={styles.navLink}>
            <LogOut size={18} /> Secure Sign Out
          </button>
        </div>
      </aside>

      {/* ─── MAIN CONTENT ─── */}
      <main className={styles.mainContent}>
        {children}
      </main>

    </div>
  );
}