'use server';

import { DbCohortReport, ProgramDraft } from '@/types';
import { createClient } from '@supabase/supabase-js';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { randomUUID } from 'crypto';

interface ApplicationFormData {
  full_name: string;
  gender: string;
  email?: string;
  phone_number: string;
  date_of_birth: string;
  address: string;
  education_level: string;
  owns_smartphone: boolean;
  has_typed_before: boolean;
  tech_experience: string;
  motivation: string;
}

const PROGRAM_COOKIE_KEY = 'active_program_id';

// ==========================================
// CLIENT 1: IDENTITY MANAGER (God Mode)
// Uses Service Role. Bypasses RLS.
// ONLY use this for Auth (creating users) and absolute root-level tasks.
// ==========================================
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// ==========================================
// CLIENT 2: DATA MANAGER (RLS Enforced)
// Uses the user's active session.
// ALWAYS use this for multi-tenant data so the DB enforces security.
// ==========================================
async function getAuthenticatedClient() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          } catch {
            // Safe to ignore in Server Components
          }
        },
      },
    }
  );
}

// ==========================================
// UTILITY: Typed error message extractor
// ==========================================
function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  return 'An unknown error occurred.';
}

// ==========================================
// 0. SECURITY GATEKEEPERS (CRITICAL)
// ==========================================

async function verifyAdminAccess() {
  const supabase = await getAuthenticatedClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) throw new Error('Unauthorized: No active session.');

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profileError || !profile) throw new Error('Unauthorized: Profile not found.');

  if (profile.role === 'auditor') {
    throw new Error('Forbidden: View-only accounts cannot modify data.');
  }

  return profile.role;
}

// Enforces Multi-Tenant Data Isolation in the Application Layer
async function requireActiveProgram() {
  const cookieStore = await cookies();
  const programId = cookieStore.get(PROGRAM_COOKIE_KEY)?.value;

  if (!programId) {
    throw new Error('No active program context. Please select a program from the hub.');
  }
  return programId;
}

export async function getActiveProgramId() {
  const cookieStore = await cookies();
  return cookieStore.get(PROGRAM_COOKIE_KEY)?.value || null;
}

// ==========================================
// 1. INSTRUCTOR MANAGEMENT (Uses supabaseAdmin)
// ==========================================
export async function createInstructorAccount(
  phone: string,
  fullName: string,
  pin: string,
  role: 'admin' | 'super_admin' | 'auditor' = 'admin',
  programIds: string[] = []
) {
  try {
    const callerRole = await verifyAdminAccess();
    if (callerRole !== 'super_admin') throw new Error('Forbidden: Super Admin required.');

    const systemEmail = `${phone}`;

    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: systemEmail,
      password: pin,
      email_confirm: true,
      user_metadata: { full_name: fullName }
    });

    if (authError) throw authError;

    if (authData.user) {
      const { error: profileError } = await supabaseAdmin
        .from('profiles')
        .insert({
          id: authData.user.id,
          email: systemEmail,
          username: phone,
          full_name: fullName,
          role: role,
          status: 'active',
          requires_pin_change: true
        });

      if (profileError) {
        await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
        throw profileError;
      }

      if (role === 'admin' && programIds.length > 0) {
        const assignmentsToInsert = programIds.map(programId => ({
          user_id: authData.user.id,
          program_id: programId
        }));

        const { error: assignmentError } = await supabaseAdmin
          .from('program_assignments')
          .insert(assignmentsToInsert);

        if (assignmentError) {
           console.error("Failed to insert assignments during creation:", assignmentError);
        }
      }
    }

    return { success: true };
  } catch (error: unknown) {
    console.error('Account Creation Error:', error);
    return { success: false, error: getErrorMessage(error) };
  }
}

