'use client';

import React, { useEffect, useState } from 'react';
import { supabase } from '@/utils/supabase';
import styles from '@/styles/register.module.css';
import { 
  Loader2, GraduationCap, Send, User,
  HelpCircle, CheckCircle2
} from 'lucide-react';
import { ApplicationQuestion, DbProgram } from '@/types';

interface StandardFormData {
  name: string;
  email: string;
  phone_number: string;
}

export default function RegistrationPage() {
  const [program, setProgram] = useState<DbProgram | null>(null);
  const [questions, setQuestions] = useState<ApplicationQuestion[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  // Form States
  const [standardData, setStandardData] = useState<StandardFormData>({
    name: '',
    email: '',
    phone_number: ''
  });

  // Maps question ID to the user's string/boolean response
  const [customResponses, setCustomResponses] = useState<Record<string, string | boolean>>({});

  // ─── 1. FETCH ACTIVE PROGRAM ───
  useEffect(() => {
    let isMounted = true;

    async function fetchProgramDetails() {
      // Check if a specific program ID was passed in the URL (e.g., ?program=uuid)
      const urlParams = new URLSearchParams(window.location.search);
      const programIdParam = urlParams.get('program');

      let query = supabase.from('programs').select('*');

      if (programIdParam) {
        query = query.eq('id', programIdParam);
      } else {
        // Fallback: Fetch the most recently created program if no URL param is provided
        query = query.order('created_at', { ascending: false }).limit(1);
      }

      const { data, error } = await query.single();

      if (data && isMounted) {
        setProgram(data as DbProgram);

        // Parse the dynamic questions configured by the Admin in Settings
        const dynamicQuestions = (data.application_questions as unknown as ApplicationQuestion[]) || [];
        setQuestions(dynamicQuestions);

        // Initialize custom response state safely
        const initialResponses: Record<string, string | boolean> = {};
        dynamicQuestions.forEach(q => {
          initialResponses[q.id] = q.type === 'boolean' ? false : '';
        });
        setCustomResponses(initialResponses);
      }

      if (isMounted) setIsLoading(false);
    }

    fetchProgramDetails();
    return () => { isMounted = false; };
  }, []);

  // ─── 2. INPUT HANDLERS ───
  const handleStandardChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setStandardData({ ...standardData, [e.target.name]: e.target.value });
  };

  const handleCustomChange = (questionId: string, value: string | boolean) => {
    setCustomResponses(prev => ({ ...prev, [questionId]: value }));
  };

  // ─── 3. SUBMIT APPLICATION ───
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!program) return;
    setIsSubmitting(true);

    // Package the dynamic questions so the admin can easily read the "Question: Answer" pairs in the dashboard
    const structuredResponses = questions.map(q => ({
      question_id: q.id,
      question: q.label,
      answer: customResponses[q.id]
    }));

    const payload = {
      program_id: program.id,
      name: standardData.name,
      email: standardData.email,
      phone_number: standardData.phone_number,
      custom_responses: structuredResponses,
      status: 'pending' // Default status for new applications
    };

    const { error } = await supabase.from('applications').insert([payload]);

    if (error) {
      alert("There was an issue submitting your application. Please try again.");
      setIsSubmitting(false);
    } else {
      setIsSuccess(true);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // ─── RENDER HELPERS ───
  if (isLoading) {
    return (
      <div className={styles.pageWrapper} style={{ alignItems: 'center' }}>
        <Loader2 className="animate-spin" size={48} color="var(--brand-green)" />
      </div>
    );
  }

  if (!program) {
    return (
      <div className={styles.pageWrapper}>
        <div className={styles.formContainer} style={{ padding: '4rem 2rem', textAlign: 'center' }}>
          <h2>No Active Programs Found</h2>
          <p style={{ color: 'var(--text-secondary)' }}>Registration is currently closed.</p>
        </div>
      </div>
    );
  }

  if (isSuccess) {
    return (
      <div className={styles.pageWrapper}>
        <div className={styles.formContainer}>
          <div className={styles.successState}>
            <div className={styles.successIcon}>
              <CheckCircle2 size={40} />
            </div>
            <h2>Application Received!</h2>
            <p>Thank you for applying to <strong>{program.name}</strong>. Our team will review your submission and contact you shortly at {standardData.email}.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.pageWrapper}>
      <div className={styles.formContainer}>

        {/* ─── HEADER ─── */}
        <div className={styles.header}>
          <div className={styles.iconWrapper}>
            <GraduationCap size={32} />
          </div>
          <h1>{program.name}</h1>
          <p>{program.description || 'Complete the form below to submit your application for the upcoming term.'}</p>
        </div>

        {/* ─── APPLICATION FORM ─── */}
        <form onSubmit={handleSubmit} className={styles.formBody}>

          {/* Core Demographics */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <h3 className={styles.sectionTitle}><User size={18} /> Candidate Information</h3>

            <div className={styles.formGroup}>
              <label>Full Name <span className={styles.required}>*</span></label>
              <input
                type="text"
                name="name"
                required
                value={standardData.name}
                onChange={handleStandardChange}
                placeholder="First and Last Name"
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem' }}>
              <div className={styles.formGroup}>
                <label>Email Address <span className={styles.required}>*</span></label>
                <input
                  type="email"
                  name="email"
                  required
                  value={standardData.email}
                  onChange={handleStandardChange}
                  placeholder="you@example.com"
                />
              </div>

              <div className={styles.formGroup}>
                <label>Phone Number <span className={styles.required}>*</span></label>
                <input
                  type="tel"
                  name="phone_number"
                  required
                  value={standardData.phone_number}
                  onChange={handleStandardChange}
                  placeholder="e.g., +231..."
                />
              </div>
            </div>
          </div>

          {/* Dynamic Program Questions */}
          {questions.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', marginTop: '1rem' }}>
              <h3 className={styles.sectionTitle}><HelpCircle size={18} /> Questionnaire</h3>

              {questions.map((q) => (
                <div key={q.id} className={styles.formGroup}>
                  <label>
                    {q.label} {q.required && <span className={styles.required}>*</span>}
                  </label>

                  {/* Render based on Admin's configuration */}
                  {q.type === 'short_text' && (
                    <input
                      type="text"
                      required={q.required}
                      value={customResponses[q.id] as string || ''}
                      onChange={e => handleCustomChange(q.id, e.target.value)}
                      placeholder="Your answer..."
                    />
                  )}

                  {q.type === 'long_text' && (
                    <textarea
                      required={q.required}
                      value={customResponses[q.id] as string || ''}
                      onChange={e => handleCustomChange(q.id, e.target.value)}
                      placeholder="Type your detailed response here..."
                    />
                  )}

                  {q.type === 'select' && (
                    <select
                      required={q.required}
                      value={customResponses[q.id] as string || ''}
                      onChange={e => handleCustomChange(q.id, e.target.value)}
                    >
                      <option value="" disabled>Select an option...</option>
                      {(q.options || []).map((opt, idx) => (
                        <option key={idx} value={opt}>{opt}</option>
                      ))}
                    </select>
                  )}

                  {q.type === 'boolean' && (
                    <label className={styles.checkboxLabel}>
                      <input
                        type="checkbox"
                        required={q.required}
                        checked={customResponses[q.id] as boolean || false}
                        onChange={e => handleCustomChange(q.id, e.target.checked)}
                      />
                      <span>Yes, I confirm this statement.</span>
                    </label>
                  )}
                </div>
              ))}
            </div>
          )}

          <div style={{ marginTop: '1rem' }}>
            <button type="submit" disabled={isSubmitting} className={styles.submitBtn}>
              {isSubmitting ? <Loader2 size={20} className="animate-spin" /> : <Send size={20} />}
              {isSubmitting ? 'Submitting Application...' : 'Submit Application'}
            </button>
            <p style={{ textAlign: 'center', fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '1rem' }}>
              By submitting this form, you agree to the terms of {program.name}.
            </p>
          </div>

        </form>
      </div>
    </div>
  );
}