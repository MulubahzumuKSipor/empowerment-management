// src/components/step5.tsx

import React, { useState } from 'react';
import { AlignLeft, Plus, X, List, CheckSquare, Type, AlignJustify } from 'lucide-react';
import styles from '@/styles/step.module.css';
import { ProgramDraft, ApplicationQuestion } from '@/types';

interface Step5Props {
  draft: ProgramDraft;
  updateDraft: (updates: Partial<ProgramDraft>) => void;
}

export default function Step5Recruitment({ draft, updateDraft }: Step5Props) {
  // Local state for the "New Question" builder form
  const [newLabel, setNewLabel] = useState('');
  const [newType, setNewType] = useState<ApplicationQuestion['type']>('short_text');
  const [newOptions, setNewOptions] = useState('');
  const [newRequired, setNewRequired] = useState(true);

  const handleAddQuestion = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLabel.trim()) return;

    // Parse comma-separated options if it's a select field
    const parsedOptions = newType === 'select' 
      ? newOptions.split(',').map(o => o.trim()).filter(o => o.length > 0)
      : undefined;

    // Edge Case Prevention: Do not allow a select field with 0 options
    if (newType === 'select' && (!parsedOptions || parsedOptions.length === 0)) {
      alert("Dropdown questions must have at least one option. Please separate them with commas.");
      return;
    }

    const question: ApplicationQuestion = {
      id: crypto.randomUUID(), // Browser-native UUID generation
      label: newLabel.trim(),
      type: newType,
      options: parsedOptions,
      required: newRequired
    };

    updateDraft({ applicationQuestions: [...(draft.applicationQuestions || []), question] });
    
    // Reset builder form for rapid data entry
    setNewLabel('');
    setNewType('short_text');
    setNewOptions('');
    setNewRequired(true);
  };

  const handleRemoveQuestion = (idToRemove: string) => {
    updateDraft({ 
      applicationQuestions: (draft.applicationQuestions || []).filter(q => q.id !== idToRemove) 
    });
  };

  // Helper to render the correct icon based on the question type
  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'short_text': return <Type size={16} />;
      case 'long_text': return <AlignJustify size={16} />;
      case 'select': return <List size={16} />;
      case 'boolean': return <CheckSquare size={16} />;
      default: return null;
    }
  };

  const questions = draft.applicationQuestions || [];

  return (
    <div className={styles.formPanel}>
      <div className={styles.header}>
        <h1>Recruitment Form Builder</h1>
        <p>Design the custom application form prospective students will fill out to join this program.</p>
      </div>

      {/* ─── BASE FIELDS (READ-ONLY WARNING) ─── */}
      <div className={styles.sectionBlock} style={{ background: 'var(--bg-surface-hover)', padding: '1.5rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-medium)' }}>
        <h3 className={styles.sectionTitle} style={{ color: 'var(--text-primary)', fontSize: '1rem' }}>
          Standard Fields (Always Included)
        </h3>
        <p className={styles.sectionDesc} style={{ marginBottom: 0 }}>
          The system automatically collects: <strong>Full Name, Phone Number, Date of Birth, Gender, and Address</strong>. You do not need to build these questions below.
        </p>
      </div>

      {/* ─── NEW QUESTION BUILDER ─── */}
      <div className={styles.sectionBlock}>
        <h3 className={styles.sectionTitle} style={{ color: 'var(--brand-green)' }}>
          <AlignLeft size={20} /> Add Custom Question
        </h3>
        
        <form onSubmit={handleAddQuestion} style={{ background: 'var(--bg-main)', border: '1px solid var(--border-medium)', padding: '1.5rem', borderRadius: 'var(--radius-lg)' }}>
          <div className={styles.inputGroup}>
            <label>Question Prompt</label>
            <input 
              type="text" 
              placeholder="e.g., Why do you want to join this program?" 
              value={newLabel}
              onChange={e => setNewLabel(e.target.value)}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className={styles.inputGroup}>
              <label>Answer Type</label>
              <select 
                value={newType} 
                onChange={e => setNewType(e.target.value as ApplicationQuestion['type'])}
                style={{ padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-medium)', background: 'var(--bg-surface)', cursor: 'pointer' }}
              >
                <option value="short_text">Short Text (One line)</option>
                <option value="long_text">Paragraph (Multiple lines)</option>
                <option value="select">Dropdown Selection</option>
                <option value="boolean">Yes / No Checkbox</option>
              </select>
            </div>

            <div className={styles.inputGroup} style={{ justifyContent: 'center', paddingTop: '1.5rem' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                <input 
                  type="checkbox" 
                  checked={newRequired}
                  onChange={e => setNewRequired(e.target.checked)}
                  style={{ width: 'auto', cursor: 'pointer' }}
                />
                Make this question required
              </label>
            </div>
          </div>

          {newType === 'select' && (
            <div className={styles.inputGroup} style={{ animation: 'slideUp 0.2s ease' }}>
              <label>Dropdown Options (Comma separated)</label>
              <input 
                type="text" 
                placeholder="e.g., Morning, Afternoon, Evening" 
                value={newOptions}
                onChange={e => setNewOptions(e.target.value)}
              />
            </div>
          )}

          <button 
            type="submit" 
            disabled={!newLabel.trim()}
            style={{ 
              background: 'var(--text-primary)', color: 'white', padding: '0.75rem 1.5rem', 
              borderRadius: 'var(--radius-md)', fontWeight: 600, border: 'none', cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '1rem',
              opacity: !newLabel.trim() ? 0.5 : 1
            }}
          >
            <Plus size={16} /> Add Question
          </button>
        </form>
      </div>

      {/* ─── LIVE PREVIEW LIST ─── */}
      <div className={styles.sectionBlock}>
        <h3 className={styles.sectionTitle}>Current Form Schema ({questions.length})</h3>
        
        {questions.length === 0 ? (
          <p className={styles.sectionDesc}>No custom questions added yet.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {questions.map((q, index) => (
              <div key={q.id} style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', background: 'var(--bg-main)', border: '1px solid var(--border-light)', padding: '1rem', borderRadius: 'var(--radius-md)' }}>
                <div>
                  <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.25rem' }}>
                    {index + 1}. {q.label} {q.required && <span style={{ color: '#ef4444' }}>*</span>}
                  </div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    {getTypeIcon(q.type)}
                    <span style={{ textTransform: 'capitalize' }}>{q.type.replace('_', ' ')}</span>
                    {q.type === 'select' && q.options && (
                      <span style={{ color: 'var(--text-muted)' }}>— Options: {q.options.join(', ')}</span>
                    )}
                  </div>
                </div>
                <button 
                  type="button"
                  onClick={() => handleRemoveQuestion(q.id)}
                  style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '0.25rem' }}
                  title="Remove Question"
                >
                  <X size={18} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}