export async function updateInstructorAccount(
  userId: string,
  newPhone: string,
  newFullName: string,
  newRole: 'admin' | 'super_admin' | 'auditor',
  programIds: string[] = [] 
) {
  try {
    const callerRole = await verifyAdminAccess();
    if (callerRole !== 'super_admin') throw new Error('Forbidden: Super Admin required.');

    const systemEmail = `${newPhone}@bbc.local`;

    const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(
      userId,
      { email: systemEmail }
    );

    if (authError) throw authError;

    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .update({
        username: newPhone,
        full_name: newFullName,
        role: newRole
      })
      .eq('id', userId);

    if (profileError) throw profileError;

    await supabaseAdmin.from('program_assignments').delete().eq('user_id', userId);

    if (newRole === 'admin' && programIds.length > 0) {
      const assignmentsToInsert = programIds.map(programId => ({
        user_id: userId,
        program_id: programId
      }));

      const { error: assignmentError } = await supabaseAdmin
        .from('program_assignments')
        .insert(assignmentsToInsert);

      if (assignmentError) throw assignmentError;
    }

    return { success: true };
  } catch (error: unknown) {
    console.error('Update Error:', error);
    return { success: false, error: getErrorMessage(error) };
  }
}

export async function deleteInstructorAccount(userId: string) {
  try {
    const callerRole = await verifyAdminAccess();
    if (callerRole !== 'super_admin') throw new Error('Forbidden: Super Admin required.');

    const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(userId);
    if (authError) throw authError;

    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .delete()
      .eq('id', userId);

    if (profileError) throw profileError;

    return { success: true };
  } catch (error: unknown) {
    console.error('Delete Error:', error);
    return { success: false, error: getErrorMessage(error) };
  }
}

// ==========================================
// 2. COHORT MANAGEMENT
// ==========================================
export async function createCohort(name: string, startDate: string) {
  try {
    await verifyAdminAccess();
    const programId = await requireActiveProgram();
    const supabase = await getAuthenticatedClient();

    const { error } = await supabase
      .from('cohorts')
      .insert({
        name: name,
        start_date: startDate,
        program_id: programId
      });

    if (error) {
      if (error.code === '23505') {
        throw new Error('A cohort with this exact name already exists.');
      }
      throw error;
    }

    return { success: true };
  } catch (error: unknown) {
    console.error('Create Cohort Error:', error);
    return { success: false, error: getErrorMessage(error) };
  }
}

export async function updateCohort(
  cohortId: string,
  name: string,
  startDate: string,
  endDate?: string | null
) {
  try {
    await verifyAdminAccess();
    const programId = await requireActiveProgram();
    const supabase = await getAuthenticatedClient();

    const { error } = await supabase
      .from('cohorts')
      .update({
        name: name,
        start_date: startDate,
        end_date: endDate ? endDate : null
      })
      .eq('id', cohortId)
      .eq('program_id', programId);

    if (error) throw error;
    return { success: true };
  } catch (error: unknown) {
    console.error('Update Cohort Error:', error);
    return { success: false, error: getErrorMessage(error) };
  }
}

export async function graduateCohort(cohortId: string, endDate: string) {
  try {
    await verifyAdminAccess();
    const programId = await requireActiveProgram();
    const supabase = await getAuthenticatedClient();

    const { error } = await supabase
      .from('cohorts')
      .update({ end_date: endDate })
      .eq('id', cohortId)
      .eq('program_id', programId);

    if (error) throw error;
    return { success: true };
  } catch (error: unknown) {
    console.error('Graduate Cohort Error:', error);
    return { success: false, error: getErrorMessage(error) };
  }
}

export async function deleteCohort(cohortId: string) {
  const supabase = await getAuthenticatedClient();

  try {
    const { error } = await supabase
      .from('cohorts')
      .delete()
      .eq('id', cohortId);

    if (error) throw error;
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to delete cohort.' };
  }
}

// ==========================================
// 3. RUBRIC MANAGEMENT 
// ==========================================

