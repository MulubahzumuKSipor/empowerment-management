import { Database } from './supabase';

// 1. Dynamic Application Form Schema
export interface ApplicationQuestion {
  id: string;
  label: string;
  type: 'short_text' | 'long_text' | 'select' | 'boolean';
  options?: string[]; // Only used if type is 'select'
  required: boolean;
}

// 2. Wizard Draft State Interface (Master Payload)
export interface ProgramDraft {
  name: string;
  description: string;
  cohortName: string;
  startDate: string;
  levels: string[];
  assessmentStages: string[];
  kpis: string[];
  rubrics: { level: string; subject: string; name: string; maxScore: number }[];
  applicationQuestions: ApplicationQuestion[]; // Array for Step 5
}

// ─── DYNAMIC JSONB STRUCTURES ───
export interface ApplicationQuestion {
  id: string;
  label: string;
  type: 'short_text' | 'long_text' | 'select' | 'boolean';
  options?: string[];
  required: boolean;
}

export interface ProgramDraft {
  name: string;
  description: string;
  cohortName: string;
  startDate: string;
  levels: string[];
  assessmentStages: string[];
  kpis: string[];
  rubrics: { level: string; subject: string; name: string; maxScore: number }[];
  applicationQuestions: ApplicationQuestion[];
}

// ─── STRICT DATABASE ROW MAPPINGS ───
// These exports fix the exact error you are seeing.
export type DbProgram = Database['public']['Tables']['programs']['Row'];
export type DbCohort = Database['public']['Tables']['cohorts']['Row'];
export type DbApplication = Database['public']['Tables']['applications']['Row'];
export type DbStudent = Database['public']['Tables']['students']['Row'];
export type DbRubric = Database['public']['Tables']['rubrics']['Row'];
export type DbCohortReport = Database['public']['Tables']['cohort_reports']['Row'];
export type DbProfile = Database['public']['Tables']['profiles']['Row'];
export type DbProgramAssignment = Database['public']['Tables']['program_assignments']['Row'];