import React, { useState } from 'react';
import { useBusiness } from '../context/BusinessContext';
import {
  Mail,
  Lock,
  User,
  Eye,
  EyeOff,
  Loader2,
  AlertCircle,
  CheckCircle2,
  ArrowRight,
  FileSpreadsheet,
  Shield,
  Cloud,
  HardDrive,
} from 'lucide-react';

type AuthMode = 'login' | 'signup' | 'reset';

export const AuthPage: React.FC = () => {
  const {
    signUpWithEmail,
    loginWithEmail,
    loginWithGoogle,
    resetPassword,
    authLoading,
    cloudAuthAvailable,
    connectionMode,
    usingLocalAuth,
  } = useBusiness();

  const [mode, setMode] = useState<AuthMode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const switchMode = (next: AuthMode) => {
    setMode(next);
    setError('');
    setSuccess('');
    setPassword('');
    setConfirmPassword('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    const trimmedEmail = email.trim();
    if (!trimmedEmail || !trimmedEmail.includes('@')) {
      setError('Please enter a valid email address.');
      return;
    }

    try {
      if (mode === 'reset') {
        const msg = await resetPassword(trimmedEmail);
        setSuccess(msg);
        return;
      }

      if (!password || password.length < 6) {
        setError('Password must be at least 6 characters.');
        return;
      }

      if (mode === 'signup') {
        if (!displayName.trim()) {
          setError('Please enter your name or business name.');
          return;
        }
        if (password !== confirmPassword) {
          setError('Passwords do not match.');
          return;
        }
        await signUpWithEmail(trimmedEmail, password, displayName.trim());
      } else {
        await loginWithEmail(trimmedEmail, password);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Something went wrong.';
      setError(msg);
    }
  };

  const handleGoogle = async () => {
    setError('');
    setSuccess('');
    try {
      await loginWithGoogle();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Google sign-in failed.';
      setError(msg);
    }
  };

  return (
    <div className="min-h-screen w-full flex bg-slate-950 text-slate-800 font-sans selection:bg-blue-600/20">
      {/* Left brand panel */}
      <div className="hidden lg:flex lg:w-[46%] relative flex-col justify-between p-12 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-600 via-indigo-700 to-slate-950" />
        <div className="absolute inset-0">
          <div className="absolute top-16 left-8 w-80 h-80 rounded-full bg-sky-400/25 blur-3xl" />
          <div className="absolute bottom-10 right-0 w-[28rem] h-[28rem] rounded-full bg-violet-500/20 blur-3xl" />
          <div className="absolute top-1/2 left-1/3 w-40 h-40 rounded-full bg-emerald-400/10 blur-2xl" />
        </div>

        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-16">
            <div className="w-11 h-11 bg-white rounded-2xl flex items-center justify-center font-black text-blue-600 text-lg shadow-xl shadow-black/20">
              I
            </div>
            <div>
              <span className="text-xl font-extrabold text-white tracking-tight block leading-none">
                Invoicestack
              </span>
              <span className="text-[10px] text-blue-100/70 font-semibold uppercase tracking-wider">
                Modern billing OS
              </span>
            </div>
          </div>

          <h1 className="text-4xl xl:text-5xl font-black text-white leading-[1.1] mb-5 tracking-tight">
            Quotes to cash,
            <br />
            <span className="bg-gradient-to-r from-sky-200 to-white bg-clip-text text-transparent">
              beautifully simple.
            </span>
          </h1>
          <p className="text-blue-100/90 text-base leading-relaxed max-w-md">
            Professional quotations, invoices, inventory, and cash insights — designed for
            teams that move fast.
          </p>
        </div>

        <div className="relative z-10 space-y-4">
          {[
            {
              icon: FileSpreadsheet,
              title: 'Full billing suite',
              desc: 'Invoices, quotations, statements & payments',
            },
            {
              icon: Shield,
              title: 'Secure accounts',
              desc: 'Email signup/login with optional Google sign-in',
            },
            {
              icon: connectionMode === 'firestore' ? Cloud : HardDrive,
              title: connectionMode === 'firestore' ? 'Cloud sync' : 'Local mode',
              desc:
                connectionMode === 'firestore'
                  ? 'Live sync across devices via Firebase'
                  : 'Works offline — accounts stored in this browser',
            },
          ].map(({ icon: Icon, title, desc }) => (
            <div
              key={title}
              className="flex items-start gap-3 bg-white/10 backdrop-blur-sm border border-white/10 rounded-xl p-4"
            >
              <div className="w-9 h-9 rounded-lg bg-white/15 flex items-center justify-center shrink-0">
                <Icon className="w-4 h-4 text-white" />
              </div>
              <div>
                <p className="text-sm font-bold text-white">{title}</p>
                <p className="text-xs text-blue-100/80 mt-0.5">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Right form panel */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-10 gradient-mesh">
        <div className="w-full max-w-md animate-slide-up">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-2.5 mb-8">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl flex items-center justify-center font-black text-white shadow-lg shadow-blue-500/25">
              I
            </div>
            <span className="text-xl font-extrabold text-slate-900 tracking-tight">
              Invoicestack
            </span>
          </div>

          <div className="card-modern p-7 sm:p-8 shadow-xl shadow-slate-900/5">
            <div className="mb-6">
              <h2 className="text-xl font-black text-slate-900 tracking-tight">
                {mode === 'login' && 'Welcome back'}
                {mode === 'signup' && 'Create your account'}
                {mode === 'reset' && 'Reset password'}
              </h2>
              <p className="text-sm text-slate-500 mt-1.5">
                {mode === 'login' && 'Log in to access your invoices and ledger.'}
                {mode === 'signup' && 'Sign up free — no credit card required.'}
                {mode === 'reset' && 'We will email you a reset link (cloud mode).'}
              </p>
            </div>

            {/* Mode tabs (login / signup) */}
            {mode !== 'reset' && (
              <div className="flex bg-slate-100 rounded-lg p-1 mb-6">
                <button
                  type="button"
                  onClick={() => switchMode('login')}
                  className={`flex-1 py-2 text-xs font-bold rounded-md transition-all cursor-pointer ${
                    mode === 'login'
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  Log in
                </button>
                <button
                  type="button"
                  onClick={() => switchMode('signup')}
                  className={`flex-1 py-2 text-xs font-bold rounded-md transition-all cursor-pointer ${
                    mode === 'signup'
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  Sign up
                </button>
              </div>
            )}

            {error && (
              <div className="mb-4 flex items-start gap-2.5 bg-red-50 border border-red-100 text-red-700 text-xs rounded-lg p-3">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span className="leading-relaxed">{error}</span>
              </div>
            )}

            {success && (
              <div className="mb-4 flex items-start gap-2.5 bg-emerald-50 border border-emerald-100 text-emerald-700 text-xs rounded-lg p-3">
                <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                <span className="leading-relaxed">{success}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-3.5">
              {mode === 'signup' && (
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                    Name / Business
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      placeholder="Acme Trading Co."
                      autoComplete="name"
                      className="w-full pl-10 pr-3 py-2.5 text-sm border border-slate-200 rounded-lg bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                  Email
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@company.com"
                    autoComplete="email"
                    required
                    className="w-full pl-10 pr-3 py-2.5 text-sm border border-slate-200 rounded-lg bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all"
                  />
                </div>
              </div>

              {mode !== 'reset' && (
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                    Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Min. 6 characters"
                      autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                      required
                      minLength={6}
                      className="w-full pl-10 pr-10 py-2.5 text-sm border border-slate-200 rounded-lg bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                      tabIndex={-1}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>
              )}

              {mode === 'signup' && (
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                    Confirm password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Repeat password"
                      autoComplete="new-password"
                      required
                      minLength={6}
                      className="w-full pl-10 pr-3 py-2.5 text-sm border border-slate-200 rounded-lg bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all"
                    />
                  </div>
                </div>
              )}

              {mode === 'login' && cloudAuthAvailable && (
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => switchMode('reset')}
                    className="text-xs font-semibold text-blue-600 hover:text-blue-700 cursor-pointer"
                  >
                    Forgot password?
                  </button>
                </div>
              )}

              <button
                type="submit"
                disabled={authLoading}
                className="btn-primary w-full mt-1 !py-3 !text-sm"
              >
                {authLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Please wait…
                  </>
                ) : (
                  <>
                    {mode === 'login' && 'Log in'}
                    {mode === 'signup' && 'Create account'}
                    {mode === 'reset' && 'Send reset link'}
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

            {mode === 'reset' && (
              <button
                type="button"
                onClick={() => switchMode('login')}
                className="w-full mt-3 text-xs font-semibold text-slate-500 hover:text-slate-700 cursor-pointer"
              >
                ← Back to log in
              </button>
            )}

            {mode !== 'reset' && cloudAuthAvailable && (
              <>
                <div className="relative my-5">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-slate-150" />
                  </div>
                  <div className="relative flex justify-center text-[10px] uppercase tracking-wider">
                    <span className="bg-white px-3 text-slate-400 font-bold">or continue with</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleGoogle}
                  disabled={authLoading}
                  className="w-full flex items-center justify-center gap-2.5 border border-slate-200 hover:bg-slate-50 disabled:opacity-60 text-slate-700 font-semibold text-sm py-2.5 px-4 rounded-lg transition-all cursor-pointer"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" aria-hidden="true">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    />
                  </svg>
                  Google
                </button>
              </>
            )}

            {(!cloudAuthAvailable || usingLocalAuth) && (
              <p className="mt-4 text-[11px] text-center text-slate-400 leading-relaxed">
                Running in <strong className="text-slate-500">local account mode</strong> —
                accounts are stored in this browser. Full invoice features work offline.
                {connectionMode === 'local' && (
                  <> For cloud sync, open Firebase Console → Authentication → Get started → enable Email/Password.</>
                )}
              </p>
            )}
          </div>

          <p className="text-center text-[11px] text-slate-400 mt-6">
            By continuing you agree to use Invoicestack for legitimate business invoicing.
          </p>
        </div>
      </div>
    </div>
  );
};