export async function createRubric(level: string, subject: string, name: string, description: string, maxScore: number) {
  try {
    await verifyAdminAccess();
    const programId = await requireActiveProgram();
    const supabase = await getAuthenticatedClient();

    const { error } = await supabase
      .from('rubrics')
      .insert({
        id: randomUUID(), 
        level,
        subject,
        name,
        description,
        max_score: maxScore,
        program_id: programId
      });

    if (error) throw error;
    return { success: true };
  } catch (error: unknown) {
    console.error('Create Rubric Error:', error);
    return { success: false, error: getErrorMessage(error) };
  }
}

export async function updateRubric(rubricId: string, subject: string, name: string, description: string, maxScore: number) {
  try {
    await verifyAdminAccess();
    const programId = await requireActiveProgram();
    const supabase = await getAuthenticatedClient();

    const { error } = await supabase
      .from('rubrics')
      .update({ subject, name, description, max_score: maxScore })
      .eq('id', rubricId)
      .eq('program_id', programId);

    if (error) throw error;
    return { success: true };
  } catch (error: unknown) {
    console.error('Update Rubric Error:', error);
    return { success: false, error: getErrorMessage(error) };
  }
}

export async function deleteRubric(rubricId: string) {
  try {
    await verifyAdminAccess();
    const programId = await requireActiveProgram();
    const supabase = await getAuthenticatedClient();

    const { error } = await supabase
      .from('rubrics')
      .delete()
      .eq('id', rubricId)
      .eq('program_id', programId);

    if (error) throw error;
    return { success: true };
  } catch (error: unknown) {
    console.error('Delete Rubric Error:', error);
    return { success: false, error: getErrorMessage(error) };
  }
}

// ==========================================
// 4. STUDENT MANAGEMENT 
// ==========================================
export async function createStudent(name: string, cohortId: string, level: string = 'beginner') {
  try {
    await verifyAdminAccess();
    const programId = await requireActiveProgram();
    const supabase = await getAuthenticatedClient();

    const { error } = await supabase
      .from('students')
      .insert({
        name,
        cohort_id: cohortId,
        current_level: level,
        status: 'active',
        program_id: programId
      });

    if (error) throw error;
    return { success: true };
  } catch (error: unknown) {
    console.error('Create Student Error:', error);
    return { success: false, error: getErrorMessage(error) };
  }
}

export async function updateStudentStatus(studentId: string, newStatus: 'active' | 'suspended' | 'archived') {
  try {
    await verifyAdminAccess();
    const programId = await requireActiveProgram();
    const supabase = await getAuthenticatedClient();

    const { error } = await supabase
      .from('students')
      .update({ status: newStatus })
      .eq('id', studentId)
      .eq('program_id', programId);

    if (error) throw error;
    return { success: true };
  } catch (error: unknown) {
    console.error('Update Student Status Error:', error);
    return { success: false, error: getErrorMessage(error) };
  }
}

export async function deleteStudent(studentId: string) {
  try {
    await verifyAdminAccess();
    const programId = await requireActiveProgram();
    const supabase = await getAuthenticatedClient();

    const { error } = await supabase
      .from('students')
      .delete()
      .eq('id', studentId)
      .eq('program_id', programId);

    if (error) throw error;
    return { success: true };
  } catch (error: unknown) {
    console.error('Delete Student Error:', error);
    return { success: false, error: getErrorMessage(error) };
  }
}

// ==========================================
// 5. REPORTING 
// ==========================================
export async function saveCohortReport(cohortId: string, payload: Partial<DbCohortReport>) {
  try {
    await verifyAdminAccess();
    const supabase = await getAuthenticatedClient();

    const safePayload: Partial<DbCohortReport> = {
      average_attendance_rate: payload.average_attendance_rate,
      challenges_encountered: payload.challenges_encountered,
      curriculum_link: payload.curriculum_link,
      custom_metrics: payload.custom_metrics,
      mission_moment: payload.mission_moment,
      outcomes_reached: payload.outcomes_reached,
      participant_testimonials: payload.participant_testimonials,
      partners_support: payload.partners_support,
      photos_link: payload.photos_link,
      program_overview: payload.program_overview,
      total_applicants: payload.total_applicants,
      volunteer_capacity: payload.volunteer_capacity,
      volunteer_enrollment: payload.volunteer_enrollment,
      volunteer_testimonials: payload.volunteer_testimonials,
      rubrics_missed: payload.rubrics_missed, 
    };

    Object.keys(safePayload).forEach(key => {
      if (safePayload[key as keyof typeof safePayload] === undefined) {
        delete safePayload[key as keyof typeof safePayload];
      }
    });

    const { error } = await supabase
      .from('cohort_reports')
      .upsert({
        cohort_id: cohortId,
        ...safePayload,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'cohort_id'
      });

    if (error) throw error;
    return { success: true };

  } catch (error: unknown) {
    console.error('Save Report Error:', error);
    return { success: false, error: getErrorMessage(error) };
  }
}

