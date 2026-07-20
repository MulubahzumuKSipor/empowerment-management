// src/app/page.tsx

import Link from 'next/link';
import { ClipboardSignature, CalendarDays, ShieldCheck } from 'lucide-react';
import Image from 'next/image';
import styles from './page.module.css';

export default function LandingPage() {
  return (
    <main className={styles.container}>
      <header className={`${styles.header} animate-fade-in`}>
        <div className={styles.brandIcon}>
          <Image src="/logo.png" alt="Liberian Learning Center Logo" width={64} height={64} loading='eager' />
        </div>
        <h1>Liberian Learning Center</h1>
        <p>
          Welcome to the central portal for Empowerment Squared programs. Select your destination below to securely access the learning management system.
        </p>
      </header>

      <section className={`${styles.grid} animate-fade-in`} style={{ animationDelay: '0.1s' }}>
        {/* Portal 1: Public Registration */}
        <Link href="/register" className={styles.card}>
          <div className={styles.cardIcon}>
            <ClipboardSignature size={32} strokeWidth={1.5} />
          </div>
          <h2>Register for a Program</h2>
          <p>
            Submit a new application or complete your intake profile for upcoming cohorts and initiatives.
          </p>
        </Link>

        {/* Portal 2: Daily Attendance */}
        <Link href="/attendance" className={styles.card}>
          <div className={styles.cardIcon}>
            <CalendarDays size={32} strokeWidth={1.5} />
          </div>
          <h2>Daily Attendance</h2>
          <p>
            Quick, touch-friendly access for instructors to log real-time student attendance in the classroom.
          </p>
        </Link>

        {/* Portal 3: Admin Dashboard */}
        <Link href="/login" className={styles.card}>
          <div className={styles.cardIcon}>
            <ShieldCheck size={32} strokeWidth={1.5} />
          </div>
          <h2>Admin Dashboard</h2>
          <p>
            Secure access for authorized staff to manage workspaces, team roles, and executive intelligence.
          </p>
        </Link>
      </section>
    </main>
  );
}