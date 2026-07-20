// src/components/step4.tsx

import React, { useState } from 'react';
import { BookOpen, Plus, X, AlertCircle } from 'lucide-react';
import styles from '@/styles/step.module.css';
import { ProgramDraft } from '@/types';

interface Step4Props {
  draft: ProgramDraft;
  updateDraft: (updates: Partial<ProgramDraft>) => void;
}

export default function Step4Rubrics({ draft, updateDraft }: Step4Props) {
  // Local state for the rubric builder
  const [newLevel, setNewLevel] = useState('');
  const [newSubject, setNewSubject] = useState('');
  const [newName, setNewName] = useState('');
  const [newMaxScore, setNewMaxScore] = useState<number | ''>(100);

  // ─── DERIVED STATE (Fixes the useEffect cascading render error) ───
  // If the user hasn't picked a level, or if their selected level was deleted in Step 2,
  // we instantly fall back to the first available level in the array without needing an effect.
  const currentLevel = draft.levels.includes(newLevel) ? newLevel : (draft.levels[0] || '');

  const handleAddRubric = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentLevel || !newSubject.trim() || !newName.trim() || newMaxScore === '' || newMaxScore <= 0) return;

    const newRubric = {
      level: currentLevel,
      subject: newSubject.trim(),
      name: newName.trim(),
      maxScore: Number(newMaxScore)
    };

    updateDraft({ rubrics: [...draft.rubrics, newRubric] });
    
    // Reset inputs, keeping the level the same to speed up rapid entry
    setNewLevel(currentLevel);
    setNewSubject('');
    setNewName('');
    setNewMaxScore(100);
  };

  const handleRemoveRubric = (indexToRemove: number) => {
    updateDraft({ 
      rubrics: draft.rubrics.filter((_, index) => index !== indexToRemove) 
    });
  };

  // Group the rubrics by level for a cleaner preview interface
  const groupedRubrics = draft.rubrics.reduce((acc, rubric) => {
    if (!acc[rubric.level]) acc[rubric.level] = [];
    acc[rubric.level].push(rubric);
    return acc;
  }, {} as Record<string, typeof draft.rubrics>);

  return (
    <div className={styles.formPanel}>
      <div className={styles.header}>
        <h1>Grading Rubrics Matrix</h1>
        <p>Define the specific assignments, subjects, and maximum scores for each academic level.</p>
      </div>

      {draft.levels.length === 0 ? (
        <div style={{ padding: '2rem', background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 'var(--radius-md)', color: '#991b1b', display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <AlertCircle size={24} />
          <div>
            <strong>Missing Academic Levels</strong>
            <p style={{ margin: 0, fontSize: '0.9rem' }}>You must define at least one Class Level in Step 2 before you can assign grading rubrics.</p>
          </div>
        </div>
      ) : (
        <>
          {/* ─── ADD RUBRIC FORM ─── */}
          <div className={styles.sectionBlock}>
            <h3 className={styles.sectionTitle} style={{ color: 'var(--brand-green)' }}>
              <BookOpen size={20} /> Create New Rubric
            </h3>
            
            <form onSubmit={handleAddRubric} style={{ background: 'var(--bg-main)', border: '1px solid var(--border-medium)', padding: '1.5rem', borderRadius: 'var(--radius-lg)' }}>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className={styles.inputGroup}>
                  <label>Target Level</label>
                  <select 
                    value={currentLevel}
                    onChange={e => setNewLevel(e.target.value)}
                    style={{ padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-medium)', background: 'var(--bg-surface)' }}
                  >
                    {draft.levels.map(level => (
                      <option key={level} value={level}>{level}</option>
                    ))}
                  </select>
                </div>

                <div className={styles.inputGroup}>
                  <label>Subject Area</label>
                  <input 
                    type="text" 
                    placeholder="e.g., Mathematics, Sewing..." 
                    value={newSubject}
                    onChange={e => setNewSubject(e.target.value)}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1rem' }}>
                <div className={styles.inputGroup}>
                  <label>Assignment Name</label>
                  <input 
                    type="text" 
                    placeholder="e.g., Final Garment Construction" 
                    value={newName}
                    onChange={e => setNewName(e.target.value)}
                  />
                </div>

                <div className={styles.inputGroup}>
                  <label>Max Score</label>
                  <input 
                    type="number" 
                    min="1"
                    placeholder="100" 
                    value={newMaxScore}
                    onChange={e => setNewMaxScore(e.target.value ? Number(e.target.value) : '')}
                  />
                </div>
              </div>

              <button 
                type="submit" 
                disabled={!newSubject.trim() || !newName.trim() || !newMaxScore}
                style={{ 
                  background: 'var(--text-primary)', color: 'white', padding: '0.75rem 1.5rem', 
                  borderRadius: 'var(--radius-md)', fontWeight: 600, border: 'none', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.5rem'
                }}
              >
                <Plus size={16} /> Add Rubric
              </button>
            </form>
          </div>

          {/* ─── LIVE PREVIEW LIST BY LEVEL ─── */}
          <div className={styles.sectionBlock}>
            <h3 className={styles.sectionTitle}>Rubrics Matrix Overview</h3>
            
            {draft.rubrics.length === 0 ? (
              <p className={styles.sectionDesc}>No grading rubrics established yet.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                {Object.keys(groupedRubrics).map(level => (
                  <div key={level} style={{ border: '1px solid var(--border-light)', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
                    <div style={{ background: 'var(--bg-surface-hover)', padding: '0.75rem 1rem', borderBottom: '1px solid var(--border-light)', fontWeight: 700, color: 'var(--brand-green)' }}>
                      Level: {level}
                    </div>
                    
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      {groupedRubrics[level].map((rubric, idx) => {
                        // Find the absolute index in the parent array to ensure accurate deletion
                        const globalIndex = draft.rubrics.findIndex(r => r === rubric);
                        
                        return (
                          <div key={globalIndex} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem 1rem', borderBottom: '1px solid var(--border-light)', background: 'var(--bg-main)' }}>
                            <div>
                              <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{rubric.name}</div>
                              <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                                {rubric.subject} • Max Score: {rubric.maxScore}
                              </div>
                            </div>
                            <button 
                              type="button"
                              onClick={() => handleRemoveRubric(globalIndex)}
                              style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '0.25rem' }}
                            >
                              <X size={18} />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}