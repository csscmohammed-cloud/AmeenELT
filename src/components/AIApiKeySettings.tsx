import React, { useState, useEffect } from 'react';
import { 
  Key, 
  Sparkles, 
  CheckCircle2, 
  AlertCircle, 
  RefreshCw, 
  ExternalLink, 
  Eye, 
  EyeOff, 
  Cpu, 
  Zap, 
  ShieldCheck, 
  RotateCcw, 
  Check, 
  Copy,
  Server,
  Globe,
  LifeBuoy,
  Layers,
  ArrowRight
} from 'lucide-react';
import { AIConfigResponse, AIProvider, AICustomBackupConfig } from '../types';

interface AIApiKeySettingsProps {
  onClose?: () => void;
  standalone?: boolean;
}

export function AIApiKeySettings({ onClose, standalone = false }: AIApiKeySettingsProps) {
  const [config, setConfig] = useState<AIConfigResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Primary Form State (OpenRouter / Custom)
  const [selectedProvider, setSelectedProvider] = useState<AIProvider>('openrouter');
  const [apiKey, setApiKey] = useState('');
  const [selectedModel, setSelectedModel] = useState('google/gemini-2.5-flash');
  const [customModel, setCustomModel] = useState('');
  const [baseUrl, setBaseUrl] = useState('https://openrouter.ai/api/v1');
  const [showKey, setShowKey] = useState(false);
  const [copiedKey, setCopiedKey] = useState(false);

  // Backup Failover State
  const [backupEnabled, setBackupEnabled] = useState(false);
  const [backupApiKey, setBackupApiKey] = useState('');
  const [backupBaseUrl, setBackupBaseUrl] = useState('https://api.openai.com/v1');
  const [backupModel, setBackupModel] = useState('gpt-4o-mini');
  const [showBackupKey, setShowBackupKey] = useState(false);
  const [backupName, setBackupName] = useState('Custom Backup Endpoint');

  // Action states for Primary Test
  const [isTestingPrimary, setIsTestingPrimary] = useState(false);
  const [primaryTestResult, setPrimaryTestResult] = useState<{
    success: boolean;
    latencyMs?: number;
    reply?: string;
    message?: string;
    error?: string;
  } | null>(null);

  // Action states for Backup Test
  const [isTestingBackup, setIsTestingBackup] = useState(false);
  const [backupTestResult, setBackupTestResult] = useState<{
    success: boolean;
    latencyMs?: number;
    reply?: string;
    message?: string;
    error?: string;
  } | null>(null);

  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isResetting, setIsResetting] = useState(false);

  const fetchAIConfig = async () => {
    try {
      setLoading(true);
      setFetchError(null);
      const res = await fetch('/api/ai-config');
      if (!res.ok) throw new Error(`Failed to load AI config (${res.status})`);
      const data: AIConfigResponse = await res.json();
      setConfig(data);
      setSelectedProvider(data.provider || 'openrouter');
      setSelectedModel(data.model || 'google/gemini-2.5-flash');
      setBaseUrl(data.baseUrl || 'https://openrouter.ai/api/v1');

      // Check if current model is outside default presets
      const openrouterPreset = data.availableProviders?.find(p => p.id === 'openrouter');
      if (openrouterPreset && !openrouterPreset.models.includes(data.model) && data.model !== openrouterPreset.defaultModel) {
        setCustomModel(data.model);
      }

      // Populate backup config
      if (data.backupConfig) {
        setBackupEnabled(Boolean(data.backupConfig.enabled));
        setBackupBaseUrl(data.backupConfig.baseUrl || 'https://api.openai.com/v1');
        setBackupModel(data.backupConfig.model || 'gpt-4o-mini');
        setBackupName(data.backupConfig.name || 'Custom Backup Endpoint');
      }
    } catch (err: any) {
      console.error('Error loading AI config:', err);
      setFetchError(err.message || 'Failed to load AI configuration');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAIConfig();
  }, []);

  const openrouterProviderData = config?.availableProviders?.find(p => p.id === 'openrouter');

  const handleTestPrimary = async () => {
    setIsTestingPrimary(true);
    setPrimaryTestResult(null);
    setSaveSuccess(null);
    setSaveError(null);

    const activeModel = customModel.trim() || selectedModel;

    try {
      const res = await fetch('/api/test-ai-key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: selectedProvider,
          apiKey: apiKey.trim(),
          model: activeModel,
          baseUrl: baseUrl.trim(),
          isBackupTest: false
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setPrimaryTestResult({
          success: false,
          latencyMs: data.latencyMs,
          error: data.error || 'Connection failed. Please check your OpenRouter API key.'
        });
      } else {
        setPrimaryTestResult({
          success: true,
          latencyMs: data.latencyMs,
          reply: data.reply,
          message: data.message || 'OpenRouter API verified successfully!'
        });
      }
    } catch (err: any) {
      setPrimaryTestResult({
        success: false,
        error: err.message || 'Network error occurred while testing OpenRouter API key'
      });
    } finally {
      setIsTestingPrimary(false);
    }
  };

  const handleTestBackup = async () => {
    setIsTestingBackup(true);
    setBackupTestResult(null);
    setSaveSuccess(null);
    setSaveError(null);

    try {
      const res = await fetch('/api/test-ai-key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: 'custom',
          apiKey: backupApiKey.trim(),
          model: backupModel.trim() || 'gpt-4o-mini',
          baseUrl: backupBaseUrl.trim() || 'https://api.openai.com/v1',
          isBackupTest: true
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setBackupTestResult({
          success: false,
          latencyMs: data.latencyMs,
          error: data.error || 'Connection to Custom Backup API failed.'
        });
      } else {
        setBackupTestResult({
          success: true,
          latencyMs: data.latencyMs,
          reply: data.reply,
          message: data.message || 'Custom Backup API verified successfully!'
        });
      }
    } catch (err: any) {
      setBackupTestResult({
        success: false,
        error: err.message || 'Network error occurred while testing backup API key'
      });
    } finally {
      setIsTestingBackup(false);
    }
  };

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsSaving(true);
    setSaveSuccess(null);
    setSaveError(null);

    const activeModel = customModel.trim() || selectedModel;

    try {
      const res = await fetch('/api/ai-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: selectedProvider,
          apiKey: apiKey.trim(),
          model: activeModel,
          baseUrl: baseUrl.trim(),
          backupConfig: {
            enabled: backupEnabled,
            apiKey: backupApiKey.trim(),
            baseUrl: backupBaseUrl.trim(),
            model: backupModel.trim(),
            name: backupName.trim()
          }
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to save configuration');
      }

      setSaveSuccess(`AI settings updated! Primary: OpenRouter (${activeModel})${backupEnabled ? ' with Custom Backup Failover enabled.' : '.'}`);
      setApiKey(''); // Clear entered raw key for security
      setBackupApiKey('');
      fetchAIConfig();
    } catch (err: any) {
      setSaveError(err.message || 'Failed to update AI settings');
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = async () => {
    if (!window.confirm('Are you sure you want to reset the AI configuration to the system defaults?')) {
      return;
    }

    setIsResetting(true);
    setSaveSuccess(null);
    setSaveError(null);
    setPrimaryTestResult(null);
    setBackupTestResult(null);

    try {
      const res = await fetch('/api/reset-ai-key', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Reset failed');
      setSaveSuccess('AI configuration reset to system default!');
      setApiKey('');
      setBackupApiKey('');
      fetchAIConfig();
    } catch (err: any) {
      setSaveError(err.message || 'Failed to reset AI settings');
    } finally {
      setIsResetting(false);
    }
  };

  const handleCopyMaskedKey = () => {
    if (config?.maskedKey) {
      navigator.clipboard.writeText(config.maskedKey);
      setCopiedKey(true);
      setTimeout(() => setCopiedKey(false), 2000);
    }
  };

  if (loading) {
    return (
      <div className="p-8 flex flex-col items-center justify-center space-y-3">
        <div className="w-8 h-8 border-3 border-teal-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm font-medium text-slate-500">Loading AI Engine configuration...</p>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${standalone ? 'max-w-4xl mx-auto' : ''}`}>
      {/* Header with Title & Status */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-teal-50 text-teal-600 dark:bg-teal-950/50 dark:text-teal-400 border border-teal-200 dark:border-teal-800">
              <Cpu className="w-5 h-5" />
            </div>
            AI Engine & API Settings
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Powered by <strong>OpenRouter</strong> with seamless support for a <strong>Custom Backup API</strong> in case your key is cancelled or credits run out.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={fetchAIConfig}
            title="Refresh Status"
            className="p-2 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          {onClose && (
            <button
              onClick={onClose}
              className="px-3 py-1.5 text-sm font-medium text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
            >
              Close
            </button>
          )}
        </div>
      </div>

      {fetchError && (
        <div className="p-4 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-xl text-rose-700 dark:text-rose-300 text-sm flex items-center gap-3">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{fetchError}</span>
        </div>
      )}

      {/* Active AI Status Card */}
      <div className="p-4 sm:p-5 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Primary AI Engine:</span>
            {config?.hasKey ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                OpenRouter Active
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                <span className="w-2 h-2 rounded-full bg-amber-500" />
                Key Not Provided
              </span>
            )}
            {config?.backupConfig?.enabled && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-teal-100 text-teal-700 dark:bg-teal-950 dark:text-teal-300 border border-teal-200 dark:border-teal-800">
                <ShieldCheck className="w-3 h-3 text-teal-600" />
                Failover Ready
              </span>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-700 dark:text-slate-300 pt-1">
            <div>
              <span className="text-slate-500 dark:text-slate-400 text-xs">Model: </span>
              <code className="text-xs font-mono bg-white dark:bg-slate-800 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700 text-teal-700 dark:text-teal-300">
                {config?.model}
              </code>
            </div>
            {config?.maskedKey && (
              <div className="flex items-center gap-1.5">
                <span className="text-slate-500 dark:text-slate-400 text-xs">Key: </span>
                <code className="text-xs font-mono bg-white dark:bg-slate-800 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300">
                  {config.maskedKey}
                </code>
                <button
                  onClick={handleCopyMaskedKey}
                  title="Copy Masked Key"
                  className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  {copiedKey ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleTestPrimary}
            disabled={isTestingPrimary}
            className="flex items-center gap-2 px-3.5 py-2 text-sm font-semibold text-teal-700 bg-teal-50 hover:bg-teal-100 dark:bg-teal-950/60 dark:text-teal-300 dark:hover:bg-teal-900 border border-teal-200 dark:border-teal-800 rounded-xl transition-all shadow-xs disabled:opacity-50"
          >
            {isTestingPrimary ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                Testing OpenRouter...
              </>
            ) : (
              <>
                <Zap className="w-4 h-4 text-amber-500" />
                Test OpenRouter
              </>
            )}
          </button>
        </div>
      </div>

      {/* Main Settings Form */}
      <form onSubmit={handleSave} className="space-y-6">
        {/* SECTION 1: OpenRouter (Primary Engine) */}
        <div className="p-5 sm:p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-xs space-y-5">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span className="w-6 h-6 rounded-lg bg-teal-600 text-white flex items-center justify-center text-xs font-bold">1</span>
                Primary AI Engine: OpenRouter
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Universal AI router providing high-speed access to Gemini 2.5 Flash, Claude 3.5, GPT-4o, and DeepSeek.
              </p>
            </div>

            <a
              href="https://openrouter.ai/keys"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs font-semibold text-teal-600 dark:text-teal-400 hover:underline inline-flex items-center gap-1 shrink-0"
            >
              Get OpenRouter Key <ExternalLink className="w-3 h-3" />
            </a>
          </div>

          {/* OpenRouter API Key Input */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                OpenRouter API Key
              </label>
              <span className="text-[11px] text-slate-400 font-mono">
                Starts with <code className="text-teal-600 dark:text-teal-400">sk-or-v1-</code>
              </span>
            </div>

            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <Key className="w-4 h-4" />
              </div>
              <input
                type={showKey ? 'text' : 'password'}
                value={apiKey}
                onChange={(e) => {
                  setApiKey(e.target.value);
                  setPrimaryTestResult(null);
                  setSaveSuccess(null);
                }}
                placeholder={
                  config?.hasKey && !apiKey
                    ? `Keep saved OpenRouter key (${config.maskedKey}) or paste new key`
                    : 'sk-or-v1-xxxxxxxx...'
                }
                className="w-full pl-10 pr-24 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white dark:focus:bg-slate-900 transition-all text-slate-900 dark:text-white"
              />
              <div className="absolute inset-y-0 right-0 pr-2 flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setShowKey(!showKey)}
                  className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-200/60 dark:hover:bg-slate-700 transition-colors"
                  title={showKey ? 'Hide key' : 'Show key'}
                >
                  {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
                {apiKey && (
                  <button
                    type="button"
                    onClick={() => setApiKey('')}
                    className="px-2 py-1 text-xs text-slate-500 hover:text-slate-700 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 rounded"
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Model Selection */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Preset Model
              </label>
              <select
                value={selectedModel}
                onChange={(e) => {
                  setSelectedModel(e.target.value);
                  setCustomModel('');
                  setPrimaryTestResult(null);
                }}
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-teal-500 text-slate-900 dark:text-white"
              >
                {openrouterProviderData?.models.map((m) => (
                  <option key={m} value={m}>
                    {m} {m === openrouterProviderData.defaultModel ? '(Recommended)' : ''}
                  </option>
                ))}
                <option value="custom">-- Custom Model Identifier --</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Custom Model Identifier (Optional)
              </label>
              <input
                type="text"
                value={customModel}
                onChange={(e) => {
                  setCustomModel(e.target.value);
                  setPrimaryTestResult(null);
                }}
                placeholder="e.g. google/gemini-2.5-flash or openai/gpt-4o"
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-teal-500 text-slate-900 dark:text-white"
              />
            </div>
          </div>

          {/* Primary Test Feedback */}
          {primaryTestResult && (
            <div
              className={`p-3.5 rounded-xl border text-xs transition-all ${
                primaryTestResult.success
                  ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200'
                  : 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200'
              }`}
            >
              <div className="flex items-start gap-2.5">
                {primaryTestResult.success ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                )}
                <div className="space-y-1 flex-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold">
                      {primaryTestResult.success ? 'OpenRouter Verified Successfully' : 'OpenRouter Test Failed'}
                    </span>
                    {primaryTestResult.latencyMs && (
                      <span className="font-mono text-[10px] font-semibold px-1.5 py-0.5 bg-black/5 dark:bg-white/10 rounded">
                        {primaryTestResult.latencyMs}ms
                      </span>
                    )}
                  </div>
                  {primaryTestResult.message && <p>{primaryTestResult.message}</p>}
                  {primaryTestResult.reply && (
                    <p className="italic bg-white/60 dark:bg-slate-900/60 p-2 rounded border border-emerald-200/60 dark:border-emerald-800/60 font-mono">
                      &quot;{primaryTestResult.reply}&quot;
                    </p>
                  )}
                  {primaryTestResult.error && (
                    <p className="font-mono mt-1 text-rose-700 dark:text-rose-300 break-words">
                      {primaryTestResult.error}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* SECTION 2: Custom Backup API (Failover if cancelled / exhausted) */}
        <div className="p-5 sm:p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-xs space-y-5">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-lg bg-indigo-600 text-white flex items-center justify-center text-xs font-bold">2</span>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Custom Backup API Endpoint
                </h3>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                  Automatic Failover
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                In case OpenRouter is cancelled, expired, or runs out of credits, the application will automatically fail over to this custom endpoint so student tasks and course generation never stop.
              </p>
            </div>

            {/* Toggle Switch */}
            <label className="relative inline-flex items-center cursor-pointer shrink-0">
              <input
                type="checkbox"
                checked={backupEnabled}
                onChange={(e) => setBackupEnabled(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:after:h-5 after:w-5 after:transition-all peer-checked:bg-teal-600"></div>
            </label>
          </div>

          {backupEnabled ? (
            <div className="space-y-4 pt-2 border-t border-slate-100 dark:border-slate-800">
              {/* Backup Key */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Backup API Key
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Key className="w-4 h-4" />
                  </div>
                  <input
                    type={showBackupKey ? 'text' : 'password'}
                    value={backupApiKey}
                    onChange={(e) => {
                      setBackupApiKey(e.target.value);
                      setBackupTestResult(null);
                      setSaveSuccess(null);
                    }}
                    placeholder={
                      config?.backupConfig?.hasKey && !backupApiKey
                        ? `Keep saved backup key (${config.backupConfig.maskedKey})`
                        : 'Paste backup API key here'
                    }
                    className="w-full pl-10 pr-24 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-teal-500 text-slate-900 dark:text-white"
                  />
                  <div className="absolute inset-y-0 right-0 pr-2 flex items-center">
                    <button
                      type="button"
                      onClick={() => setShowBackupKey(!showBackupKey)}
                      className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-200/60 dark:hover:bg-slate-700 transition-colors"
                      title={showBackupKey ? 'Hide key' : 'Show key'}
                    >
                      {showBackupKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>

              {/* Backup Base URL & Model */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1">
                    <Globe className="w-3.5 h-3.5 text-slate-400" />
                    Backup API Base URL (OpenAI-compatible)
                  </label>
                  <input
                    type="text"
                    value={backupBaseUrl}
                    onChange={(e) => setBackupBaseUrl(e.target.value)}
                    placeholder="https://api.openai.com/v1"
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono focus:outline-none focus:ring-2 focus:ring-teal-500 text-slate-900 dark:text-white"
                  />
                  <span className="text-[10px] text-slate-400 mt-1 block">
                    e.g. <code>https://api.openai.com/v1</code>, <code>https://api.groq.com/openai/v1</code>, or custom proxy
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1">
                    <Server className="w-3.5 h-3.5 text-slate-400" />
                    Backup Model Name
                  </label>
                  <input
                    type="text"
                    value={backupModel}
                    onChange={(e) => setBackupModel(e.target.value)}
                    placeholder="gpt-4o-mini"
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono focus:outline-none focus:ring-2 focus:ring-teal-500 text-slate-900 dark:text-white"
                  />
                  <span className="text-[10px] text-slate-400 mt-1 block">
                    e.g. <code>gpt-4o-mini</code>, <code>llama-3.3-70b-versatile</code>, <code>deepseek-chat</code>
                  </span>
                </div>
              </div>

              {/* Test Backup Connection */}
              <div className="flex items-center justify-between pt-1">
                <button
                  type="button"
                  onClick={handleTestBackup}
                  disabled={isTestingBackup}
                  className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/60 dark:hover:bg-indigo-900 border border-indigo-200 dark:border-indigo-800 rounded-xl transition-all disabled:opacity-50"
                >
                  {isTestingBackup ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      Testing Custom Backup API...
                    </>
                  ) : (
                    <>
                      <Zap className="w-3.5 h-3.5" />
                      Test Custom Backup Endpoint
                    </>
                  )}
                </button>
              </div>

              {/* Backup Test Feedback */}
              {backupTestResult && (
                <div
                  className={`p-3.5 rounded-xl border text-xs transition-all ${
                    backupTestResult.success
                      ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200'
                      : 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200'
                  }`}
                >
                  <div className="flex items-start gap-2.5">
                    {backupTestResult.success ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                    )}
                    <div className="space-y-1 flex-1">
                      <div className="flex items-center justify-between">
                        <span className="font-bold">
                          {backupTestResult.success ? 'Custom Backup API Verified' : 'Custom Backup Test Failed'}
                        </span>
                        {backupTestResult.latencyMs && (
                          <span className="font-mono text-[10px] font-semibold px-1.5 py-0.5 bg-black/5 dark:bg-white/10 rounded">
                            {backupTestResult.latencyMs}ms
                          </span>
                        )}
                      </div>
                      {backupTestResult.message && <p>{backupTestResult.message}</p>}
                      {backupTestResult.reply && (
                        <p className="italic bg-white/60 dark:bg-slate-900/60 p-2 rounded border border-emerald-200/60 dark:border-emerald-800/60 font-mono">
                          &quot;{backupTestResult.reply}&quot;
                        </p>
                      )}
                      {backupTestResult.error && (
                        <p className="font-mono mt-1 text-rose-700 dark:text-rose-300 break-words">
                          {backupTestResult.error}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl text-xs text-slate-500 dark:text-slate-400 flex items-center justify-between">
              <span>Automatic failover is currently disabled. Toggle on if you want to provide a fallback API endpoint.</span>
            </div>
          )}
        </div>

        {/* Save Status Messages */}
        {saveSuccess && (
          <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl text-emerald-700 dark:text-emerald-300 text-sm flex items-center gap-3 animate-fadeIn">
            <CheckCircle2 className="w-5 h-5 shrink-0" />
            <span>{saveSuccess}</span>
          </div>
        )}

        {saveError && (
          <div className="p-4 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-xl text-rose-700 dark:text-rose-300 text-sm flex items-center gap-3 animate-fadeIn">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <span>{saveError}</span>
          </div>
        )}

        {/* Actions Footer */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
          <button
            type="button"
            onClick={handleReset}
            disabled={isResetting}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-xl transition-colors disabled:opacity-40"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            {isResetting ? 'Resetting...' : 'Reset to System Default'}
          </button>

          <button
            type="submit"
            disabled={isSaving}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 text-sm font-bold text-white bg-teal-600 hover:bg-teal-700 active:bg-teal-800 rounded-xl shadow-sm shadow-teal-600/20 transition-all disabled:opacity-50"
          >
            {isSaving ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                Saving AI Settings...
              </>
            ) : (
              <>
                <Check className="w-4 h-4" />
                Save & Apply Settings
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
