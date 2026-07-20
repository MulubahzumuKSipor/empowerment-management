'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/utils/supabase';
import { getActiveProgramId, saveCohortReport } from '@/action/admin';
import styles from '@/styles/editReport.module.css';
import { 
  FileText, Save, Plus, Trash2, LayoutList,
  BookOpen, CheckSquare, Info, Target, Users, MessageSquare, ArrowLeft
} from 'lucide-react';
import { DbProgram, DbCohort, DbRubric } from '@/types';

const getSeason = (dateString: string) => {
  const month = new Date(dateString).getMonth() + 1;
  if (month >= 3 && month <= 5) return 'Spring';
  if (month >= 6 && month <= 8) return 'Summer';
  if (month >= 9 && month <= 11) return 'Fall';
  return 'Winter';
};

const getSessionProjections = (start: string, end?: string) => {
  const startDate = new Date(start);
  const endDate = end
    ? new Date(end)
    : new Date(startDate.getTime() + 90 * 24 * 60 * 60 * 1000);
  const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
  const diffWeeks = Math.ceil(diffTime / (1000 * 60 * 60 * 24 * 7));
  return { weeks: diffWeeks, beg: diffWeeks * 3, int: diffWeeks * 2 };
};

// ─── CUSTOM FRONTEND FORM STATE ───
// This bridges the gap between your desired UI and the strict DB Schema
interface ReportFormState {
  program_overview: string;
  outcomes_reached: string;
  average_attendance_rate: number;
  total_applicants: number;
  volunteer_capacity: number;
  volunteer_enrollment: number;
  challenges_encountered: string;
  partners_support: string;
  mission_moment: string;
  participant_testimonials: string[];
  volunteer_testimonials: string[];
  // These fields are serialized into JSON in the DB
  custom_metrics: Record<string, number>;
  rubrics_missed: string[];
  rubrics_taught: string[];
  top_languages: string[];
  top_cultural_identities: string[];
}

const EMPTY_FORM: ReportFormState = {
  program_overview: '',
  outcomes_reached: '',
  average_attendance_rate: 0,
  total_applicants: 0,
  volunteer_capacity: 0,
  volunteer_enrollment: 0,
  challenges_encountered: '',
  partners_support: '',
  mission_moment: '',
  participant_testimonials: [''],
  volunteer_testimonials: [''],
  custom_metrics: {},
  rubrics_missed: [],
  rubrics_taught: [],
  top_languages: ['English'],
  top_cultural_identities: [''],
};

