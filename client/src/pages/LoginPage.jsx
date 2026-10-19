import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Eye, EyeOff, Lock, Mail, AlertCircle, ArrowRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { Layout, ComponentLayout } from '../components/layout/index.js';

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const from = location.state?.from?.pathname || '/';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setIsSubmitting(true);

    try {
      await login({ email: email.trim(), password });
      navigate(from, { replace: true });
    } catch (err) {
      setErrorMessage(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Layout maxWidth="md" centered>
      <ComponentLayout padding="normal" className="shadow-xl space-y-6">
        {/* Header */}
        <div className="text-center space-y-1">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#C74732] to-[#702C35] text-white flex items-center justify-center mx-auto shadow-sm mb-3 border border-white/20">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 2C7.58 2 4 5.58 4 10C4 15.5 12 22 12 22C12 22 20 15.5 20 10C20 5.58 16.42 2 12 2Z" fill="white" fillOpacity="0.25" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M9 14V11C9 9.34315 10.3431 8 12 8C13.6569 8 15 9.34315 15 11V14" stroke="white" strokeWidth="2" strokeLinecap="round"/>
              <circle cx="12" cy="6" r="1.5" fill="white"/>
            </svg>
          </div>
          <span className="text-[11px] font-bold text-[#B58B45] uppercase tracking-widest">
            শারদোৎসব ২০২৬
          </span>
          <h1 className="text-2xl font-serif font-bold text-stone-900 dark:text-stone-100 tracking-tight">
            Welcome to PandalGo
          </h1>
          <p className="text-xs text-stone-600 dark:text-stone-400">
            Log in to view live crowd intelligence and share your Puja pandal moments.
          </p>
        </div>

        {errorMessage && (
          <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 rounded-xl text-xs text-rose-700 dark:text-rose-400 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 dark:text-rose-400 mt-0.5" />
            <span>{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400 mb-1.5">
              Email Address
            </label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400 dark:text-stone-500" />
              <input
                type="email"
                required
                autoComplete="email"
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 text-sm bg-[#F4EBDD]/50 dark:bg-[#2A2420] border border-[#E8DEC8] dark:border-[#3A322B] text-stone-900 dark:text-stone-100 placeholder:text-stone-400 dark:placeholder:text-stone-500 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#C74732]"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400 mb-1.5">
              Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400 dark:text-stone-500" />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                autoComplete="current-password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-10 py-2.5 text-sm bg-[#F4EBDD]/50 dark:bg-[#2A2420] border border-[#E8DEC8] dark:border-[#3A322B] text-stone-900 dark:text-stone-100 placeholder:text-stone-400 dark:placeholder:text-stone-500 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#C74732]"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-stone-400 dark:text-stone-500 hover:text-stone-600 dark:hover:text-stone-300"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3 rounded-xl bg-[#C74732] hover:bg-[#991B1B] text-white font-bold text-sm shadow-md disabled:opacity-50 transition-all flex items-center justify-center gap-2 mt-2"
          >
            <span>{isSubmitting ? 'Signing In...' : 'Sign In'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <div className="pt-2 text-center text-xs text-stone-500 dark:text-stone-400 border-t border-[#E8DEC8]/80 dark:border-[#3A322B]">
          Don't have an account yet?{' '}
          <Link to="/register" className="font-bold text-[#C74732] hover:text-[#991B1B] dark:text-[#E07A5F] hover:underline">
            Register here
          </Link>
        </div>
      </ComponentLayout>
    </Layout>
  );
}
