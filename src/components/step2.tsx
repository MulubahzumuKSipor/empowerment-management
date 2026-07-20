// src/app/components/step2.tsx

import React, { useState } from 'react';
import { Layers, ClipboardCheck, Plus, X } from 'lucide-react';
import styles from '@/styles/step.module.css';
import { ProgramDraft } from '@/types';

interface Step2Props {
  draft: ProgramDraft;
  updateDraft: (updates: Partial<ProgramDraft>) => void;
}

export default function Step2Structure({ draft, updateDraft }: Step2Props) {
  // Local state purely for the input fields before they are "added"
  const [newLevel, setNewLevel] = useState('');
  const [newStage, setNewStage] = useState('');

  // --- Handlers for Levels Array ---
  const handleAddLevel = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const formatted = newLevel.trim();
    
    if (formatted && !draft.levels.includes(formatted)) {
      updateDraft({ levels: [...draft.levels, formatted] });
    }
    setNewLevel('');
  };

  const handleRemoveLevel = (levelToRemove: string) => {
    updateDraft({ levels: draft.levels.filter(l => l !== levelToRemove) });
  };

  // --- Handlers for Assessment Stages Array ---
  const handleAddStage = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const formatted = newStage.trim();
    
    if (formatted && !draft.assessmentStages.includes(formatted)) {
      updateDraft({ assessmentStages: [...draft.assessmentStages, formatted] });
    }
    setNewStage('');
  };

  const handleRemoveStage = (stageToRemove: string) => {
    updateDraft({ assessmentStages: draft.assessmentStages.filter(s => s !== stageToRemove) });
  };

  return (
    <div className={styles.formPanel}>
      <div className={styles.header}>
        <h1>Structural Taxonomy</h1>
        <p>Establish the academic levels and evaluation periods for your cohorts.</p>
      </div>

      {/* ─── CLASS LEVELS ─── */}
      <div className={styles.sectionBlock}>
        <h3 className={styles.sectionTitle} style={{ color: 'var(--brand-green)' }}>
          <Layers size={20} /> Class Levels
        </h3>
        <p className={styles.sectionDesc}>
          Define the hierarchy of classes (e.g., Grade 1, Beginner, Level 3). You need at least one.
        </p>
        
        <div className={styles.inputGroup}>
          <label>Add a Level</label>
          <form onSubmit={handleAddLevel} className={styles.addInputWrapper}>
            <input 
              type="text" 
              placeholder="Type a level and press Enter..." 
              value={newLevel}
              onChange={e => setNewLevel(e.target.value)}
              autoFocus
            />
            <button 
              type="button" 
              className={styles.addBtn} 
              onClick={handleAddLevel}
              disabled={!newLevel.trim()}
            >
              <Plus size={16} /> Add
            </button>
          </form>

          {/* Dynamic Render of Selected Levels */}
          <div className={styles.tagList}>
            {draft.levels.map(level => (
              <span key={level} className={styles.tagItem}>
                {level}
                <button 
                  type="button" 
                  className={styles.removeBtn} 
                  onClick={() => handleRemoveLevel(level)}
                  title={`Remove ${level}`}
                >
                  <X size={14} />
                </button>
              </span>
            ))}
            {draft.levels.length === 0 && (
              <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem', fontStyle: 'italic' }}>
                No levels added yet.
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ─── ASSESSMENT STAGES ─── */}
      <div className={styles.sectionBlock}>
        <h3 className={styles.sectionTitle} style={{ color: 'var(--brand-blue)' }}>
          <ClipboardCheck size={20} /> Assessment Stages
        </h3>
        <p className={styles.sectionDesc}>
          When will students be graded? (e.g., Mid-term, Final, Monthly Review).
        </p>
        
        <div className={styles.inputGroup}>
          <label>Add an Assessment Stage</label>
          <form onSubmit={handleAddStage} className={styles.addInputWrapper}>
            <input 
              type="text" 
              placeholder="e.g., Final Examination..." 
              value={newStage}
              onChange={e => setNewStage(e.target.value)}
            />
            <button 
              type="button" 
              className={styles.addBtn} 
              onClick={handleAddStage}
              disabled={!newStage.trim()}
            >
              <Plus size={16} /> Add
            </button>
          </form>

          {/* Dynamic Render of Selected Stages */}
          <div className={styles.tagList}>
            {draft.assessmentStages.map(stage => (
              <span key={stage} className={styles.tagItem}>
                {stage}
                <button 
                  type="button" 
                  className={styles.removeBtn} 
                  onClick={() => handleRemoveStage(stage)}
                  title={`Remove ${stage}`}
                >
                  <X size={14} />
                </button>
              </span>
            ))}
            {draft.assessmentStages.length === 0 && (
              <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem', fontStyle: 'italic' }}>
                No assessment stages added yet.
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}