import React from 'react';
import { Building2 } from 'lucide-react';
import styles from '@/styles/step.module.css';
import { ProgramDraft } from '@/types';

interface Step1Props {
  draft: ProgramDraft;
  updateDraft: (updates: Partial<ProgramDraft>) => void;
}

export default function Step1Identity({ draft, updateDraft }: Step1Props) {
  return (
    <div className={styles.formPanel}>
      <div className={styles.header}>
        <h1>Workspace Identity</h1>
        <p>Define the core details of this new program and its inaugural cohort.</p>
      </div>

      <div className={styles.sectionBlock}>
        <h3 className={styles.sectionTitle} style={{ color: 'var(--brand-green)' }}>
          <Building2 size={20} /> Program Details
        </h3>
        
        <div className={styles.inputGroup}>
          <label>Program Name *</label>
          <input 
            type="text" 
            placeholder="e.g., Early Childhood Literacy" 
            value={draft.name}
            onChange={e => updateDraft({ name: e.target.value })}
            autoFocus
          />
        </div>

        <div className={styles.inputGroup}>
          <label>Program Description</label>
          <textarea 
            placeholder="Briefly describe the goals of this program..." 
            value={draft.description}
            onChange={e => updateDraft({ description: e.target.value })}
          />
        </div>
      </div>

      <div className={styles.sectionBlock}>
        <h3 className={styles.sectionTitle} style={{ color: 'var(--brand-blue)' }}>
          Inaugural Cohort Details
        </h3>
        <p className={styles.sectionDesc}>
          Every program requires at least one active cohort to enroll students. You can add more later.
        </p>
        
        <div className={styles.inputGroup}>
          <label>Cohort Name *</label>
          <input 
            type="text" 
            placeholder="e.g., Fall 2026 Batch" 
            value={draft.cohortName}
            onChange={e => updateDraft({ cohortName: e.target.value })}
          />
        </div>

        <div className={styles.inputGroup}>
          <label>Start Date *</label>
          <input 
            type="date" 
            value={draft.startDate}
            onChange={e => updateDraft({ startDate: e.target.value })}
          />
        </div>
      </div>
    </div>
  );
}