export default function ReportBuilderPage() {
  const router = useRouter();

  // ─── Dynamic Context State ───
  const [program, setProgram] = useState<DbProgram | null>(null);
  const [cohorts, setCohorts] = useState<DbCohort[]>([]);
  const [rubrics, setRubrics] = useState<DbRubric[]>([]);
  const [isContextLoading, setIsContextLoading] = useState(true);

  // ─── Form State ───
  // Reads URL synchronously on mount to avoid the useEffect cascading render error
  const [selectedCohortId, setSelectedCohortId] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return new URLSearchParams(window.location.search).get('cohort') || '';
    }
    return '';
  });

  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState<ReportFormState>(EMPTY_FORM);

  // ─── 1. Fetch Multi-Tenant Context ───
  useEffect(() => {
    async function loadWorkspaceContext() {
      setIsContextLoading(true);
      const programId = await getActiveProgramId();
      if (!programId) return;

      const [
        { data: progData },
        { data: cohortData },
        { data: rubricData }
      ] = await Promise.all([
        supabase.from('programs').select('*').eq('id', programId).single(),
        supabase.from('cohorts').select('*').eq('program_id', programId).order('start_date', { ascending: false }),
        supabase.from('rubrics').select('*').eq('program_id', programId)
      ]);

      if (progData) setProgram(progData);
      if (cohortData) setCohorts(cohortData);
      if (rubricData) setRubrics(rubricData);
      setIsContextLoading(false);
    }
    loadWorkspaceContext();
  }, []);

  // ─── 2. Fetch Report when Cohort changes ───
  useEffect(() => {
    async function loadReport() {
      if (!selectedCohortId) return;
      setIsLoading(true);

      const { data } = await supabase
        .from('cohort_reports')
        .select('*')
        .eq('cohort_id', selectedCohortId)
        .maybeSingle();

      if (data) {
        // Extract the hidden UI arrays from the custom_metrics JSON block safely
        const storedMetrics = (data.custom_metrics as Record<string, any>) || {};

        setFormData({
          program_overview: data.program_overview || '',
          outcomes_reached: data.outcomes_reached || '',
          average_attendance_rate: data.average_attendance_rate || 0,
          total_applicants: data.total_applicants || 0,
          volunteer_capacity: data.volunteer_capacity || 0,
          volunteer_enrollment: data.volunteer_enrollment || 0,
          challenges_encountered: data.challenges_encountered || '',
          partners_support: data.partners_support || '',
          mission_moment: data.mission_moment || '',
          participant_testimonials: data.participant_testimonials || [''],
          volunteer_testimonials: data.volunteer_testimonials || [''],
          rubrics_missed: (data.rubrics_missed as string[]) || [],

          // Extracted JSON properties
          custom_metrics: storedMetrics,
          rubrics_taught: storedMetrics.rubrics_taught || [],
          top_languages: storedMetrics.top_languages?.length ? storedMetrics.top_languages : ['English'],
          top_cultural_identities: storedMetrics.top_cultural_identities?.length ? storedMetrics.top_cultural_identities : [''],
        });
      } else {
        setFormData(EMPTY_FORM);
      }

      setIsLoading(false);
    }
    loadReport();
  }, [selectedCohortId]);

  // ─── Derived auto-data ───
  const activeCohortData = useMemo(
    () => cohorts.find(c => c.id === selectedCohortId),
    [cohorts, selectedCohortId]
  );

  const autoData = useMemo(() => {
    if (!activeCohortData?.start_date) return null;
    return {
      season: getSeason(activeCohortData.start_date),
      sessions: getSessionProjections(activeCohortData.start_date, activeCohortData.end_date || undefined),
      year: new Date(activeCohortData.start_date).getFullYear(),
    };
  }, [activeCohortData]);

  // ─── Array Handlers ───
  const handleArrayChange = (field: keyof ReportFormState, index: number, value: string) => {
    const next = [...(formData[field] as string[])];
    next[index] = value;
    setFormData({ ...formData, [field]: next });
  };

  const addArrayItem = (field: keyof ReportFormState) =>
    setFormData({ ...formData, [field]: [...((formData[field] as string[]) || []), ''] });

  const removeArrayItem = (field: keyof ReportFormState, index: number) =>
    setFormData({
      ...formData,
      [field]: (formData[field] as string[]).filter((_, i) => i !== index),
    });

  const toggleRubric = (rubricName: string, status: 'taught' | 'missed') => {
    const taught = formData.rubrics_taught.filter(r => r !== rubricName);
    const missed = formData.rubrics_missed.filter(r => r !== rubricName);

    if (status === 'taught') taught.push(rubricName);
    if (status === 'missed') missed.push(rubricName);

    setFormData({ ...formData, rubrics_taught: taught, rubrics_missed: missed });
  };

  const handleCustomMetricChange = (metricName: string, value: number) => {
    setFormData(prev => ({
      ...prev,
      custom_metrics: {
        ...prev.custom_metrics,
        [metricName]: value
      }
    }));
  };

  // ─── Save ───
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCohortId) return alert('Please select a cohort first.');
    setIsSaving(true);

    // Pack the UI-only arrays into the JSON custom_metrics payload
    const packedCustomMetrics = {
      ...formData.custom_metrics,
      rubrics_taught: formData.rubrics_taught,
      top_languages: formData.top_languages.filter(i => i.trim()),
      top_cultural_identities: formData.top_cultural_identities.filter(i => i.trim()),
    };

    // Construct exactly what the Supabase schema expects
    const payload = {
      program_overview: formData.program_overview,
      outcomes_reached: formData.outcomes_reached,
      average_attendance_rate: formData.average_attendance_rate,
      total_applicants: formData.total_applicants,
      volunteer_capacity: formData.volunteer_capacity,
      volunteer_enrollment: formData.volunteer_enrollment,
      challenges_encountered: formData.challenges_encountered,
      partners_support: formData.partners_support,
      mission_moment: formData.mission_moment,
      participant_testimonials: formData.participant_testimonials.filter(i => i.trim()),
      volunteer_testimonials: formData.volunteer_testimonials.filter(i => i.trim()),
      rubrics_missed: formData.rubrics_missed, // Typecasted dynamically for JSON
      custom_metrics: packedCustomMetrics,     // Typecasted dynamically for JSON
    };

    const result = await saveCohortReport(selectedCohortId, payload);
    alert(result.success
      ? 'Report saved successfully! Ready for PDF Export.'
      : `Error saving report: ${result.error}`
    );
    setIsSaving(false);
  };

  // ─── Guards ───
  if (isContextLoading) return <div className={styles.loadingState}>Loading Program Context...</div>;
  if (!program) return <div className={styles.loadingState}>No active program found. Please return to the Hub.</div>;

  return (
    <div className={styles.container}>

      <button onClick={() => router.push('/admin/reports')} className={styles.backBtn} type="button">
        <ArrowLeft size={16} /> Back to Reports Dashboard
      </button>

      {/* ─── PAGE HEADER ─── */}
      <div className={styles.headerCard}>
        <div className={styles.titleGroup}>
          <div className={styles.iconWrapper}>
            <FileText size={24} />
          </div>
          <div>
            <h2 className={styles.title}>Official Term Report Builder</h2>
            <p className={styles.subtitle}>
              Data entered here will generate the final PDF program report for <strong>{program.name}</strong>.
            </p>
          </div>
        </div>
      </div>

      {/* ─── COHORT SELECTOR ─── */}
      <div className={styles.selectorBlock}>
        <div className={styles.inputGroup}>
          <label className={styles.label}>Select Cohort to Report On</label>
          <select
            value={selectedCohortId}
            onChange={e => setSelectedCohortId(e.target.value)}
            className={styles.input}
            style={{ maxWidth: '400px' }}
          >
            <option value="" disabled>— Select a Cohort —</option>
            {cohorts.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* ─── MAIN FORM ─── */}
      {isLoading ? (
        <div className={styles.loadingState}>Loading report data...</div>
      ) : selectedCohortId && activeCohortData && autoData ? (
        <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '2rem', marginTop: '2rem' }}>

          {/* 0. SYSTEM-GENERATED BANNER */}
          <div className={styles.autoBanner}>
            <div className={styles.autoBannerLabel}>
              <Info size={14} /> System Generated Data
            </div>
            <div className={styles.autoBannerItem}>
              <p className={styles.autoBannerItemLabel}>Program Title</p>
              <div className={styles.autoBannerItemValue}>{program.name}</div>
            </div>
            <div className={styles.autoBannerItem}>
              <p className={styles.autoBannerItemLabel}>Timeline</p>
              <div className={styles.autoBannerItemValue}>{autoData.season} {autoData.year}</div>
            </div>
            <div className={styles.autoBannerItem}>
              <p className={styles.autoBannerItemLabel}>Est. Duration</p>
              <div className={styles.autoBannerItemValue}>{autoData.sessions.weeks} Weeks</div>
            </div>
          </div>

          {/* 1. EXECUTIVE OVERVIEW */}
          <div className={styles.sectionCard}>
            <div className={styles.sectionHeader}>
              <BookOpen size={18} color="var(--teal-green)" />
              <h3 className={styles.sectionTitle}>Executive Overview</h3>
            </div>
            <div className={styles.gridStack}>
              <div className={styles.inputGroup}>
                <label className={styles.label}>Program Overview</label>
                <textarea
                  rows={4}
                  value={formData.program_overview || ''}
                  onChange={e => setFormData({ ...formData, program_overview: e.target.value })}
                  className={styles.input}
                  placeholder="Describe the goals, purpose, and structure of this program term..."
                />
              </div>
              <div className={styles.inputGroup}>
                <label className={styles.label}>Outcomes Reached</label>
                <textarea
                  rows={4}
                  value={formData.outcomes_reached || ''}
                  onChange={e => setFormData({ ...formData, outcomes_reached: e.target.value })}
                  className={styles.input}
                  placeholder="Describe the measurable outcomes and achievements from this term..."
                />
              </div>
            </div>
          </div>

          {/* 2. ENROLLMENT & CAPACITY */}
          <div className={styles.sectionCard}>
            <div className={styles.sectionHeader}>
              <LayoutList size={18} color="var(--teal-green)" />
              <h3 className={styles.sectionTitle}>Enrollment &amp; Capacity</h3>
            </div>
            <div className={styles.gridThree}>
              <div className={styles.inputGroup}>
                <label className={styles.label}>Total Applicants</label>
                <input
                  type="number" min="0"
                  value={formData.total_applicants || 0}
                  onChange={e => setFormData({ ...formData, total_applicants: parseInt(e.target.value) || 0 })}
                  className={styles.input}
                />
              </div>
              <div className={styles.inputGroup}>
                <label className={styles.label}>Volunteer Capacity</label>
                <input
                  type="number" min="0"
                  value={formData.volunteer_capacity || 0}
                  onChange={e => setFormData({ ...formData, volunteer_capacity: parseInt(e.target.value) || 0 })}
                  className={styles.input}
                />
              </div>
              <div className={styles.inputGroup}>
                <label className={styles.label}>Volunteers Enrolled</label>
                <input
                  type="number" min="0"
                  value={formData.volunteer_enrollment || 0}
                  onChange={e => setFormData({ ...formData, volunteer_enrollment: parseInt(e.target.value) || 0 })}
                  className={styles.input}
                />
              </div>
              <div className={styles.inputGroup}>
                <label className={styles.label}>Avg. Attendance Rate (%)</label>
                <input
                  type="number" min="0" max="100"
                  value={formData.average_attendance_rate || 0}
                  onChange={e => setFormData({ ...formData, average_attendance_rate: parseInt(e.target.value) || 0 })}
                  className={styles.input}
                />
              </div>
            </div>
          </div>

          {/* 2.5 DYNAMIC KPIs */}
          {Object.keys(formData.custom_metrics).length > 0 && (
            <div className={styles.sectionCard}>
              <div className={styles.sectionHeader}>
                <Target size={18} color="var(--teal-green)" />
                <h3 className={styles.sectionTitle}>Program-Specific KPIs</h3>
              </div>
              <div className={styles.gridThree}>
                {Object.keys(formData.custom_metrics)
                  .filter(key => key !== 'rubrics_taught' && key !== 'top_languages' && key !== 'top_cultural_identities')
                  .map((metricKey) => (
                  <div key={metricKey} className={styles.inputGroup}>
                    <label className={styles.label}>{metricKey}</label>
                    <input
                      type="number"
                      value={formData.custom_metrics[metricKey] || 0}
                      onChange={e => handleCustomMetricChange(metricKey, parseInt(e.target.value) || 0)}
                      className={styles.input}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 3. CURRICULUM ACCOUNTABILITY */}
          <div className={styles.sectionCard}>
            <div className={styles.sectionHeader}>
              <CheckSquare size={18} color="var(--teal-green)" />
              <h3 className={styles.sectionTitle}>Program Requirements Met</h3>
            </div>
            <p className={styles.rubricHint}>
              Mark each rubric criterion as Taught or Missed for this term.
            </p>
            <div className={styles.gridTwo}>
              {(program.levels as string[] || []).map((level: string) => {
                const levelRubrics = rubrics.filter(r => r.level === level);
                if (!levelRubrics.length) return null;
                return (
                  <div key={level}>
                    <h4 className={styles.rubricTrackTitle}>{level} Track</h4>
                    <div className={styles.rubricList}>
                      {levelRubrics.map(r => {
                        const isTaught = formData.rubrics_taught.includes(r.name);
                        const isMissed = formData.rubrics_missed.includes(r.name);
                        return (
                          <div
                            key={r.id}
                            className={`${styles.rubricRow} ${isTaught ? styles.rubricRowTaught : ''} ${isMissed ? styles.rubricRowMissed : ''}`}
                          >
                            <span className={styles.rubricName}>{r.name}</span>
                            <div className={styles.rubricBtnGroup}>
                              <button
                                type="button"
                                onClick={() => toggleRubric(r.name, 'taught')}
                                className={`${styles.rubricBtn} ${isTaught ? styles.rubricBtnTaughtActive : styles.rubricBtnTaught}`}
                              >
                                Taught
                              </button>
                              <button
                                type="button"
                                onClick={() => toggleRubric(r.name, 'missed')}
                                className={`${styles.rubricBtn} ${isMissed ? styles.rubricBtnMissedActive : styles.rubricBtnMissed}`}
                              >
                                Missed
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 4. QUALITATIVE NARRATIVE */}
          <div className={styles.sectionCard}>
            <div className={styles.sectionHeader}>
              <Info size={18} color="var(--teal-green)" />
              <h3 className={styles.sectionTitle}>Qualitative Narrative</h3>
            </div>
            <div className={styles.gridStack}>
              <div className={styles.inputGroup}>
                <label className={styles.label}>Challenges Encountered</label>
                <textarea
                  rows={3}
                  value={formData.challenges_encountered || ''}
                  onChange={e => setFormData({ ...formData, challenges_encountered: e.target.value })}
                  className={styles.input}
                  placeholder="Describe any obstacles, setbacks, or challenges the team faced..."
                />
              </div>
              <div className={styles.inputGroup}>
                <label className={styles.label}>Partners &amp; Support</label>
                <textarea
                  rows={3}
                  value={formData.partners_support || ''}
                  onChange={e => setFormData({ ...formData, partners_support: e.target.value })}
                  className={styles.input}
                  placeholder="Acknowledge any external partners, donors, or community support..."
                />
              </div>
              <div className={styles.inputGroup}>
                <label className={styles.label}>Mission Moment</label>
                <textarea
                  rows={3}
                  value={formData.mission_moment || ''}
                  onChange={e => setFormData({ ...formData, mission_moment: e.target.value })}
                  className={styles.input}
                  placeholder="Share a powerful story or transformational moment from this term..."
                />
              </div>
            </div>
          </div>

          {/* 5. DEMOGRAPHICS */}
          <div className={styles.sectionCard}>
            <div className={styles.sectionHeader}>
              <Users size={18} color="var(--teal-green)" />
              <h3 className={styles.sectionTitle}>Demographics</h3>
            </div>
            <div className={styles.gridTwo}>
              <div className={styles.arrayField}>
                <p className={styles.arrayFieldLabel}>Primary Languages</p>
                {formData.top_languages.map((lang: string, idx: number) => (
                  <div key={idx} className={styles.arrayRow}>
                    <input
                      type="text"
                      value={lang}
                      onChange={e => handleArrayChange('top_languages', idx, e.target.value)}
                      className={`${styles.input} ${styles.arrayRowInput}`}
                      placeholder="e.g., English"
                    />
                    <button type="button" onClick={() => removeArrayItem('top_languages', idx)} className={styles.btnIcon}>
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
                <button type="button" onClick={() => addArrayItem('top_languages')} className={styles.btn}>
                  <Plus size={14} /> Add Language
                </button>
              </div>
              <div className={styles.arrayField}>
                <p className={styles.arrayFieldLabel}>Cultural Identities</p>
                {formData.top_cultural_identities.map((identity: string, idx: number) => (
                  <div key={idx} className={styles.arrayRow}>
                    <input
                      type="text"
                      value={identity}
                      onChange={e => handleArrayChange('top_cultural_identities', idx, e.target.value)}
                      className={`${styles.input} ${styles.arrayRowInput}`}
                      placeholder="e.g., Latino/Hispanic"
                    />
                    <button type="button" onClick={() => removeArrayItem('top_cultural_identities', idx)} className={styles.btnIcon}>
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
                <button type="button" onClick={() => addArrayItem('top_cultural_identities')} className={styles.btn}>
                  <Plus size={14} /> Add Identity
                </button>
              </div>
            </div>
          </div>

          {/* 6. TESTIMONIALS */}
          <div className={styles.sectionCard}>
            <div className={styles.sectionHeader}>
              <MessageSquare size={18} color="var(--teal-green)" />
              <h3 className={styles.sectionTitle}>Testimonials</h3>
            </div>
            <div className={styles.gridTwo}>
              <div className={styles.arrayField}>
                <p className={styles.arrayFieldLabel}>Participant Testimonials</p>
                {formData.participant_testimonials.map((t: string, idx: number) => (
                  <div key={idx} className={styles.arrayRow}>
                    <textarea
                      rows={2}
                      value={t}
                      onChange={e => handleArrayChange('participant_testimonials', idx, e.target.value)}
                      className={`${styles.input} ${styles.arrayRowInput}`}
                      placeholder="Quote from a participant..."
                    />
                    <button type="button" onClick={() => removeArrayItem('participant_testimonials', idx)} className={styles.btnIcon}>
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
                <button type="button" onClick={() => addArrayItem('participant_testimonials')} className={styles.btn}>
                  <Plus size={14} /> Add Quote
                </button>
              </div>
              <div className={styles.arrayField}>
                <p className={styles.arrayFieldLabel}>Volunteer Testimonials</p>
                {formData.volunteer_testimonials.map((t: string, idx: number) => (
                  <div key={idx} className={styles.arrayRow}>
                    <textarea
                      rows={2}
                      value={t}
                      onChange={e => handleArrayChange('volunteer_testimonials', idx, e.target.value)}
                      className={`${styles.input} ${styles.arrayRowInput}`}
                      placeholder="Quote from a volunteer..."
                    />
                    <button type="button" onClick={() => removeArrayItem('volunteer_testimonials', idx)} className={styles.btnIcon}>
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
                <button type="button" onClick={() => addArrayItem('volunteer_testimonials')} className={styles.btn}>
                  <Plus size={14} /> Add Quote
                </button>
              </div>
            </div>
          </div>

          <div className={styles.saveFooter}>
            <button
              type="submit"
              disabled={isSaving}
              className={`${styles.btn} ${styles.btnPrimary}`}
            >
              <Save size={18} />
              {isSaving ? 'Saving to Database...' : 'Save Operations Report'}
            </button>
          </div>

        </form>
      ) : null}
    </div>
  );
}