// ==========================================
// 6. ADMISSIONS / APPLICATIONS 
// ==========================================
export async function processApplication(
  applicationId: string,
  action: 'accept' | 'reject',
  cohortId?: string
) {
  try {
    await verifyAdminAccess();
    const programId = await requireActiveProgram();
    const supabase = await getAuthenticatedClient();

    if (action === 'reject') {
      const { error } = await supabase
        .from('applications')
        .update({ status: 'rejected' })
        .eq('id', applicationId)
        .eq('program_id', programId);

      if (error) throw error;
      return { success: true };
    }

    if (action === 'accept' && !cohortId) {
      throw new Error("A cohort ID must be provided to enroll an accepted student.");
    }

    const { data: app, error: fetchError } = await supabase
      .from('applications')
      .select('*')
      .eq('id', applicationId)
      .eq('program_id', programId)
      .single();

    if (fetchError || !app) throw new Error("Application not found or access denied by DB.");

    const birthDate = new Date(app.date_of_birth);
    const today = new Date();
    let calculatedAge = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      calculatedAge--;
    }

    const { error: insertError } = await supabase
      .from('students')
      .insert([{
        name: app.full_name,
        age: calculatedAge,
        cohort_id: cohortId,
        program_id: programId,
        current_level: 'beginner',
        status: 'active'
      }]);

    if (insertError) throw insertError;

    const { error: updateError } = await supabase
      .from('applications')
      .update({ status: 'accepted' })
      .eq('id', applicationId)
      .eq('program_id', programId);

    if (updateError) throw updateError;

    return { success: true };
  } catch (error: unknown) {
    console.error('Process Application Error:', error);
    return { success: false, error: getErrorMessage(error) };
  }
}

// ==========================================
// 7. PUBLIC REGISTRATION 
// ==========================================
export async function submitApplication(formData: ApplicationFormData, programId: string) {
  const cookieStore = await cookies();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll() {} 
      },
    }
  );

  try {
    if (!programId) throw new Error("A target program ID is required.");

    const { data: program, error: programError } = await supabase
      .from('programs')
      .select('id')
      .eq('id', programId)
      .single();

    if (programError || !program) {
      throw new Error("Invalid program link. Please contact the administrator.");
    }

    const { error } = await supabase
      .from('applications')
      .insert([{
        program_id: programId,
        full_name: formData.full_name,
        gender: formData.gender,
        email: formData.email || null,
        phone_number: formData.phone_number,
        date_of_birth: formData.date_of_birth,
        address: formData.address,
        education_level: formData.education_level,
        owns_smartphone: formData.owns_smartphone,
        has_typed_before: formData.has_typed_before,
        tech_experience: formData.tech_experience,
        motivation: formData.motivation,
        status: 'pending'
      }]);

    if (error) throw error;
    return { success: true };

  } catch (error: unknown) {
    console.error('Application Submission Error:', error);
    return {
      success: false,
      error: getErrorMessage(error) ?? 'Failed to submit application. Please try again.'
    };
  }
}

// ==========================================
// 8. MULTI-TENANT PROGRAM HUB
// ==========================================

export async function setProgramContext(programId: string) {
  const cookieStore = await cookies();

  cookieStore.set(PROGRAM_COOKIE_KEY, programId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 7 
  });
  return { success: true };
}

