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
    password: '',
  });

  const [submitting, setSubmitting] = useState(false);

  const title = useMemo(
    () => (isRegister ? 'Create your account' : 'Welcome back'),
    [isRegister]
  );

  async function handleSubmit(event) {
    event.preventDefault();
    setSubmitting(true);

    try {
      if (isRegister) {
        await register(form);
        pushToast('Account created successfully');
      } else {
        await login({
          email: form.email,
          password: form.password,
        });
        pushToast('Logged in successfully');
      }

      navigate('/chat', { replace: true });
    } catch (error) {
      const message =
        error?.response?.data?.message ||
        error?.message ||
        'Authentication failed';

      pushToast(message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-wa-bg px-4 py-8 text-white">
      {/* Background Glow */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(37,211,102,0.18),transparent_24%),radial-gradient(circle_at_bottom_right,rgba(18,140,126,0.16),transparent_28%)]" />

      {/* Centered Form Card */}
      <section className="glass-card relative w-full max-w-md rounded-[2rem] p-8 shadow-soft">
        <div className="text-center">
          <p className="text-xs uppercase tracking-[0.3em] text-slate-400">
            Secure Access
          </p>

          <h2 className="mt-3 text-3xl font-bold">
            {title}
          </h2>

          <p className="mt-2 text-sm text-slate-400">
            {isRegister
              ? 'Join and start chatting instantly'
              : 'Sign in to continue'}
          </p>
        </div>

        <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
          {isRegister && (
            <label className="block">
              <span className="mb-2 flex items-center gap-2 text-sm text-slate-300">
                <FiUser />
                Username
              </span>

              <input
                type="text"
                value={form.username}
                onChange={(e) =>
                  setForm((current) => ({
                    ...current,
                    username: e.target.value,
                  }))
                }
                placeholder="Enter username"
                className="w-full rounded-2xl border border-white/10 bg-[#111b21] px-4 py-3 text-white outline-none transition focus:border-wa-accent"
              />
            </label>
          )}

          <label className="block">
            <span className="mb-2 flex items-center gap-2 text-sm text-slate-300">
              <FiMail />
              Email
            </span>

            <input
              type="email"
              value={form.email}
              onChange={(e) =>
                setForm((current) => ({
                  ...current,
                  email: e.target.value,
                }))
              }
              placeholder="you@example.com"
              className="w-full rounded-2xl border border-white/10 bg-[#111b21] px-4 py-3 text-white outline-none transition focus:border-wa-accent"
            />
          </label>

          <label className="block">
            <span className="mb-2 flex items-center gap-2 text-sm text-slate-300">
              <FiLock />
              Password
            </span>

            <input
              type="password"
              value={form.password}
              onChange={(e) =>
                setForm((current) => ({
                  ...current,
                  password: e.target.value,
                }))
              }
              placeholder="Enter password"
              className="w-full rounded-2xl border border-white/10 bg-[#111b21] px-4 py-3 text-white outline-none transition focus:border-wa-accent"
            />
          </label>

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-2xl bg-wa-accent py-3 font-semibold text-wa-surface transition hover:bg-wa-accentDark disabled:cursor-not-allowed disabled:opacity-70"
          >
            {submitting
              ? 'Please wait...'
              : isRegister
              ? 'Create Account'
              : 'Login'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-400">
          {isRegister
            ? 'Already have an account?'
            : "Don't have an account?"}{' '}
          <Link
            to={isRegister ? '/login' : '/register'}
            className="font-medium text-wa-accent hover:underline"
          >
            {isRegister ? 'Sign In' : 'Register'}
          </Link>
        </p>
      </section>
    </div>
  );
}