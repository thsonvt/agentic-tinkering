import React, {useState, FormEvent, useEffect, useRef} from 'react';
import {useHistory} from '@docusaurus/router';
import {useConvexAuth} from 'convex/react';
import {useAuthActions} from '@convex-dev/auth/react';
import styles from '@site/src/pages/login.module.css';

type Step = 'email' | 'code';
type Status = 'idle' | 'loading' | 'error';

export default function LoginForm() {
  const history = useHistory();
  const {isAuthenticated} = useConvexAuth();
  const {signIn} = useAuthActions();

  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [status, setStatus] = useState<Status>('idle');
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const emailInputRef = useRef<HTMLInputElement>(null);
  const codeInputRef = useRef<HTMLInputElement>(null);

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      history.push('/');
    }
  }, [isAuthenticated, history]);

  // Focus input when step changes
  useEffect(() => {
    if (step === 'email') {
      emailInputRef.current?.focus();
    } else {
      codeInputRef.current?.focus();
    }
  }, [step]);

  const handleEmailSubmit = async (e: FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!email.trim()) {
      setError('Please enter your email');
      return;
    }

    setStatus('loading');
    setError('');

    try {
      const result = await signIn('resend-otp', {email});
      console.log('signIn result:', result);
      // Move to code step regardless - the email was sent
      setStep('code');
      setStatus('idle');
    } catch (err) {
      console.error('Email submit error:', err);
      setStatus('error');
      const errorMessage = err instanceof Error ? err.message : String(err);
      if (errorMessage.includes('Connection lost')) {
        setError('Connection interrupted. Please try again.');
      } else {
        setError('Failed to send code. Please try again.');
      }
    }
  };

  const handleCodeSubmit = async (e: FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!code.trim()) {
      setError('Please enter the verification code');
      return;
    }

    setStatus('loading');
    setError('');
    setSuccessMessage('');

    try {
      const result = await signIn('resend-otp', {code, email});
      console.log('Code verification result:', result);
      // Verification succeeded - show success and redirect
      setSuccessMessage('Sign in successful! Redirecting...');
      setStatus('idle');
      // Give a moment to show success, then redirect
      setTimeout(() => {
        window.location.href = '/';
      }, 500);
    } catch (err) {
      console.error('Code verification error:', err);
      setStatus('error');
      // Parse error and show user-friendly message
      const errorMessage = err instanceof Error ? err.message : String(err);
      if (errorMessage.includes('Could not verify code')) {
        setError('Invalid code. Please check and try again, or request a new one.');
      } else if (errorMessage.includes('Connection lost')) {
        setError('Connection lost. Please try again.');
      } else {
        setError('Verification failed. Please try again.');
      }
    }
  };

  const handleBackToEmail = () => {
    setStep('email');
    setCode('');
    setError('');
  };

  const handleResendCode = async () => {
    setStatus('loading');
    setError('');
    setSuccessMessage('');
    setCode('');

    try {
      await signIn('resend-otp', {email});
      setStatus('idle');
      setSuccessMessage('New code sent! Check your email.');
    } catch (err) {
      setStatus('error');
      setError('Failed to resend code. Please try again.');
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        {step === 'email' ? (
          <>
            <h1>Sign In</h1>
            <p className={styles.subtitle}>
              Enter your email to receive a verification code
            </p>

            <form onSubmit={handleEmailSubmit} className={styles.form}>
              <label htmlFor="email" className={styles.label}>
                Email address
              </label>
              <input
                ref={emailInputRef}
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => e.stopPropagation()}
                placeholder="you@example.com"
                className={styles.input}
                disabled={status === 'loading'}
                autoComplete="email"
                required
              />

              {error && <p className={styles.error}>{error}</p>}

              <button
                type="submit"
                className={styles.submitButton}
                disabled={status === 'loading'}>
                {status === 'loading' ? 'Sending code...' : 'Continue'}
              </button>
            </form>
          </>
        ) : (
          <>
            <h1>Enter Code</h1>
            <p className={styles.subtitle}>
              We sent a 6-digit code to <strong>{email}</strong>
            </p>

            <form onSubmit={handleCodeSubmit} className={styles.form}>
              <label htmlFor="code" className={styles.label}>
                Verification code
              </label>
              <input
                ref={codeInputRef}
                id="code"
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                onKeyDown={(e) => e.stopPropagation()}
                placeholder="000000"
                className={`${styles.input} ${styles.codeInput}`}
                disabled={status === 'loading'}
                autoComplete="one-time-code"
                required
              />

              {error && <p className={styles.error}>{error}</p>}
              {successMessage && <p className={styles.success}>{successMessage}</p>}

              <button
                type="submit"
                className={styles.submitButton}
                disabled={status === 'loading'}>
                {status === 'loading' ? 'Verifying...' : 'Sign In'}
              </button>

              <button
                type="button"
                onClick={handleResendCode}
                className={styles.backButton}
                disabled={status === 'loading'}>
                {status === 'loading' ? 'Sending...' : 'Resend code'}
              </button>

              <button
                type="button"
                onClick={handleBackToEmail}
                className={styles.backButton}
                disabled={status === 'loading'}>
                Use a different email
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
