import { useState } from 'react';
import { Outlet, Link, useNavigate } from 'react-router-dom';
import { LogOut, BookOpen, UserCircle, Settings, X, Moon, Sun, Volume2, VolumeX, Eye, Cpu, Sliders } from 'lucide-react';
import { auth } from '../firebase';
import { signOut } from 'firebase/auth';
import { useAuth } from '../context/AuthContext';
import { useSettings } from '../context/SettingsContext';
import { NotificationsDropdown } from './NotificationsDropdown';
import { AmeenLogo } from './AmeenLogo';
import { AIApiKeySettings } from './AIApiKeySettings';

export function Layout() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const { theme, setTheme, highContrast, setHighContrast, showAITutor, setShowAITutor, soundEffects, setSoundEffects } = useSettings();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [settingsTab, setSettingsTab] = useState<'general' | 'ai'>('general');

  const handleLogout = async () => {
    await signOut(auth);
    navigate('/login');
  };

  return (
    <div className={`min-h-screen flex flex-col transition-colors bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 ${highContrast ? 'contrast-125' : ''}`}>
      <header className="sticky top-0 z-30 hide-print transition-all backdrop-blur-md bg-white/95 dark:bg-slate-900/90 border-b border-slate-200/80 dark:border-slate-800/80 shadow-2xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link to="/dashboard" className="flex items-center gap-2 group">
            <AmeenLogo size="md" />
          </Link>
          
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="hidden sm:flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-full bg-slate-100/90 dark:bg-slate-800/90 border border-slate-200/60 dark:border-slate-700/60 text-slate-700 dark:text-slate-200 shadow-2xs">
              <UserCircle className="w-4 h-4 text-teal-600 dark:text-teal-400" />
              <span>{profile?.name}</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-teal-100 dark:bg-teal-950 text-teal-800 dark:text-teal-300 border border-teal-200/60 dark:border-teal-800/60">
                {profile?.role}
              </span>
            </div>
            
            <NotificationsDropdown />
            
            <button 
              onClick={() => setIsSettingsOpen(true)}
              className="p-2 rounded-xl transition-all text-slate-500 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-slate-100 dark:hover:bg-slate-800 cursor-pointer border border-transparent hover:border-slate-200 dark:hover:border-slate-700"
              title="Preferences & Settings"
            >
              <Settings className="w-5 h-5" />
            </button>
            
            <button 
              onClick={handleLogout}
              className="p-2 rounded-xl transition-all text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:text-slate-400 dark:hover:text-rose-400 dark:hover:bg-rose-950/40 cursor-pointer border border-transparent hover:border-rose-200 dark:hover:border-rose-900/40"
              title="Logout"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
        <Outlet />
      </main>

      {/* Settings Panel */}
      {isSettingsOpen && (
        <>
          <div className="fixed inset-0 bg-black/50 z-40 backdrop-blur-xs transition-opacity" onClick={() => setIsSettingsOpen(false)} />
          <div className={`fixed inset-y-0 right-0 ${profile?.role === 'teacher' ? 'w-full max-w-xl sm:max-w-2xl' : 'w-80'} shadow-2xl z-50 transform transition-transform bg-white border-l border-slate-200 dark:bg-slate-900 dark:border-slate-800 flex flex-col`}>
            <div className="flex items-center justify-between p-4 sm:px-6 border-b border-slate-200 dark:border-slate-800 shrink-0">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-teal-50 text-teal-600 dark:bg-teal-950/60 dark:text-teal-400">
                  <Settings className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-900 dark:text-white">Settings & Configuration</h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Manage your workspace preferences</p>
                </div>
              </div>
              <button 
                onClick={() => setIsSettingsOpen(false)} 
                className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Teacher Tabs */}
            {profile?.role === 'teacher' && (
              <div className="flex border-b border-slate-200 dark:border-slate-800 px-6 pt-2 shrink-0 bg-slate-50/50 dark:bg-slate-900/50">
                <button
                  onClick={() => setSettingsTab('general')}
                  className={`flex items-center gap-2 py-3 px-4 text-sm font-semibold border-b-2 transition-all ${
                    settingsTab === 'general'
                      ? 'border-teal-600 text-teal-600 dark:text-teal-400'
                      : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
                  }`}
                >
                  <Sliders className="w-4 h-4" />
                  Preferences
                </button>
                <button
                  onClick={() => setSettingsTab('ai')}
                  className={`flex items-center gap-2 py-3 px-4 text-sm font-semibold border-b-2 transition-all ${
                    settingsTab === 'ai'
                      ? 'border-teal-600 text-teal-600 dark:text-teal-400'
                      : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
                  }`}
                >
                  <Cpu className="w-4 h-4 text-teal-600" />
                  AI API Key & Engine
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-teal-100 text-teal-700 dark:bg-teal-950 dark:text-teal-300 font-bold uppercase">
                    Config
                  </span>
                </button>
              </div>
            )}
            
            <div className="p-6 overflow-y-auto flex-1 space-y-6">
              {settingsTab === 'ai' && profile?.role === 'teacher' ? (
                <AIApiKeySettings onClose={() => setIsSettingsOpen(false)} />
              ) : (
                <>
                  <div className="space-y-4">
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Appearance</h3>
                    
                    <div className="space-y-3">
                      <span className="block text-sm text-slate-700 dark:text-slate-300">Theme</span>
                      <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
                        <button 
                          onClick={() => setTheme('light')}
                          className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${theme === 'light' ? 'bg-white text-teal-600 shadow-sm dark:bg-slate-700 dark:text-teal-400' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'}`}
                        >
                          <Sun className="w-4 h-4" /> Light
                        </button>
                        <button 
                          onClick={() => setTheme('dark')}
                          className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-md text-sm font-medium transition-colors ${theme === 'dark' ? 'bg-white text-teal-600 shadow-sm dark:bg-slate-700 dark:text-teal-400' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'}`}
                        >
                          <Moon className="w-4 h-4" /> Dark
                        </button>
                        <button 
                          onClick={() => setTheme('system')}
                          className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-md text-sm font-medium transition-colors ${theme === 'system' ? 'bg-white text-teal-600 shadow-sm dark:bg-slate-700 dark:text-teal-400' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'}`}
                        >
                          <Settings className="w-4 h-4" /> System
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Eye className="w-5 h-5 text-slate-500 dark:text-slate-400" />
                        <span>High Contrast</span>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" className="sr-only peer" checked={highContrast} onChange={(e) => setHighContrast(e.target.checked)} />
                        <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-teal-300 dark:peer-focus:ring-teal-800 rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-slate-600 peer-checked:bg-teal-600"></div>
                      </label>
                    </div>
                  </div>

                  <div className="space-y-4 pt-4 border-t border-slate-200 dark:border-slate-700">
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Learning Tools</h3>
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {soundEffects ? <Volume2 className="w-5 h-5 text-slate-500 dark:text-slate-400" /> : <VolumeX className="w-5 h-5 text-slate-500 dark:text-slate-400" />}
                        <span>Sound Effects</span>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" className="sr-only peer" checked={soundEffects} onChange={(e) => setSoundEffects(e.target.checked)} />
                        <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-teal-300 dark:peer-focus:ring-teal-800 rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-slate-600 peer-checked:bg-teal-600"></div>
                      </label>
                    </div>

                    {profile?.role === 'student' && (
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`w-5 h-5 flex items-center justify-center rounded-full bg-teal-100 text-teal-600 text-xs font-bold`}>AI</div>
                          <span>AI Tutor Button</span>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input type="checkbox" className="sr-only peer" checked={showAITutor} onChange={(e) => setShowAITutor(e.target.checked)} />
                          <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-teal-300 dark:peer-focus:ring-teal-800 rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-slate-600 peer-checked:bg-teal-600"></div>
                        </label>
                      </div>
                    )}
                  </div>

                  {profile?.role === 'teacher' && (
                    <div className="p-4 rounded-2xl bg-teal-50/70 dark:bg-teal-950/30 border border-teal-100 dark:border-teal-900/60 flex items-center justify-between gap-3">
                      <div className="space-y-0.5">
                        <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                          <Cpu className="w-4 h-4 text-teal-600" />
                          AI API Key & Provider
                        </h4>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          Configure or replace cancelled AI keys
                        </p>
                      </div>
                      <button
                        onClick={() => setSettingsTab('ai')}
                        className="px-3 py-1.5 text-xs font-bold text-teal-700 dark:text-teal-300 bg-white dark:bg-slate-800 border border-teal-200 dark:border-teal-800 rounded-xl hover:bg-teal-50 dark:hover:bg-slate-700 transition-colors shadow-2xs"
                      >
                        Manage Key
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
