'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/utils/supabase';
import { Lock, User, ArrowRight, Smartphone, AlertCircle, Loader2, ShieldCheck } from 'lucide-react';
import styles from '@/styles/login.module.css';

type AuthStep = 'login' | 'setup' | 'mfa_enroll' | 'mfa_verify';

export default function LoginPage() {
  const router = useRouter();

  // --- UI & Progression State ---
  const [step, setStep] = useState<AuthStep>('login');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // --- Form State ---
  const [loginId, setLoginId] = useState('');
  const [pin, setPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');

  // --- MFA State ---
  const [totpCode, setTotpCode] = useState('');
  const [qrCodeSvg, setQrCodeSvg] = useState('');
  const [factorId, setFactorId] = useState('');

  // ==========================================
  // 1. INITIAL LOGIN
  // ==========================================
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    const trimmedInput = loginId.trim();
    let systemEmail = '';

    if (trimmedInput.includes('@')) {
      systemEmail = trimmedInput;
    } else {
      const cleanPhone = trimmedInput.replace(/\D/g, '');
      if (cleanPhone.length < 7) {
        setError('Please enter a valid email address or phone number.');
        setIsLoading(false);
        return;
      }
      systemEmail = `${cleanPhone}@bbc.local`;
    }

    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: systemEmail,
      password: pin,
    });

    if (authError) {
      setError('Invalid credentials. Please try again.');
      setIsLoading(false);
      return;
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role, requires_pin_change')
      .eq('id', authData.user.id)
      .single();

    if (profile?.requires_pin_change) {
      setStep('setup');
      setIsLoading(false);
      return;
    }

    if (profile?.role === 'super_admin') {
      const { data: factors } = await supabase.auth.mfa.listFactors();
      const totpFactor = factors?.totp[0];

      if (!totpFactor) {
        const { data, error: enrollError } = await supabase.auth.mfa.enroll({
          factorType: 'totp',
          issuer: 'Learning Center Management',
          friendlyName: systemEmail
        });
        if (enrollError) {
          setError('Failed to initialize 2FA security.');
          setIsLoading(false);
          return;
        }
        setFactorId(data.id);
        setQrCodeSvg(data.totp.qr_code);
        setStep('mfa_enroll');
      } else {
        setFactorId(totpFactor.id);
        setStep('mfa_verify');
      }
      setIsLoading(false);
      return;
    }

    router.push('/admin/programs');
  };

  // ==========================================
  // 2. SETUP NEW PIN
  // ==========================================
  const handleSetupPin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!/^\d{6}$/.test(newPin)) {
      setError('Your new PIN must be exactly 6 numeric digits.');
      return;
    }
    if (newPin !== confirmPin) {
      setError('Your PINs do not match.');
      return;
    }

    setIsLoading(true);

    const { error: updateError } = await supabase.auth.updateUser({ password: newPin });
    if (updateError) {
      setError('Failed to update PIN securely.');
      setIsLoading(false);
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase.from('profiles').update({ requires_pin_change: false }).eq('id', user.id);
      const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();

      if (profile?.role === 'super_admin') {
        const { data } = await supabase.auth.mfa.enroll({
          factorType: 'totp',
          issuer: 'Learning Center Management',
          friendlyName: user.email || 'Admin Account'
        });
        if (data) {
          setFactorId(data.id);
          setQrCodeSvg(data.totp.qr_code);
          setStep('mfa_enroll');
        }
      } else {
        router.push('/admin/programs');
      }
    }
    setIsLoading(false);
  };

  // ==========================================
  // 3. VERIFY 2FA
  // ==========================================
  const handleVerify2FA = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const challenge = await supabase.auth.mfa.challenge({ factorId });
      if (challenge.error) throw challenge.error;

      const verify = await supabase.auth.mfa.verify({
        factorId,
        challengeId: challenge.data.id,
        code: totpCode,
      });

      if (verify.error) {
        setError('Invalid 6-digit code.');
        setIsLoading(false);
        return;
      }

      await supabase.auth.refreshSession();
      window.location.href = '/admin/programs';
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred.';
      setError(errorMessage);
      setIsLoading(false);
    }
  };

  // ==========================================
  // RENDER HELPERS
  // ==========================================
  const renderHeader = () => {
    switch (step) {
      case 'mfa_enroll':
        return { icon: <Smartphone size={32} />, title: 'Enable 2FA', subtitle: 'Scan the code to secure your Developer account.' };
      case 'mfa_verify':
        return { icon: <ShieldCheck size={32} />, title: 'Verification', subtitle: 'Enter the 6-digit code from your authenticator app.' };
      case 'setup':
        return { icon: <Lock size={32} />, title: 'Set Permanent PIN', subtitle: 'Create a secure 6-digit PIN for future access.' };
      default:
        return { icon: <User size={32} />, title: 'System Login', subtitle: 'Access the Empowerment Workspace.' };
    }
  };

  const headerContent = renderHeader();

  return (
    <div className={styles.container}>
      <div className={styles.card}>

        <div className={styles.header}>
          <div className={styles.iconWrapper}>
            {headerContent.icon}
          </div>
          <h2 className={styles.title}>{headerContent.title}</h2>
          <p className={styles.subtitle}>{headerContent.subtitle}</p>
        </div>

        {error && (
          <div className={styles.errorBanner}>
            <AlertCircle size={20} />
            <span>{error}</span>
          </div>
        )}

        {/* --- STEP 1: LOGIN --- */}
        {step === 'login' && (
          <form onSubmit={handleLogin} className={styles.form}>
            <div className={styles.inputGroup}>
              <label className={styles.label}>Email or Phone Number</label>
              <div className={styles.inputWrapper}>
                <User size={18} className={styles.inputIcon} />
                <input
                  type="text" autoFocus required value={loginId}
                  onChange={(e) => setLoginId(e.target.value)}
                  className={`${styles.input} ${styles.withIcon}`}
                  placeholder="name@example.com or 0777..."
                />
              </div>
            </div>

            <div className={styles.inputGroup}>
              <label className={styles.label}>PIN Code</label>
              <div className={styles.inputWrapper}>
                <Lock size={18} className={styles.inputIcon} />
                <input
                  type="password" required value={pin}
                  onChange={(e) => setPin(e.target.value)}
                  className={`${styles.input} ${styles.withIcon}`}
                  placeholder="••••"
                />
              </div>
            </div>

            <button type="submit" disabled={isLoading} className={styles.submitBtn}>
              {isLoading ? <Loader2 size={18} className={styles.spinner} /> : 'Sign In'}
              {!isLoading && <ArrowRight size={18} />}
            </button>
          </form>
        )}

        {/* --- STEP 2: SETUP PIN --- */}
        {step === 'setup' && (
          <form onSubmit={handleSetupPin} className={styles.form}>
             <div className={styles.inputGroup}>
              <label className={styles.label}>New 6-Digit PIN</label>
              <input
                type="password" autoFocus required maxLength={6}
                value={newPin} onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ''))}
                className={styles.input} placeholder="••••••"
              />
            </div>
            <div className={styles.inputGroup}>
              <label className={styles.label}>Confirm PIN</label>
              <input
                type="password" required maxLength={6}
                value={confirmPin} onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, ''))}
                className={styles.input} placeholder="••••••"
              />
            </div>
            <button type="submit" disabled={isLoading} className={styles.submitBtn}>
              {isLoading ? <Loader2 size={18} className={styles.spinner} /> : 'Set PIN & Continue'}
            </button>
          </form>
        )}

        {/* --- STEP 3: MFA (ENROLL / VERIFY) --- */}
        {(step === 'mfa_enroll' || step === 'mfa_verify') && (
          <form onSubmit={handleVerify2FA} className={styles.form}>

            {step === 'mfa_enroll' && qrCodeSvg && (
              <div className={styles.qrContainer}>
                <div dangerouslySetInnerHTML={{ __html: qrCodeSvg.replace(/^data:image\/svg\+xml[^,]*,/, '') }} />
              </div>
            )}

            <div className={styles.inputGroup}>
              <label className={`${styles.label} ${styles.labelCenter}`}>Authenticator Code</label>
              <input
                type="text" autoFocus required maxLength={6} value={totpCode}
                onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, ''))}
                className={`${styles.input} ${styles.mfaInput}`}
                placeholder="000000"
              />
            </div>

            <button type="submit" disabled={isLoading} className={styles.submitBtn}>
              {isLoading ? <Loader2 size={18} className={styles.spinner} /> : 'Verify & Sign In'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}