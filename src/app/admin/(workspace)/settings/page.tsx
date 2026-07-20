'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/utils/supabase';
import { getActiveProgramId } from '@/action/admin';
import styles from '@/styles/settings.module.css';
import {
  Loader2, Save, Plus, Trash2, Settings, ListTree,
  Target, FileQuestion
} from 'lucide-react';

// ─── INTERFACES ───

// Strictly matching the register page schema constraints
interface RegistrationField {
  id: string;
  label: string;
  type: 'text' | 'boolean' | 'number';
}

// Custom UI Form State (Completely replaces the old Pick<DbProgram> type)
interface ProgramSettingsForm {
  name: string;
  description: string;
  levels: string[];
  assessment_stages: string[];
  registration_schema: RegistrationField[];
}

const EMPTY_FORM: ProgramSettingsForm = {
  name: '',
  description: '',
  levels: ['Beginner', 'Intermediate', 'Advanced'],
  assessment_stages: ['Pre-Assessment', 'Mid-Term Evaluation', 'Final Assessment'],
  registration_schema: []
};

// Helper to generate a unique ID for new questions
const generateId = () => Math.random().toString(36).substring(2, 11);

export default function ProgramSettingsPage() {
  const router = useRouter();

  const [programId, setProgramId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState<ProgramSettingsForm>(EMPTY_FORM);

  // ─── 1. LOAD PROGRAM DATA ───
  useEffect(() => {
    let isMounted = true;

    async function loadSettings() {
      const pid = await getActiveProgramId();
      if (!pid) return router.replace('/programs');

      if (isMounted) setProgramId(pid);

      const { data, error } = await supabase
        .from('programs')
        .select('*')
        .eq('id', pid)
        .single();

      if (data && isMounted) {
        // Map any nulls from the database to empty strings/arrays for the React UI
        setFormData({
          name: data.name || '',
          description: data.description || '',
          levels: data.levels || [],
          assessment_stages: data.assessment_stages || [],
          registration_schema: (data.registration_schema as unknown as RegistrationField[]) || []
        });
      }

      if (isMounted) setIsLoading(false);
    }

    loadSettings();
    return () => { isMounted = false; };
  }, [router]);

  // ─── 2. SIMPLE ARRAY HANDLERS (Levels & Assessment Stages) ───
  const handleSimpleArrayChange = (field: 'levels' | 'assessment_stages', index: number, value: string) => {
    const next = [...(formData[field] || [])];
    next[index] = value;
    setFormData({ ...formData, [field]: next });
  };

  const addSimpleArrayItem = (field: 'levels' | 'assessment_stages') => {
    setFormData({ ...formData, [field]: [...(formData[field] || []), ''] });
  };

  const removeSimpleArrayItem = (field: 'levels' | 'assessment_stages', index: number) => {
    const next = [...(formData[field] || [])];
    next.splice(index, 1);
    setFormData({ ...formData, [field]: next });
  };

  // ─── 3. REGISTRATION SCHEMA HANDLERS ───
  const addQuestion = () => {
    const newQuestion: RegistrationField = {
      id: generateId(),
      label: '',
      type: 'text'
    };
    setFormData(prev => ({
      ...prev,
      registration_schema: [...prev.registration_schema, newQuestion]
    }));
  };

  const updateQuestion = (index: number, updates: Partial<RegistrationField>) => {
    const nextQuestions = [...formData.registration_schema];
    nextQuestions[index] = { ...nextQuestions[index], ...updates };
    setFormData({ ...formData, registration_schema: nextQuestions });
  };

  const removeQuestion = (index: number) => {
    const nextQuestions = [...formData.registration_schema];
    nextQuestions.splice(index, 1);
    setFormData({ ...formData, registration_schema: nextQuestions });
  };

  // ─── 4. SAVE HANDLER ───
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!programId) return;
    setIsSaving(true);

    // Clean up empty array inputs before saving to DB
    const payload = {
      name: formData.name.trim(),
      description: formData.description.trim(),
      levels: (formData.levels || []).filter(v => v.trim() !== ''),
      assessment_stages: (formData.assessment_stages || []).filter(v => v.trim() !== ''),
      registration_schema: formData.registration_schema.filter(q => q.label.trim() !== '')
    };

    const { error } = await supabase
      .from('programs')
      .update(payload)
      .eq('id', programId);

    if (error) {
      alert(`Error saving settings: ${error.message}`);
    } else {
      setFormData(payload);
      alert("Program Settings updated successfully.");
    }

    setIsSaving(false);
  };

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
        <h1>Program Settings</h1>
        <p>Configure the dimensions, academic structures, and registration requirements for {formData.name || 'this program'}.</p>
      </header>

      <form onSubmit={handleSave}>

        {/* ─── SECTION 1: CORE DETAILS ─── */}
        <div className={styles.sectionCard}>
          <div className={styles.sectionHeader}>
            <Settings size={20} color="var(--brand-green)" />
            <h3>General Information</h3>
          </div>

          <div className={styles.formGroup}>
            <label>Program Name</label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={e => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g., The Digital Empowerment Initiative"
            />
          </div>

          <div className={styles.formGroup}>
            <label>Public Description</label>
            <textarea
              value={formData.description}
              onChange={e => setFormData({ ...formData, description: e.target.value })}
              placeholder="Briefly describe the goals of this program. This will be shown on the registration page..."
            />
          </div>
        </div>

        {/* ─── SECTION 2: ACADEMIC DIMENSIONS ─── */}
        <div className={styles.sectionCard}>
          <div className={styles.sectionHeader}>
            <ListTree size={20} color="var(--brand-green)" />
            <h3>Academic Structure</h3>
          </div>
          <p className={styles.hint} style={{ marginBottom: '1.5rem' }}>
            Define the class levels used to categorize students. These levels dictate which grading rubrics are applied to which students in the Gradebook.
          </p>

          <div className={styles.arrayField}>
            {(formData.levels || []).map((level, idx) => (
              <div key={idx} className={styles.arrayRow}>
                <input
                  type="text"
                  value={level}
                  onChange={e => handleSimpleArrayChange('levels', idx, e.target.value)}
                  placeholder="e.g., Beginner Track"
                  required
                />
                <button type="button" onClick={() => removeSimpleArrayItem('levels', idx)} className={styles.btnIcon}>
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
            <button type="button" onClick={() => addSimpleArrayItem('levels')} className={styles.btn}>
              <Plus size={16} /> Add Class Level
            </button>
          </div>
        </div>

        {/* ─── SECTION 3: ASSESSMENT STAGES ─── */}
        <div className={styles.sectionCard}>
          <div className={styles.sectionHeader}>
            <Target size={20} color="var(--brand-green)" />
            <h3>Assessment Stages</h3>
          </div>
          <p className={styles.hint} style={{ marginBottom: '1.5rem' }}>
            Define the testing intervals for this program (e.g., Pre-Assessment, Final Evaluation).
          </p>

          <div className={styles.arrayField}>
            {(formData.assessment_stages || []).map((stage, idx) => (
              <div key={idx} className={styles.arrayRow}>
                <input
                  type="text"
                  value={stage}
                  onChange={e => handleSimpleArrayChange('assessment_stages', idx, e.target.value)}
                  placeholder="e.g., Mid-Term Evaluation"
                  required
                />
                <button type="button" onClick={() => removeSimpleArrayItem('assessment_stages', idx)} className={styles.btnIcon}>
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
            <button type="button" onClick={() => addSimpleArrayItem('assessment_stages')} className={styles.btn}>
              <Plus size={16} /> Add Assessment Stage
            </button>
          </div>
        </div>

        {/* ─── SECTION 4: REGISTRATION FORM BUILDER ─── */}
        <div className={styles.sectionCard}>
          <div className={styles.sectionHeader}>
            <FileQuestion size={20} color="var(--brand-green)" />
            <h3>Registration Form Builder</h3>
          </div>
          <p className={styles.hint} style={{ marginBottom: '1.5rem' }}>
            Configure the custom questions prospective students must answer when applying to this program. Name, Email, Phone, DOB, Gender, and Education are collected automatically.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {formData.registration_schema.map((q, qIndex) => (
              <div key={q.id} className={styles.questionCard}>

                <div className={styles.questionHeader}>
                  <div className={styles.formGroup} style={{ flex: 1, marginBottom: 0 }}>
                    <input
                      type="text"
                      value={q.label}
                      onChange={e => updateQuestion(qIndex, { label: e.target.value })}
                      placeholder="e.g., Do you have access to a laptop?"
                      style={{ fontSize: '1rem', fontWeight: 600, border: 'none', borderBottom: '2px solid var(--border-medium)', borderRadius: 0, padding: '0.5rem 0', background: 'transparent' }}
                      required
                    />
                  </div>
                  <button type="button" onClick={() => removeQuestion(qIndex)} className={styles.btnIcon}>
                    <Trash2 size={16} />
                  </button>
                </div>

                <div className={styles.formGroup} style={{ marginBottom: 0, maxWidth: '300px' }}>
                  <select
                    value={q.type}
                    onChange={e => updateQuestion(qIndex, { type: e.target.value as RegistrationField['type'] })}
                  >
                    <option value="text">Text Response</option>
                    <option value="number">Numeric Response</option>
                    <option value="boolean">Yes / No Checkbox</option>
                  </select>
                </div>
              </div>
            ))}
          </div>

          <button type="button" onClick={addQuestion} className={styles.btn} style={{ marginTop: '1.5rem', width: '100%', padding: '1rem', borderStyle: 'solid', background: 'var(--bg-main)' }}>
            <Plus size={18} /> Add Custom Question
          </button>
        </div>

        {/* ─── STICKY SAVE FOOTER ─── */}
        <div className={styles.stickyFooter}>
          <button type="submit" disabled={isSaving} className={styles.saveBtn}>
            {isSaving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
            {isSaving ? 'Saving Configurations...' : 'Save Program Settings'}
          </button>
        </div>

      </form>
    </div>
  );
}