export async function createNewProgram(name: string, description: string) {
  try {
    const role = await verifyAdminAccess();
    if (role !== 'super_admin') {
      throw new Error("Only Developers (Super Admins) can create new programs.");
    }

    const { error } = await supabaseAdmin
      .from('programs')
      .insert([{ name, description }]);

    if (error) throw error;
    return { success: true };
  } catch (error: unknown) {
    return { success: false, error: getErrorMessage(error) };
  }
}

export async function verifyProgramAccess(supabase: any, userId: string, programId: string, role: string) {
  if (role === 'super_admin') return true;

  const { data, error } = await supabase
    .from('program_assignments')
    .select('id')
    .eq('user_id', userId)
    .eq('program_id', programId)
    .single();

  if (error || !data) {
    throw new Error("Unauthorized: You are not assigned to this program.");
  }

  return true;
}

export async function deleteProgram(programId: string) {
  try {
    const role = await verifyAdminAccess();
    if (role !== 'super_admin') {
      throw new Error("Only Developers (Super Admins) can delete programs.");
    }

    const { error } = await supabaseAdmin
      .from('programs')
      .delete()
      .eq('id', programId);

    if (error) throw error;
    return { success: true };
  } catch (error: unknown) {
    return { success: false, error: getErrorMessage(error) };
  }
}

export async function launchNewProgram(draft: ProgramDraft) {
  try {
    const supabase = await getAuthenticatedClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) throw new Error("Unauthorized: Active session required.");

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profile?.role !== 'super_admin') {
      throw new Error("Forbidden: Only Super Admins can initialize new programs.");
    }

    const { data: program, error: programError } = await supabase
      .from('programs')
      .insert({
        name: draft.name,
        description: draft.description,
        levels: draft.levels,
        assessment_stages: draft.assessmentStages,
      })
      .select('id')
      .single();

    if (programError || !program) throw new Error(`Failed to create program: ${programError?.message}`);
    const programId = program.id;

    try {
      const { data: cohort, error: cohortError } = await supabase
        .from('cohorts')
        .insert({
          program_id: programId,
          name: draft.cohortName,
          start_date: draft.startDate,
        })
        .select('id')
        .single();

      if (cohortError || !cohort) throw new Error(`Cohort creation failed: ${cohortError?.message}`);
      const cohortId = cohort.id;

      const initialMetrics = draft.kpis.reduce((acc: Record<string, number>, kpi: string) => {
        acc[kpi] = 0;
        return acc;
      }, {} as Record<string, number>);

      const { error: reportError } = await supabase
        .from('cohort_reports')
        .insert({
          cohort_id: cohortId,
          total_applicants: 0,
          volunteer_capacity: 0,
          volunteer_enrollment: 0,
          average_attendance_rate: 0,
          custom_metrics: initialMetrics
        });

      if (reportError) throw new Error(`Report initialization failed: ${reportError.message}`);

      if (draft.rubrics.length > 0) {
        const rubricsToInsert = draft.rubrics.map(r => ({
          id: randomUUID(),
          program_id: programId,
          level: r.level,
          subject: r.subject,
          name: r.name,
          description: '',
          max_score: r.maxScore
        }));

        const { error: rubricsError } = await supabase
          .from('rubrics')
          .insert(rubricsToInsert);

        if (rubricsError) throw new Error(`Rubric creation failed: ${rubricsError.message}`);
      }

      const cookieStore = await cookies();

      // FIXED: Using the central variable ensures total cookie consistency across the application
      cookieStore.set(PROGRAM_COOKIE_KEY, programId, {
        path: '/',
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        maxAge: 60 * 60 * 24 * 7 
      });

      return { success: true, programId };

    } catch (transactionError: unknown) {
      console.error("Mid-flight failure, rolling back program:", transactionError);
      await supabase.from('programs').delete().eq('id', programId);
      return { success: false, error: getErrorMessage(transactionError) };
    }

  } catch (err: unknown) {
    console.error("Failed to launch program:", err);
    return { success: false, error: getErrorMessage(err) };
  }
}