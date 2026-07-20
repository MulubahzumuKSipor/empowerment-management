// src/app/components/step3.tsx

import React, { useState } from 'react';
import { Target, Plus, X, Lightbulb } from 'lucide-react';
import styles from '@/styles/step.module.css';
import { ProgramDraft } from '@/types';

interface Step3Props {
  draft: ProgramDraft;
  updateDraft: (updates: Partial<ProgramDraft>) => void;
}

export default function Step3Intelligence({ draft, updateDraft }: Step3Props) {
  const [newKpi, setNewKpi] = useState('');

  const handleAddKpi = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const formatted = newKpi.trim();
    
    if (formatted && !draft.kpis.includes(formatted)) {
      updateDraft({ kpis: [...draft.kpis, formatted] });
    }
    setNewKpi('');
  };

  const handleRemoveKpi = (kpiToRemove: string) => {
    updateDraft({ kpis: draft.kpis.filter(k => k !== kpiToRemove) });
  };

  const handleSuggestionClick = (suggestion: string) => {
    if (!draft.kpis.includes(suggestion)) {
      updateDraft({ kpis: [...draft.kpis, suggestion] });
    }
  };

  // Pre-defined suggestions to speed up the UX
  const suggestions = [
    "Reading Comprehension", 
    "Digital Literacy Mastery", 
    "Exam Pass Rate", 
    "Practical Application Score"
  ];

  return (
    <div className={styles.formPanel}>
      <div className={styles.header}>
        <h1>Intelligence Tracking</h1>
        <p>Define the custom Key Performance Indicators (KPIs) you want to track for this program.</p>
      </div>

      <div className={styles.sectionBlock}>
        <h3 className={styles.sectionTitle} style={{ color: 'var(--brand-orange, #f97316)' }}>
          <Target size={20} /> Custom Metrics
        </h3>
        <p className={styles.sectionDesc}>
          What specific data points indicate student success? The system will automatically generate tracking dashboards for these metrics.
        </p>
        
        {/* Rapid Suggestion Buttons */}
        <div style={{ marginBottom: '1.5rem', display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
          <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.25rem', marginRight: '0.5rem' }}>
            <Lightbulb size={14} /> Suggestions:
          </span>
          {suggestions.map(sugg => (
            <button
              key={sugg}
              type="button"
              onClick={() => handleSuggestionClick(sugg)}
              disabled={draft.kpis.includes(sugg)}
              style={{
                fontSize: '0.8rem',
                padding: '0.25rem 0.75rem',
                borderRadius: 'var(--radius-pill)',
                border: '1px solid var(--border-medium)',
                background: draft.kpis.includes(sugg) ? 'var(--bg-surface-hover)' : 'var(--bg-main)',
                color: draft.kpis.includes(sugg) ? 'var(--text-muted)' : 'var(--text-secondary)',
                cursor: draft.kpis.includes(sugg) ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s ease'
              }}
            >
              + {sugg}
            </button>
          ))}
        </div>

        <div className={styles.inputGroup}>
          <label>Add a Custom KPI</label>
          <form onSubmit={handleAddKpi} className={styles.addInputWrapper}>
            <input 
              type="text" 
              placeholder="e.g., Lexile Reading Level..." 
              value={newKpi}
              onChange={e => setNewKpi(e.target.value)}
              autoFocus
            />
            <button 
              type="button" 
              className={styles.addBtn} 
              onClick={handleAddKpi}
              disabled={!newKpi.trim()}
            >
              <Plus size={16} /> Add
            </button>
          </form>

          {/* Dynamic Render of Selected KPIs */}
          <div className={styles.tagList}>
            {draft.kpis.map(kpi => (
              <span key={kpi} className={styles.tagItem}>
                {kpi}
                <button 
                  type="button" 
                  className={styles.removeBtn} 
                  onClick={() => handleRemoveKpi(kpi)}
                  title={`Remove ${kpi}`}
                >
                  <X size={14} />
                </button>
              </span>
            ))}
            {draft.kpis.length === 0 && (
              <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem', fontStyle: 'italic' }}>
                No custom metrics defined yet.
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}