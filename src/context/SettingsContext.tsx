import React, { createContext, useContext, useEffect, useState } from 'react';

type Theme = 'light' | 'dark' | 'system';

interface SettingsContextType {
  theme: Theme;
  setTheme: (value: Theme) => void;
  highContrast: boolean;
  setHighContrast: (value: boolean) => void;
  showAITutor: boolean;
  setShowAITutor: (value: boolean) => void;
  soundEffects: boolean;
  setSoundEffects: (value: boolean) => void;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>(() => {
    const saved = localStorage.getItem('settings_theme');
    return (saved as Theme) || 'system';
  });
  
  const [highContrast, setHighContrast] = useState(() => {
    const saved = localStorage.getItem('settings_highContrast');
    return saved ? JSON.parse(saved) : false;
  });
  
  const [showAITutor, setShowAITutor] = useState(() => {
    const saved = localStorage.getItem('settings_showAITutor');
    return saved ? JSON.parse(saved) : true;
  });
  
  const [soundEffects, setSoundEffects] = useState(() => {
    const saved = localStorage.getItem('settings_soundEffects');
    return saved ? JSON.parse(saved) : true;
  });

  useEffect(() => {
    localStorage.setItem('settings_theme', theme);
    
    const applyTheme = () => {
      const isDark = 
        theme === 'dark' || 
        (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
        
      if (isDark) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    };
    
    applyTheme();
    
    if (theme === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const listener = () => applyTheme();
      mediaQuery.addEventListener('change', listener);
      return () => mediaQuery.removeEventListener('change', listener);
    }
  }, [theme]);

  useEffect(() => {
    localStorage.setItem('settings_highContrast', JSON.stringify(highContrast));
    if (highContrast) {
      document.documentElement.classList.add('contrast-more');
    } else {
      document.documentElement.classList.remove('contrast-more');
    }
  }, [highContrast]);

  useEffect(() => {
    localStorage.setItem('settings_showAITutor', JSON.stringify(showAITutor));
  }, [showAITutor]);
  
  useEffect(() => {
    localStorage.setItem('settings_soundEffects', JSON.stringify(soundEffects));
  }, [soundEffects]);

  return (
    <SettingsContext.Provider value={{
      theme, setTheme,
      highContrast, setHighContrast,
      showAITutor, setShowAITutor,
      soundEffects, setSoundEffects
    }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
}

