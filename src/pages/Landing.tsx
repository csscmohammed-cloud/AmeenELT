import React from 'react';
import { Link, Navigate } from 'react-router-dom';
import { BookOpen, Sparkles, BrainCircuit, Mic, ArrowRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { AmeenLogo } from '../components/AmeenLogo';

export function Landing() {
  const { user, loading } = useAuth();

  if (loading) return (
    <div className="min-h-screen bg-white dark:bg-slate-950 flex items-center justify-center text-slate-500 font-medium">
      <div className="w-8 h-8 border-3 border-teal-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="min-h-screen bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans selection:bg-teal-500 selection:text-white relative overflow-hidden">
      {/* Background Decorative Ambient Glows */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-teal-500/10 dark:bg-teal-500/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/3 right-10 w-[400px] h-[400px] bg-indigo-500/10 dark:bg-indigo-500/15 rounded-full blur-3xl pointer-events-none" />

      {/* Header Navigation */}
      <header className="sticky top-0 z-50 backdrop-blur-md bg-white/70 dark:bg-slate-900/70 border-b border-slate-200/60 dark:border-slate-800/60">
        <nav className="flex items-center justify-between p-4 sm:px-8 max-w-7xl mx-auto" aria-label="Global">
          <div className="flex lg:flex-1">
            <Link to="/" className="flex items-center gap-2 group">
              <AmeenLogo size="lg" />
            </Link>
          </div>
          <div className="flex flex-1 justify-end items-center gap-4 sm:gap-6">
            {!user ? (
              <>
                <Link to="/login" className="text-sm font-semibold text-slate-700 dark:text-slate-200 hover:text-teal-600 dark:hover:text-teal-400 transition-colors">
                  Log in
                </Link>
                <Link
                  to="/register"
                  className="rounded-xl bg-gradient-to-r from-teal-600 to-teal-500 hover:from-teal-500 hover:to-teal-400 px-5 py-2.5 text-sm font-bold text-white shadow-md shadow-teal-600/20 transition-all hover:scale-[1.02] cursor-pointer"
                >
                  Sign up <span aria-hidden="true" className="ml-1">→</span>
                </Link>
              </>
            ) : (
              <Link
                to="/dashboard"
                className="rounded-xl bg-gradient-to-r from-teal-600 to-teal-500 hover:from-teal-500 hover:to-teal-400 px-5 py-2.5 text-sm font-bold text-white shadow-md shadow-teal-600/20 transition-all hover:scale-[1.02]"
              >
                Go to Dashboard <span aria-hidden="true" className="ml-1">→</span>
              </Link>
            )}
          </div>
        </nav>
      </header>

      {/* Hero section */}
      <div className="relative pt-12 pb-20 lg:pt-20 lg:pb-32">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="mx-auto max-w-3xl text-center space-y-6">
            {/* Pill Chip */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-teal-50 dark:bg-teal-950/80 border border-teal-200/80 dark:border-teal-800/80 text-teal-800 dark:text-teal-300 text-xs font-semibold shadow-2xs">
              <Sparkles className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400 animate-pulse" />
              <span>Next-Generation English Language Learning & Assessment</span>
            </div>

            <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-slate-900 dark:text-white leading-[1.15]">
              Empower Teaching & <span className="bg-gradient-to-r from-teal-600 via-emerald-500 to-cyan-600 bg-clip-text text-transparent">Master English</span> with AI
            </h1>

            <p className="text-base sm:text-lg text-slate-600 dark:text-slate-300 leading-relaxed font-normal max-w-2xl mx-auto">
              An intelligent workspace connecting educators and learners. Generate AI-powered quizzes, practice real-time pronunciation with instant phonetic feedback, and interact with adaptive course modules.
            </p>

            <div className="pt-4 flex flex-wrap items-center justify-center gap-4">
              {!user ? (
                <>
                  <Link
                    to="/register"
                    className="rounded-xl bg-teal-600 hover:bg-teal-500 px-7 py-3.5 text-base font-bold text-white shadow-lg shadow-teal-600/25 transition-all hover:-translate-y-0.5"
                  >
                    Get started for free
                  </Link>
                  <Link 
                    to="/login" 
                    className="rounded-xl px-6 py-3.5 text-base font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800/60 border border-slate-200 dark:border-slate-800 transition-all flex items-center gap-2 group"
                  >
                    Teacher Portal <ArrowRight className="w-4 h-4 text-teal-600 group-hover:translate-x-1 transition-transform" />
                  </Link>
                </>
              ) : (
                <Link
                  to="/dashboard"
                  className="rounded-xl bg-teal-600 hover:bg-teal-500 px-8 py-3.5 text-base font-bold text-white shadow-lg shadow-teal-600/25 transition-all hover:-translate-y-0.5"
                >
                  Go to Dashboard
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Feature section */}
      <div className="max-w-7xl mx-auto px-6 lg:px-8 pb-24">
        <div className="text-center max-w-2xl mx-auto mb-16 space-y-3">
          <h2 className="text-xs font-extrabold uppercase tracking-widest text-teal-600 dark:text-teal-400">
            Comprehensive Suite
          </h2>
          <p className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white">
            Designed for Modern Educators & Active Learners
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="glass-card-hover p-8 rounded-2xl flex flex-col items-start space-y-4 relative group">
            <div className="p-3.5 rounded-xl bg-teal-50 dark:bg-teal-950/80 border border-teal-100 dark:border-teal-900/50 text-teal-600 dark:text-teal-400 group-hover:scale-110 transition-transform">
              <BrainCircuit className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 dark:text-white">
              AI Quiz & Course Builder
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
              Instantly create custom quizzes, listening exercises, and interactive grammar modules tailored to student learning levels.
            </p>
          </div>

          <div className="glass-card-hover p-8 rounded-2xl flex flex-col items-start space-y-4 relative group">
            <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/80 border border-emerald-100 dark:border-emerald-900/50 text-emerald-600 dark:text-emerald-400 group-hover:scale-110 transition-transform">
              <Mic className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 dark:text-white">
              Speech & Pronunciation AI
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
              Record spoken attempts and receive automated phonetic evaluations, pacing feedback, and personalized pronunciation tips.
            </p>
          </div>

          <div className="glass-card-hover p-8 rounded-2xl flex flex-col items-start space-y-4 relative group">
            <div className="p-3.5 rounded-xl bg-cyan-50 dark:bg-cyan-950/80 border border-cyan-100 dark:border-cyan-900/50 text-cyan-600 dark:text-cyan-400 group-hover:scale-110 transition-transform">
              <Sparkles className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 dark:text-white">
              Interactive Learning Canvas
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
              Engage with matching pairs, fill-in-the-blank cards, sentence builders, and role-play simulations designed for fluency.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
