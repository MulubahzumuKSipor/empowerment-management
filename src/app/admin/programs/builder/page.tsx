'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, ArrowRight, Save, Loader2 } from 'lucide-react';
import styles from '@/styles/builder.module.css';
import { ProgramDraft } from '@/types';
import { launchNewProgram } from '@/action/admin';

// Import Steps
import Step1Identity from '@/components/step1';
import Step2Structure from '@/components/step2';
import Step3Intelligence from '@/components/step3';
import Step4Rubrics from '@/components/step4';
import Step5Recruitment from '@/components/step5';

export default function ProgramBuilderPage() {
  const router = useRouter();

  // --- Orchestration State ---
  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = 5; // <-- UPDATED TO 5
  const [isSubmitting, setIsSubmitting] = useState(false);

  // --- Master Draft State ---
  const [draft, setDraft] = useState<ProgramDraft>({
    name: '',
    description: '',
    cohortName: '',
    startDate: new Date().toISOString().split('T')[0],
    levels: [],
    assessmentStages: [],
    kpis: [],
    rubrics: [],
    applicationQuestions: [] // <-- INITIALIZED FOR STEP 5
  });

  // --- Handlers ---
  const handleUpdateDraft = (updates: Partial<ProgramDraft>) => {
    setDraft(prev => ({ ...prev, ...updates }));
  };

  const nextStep = () => setCurrentStep(prev => Math.min(prev + 1, totalSteps));
  const prevStep = () => setCurrentStep(prev => Math.max(prev - 1, 1));

  const handleDeploy = async () => {
    setIsSubmitting(true);

    const result = await launchNewProgram(draft);

    if (result.success) {
      router.push('/admin'); // Route directly into their new workspace
    } else {
      alert(`Deployment Failed: ${result.error}`);
      setIsSubmitting(false);
    }
  };

  // --- Validation Gates ---
  const isStep1Valid = draft.name.trim() !== '' && draft.cohortName.trim() !== '' && draft.startDate !== '';
  const isStep2Valid = draft.levels.length > 0 && draft.assessmentStages.length > 0;
  const isStep3Valid = draft.kpis.length > 0;

  // Determines if the "Continue" button is active based on the current step
  const isCurrentStepValid = () => {
    if (currentStep === 1) return isStep1Valid;
    if (currentStep === 2) return isStep2Valid;
    if (currentStep === 3) return isStep3Valid;
    // Steps 4 and 5 evaluate to true because they are optional/have their own local validation
    return true;
  };

  return (
    <div className={styles.pageContainer}>
      <header className={styles.topNav}>
        <button className={styles.backBtn} onClick={() => router.push('/admin/programs')} type="button">
          <ArrowLeft size={18} />
          Cancel Setup
        </button>

        <div className={styles.stepper}>
          {[...Array(totalSteps)].map((_, i) => {
            const stepNumber = i + 1;
            return (
              <div
                key={stepNumber}
                className={`${styles.stepDot} ${currentStep === stepNumber ? styles.active : ''} ${currentStep > stepNumber ? styles.completed : ''}`}
              />
            );
          })}
        </div>

        <div style={{ width: '100px' }}></div>
      </header>

      <main className={styles.workspace}>
        {currentStep === 1 && <Step1Identity draft={draft} updateDraft={handleUpdateDraft} />}
        {currentStep === 2 && <Step2Structure draft={draft} updateDraft={handleUpdateDraft} />}
        {currentStep === 3 && <Step3Intelligence draft={draft} updateDraft={handleUpdateDraft} />}

        {/* Render Step 4 & 5 dynamically */}
        {currentStep === 4 && <Step4Rubrics draft={draft} updateDraft={handleUpdateDraft} />}
        {currentStep === 5 && <Step5Recruitment draft={draft} updateDraft={handleUpdateDraft} />}
      </main>

      <footer className={styles.footerBar}>
        <div className={styles.footerContent}>
          {currentStep > 1 ? (
            <button className={styles.btnSecondary} onClick={prevStep} disabled={isSubmitting} type="button">
              Previous Step
            </button>
          ) : (
            <div></div> // Spacer to keep layout intact
          )}

          {currentStep < totalSteps ? (
            <button
              className={styles.btnPrimary}
              onClick={nextStep}
              disabled={!isCurrentStepValid()}
              type="button"
            >
              Continue <ArrowRight size={18} />
            </button>
          ) : (
            <button
              className={styles.btnPrimary}
              onClick={handleDeploy}
              disabled={isSubmitting}
              type="button"
            >
              {isSubmitting ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
              {isSubmitting ? 'Launching...' : 'Deploy Workspace'}
            </button>
          )}
        </div>
      </footer>
    </div>
  );
}