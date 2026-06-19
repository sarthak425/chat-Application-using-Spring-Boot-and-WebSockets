import { useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { FiMail, FiLock, FiUser } from 'react-icons/fi';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

export default function AuthPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { login, register } = useAuth();
  const { pushToast } = useToast();
  const isRegister = location.pathname.includes('register');

  const [form, setForm] = useState({
    username: '',
    email: '',
    password: ''
  });
  const [submitting, setSubmitting] = useState(false);

  const title = useMemo(() => (isRegister ? 'Create your account' : 'Welcome back'), [isRegister]);

  async function handleSubmit(event) {
    event.preventDefault();
    setSubmitting(true);

    try {
      if (isRegister) {
        await register(form);
        pushToast('Account created successfully');
      } else {
        await login({ email: form.email, password: form.password });
        pushToast('Logged in successfully');
      }

      navigate('/chat', { replace: true });
    } catch (error) {
      const message = error?.response?.data?.message || error?.message || 'Authentication failed';
      pushToast(message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-wa-bg px-4 py-10 text-white">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(37,211,102,0.18),transparent_24%),radial-gradient(circle_at_bottom_right,rgba(18,140,126,0.16),transparent_28%)]" />
      <div className="relative grid w-full max-w-6xl gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <section className="glass-card rounded-[2rem] p-8 shadow-soft lg:p-10">
          <p className="text-xs uppercase tracking-[0.4em] text-wa-accent">ChatBox</p>
          <h1 className="mt-4 font-display text-4xl font-bold leading-tight sm:text-5xl">
            WhatsApp-inspired messaging for real conversations.
          </h1>
          <p className="mt-5 max-w-2xl text-sm leading-7 text-slate-300 sm:text-base">
            Secure login, instant delivery, read receipts, voice notes, attachments, presence, and a clean mobile-first
            chat experience.
          </p>

          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            {[
              'JWT authentication',
              'Real-time WebSocket chat',
              'Unread counters',
              'Dark/light mode'
            ].map((item) => (
              <div key={item} className="rounded-3xl border border-white/10 bg-white/5 px-4 py-4 text-sm text-slate-200">
                {item}
              </div>
            ))}
          </div>
        </section>

        <section className="glass-card rounded-[2rem] p-6 shadow-soft sm:p-8">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Secure access</p>
              <h2 className="mt-2 font-display text-3xl font-semibold">{title}</h2>
            </div>
            <div className="rounded-full bg-wa-accent/15 px-4 py-2 text-sm text-wa-accent">
              {isRegister ? 'Sign up' : 'Sign in'}
            </div>
          </div>

          <form className="mt-8 space-y-4" onSubmit={handleSubmit}>
            {isRegister ? (
              <label className="block">
                <span className="mb-2 flex items-center gap-2 text-sm text-slate-300">
                  <FiUser /> Username
                </span>
                <input
                  className="w-full rounded-2xl border border-white/10 bg-[#111b21] px-4 py-3 text-white outline-none placeholder:text-slate-500 focus:border-wa-accent"
                  value={form.username}
                  onChange={(event) => setForm((current) => ({ ...current, username: event.target.value }))}
                  placeholder="Your name"
                />
              </label>
            ) : null}

            <label className="block">
              <span className="mb-2 flex items-center gap-2 text-sm text-slate-300">
                <FiMail /> Email
              </span>
              <input
                type="email"
                className="w-full rounded-2xl border border-white/10 bg-[#111b21] px-4 py-3 text-white outline-none placeholder:text-slate-500 focus:border-wa-accent"
                value={form.email}
                onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
                placeholder="you@example.com"
              />
            </label>

            <label className="block">
              <span className="mb-2 flex items-center gap-2 text-sm text-slate-300">
                <FiLock /> Password
              </span>
              <input
                type="password"
                className="w-full rounded-2xl border border-white/10 bg-[#111b21] px-4 py-3 text-white outline-none placeholder:text-slate-500 focus:border-wa-accent"
                value={form.password}
                onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))}
                placeholder="Minimum 8 characters"
              />
            </label>

            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-2xl bg-wa-accent px-4 py-3 font-semibold text-wa-surface transition hover:bg-wa-accentDark disabled:cursor-not-allowed disabled:opacity-70"
            >
              {submitting ? 'Please wait...' : isRegister ? 'Create account' : 'Login'}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-slate-400">
            {isRegister ? 'Already have an account?' : "Don't have an account?"}{' '}
            <Link to={isRegister ? '/login' : '/register'} className="text-wa-accent hover:underline">
              {isRegister ? 'Sign in' : 'Register'}
            </Link>
          </p>
        </section>
      </div>
    </div>
  );
}
