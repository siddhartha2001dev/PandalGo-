import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { ShieldAlert, Compass } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.jsx';

/**
 * Production-grade ProtectedRoute component.
 * Supports authentication protection and role-based (admin) authorization.
 */
export function ProtectedRoute({ children, adminOnly = false }) {
  const { user, isAdmin, isLoading } = useAuth();
  const location = useLocation();

  // 1. Show centered loading indicator while validating authentication session
  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-3 p-4">
        <div className="w-10 h-10 border-3 border-stone-200 dark:border-stone-800 border-t-festival-600 rounded-full animate-spin" />
        <p className="text-xs font-semibold text-stone-500 dark:text-stone-400">
          Verifying credentials...
        </p>
      </div>
    );
  }

  // 2. Redirect unauthenticated users to login with return path
  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // 3. Admin authorization check
  if (adminOnly && !isAdmin) {
    return (
      <div className="max-w-md mx-auto my-12 p-6 sm:p-8 bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 shadow-sm text-center space-y-4">
        <div className="w-14 h-14 rounded-2xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 flex items-center justify-center mx-auto">
          <ShieldAlert className="w-7 h-7" />
        </div>
        <h2 className="text-lg font-bold text-stone-900 dark:text-stone-100">
          Administrator Access Required
        </h2>
        <p className="text-xs text-stone-600 dark:text-stone-400 leading-relaxed">
          You are signed in as <strong>{user.email || user.name}</strong>, but this portal is reserved for verified PandalGo administrators.
        </p>
        <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-2">
          <a
            href="/"
            className="w-full sm:w-auto px-4 py-2 rounded-xl bg-festival-600 hover:bg-festival-700 text-white font-bold text-xs transition-colors"
          >
            Return to Map
          </a>
          <a
            href="/profile"
            className="w-full sm:w-auto px-4 py-2 rounded-xl bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-300 font-bold text-xs transition-colors"
          >
            View Your Profile
          </a>
        </div>
      </div>
    );
  }

  // 4. Authorized
  return children;
}

export default ProtectedRoute;
