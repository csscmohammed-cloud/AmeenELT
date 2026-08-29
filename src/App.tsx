/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SettingsProvider } from './context/SettingsContext';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { Dashboard } from './pages/Dashboard';
import { Landing } from './pages/Landing';
import { MaterialView } from './pages/MaterialView';
import { Layout } from './components/Layout';
import { auth } from './firebase';
import { Clock, RefreshCw, CheckCircle2 } from 'lucide-react';

function ProtectedRoute({ children, requireRole }: { children: React.ReactNode, requireRole?: 'teacher' | 'student' }) {
  const { user, profile, loading, refreshProfile } = useAuth();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshSuccess, setRefreshSuccess] = useState(false);
  
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-500">
        <RefreshCw className="w-8 h-8 animate-spin text-teal-600 mb-3" />
        <p className="text-sm font-medium">Loading profile...</p>
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;
  if (requireRole && profile?.role !== requireRole) {
    return <Navigate to="/dashboard" replace />;
  }

  const isPending = profile != null && profile.role !== 'teacher' && profile.status !== 'approved' && profile.approved !== true;
  
  if (isPending) {
    const handleCheckStatus = async () => {
      setIsRefreshing(true);
      setRefreshSuccess(false);
      await refreshProfile();
      setIsRefreshing(false);
      setRefreshSuccess(true);
      setTimeout(() => setRefreshSuccess(false), 3000);
    };

    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50 dark:bg-slate-900 p-4">
        <div className="bg-white dark:bg-slate-800 p-8 rounded-2xl shadow-xl text-center max-w-md w-full border border-slate-200 dark:border-slate-700 space-y-5 animate-in fade-in zoom-in-95 duration-200">
          <div className="w-16 h-16 bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400 rounded-full flex items-center justify-center mx-auto shadow-sm">
            <Clock className="w-8 h-8 animate-pulse" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Account Pending Approval</h2>
            <p className="text-slate-600 dark:text-slate-400 text-sm mt-2">
              Your student account has been registered and is currently awaiting instructor approval. Once approved, your status will update in real time.
            </p>
          </div>

          <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/50 p-3.5 rounded-xl text-xs text-amber-800 dark:text-amber-300 flex items-center justify-center gap-2 font-medium">
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping shrink-0"></span>
            <span>Real-time sync active • Auto-redirecting on approval</span>
          </div>

          {refreshSuccess && (
            <div className="bg-teal-50 dark:bg-teal-950/40 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-900/50 p-2.5 rounded-xl text-xs flex items-center justify-center gap-1.5 font-semibold">
              <CheckCircle2 className="w-4 h-4 text-teal-600" />
              <span>Checked Firestore • Account still pending approval</span>
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <button
              onClick={handleCheckStatus}
              disabled={isRefreshing}
              className="flex-1 px-4 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-sm font-semibold transition-colors flex items-center justify-center gap-2 shadow-sm disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              {isRefreshing ? 'Checking Server...' : 'Check Status Now'}
            </button>
            <button 
              onClick={() => auth.signOut()}
              className="px-4 py-2.5 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-sm font-semibold hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
            >
              Sign Out
            </button>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

export default function App() {
  return (
    <AuthProvider>
      <SettingsProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/dashboard" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
              <Route index element={<Dashboard />} />
              <Route path="materials/:id" element={<MaterialView />} />
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </SettingsProvider>
    </AuthProvider>
  );
}
