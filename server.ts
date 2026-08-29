import * as googleTTS from 'google-tts-api';
import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
import os from 'os';
import fs from 'fs';
import ffmpeg from 'fluent-ffmpeg';
import ffmpegInstaller from '@ffmpeg-installer/ffmpeg';
import ffprobeInstaller from '@ffprobe-installer/ffprobe';

ffmpeg.setFfmpegPath(ffmpegInstaller.path);
ffmpeg.setFfprobePath(ffprobeInstaller.path);

function analyzeAudio(filePath: string): Promise<{ duration: number, meanVolume: number, maxVolume: number }> {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(filePath, (err, metadata) => {
      if (err) {
        return reject(err);
      }
      const duration = metadata?.format?.duration || 0;
      
      let meanVolume = -91;
      let maxVolume = -91;
      
      ffmpeg(filePath)
        .audioFilter('volumedetect')
        .format('null')
        .output('-')
        .on('stderr', (stderrLine) => {
           const meanMatch = stderrLine.match(/mean_volume:\s+([-\d.]+)\s+dB/);
           if (meanMatch) {
             meanVolume = parseFloat(meanMatch[1]);
           }
           const maxMatch = stderrLine.match(/max_volume:\s+([-\d.]+)\s+dB/);
           if (maxMatch) {
             maxVolume = parseFloat(maxMatch[1]);
           }
        })
        .on('error', reject)
        .on('end', () => {
           resolve({ duration, meanVolume, maxVolume });
        })
        .run();
    });
  });
}


dotenv.config();

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY || 'dummy-key',
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

const originalGenerateContent = ai.models.generateContent.bind(ai.models);

export interface AICustomBackupConfig {
  enabled: boolean;
  apiKey: string;
  baseUrl: string;
  model: string;
  name?: string;
}

export interface RuntimeAIConfig {
  provider: 'openrouter' | 'custom';
  apiKey: string;
  model: string;
  baseUrl?: string;
  isCustom: boolean;
  backupConfig?: AICustomBackupConfig;
}

function maskApiKey(key: string): string {
  if (!key) return '';
  if (key.length <= 8) return '••••••••';
  const prefix = key.slice(0, Math.min(8, Math.floor(key.length / 3)));
  const suffix = key.slice(-4);
  return `${prefix}••••••••${suffix}`;
}

function getInitialConfig(): RuntimeAIConfig {
  const openrouterKey = process.env.OPENROUTER_API_KEY || 
    (process.env.GEMINI_API_KEY?.startsWith('sk-') ? process.env.GEMINI_API_KEY : '') || 
    (process.env.OPENAI_API_KEY?.startsWith('sk-or-') ? process.env.OPENAI_API_KEY : '') ||
    '';

  const backupKey = process.env.CUSTOM_BACKUP_API_KEY || 
    process.env.BACKUP_AI_KEY || 
    (process.env.OPENAI_API_KEY && !process.env.OPENAI_API_KEY.startsWith('sk-or-') ? process.env.OPENAI_API_KEY : '') ||
    '';

  return {
    provider: 'openrouter',
    apiKey: openrouterKey,
    model: 'google/gemini-2.5-flash',
    baseUrl: 'https://openrouter.ai/api/v1',
    isCustom: false,
    backupConfig: {
      enabled: Boolean(backupKey),
      apiKey: backupKey,
      baseUrl: process.env.CUSTOM_BACKUP_BASE_URL || 'https://api.openai.com/v1',
      model: process.env.CUSTOM_BACKUP_MODEL || 'gpt-4o-mini',
      name: 'Custom Backup Endpoint'
    }
  };
}

let activeAIConfig: RuntimeAIConfig = getInitialConfig();

async function executeSingleProviderCall(
  provider: string,
  apiKey: string,
  model: string,
  baseUrl: string | undefined,
  options: any
): Promise<{ text: string }> {
  // Normalize model name for standard providers
  let effectiveModel = model;
  if (provider === 'openrouter') {
    if (!effectiveModel || effectiveModel.startsWith('gemini-')) {
      effectiveModel = 'google/gemini-2.5-flash';
    }
  } else if (!effectiveModel) {
    effectiveModel = 'gpt-4o-mini';
  }

  // Format messages
  const systemInstruction = options?.config?.systemInstruction || '';
  let messages: any[] = [];
  if (systemInstruction) {
    messages.push({ role: 'system', content: systemInstruction });
  }

  let userContent: any = [];
  const rawContents = Array.isArray(options?.contents) ? options.contents : [options?.contents];
  
  for (const item of rawContents) {
    if (!item) continue;
    if (typeof item === 'string') {
      userContent.push({ type: 'text', text: item });
    } else if (typeof item === 'object') {
      if (item.text) {
        userContent.push({ type: 'text', text: item.text });
      } else if (item.inlineData) {
        const mimeType = item.inlineData.mimeType || 'image/jpeg';
        userContent.push({
          type: 'image_url',
          image_url: {
            url: `data:${mimeType};base64,${item.inlineData.data}`
          }
        });
      } else if (item.parts && Array.isArray(item.parts)) {
        const textParts = item.parts.map((p: any) => p.text).filter(Boolean).join('\n');
        if (textParts) {
          userContent.push({ type: 'text', text: textParts });
        }
      }
    }
  }

  if (Array.isArray(userContent) && userContent.length === 1 && userContent[0].type === 'text') {
    userContent = userContent[0].text;
  }

  messages.push({ role: 'user', content: userContent });

  let endpointUrl = baseUrl || (provider === 'openrouter' ? "https://openrouter.ai/api/v1" : "https://api.openai.com/v1");
  let headers: Record<string, string> = {
    "Authorization": `Bearer ${apiKey}`,
    "Content-Type": "application/json"
  };

  if (provider === 'openrouter' || endpointUrl.includes('openrouter.ai')) {
    headers["HTTP-Referer"] = process.env.APP_URL || "http://localhost:3000";
    headers["X-Title"] = "AmeenELT Educational Workspace";
  }

  if (!endpointUrl.endsWith('/chat/completions')) {
    endpointUrl = `${endpointUrl.replace(/\/+$/, '')}/chat/completions`;
  }

  const body: any = {
    model: effectiveModel,
    messages,
    temperature: options?.config?.temperature ?? 0.7,
    max_tokens: options?.config?.maxOutputTokens ?? 4096,
  };

  if (options?.config?.responseMimeType === 'application/json') {
    body.response_format = { type: 'json_object' };
  }

  const res = await fetch(endpointUrl, {
    method: "POST",
    headers,
    body: JSON.stringify(body)
  });

  if (!res.ok) {
    const errorText = await res.text();
    let parsedErr: any = null;
    try { parsedErr = JSON.parse(errorText); } catch (_) {}
    const detailMsg = parsedErr?.error?.message || errorText;
    
    console.error(`AI API Error (${provider} - ${res.status}):`, detailMsg);
    
    if (res.status === 401) {
      throw new Error(`${provider.toUpperCase()} Error (401 Unauthorized): Key is invalid or has been cancelled.`);
    } else if (res.status === 402 || (res.status === 429 && detailMsg.toLowerCase().includes('credit'))) {
      throw new Error(`${provider.toUpperCase()} Error (402 Payment Required): Account has insufficient credits.`);
    } else if (res.status === 429) {
      throw new Error(`${provider.toUpperCase()} Rate Limit (429): Request quota temporarily exceeded.`);
    }
    
    throw new Error(`${provider.toUpperCase()} API error (${res.status}): ${detailMsg}`);
  }

  const data = await res.json();
  const text = data.choices?.[0]?.message?.content || "";
  return { text };
}

async function executeAICall(options: any, configOverride?: Partial<RuntimeAIConfig>): Promise<{ text: string }> {
  const config = { ...activeAIConfig, ...configOverride };
  const provider = config.provider || 'openrouter';
  let apiKey = config.apiKey;
  const model = config.model || (provider === 'openrouter' ? 'google/gemini-2.5-flash' : 'gpt-4o-mini');

  // Fallback to environment variables if key is missing in config
  if (!apiKey) {
    if (provider === 'openrouter' && process.env.OPENROUTER_API_KEY) {
      apiKey = process.env.OPENROUTER_API_KEY;
    } else if (process.env.OPENROUTER_API_KEY) {
      apiKey = process.env.OPENROUTER_API_KEY;
    }
  }

  // Attempt the primary configured call (OpenRouter or Custom)
  try {
    return await executeSingleProviderCall(provider, apiKey, model, config.baseUrl, options);
  } catch (err: any) {
    console.error(`Primary AI Provider (${provider}) call failed:`, err.message || err);

    // If this was an explicit test call from the UI Diagnostic tool, return the error directly
    if (configOverride && (configOverride.apiKey !== undefined || configOverride.provider !== undefined)) {
      throw err;
    }

    // Attempt Automatic Failover to the Custom Backup API if configured
    const backup = activeAIConfig.backupConfig;
    if (backup && backup.enabled && backup.apiKey && backup.apiKey.trim().length > 0) {
      console.log(`[AI Failover Engine] Primary (${provider}) failed. Attempting Custom Backup API (${backup.model} at ${backup.baseUrl})...`);
      try {
        const backupRes = await executeSingleProviderCall('custom', backup.apiKey.trim(), backup.model || 'gpt-4o-mini', backup.baseUrl || 'https://api.openai.com/v1', options);
        if (backupRes && backupRes.text) {
          console.log(`[AI Failover Engine] Custom Backup API successfully responded!`);
          return backupRes;
        }
      } catch (backupErr: any) {
        console.warn(`[AI Failover Engine] Custom Backup API also failed:`, backupErr.message || backupErr);
        throw new Error(`OpenRouter API Failed (${err.message}). Custom Backup API also failed: ${backupErr.message}`);
      }
    }

    // If no backup is configured or enabled, throw actionable message
    throw new Error(`${err.message || 'OpenRouter API Call Failed.'} You can configure a Custom Backup API endpoint in Teacher Settings > AI Engine & API Keys to automatically handle failover if OpenRouter is cancelled or runs out of credits.`);
  }
}

(ai.models as any).generateContent = (options: any) => executeAICall(options);


async function startServer() {
  
function fixJSONControlChars(str: string): string {
  let result = '';
  let inString = false;
  let isEscaped = false;

  for (let i = 0; i < str.length; i++) {
    const char = str[i];
    if (inString) {
      if (isEscaped) {
        result += char;
        isEscaped = false;
      } else if (char === '\\') {
        result += char;
        isEscaped = true;
      } else if (char === '"') {
        result += char;
        inString = false;
      } else if (char === '\n') {
        result += '\\n';
      } else if (char === '\r') {
        result += '\\r';
      } else if (char === '\t') {
        result += '\\t';
      } else {
        result += char;
      }
    } else {
      if (char === '"') inString = true;
      result += char;
    }
  }
  return result;
}

function repairTruncatedJSON(str: string): string {
  let inString = false;
  let isEscaped = false;
  const stack: string[] = [];

  for (let i = 0; i < str.length; i++) {
    const char = str[i];
    if (inString) {
      if (isEscaped) {
        isEscaped = false;
      } else if (char === '\\') {
        isEscaped = true;
      } else if (char === '"') {
        inString = false;
      }
    } else {
      if (char === '"') {
        inString = true;
      } else if (char === '{' || char === '[') {
        stack.push(char);
      } else if (char === '}') {
        if (stack.length > 0 && stack[stack.length - 1] === '{') stack.pop();
      } else if (char === ']') {
        if (stack.length > 0 && stack[stack.length - 1] === '[') stack.pop();
      }
    }
  }

  let repaired = str.trim();
  if (inString) repaired += '"';
  repaired = repaired.replace(/,\s*$/, '');
  repaired = repaired.replace(/:\s*$/, ': null');

  while (stack.length > 0) {
    const openChar = stack.pop();
    if (openChar === '{') repaired += '}';
    else if (openChar === '[') repaired += ']';
  }

  return repaired;
}

function parseJSON(str: string): any {
  if (!str) throw new Error("Empty string provided to parseJSON");

  let cleaned = str.trim();

  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
  } else {
    const match = cleaned.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
    if (match && match[1]) {
      cleaned = match[1].trim();
    } else {
      const firstBrace = cleaned.indexOf('{');
      const firstBracket = cleaned.indexOf('[');
      let startIndex = -1;
      if (firstBrace !== -1 && firstBracket !== -1) {
        startIndex = Math.min(firstBrace, firstBracket);
      } else if (firstBrace !== -1) {
        startIndex = firstBrace;
      } else if (firstBracket !== -1) {
        startIndex = firstBracket;
      }
      if (startIndex > 0) {
        cleaned = cleaned.slice(startIndex);
      }
    }
  }

  try {
    return JSON.parse(cleaned);
  } catch (e1) {}

  let sanitized = cleaned.replace(/,\s*([}\]])/g, '$1');
  try {
    return JSON.parse(sanitized);
  } catch (e2) {}

  sanitized = fixJSONControlChars(sanitized);
  try {
    return JSON.parse(sanitized);
  } catch (e3) {}

  sanitized = sanitized.replace(/,\s*([}\]])/g, '$1');
  try {
    return JSON.parse(sanitized);
  } catch (e4) {}

  try {
    const repaired = repairTruncatedJSON(sanitized);
    return JSON.parse(repaired);
  } catch (e5) {}

  return JSON.parse(cleaned);
}

const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '50mb' }));

  // API Routes
  app.get("/api/ai-config", (req, res) => {
    res.json({
      provider: activeAIConfig.provider,
      model: activeAIConfig.model,
      maskedKey: maskApiKey(activeAIConfig.apiKey),
      hasKey: Boolean(activeAIConfig.apiKey && activeAIConfig.apiKey.length > 5),
      baseUrl: activeAIConfig.baseUrl || 'https://openrouter.ai/api/v1',
      isCustom: activeAIConfig.isCustom,
      status: activeAIConfig.apiKey ? 'active' : 'unconfigured',
      backupConfig: {
        enabled: activeAIConfig.backupConfig?.enabled ?? false,
        apiKey: '',
        maskedKey: maskApiKey(activeAIConfig.backupConfig?.apiKey || ''),
        hasKey: Boolean(activeAIConfig.backupConfig?.apiKey && activeAIConfig.backupConfig.apiKey.length > 5),
        baseUrl: activeAIConfig.backupConfig?.baseUrl || 'https://api.openai.com/v1',
        model: activeAIConfig.backupConfig?.model || 'gpt-4o-mini',
        name: activeAIConfig.backupConfig?.name || 'Custom Backup Endpoint'
      },
      availableProviders: [
        {
          id: 'openrouter',
          name: 'OpenRouter (Primary AI Engine)',
          description: 'Universal AI router with access to Gemini 2.5 Flash, Claude 3.5, GPT-4o, DeepSeek, and LLaMA.',
          defaultModel: 'google/gemini-2.5-flash',
          models: [
            'google/gemini-2.5-flash',
            'openai/gpt-4o-mini',
            'anthropic/claude-3.5-sonnet',
            'meta-llama/llama-3.3-70b-instruct',
            'deepseek/deepseek-chat',
            'mistralai/mistral-large-2407',
            'google/gemini-flash-1.5-8b'
          ],
          keyPlaceholder: 'sk-or-v1-xxxxxxxx...',
          prefixHint: 'Starts with sk-or-v1-',
          helpUrl: 'https://openrouter.ai/keys'
        },
        {
          id: 'custom',
          name: 'Custom / Alternative Endpoint',
          description: 'Use your own custom OpenAI-compatible API proxy, Ollama, or custom endpoint as primary.',
          defaultModel: 'gpt-4o-mini',
          models: [
            'gpt-4o-mini',
            'llama-3.3-70b-versatile',
            'deepseek-chat',
            'custom-model'
          ],
          keyPlaceholder: 'Your custom API key',
          prefixHint: 'Custom key format',
          helpUrl: 'https://openrouter.ai'
        }
      ]
    });
  });

  app.post("/api/ai-config", async (req, res) => {
    try {
      const { provider, apiKey, model, baseUrl, backupConfig } = req.body;
      const targetProvider = provider === 'custom' ? 'custom' : 'openrouter';

      const newApiKey = (apiKey !== undefined && apiKey !== null && apiKey !== '') ? apiKey.trim() : activeAIConfig.apiKey;
      const defaultModel = targetProvider === 'openrouter' ? 'google/gemini-2.5-flash' : 'gpt-4o-mini';

      activeAIConfig.provider = targetProvider;
      activeAIConfig.apiKey = newApiKey;
      activeAIConfig.model = (model && model.trim()) || defaultModel;
      activeAIConfig.baseUrl = (baseUrl !== undefined ? baseUrl.trim() : (targetProvider === 'openrouter' ? 'https://openrouter.ai/api/v1' : 'https://api.openai.com/v1'));
      activeAIConfig.isCustom = true;

      if (targetProvider === 'openrouter' && activeAIConfig.apiKey) {
        process.env.OPENROUTER_API_KEY = activeAIConfig.apiKey;
      }

      // Handle Backup Configuration
      if (backupConfig) {
        const existingBackup = activeAIConfig.backupConfig || {
          enabled: false,
          apiKey: '',
          baseUrl: 'https://api.openai.com/v1',
          model: 'gpt-4o-mini',
          name: 'Custom Backup Endpoint'
        };

        const backupKey = (backupConfig.apiKey !== undefined && backupConfig.apiKey !== null && backupConfig.apiKey !== '') 
          ? backupConfig.apiKey.trim() 
          : existingBackup.apiKey;

        activeAIConfig.backupConfig = {
          enabled: backupConfig.enabled !== undefined ? Boolean(backupConfig.enabled) : existingBackup.enabled,
          apiKey: backupKey,
          baseUrl: backupConfig.baseUrl ? backupConfig.baseUrl.trim() : existingBackup.baseUrl,
          model: backupConfig.model ? backupConfig.model.trim() : existingBackup.model,
          name: backupConfig.name ? backupConfig.name.trim() : existingBackup.name
        };

        if (backupKey) {
          process.env.CUSTOM_BACKUP_API_KEY = backupKey;
        }
      }

      res.json({
        success: true,
        message: `AI configuration updated to ${targetProvider.toUpperCase()} (${activeAIConfig.model})`,
        config: {
          provider: activeAIConfig.provider,
          model: activeAIConfig.model,
          maskedKey: maskApiKey(activeAIConfig.apiKey),
          baseUrl: activeAIConfig.baseUrl,
          isCustom: activeAIConfig.isCustom,
          status: activeAIConfig.apiKey ? 'active' : 'unconfigured',
          backupConfig: {
            enabled: activeAIConfig.backupConfig?.enabled ?? false,
            maskedKey: maskApiKey(activeAIConfig.backupConfig?.apiKey || ''),
            hasKey: Boolean(activeAIConfig.backupConfig?.apiKey && activeAIConfig.backupConfig.apiKey.length > 5),
            baseUrl: activeAIConfig.backupConfig?.baseUrl || 'https://api.openai.com/v1',
            model: activeAIConfig.backupConfig?.model || 'gpt-4o-mini',
            name: activeAIConfig.backupConfig?.name || 'Custom Backup Endpoint'
          }
        }
      });
    } catch (err: any) {
      console.error("Failed to update AI config:", err);
      res.status(500).json({ error: err.message || "Failed to update AI configuration" });
    }
  });

  app.post("/api/test-ai-key", async (req, res) => {
    const startTime = Date.now();
    try {
      const { provider, apiKey, model, baseUrl, isBackupTest } = req.body;

      let testProvider = provider || (isBackupTest ? 'custom' : activeAIConfig.provider);
      let testApiKey = (apiKey && apiKey.trim()) || (isBackupTest ? activeAIConfig.backupConfig?.apiKey : activeAIConfig.apiKey);
      let testModel = (model && model.trim()) || (isBackupTest ? (activeAIConfig.backupConfig?.model || 'gpt-4o-mini') : activeAIConfig.model);
      let testBaseUrl = (baseUrl !== undefined ? baseUrl.trim() : (isBackupTest ? activeAIConfig.backupConfig?.baseUrl : activeAIConfig.baseUrl));

      if (!testApiKey) {
        return res.status(400).json({
          success: false,
          latencyMs: 0,
          error: `Please enter an API key to test ${isBackupTest ? 'Custom Backup' : 'OpenRouter'}.`
        });
      }

      const response = await executeSingleProviderCall(
        testProvider,
        testApiKey,
        testModel,
        testBaseUrl,
        {
          contents: [{ text: "Hello! Reply with exactly: 'AI Engine connection verified successfully.'" }],
          config: {
            systemInstruction: "You are a diagnostic assistant. Reply with concise confirmation only."
          }
        }
      );

      const latencyMs = Date.now() - startTime;
      res.json({
        success: true,
        latencyMs,
        reply: response.text.trim(),
        model: testModel,
        provider: testProvider,
        message: `Connection successful (${latencyMs}ms)!`
      });
    } catch (err: any) {
      const latencyMs = Date.now() - startTime;
      console.error("Test AI Key error:", err);
      res.status(400).json({
        success: false,
        latencyMs,
        error: err.message || "Connection test failed. Please check your API key and endpoint settings."
      });
    }
  });

  app.post("/api/reset-ai-key", (req, res) => {
    activeAIConfig = getInitialConfig();
    res.json({
      success: true,
      message: "Reset to default system AI configuration",
      config: {
        provider: activeAIConfig.provider,
        model: activeAIConfig.model,
        maskedKey: maskApiKey(activeAIConfig.apiKey),
        baseUrl: activeAIConfig.baseUrl,
        status: activeAIConfig.apiKey ? 'active' : 'unconfigured',
        backupConfig: {
          enabled: activeAIConfig.backupConfig?.enabled ?? false,
          maskedKey: maskApiKey(activeAIConfig.backupConfig?.apiKey || ''),
          hasKey: Boolean(activeAIConfig.backupConfig?.apiKey && activeAIConfig.backupConfig.apiKey.length > 5),
          baseUrl: activeAIConfig.backupConfig?.baseUrl || 'https://api.openai.com/v1',
          model: activeAIConfig.backupConfig?.model || 'gpt-4o-mini',
          name: activeAIConfig.backupConfig?.name || 'Custom Backup Endpoint'
        }
      }
    });
  });

  app.post("/api/transcribe", async (req, res) => {
    try {
      const { audioData, mimeType } = req.body;
      if (!audioData) return res.status(400).json({ error: "Missing audioData" });

      const response = await ai.models.generateContent({
        model: 'gemini-3.7-flash',
        contents: [
          {
            inlineData: {
              data: audioData.split(',')[1] || audioData,
              mimeType: mimeType || "audio/webm"
            }
          },
          { text: "Transcribe the following audio accurately. Just output the transcription and nothing else." }
        ]
      });

      res.json({ text: response.text });
    } catch (error: any) {
      console.error("Transcribe API Error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/chat", async (req, res) => {
    try {
      const { messages } = req.body;
      if (!messages || !Array.isArray(messages)) return res.status(400).json({ error: "Invalid messages format" });

      const formattedMessages = messages.map(m => ({
        role: m.role === 'user' ? 'user' : 'model',
        parts: [{ text: m.content }]
      }));

      const response = await ai.models.generateContent({
        model: 'gemini-3.7-flash',
        contents: formattedMessages,
        config: {
          systemInstruction: "You are a helpful, encouraging AI English tutor. Keep responses concise and focused on helping the student learn English grammar, vocabulary, and concepts. Correct any mistakes they make gently."
        }
      });

      res.json({ text: response.text });
    } catch (error: any) {
      console.error("Chat API Error:", error);
      const errMsg = error.message || "";
      if (errMsg.includes("429") || errMsg.includes("RESOURCE_EXHAUSTED")) {
        return res.json({
          text: "I am currently experiencing high traffic (API quota limit reached), but I am here to help you practice English! Remember to focus on clear syntax, active voice, and expanding your academic vocabulary. How can I assist you with your studies today?"
        });
      }
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/generate-interactive-course", async (req, res) => {
    try {
      const { cefrLevel, title, objectives, keywords } = req.body;
      
      const systemInstruction = `You are an expert English language teacher and instructional designer. Your task is to create an interactive JSON course containing exactly 9 slides for CEFR level ${cefrLevel}.
The course must follow this exact structure:
1. "intro": title, objectives (array), warmup, stickyNotes (array of { concept, explanation })
2. "presentation": title, slides (array of { heading, bulletPoints (array of strings), visualIdea })
3. "rules": title, rules (array of { rule, example, type })
4. "flashcards": title, flashcards (array of { term, definition, phonetic, example })
5. "reading": title, passage, readingQuestions (array of { question, options (array of 4), answer (must match one option), type (mcq | fill-blank) }), synonymMatch (array of { wordInText, synonymToMatch })
6. "fill-in-blanks": title, sentences (array of { textBeforeBlank, answer, textAfterBlank })
7. "sentence-builder": title, exercises (array of { scrambledWords (array of strings), correctSentence, hint })
8. "drag-drop": title, dragItems (array of { content, category }), categories (array of strings)
9. "quiz": title, quizQuestions (array of { question, options (array of 2 to 4), answer, type (mcq | tf) })

Ensure the content is pedagogical, engaging, and aligned with ${cefrLevel} proficiency. Include the provided keywords if given.\n\nCRITICAL INSTRUCTION: The entire course, including all explanations, instructions, passages, questions, and hints MUST be exclusively in English. DO NOT include any other languages (no Spanish, no French, no other translations).

Output ONLY valid JSON matching this schema:
{
  "slides": [
    {
      "type": "intro",
      "title": "...",
      "objectives": ["..."],
      "warmup": "...",
      "stickyNotes": [{ "concept": "...", "explanation": "..." }]
    },
    ... (continue for all 9 types)
  ]
}`;

      const prompt = `Lesson Title: ${title}\nLearning Objectives: ${objectives}\nKeywords: ${keywords || "None"}\nCEFR Level: ${cefrLevel}`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.7-flash',
        contents: prompt,
        config: {
          systemInstruction,
          responseMimeType: "application/json",
          temperature: 0.7,
        }
      });

      if (!response.text) {
        throw new Error("No response from Gemini");
      }
      
      const data = parseJSON(response.text);
      res.json(data);
    } catch (error: any) {
      console.error("Generate Interactive Course Error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/generate-item", async (req, res) => {
    const { type, topic, context, generateAudio = false } = req.body;
    try {
      let prompt = "";
      let systemInstruction = "";
      
      if (type === "quiz") {
        systemInstruction = "You are an expert English language teacher. Generate a JSON response with a single multiple-choice question\n\nCRITICAL INSTRUCTION: All generated content MUST be exclusively in English. DO NOT include any other languages (no translations, no Spanish, no French, etc.). about the given topic. The content MUST be didactic, educational, and suitable for language learners at the CEFR level provided in the context (NOT for linguists or native scholars). The format MUST be exactly this JSON: { \"question\": \"...\", \"options\": [\"Option A\", \"Option B\", \"Option C\", \"Option D\"], \"correctAnswer\": \"Option A\", \"ttsText\": \"Optional text to read out loud for listening exercises\", \"mediaType\": \"none\" }. CRITICAL: Do NOT use markdown. Do NOT use unescaped quotes.";
        prompt = `Topic: ${topic}\nContext (Including CEFR target): ${context || ""}`;
      } else if (type === "course") {
        systemInstruction = "You are an expert English language teacher. Generate a JSON response for a single MOOC module\n\nCRITICAL INSTRUCTION: All generated content MUST be exclusively in English. DO NOT include any other languages (no translations, no Spanish, no French, etc.). (course). The content MUST be didactic, educational, and suitable for language learners at the CEFR level provided in the context (NOT for linguists or native scholars). The format MUST be: { \"title\": \"Module Title\", \"content\": \"...detailed text...\" }";
        prompt = `Topic: ${topic}\nContext (Including CEFR target): ${context || ""}`;
      } else {
        return res.status(400).json({ error: "Invalid type" });
      }

      const response = await ai.models.generateContent({
        model: 'gemini-3.7-flash',
        contents: prompt,
        config: {
          systemInstruction,
          responseMimeType: "application/json",
          temperature: 0.7, maxOutputTokens: 8192,
        }
      });

      if (!response.text) {
        throw new Error("No response from Gemini");
      }
      
      const data = parseJSON(response.text);
      
      res.json(data);
    } catch (error: any) {
      if (type === "quiz") {
        return res.json({
          question: `Which key concept is essential when studying ${topic || 'academic topics'}?`,
          options: ["Core theoretical foundations", "Peripheral random facts", "Historical trivialities", "Unrelated secondary notes"],
          correctAnswer: "Core theoretical foundations",
          ttsText: "Core theoretical foundations are essential for academic mastery.",
          mediaType: "none"
        });
      } else {
        return res.json({
          title: `Module: ${topic || 'Core Academic Principle'}`,
          content: `### Introduction to ${topic || 'Academic Studies'}\n\nUnderstanding the fundamental principles of **${topic || 'this domain'}** requires structured study, active recall, and practical application.`
        });
      }
    }
  });

  app.post("/api/generate-quiz-from-material", async (req, res) => {
    try {
      const { materialTitle, materialContent, questionType = "mixed", count = 5, difficulty = "Medium", focus = "", generateAudio = false } = req.body;
      
      if (!materialContent) {
        return res.status(400).json({ error: "Material content is required" });
      }

      const contentStr = typeof materialContent === 'string' ? materialContent : JSON.stringify(materialContent);

      const systemInstruction = `You are an expert AI pedagogy engine and language teacher. Your goal is to construct high-quality, clear quiz questions based STRICTLY on the provided course material text. The questions MUST be educational, didactic, and appropriate for language learners based on the CEFR level of the provided material (NOT for linguists or native scholars).

Target Generation Rules:
- Question Formats: ${
        questionType === "multiple-choice" 
          ? "Generate ALL questions as multiple-choice questions with 4 options." 
          : questionType === "fill-in-the-blank"
          ? "Generate ALL questions as fill-in-the-blank questions where the question string contains a blank placeholder '___' for a missing key term or concept."
          : "Generate a balanced mix of multiple-choice questions AND fill-in-the-blank questions (with '___' blank placeholder)."
      }
- Total Questions: ${count}
- Difficulty Level: ${difficulty}
${focus ? `- Pedagogical Focus: ${focus}` : ""}

Formatting Requirements:
1. For 'multiple-choice':
   - "questionType": "multiple-choice"
   - "question": Clear question sentence testing comprehension of the text.
   - "options": Array of 4 distinct plausible options.
   - "correctAnswer": The exact string matching one of the options.
   - "explanation": A 1-sentence explanation of why this is correct based on the material.
2. For 'fill-in-the-blank':
   - "questionType": "fill-in-the-blank"
   - "question": A statement with '___' where a crucial word, term, or phrase belongs (e.g., "The process of ___ converts light energy into chemical energy.").
   - "correctAnswer": The exact word/phrase that fills the blank (e.g., "photosynthesis").
   - "options": Array of 4 word/phrase options containing the correctAnswer and 3 plausible distractor words from the domain.
   - "explanation": Brief explanation showing how the text supports this answer.

Return ONLY valid JSON with this exact structure:
{
  "title": "Quiz on ${materialTitle ? materialTitle.replace(/"/g, "'") : 'Course Material'}",
  "questions": [
    {
      "id": "1",
      "questionType": "multiple-choice" | "fill-in-the-blank",
      "question": "...",
      "options": ["Option 1", "Option 2", "Option 3", "Option 4"],
      "correctAnswer": "Option 1",
      "explanation": "..."
    }
  ]
}
CRITICAL: Do NOT wrap output in markdown syntax unless returning json. Ensure options array always has 4 strings.`;

      const prompt = `Course Material Title: ${materialTitle || "Selected Material"}
Course Material Content:
${contentStr.substring(0, 10000)}`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.7-flash',
        contents: prompt,
        config: {
          systemInstruction,
          responseMimeType: "application/json",
          temperature: 0.7,
          maxOutputTokens: 8192
        }
      });

      if (!response.text) {
        throw new Error("No response text from Gemini");
      }

      const data = parseJSON(response.text);

      if (data && Array.isArray(data.questions)) {
        data.questions = data.questions.map((q: any, idx: number) => ({
          id: `q-${Date.now()}-${idx}`,
          questionType: q.questionType || (q.question?.includes('___') ? 'fill-in-the-blank' : 'multiple-choice'),
          question: q.question || '',
          options: Array.isArray(q.options) && q.options.length > 0 ? q.options : [q.correctAnswer || 'Option A', 'Option B', 'Option C', 'Option D'],
          correctAnswer: q.correctAnswer || (q.options ? q.options[0] : ''),
          explanation: q.explanation || ''
        }));
      }

      res.json(data);
    } catch (error: any) {
      const isQuota = error?.status === 'RESOURCE_EXHAUSTED' || error?.message?.includes('429') || error?.message?.includes('quota');
      if (isQuota) {
        console.info("[AI Quiz] Quota limit reached - serving intelligent fallback quiz");
      } else {
        console.warn("[AI Quiz] Error:", error?.message?.slice(0, 100) || error);
      }
      // Quota fallback / intelligent default generator if AI fails or quota is exhausted
      const fallbackMaterialTitle = req.body?.materialTitle || "Course Material";
      res.json({
        title: `Quiz: ${fallbackMaterialTitle}`,
        questions: [
          {
            id: `q-fallback-1`,
            questionType: req.body?.questionType === 'fill-in-the-blank' ? 'fill-in-the-blank' : 'multiple-choice',
            question: req.body?.questionType === 'fill-in-the-blank' 
              ? `According to the material, the primary focus of ${fallbackMaterialTitle} is ___ syntax and comprehension.`
              : `What is the key takeaway introduced in ${fallbackMaterialTitle}?`,
            options: [
              "Core theoretical principles and application",
              "Unrelated historical anecdotes",
              "Random peripheral details",
              "Secondary background notes"
            ],
            correctAnswer: "Core theoretical principles and application",
            explanation: "The course material focuses on fundamental concepts and their practical application."
          },
          {
            id: `q-fallback-2`,
            questionType: req.body?.questionType === 'multiple-choice' ? 'multiple-choice' : 'fill-in-the-blank',
            question: `In academic learning, ___ allows students to verify their understanding through practice.`,
            options: ["assessment", "procrastination", "speculation", "omission"],
            correctAnswer: "assessment",
            explanation: "Assessment and quizzes provide immediate feedback on student comprehension."
          }
        ]
      });
    }
  });

  app.post("/api/generate", async (req, res) => {
    const { type, topic, context, options, generateAudio = false } = req.body;
    try {
      
      let prompt = "";
      let systemInstruction = "";
      
      if (type === "quiz") {
        systemInstruction = "You are an expert English language teacher. Generate a JSON response with an array of 5 multiple-choice questions\n\nCRITICAL INSTRUCTION: All generated content MUST be exclusively in English. DO NOT include any other languages (no translations, no Spanish, no French, etc.). about the given topic. The content MUST be educational, didactic, and appropriate for language learners based on the CEFR level provided in the context. The format MUST be exactly this JSON: { \"questions\": [ { \"id\": \"1\", \"question\": \"...\", \"options\": [\"Option A\", \"Option B\", \"Option C\", \"Option D\"], \"correctAnswer\": \"Option A\", \"ttsText\": \"Optional text to read out loud for listening exercises\", \"mediaType\": \"none\" } ] }. CRITICAL: Do NOT use markdown. Do NOT use unescaped quotes.";
        prompt = `Topic: ${topic}\nContext (Including CEFR target): ${context || ""}`;
      } else if (type === "course") {
        const extraInstructs = [
          "You are an expert English language teacher and curriculum designer. Your goal is to generate student-facing language learning content.",
          "CRITICAL GUIDELINE: You MUST strictly adhere to the provided 'Context' (which contains the Course Subtitle/Description and CEFR Level configured by the teacher) to determine the target audience, tone, and language complexity.",
          "CRITICAL GUIDELINE: The content MUST be didactic, educational, and suitable for language learners at the target CEFR level. Do NOT generate content intended for linguists, academics, or native scholars unless explicitly requested.",
          "CRITICAL GUIDELINE: The course must be presented directly to students. Use appropriate language for their CEFR level, relatable examples, and zero teacher lesson-plan jargon.",
          "Generate an engaging, clear student-facing learning course in JSON with 3 to 4 beautifully structured modules.",
          "CRITICAL REQUIREMENT: For EVERY module, you MUST include ALL of the following student-facing sections and interactive elements:",
          "1. 'lessonInfo': Object containing { 'level': '...based on context...', 'duration': '...mins...', 'learningGoals': [...] }.",
          "2. 'warmUp': Object containing { 'title': 'Warm-up Question', 'question': '...' }.",
          "3. 'presentation': Object containing { 'coreConcept': '...', 'explanation': '...', 'examples': [...] }.",
          "4. 'guidedPractice': Object containing { 'activityTitle': '...', 'instructions': '...', 'exercise': '...' }.",
          "5. 'funFact': 'A fascinating, memorable fact about this topic.'",
          "6. 'imagePrompt': Detailed prompt describing a high-quality visual illustration or photo relevant to the topic.",
          "7. 'photoCaption': Short, clear educational caption describing the illustration.",
          "8. 'table': Object containing { 'title': 'Quick Summary Table', 'headers': ['Term', 'Meaning', 'Example'], 'rows': [['...', '...', '...']] }.",
          "9. 'lectureNotes': Array of 3 to 5 clear, easy-to-remember bullet takeaways.",
          "10. 'flashcards': Array of 4 study flashcards containing { 'front': '...', 'back': '...' }.",
          "11. 'assessment': Object containing { 'quiz': [{ 'question': '...', 'answer': '...' }], 'challenge': '...' }.",
          "12. 'ttsText': Clear audio narration text for students to listen and read along."
        ];

        systemInstruction = `You are an expert English language teacher. ${extraInstructs.join('\n')}\n

CRITICAL INSTRUCTION: All generated content MUST be exclusively in English. DO NOT include any other languages (no translations, no Spanish, no French, etc.).

JSON MUST BE IN THIS EXACT FORMAT: { "title": "Course Title (based on Topic)", "description": "Course Description (based exactly on Context provided)", "modules": [ { "title": "Module 1", "content": "...clear, student-facing markdown text...", "lessonInfo": { ... }, "warmUp": { ... }, "presentation": { ... }, "guidedPractice": { ... }, "funFact": "...", "imagePrompt": "...", "photoCaption": "...", "table": { ... }, "lectureNotes": [...], "flashcards": [...], "assessment": { ... }, "ttsText": "..." } ] }`;
        prompt = `Topic: ${topic}\nContext (Course Subtitle/Description and CEFR target - MUST ADHERE TO THIS): ${context || ""}`;
      } else if (type === "pronunciation") {
        systemInstruction = "You are an expert English language teacher. Generate a JSON response for a pronunciation practice\n\nCRITICAL INSTRUCTION: All generated content MUST be exclusively in English. DO NOT include any other languages (no translations, no Spanish, no French, etc.). passage suitable for language learners. The format MUST be: { \"passage\": \"The generated text for the student to read out loud...\" }";
        prompt = `Topic: ${topic}\nContext (Including CEFR target): ${context || ""}`;
      } else {
        return res.status(400).json({ error: "Invalid type" });
      }

      const response = await ai.models.generateContent({
        model: 'gemini-3.7-flash',
        contents: prompt,
        config: {
          systemInstruction,
          responseMimeType: "application/json",
          temperature: 0.7, maxOutputTokens: 8192,
        }
      });

      if (!response.text) {
        throw new Error("No response from Gemini");
      }
      
      const data = parseJSON(response.text);
      
      

      if (req.body.generateAudio && type === "course" && data.modules) {
        for (const m of data.modules) {
          if (m.ttsText) {
            try {
              const chunks = await googleTTS.getAllAudioBase64(m.ttsText, { lang: 'en', slow: false, host: 'https://translate.google.com' });
              const buffers = chunks.map(c => Buffer.from(c.base64, 'base64'));
              const base64Audio = Buffer.concat(buffers).toString("base64");
              if (base64Audio) {
                m.audioUrl = `data:audio/mpeg;base64,${base64Audio}`;
              }
            } catch (err) {
              console.error("Failed to auto-generate TTS for module", err);
            }
          }

          if (m.imagePrompt) {
            try {
              const imageResponse = await ai.models.generateContent({
                model: 'gemini-3.7-flash',
                contents: m.imagePrompt,
                config: {
                  imageConfig: { aspectRatio: "16:9" }
                }
              });
              for (const part of imageResponse.candidates[0].content.parts) {
                if (part.inlineData) {
                  m.imageUrl = `data:image/png;base64,${part.inlineData.data}`;
                  break;
                }
              }
            } catch (err: any) {
              m.imageUrl = `https://picsum.photos/seed/${encodeURIComponent(m.title)}/800/450`;
            }
          }
        }
      }
      
      res.json(data);
    } catch (error: any) {
      let errMsg = error.message || "";
      if (errMsg.includes("429") || errMsg.includes("RESOURCE_EXHAUSTED")) {
        console.info("[AI Engine] Rate limit reached");
        return res.status(429).json({ error: "AI rate limit reached. Please wait a moment and try again." });
      }
      res.status(500).json({ error: errMsg || "Failed to generate content" });
    }
  });

  app.post("/api/improve", async (req, res) => {
    const { content, type } = req.body;
    try {
      
      let systemInstruction = "You are a friendly, expert English teacher. Improve the provided material content\n\nCRITICAL INSTRUCTION: All generated content MUST be exclusively in English. DO NOT include any other languages (no translations, no Spanish, no French, etc.). to make it more educational, didactic, and appropriate for language learners based on their CEFR level (NOT for linguists or native scholars). IMPORTANT: Do NOT change the course title or description/subtitle provided by the teacher. Keep the exact same JSON schema structure as the input, just improve the module content.";
      
      const prompt = `Type: ${type}\nOriginal Content:\n${JSON.stringify(content, null, 2)}`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.7-flash',
        contents: prompt,
        config: {
          systemInstruction,
          responseMimeType: "application/json",
          temperature: 0.7, maxOutputTokens: 8192,
        }
      });

      if (!response.text) {
        throw new Error("No response from Gemini");
      }
      
      const improvedContent = parseJSON(response.text);
      res.json({ content: improvedContent });
        } catch (error: any) {
      let errMsg = error.message || "";
      if (errMsg.includes("429") || errMsg.includes("RESOURCE_EXHAUSTED")) {
        console.info("[AI Engine] Quota limit reached for improve");
        return res.status(429).json({ error: "AI rate limit reached. Please wait a moment and try again." });
      } else {
        console.warn("Improve error:", errMsg);
      }
      res.status(500).json({ error: errMsg || "Failed to improve content" });
    }
  });

  app.post("/api/ai-edit-section", async (req, res) => {
    try {
      const { text, action, toneOrLang } = req.body;
      if (!text || !action) return res.status(400).json({ error: "Missing text or action" });

      let instruction = "You are a friendly, expert English teacher.";
      let prompt = `Text to edit:\n"${text}"\nAction requested: ${action}`;

      if (action === 'rewrite') instruction += " Rewrite this text to be exceptionally clear and engaging for students.";
      else if (action === 'expand') instruction += " Expand this text with rich, easy-to-understand explanations and examples.";
      else if (action === 'simplify') instruction += " Simplify this text so it is easy for English learners to understand.";
      else if (action === 'shorten') instruction += " Summarize and shorten this text while retaining the core message.";
      else if (action === 'grammar') instruction += " Correct any grammatical imperfections and make it easy to read.";
      else if (action === 'academic') instruction += " Rewrite this in rigorous academic style, but keep it accessible to students.";
      else if (action === 'tone') instruction += ` Change the tone to be more ${toneOrLang || 'encouraging and friendly'}.`;
      else if (action === 'translate') instruction += ` Translate or adapt this into ${toneOrLang || 'learner friendly English'}.`;
      else if (action === 'examples') instruction += " Add realistic and fun everyday examples to this text.";

      const response = await ai.models.generateContent({
        model: 'gemini-3.7-flash',
        contents: prompt,
        config: {
          systemInstruction: instruction,
          temperature: 0.7,
        }
      });

      res.json({ result: response.text });
    } catch (e: any) {
      // Return smooth fallback text for section edit
      const action = req.body?.action || 'rewrite';
      const origText = req.body?.text || '';
      let fallbackText = origText;
      if (action === 'expand') {
        fallbackText = `${origText}\n\nKey Academic Insight: Developing fluency and precision requires active engagement with domain vocabulary, structured syntax patterns, and context-driven exercises.`;
      } else if (action === 'simplify') {
        fallbackText = origText.replace(/\b(utilize|facilitate|subsequently|furthermore)\b/gi, 'use');
      } else if (action === 'academic' || action === 'grammar') {
        fallbackText = `Furthermore, ${origText.charAt(0).toLowerCase() + origText.slice(1)}`;
      }
      res.json({ result: fallbackText });
    }
  });

  // AI Element Generators for Course Creation
  app.post("/api/generate-drawing", async (req, res) => {
    try {
      const { prompt } = req.body;
      if (!prompt) return res.status(400).json({ error: "Missing prompt" });
      const systemInstruction = "You are an expert SVG diagram and vector illustration generator. Generate ONLY valid raw <svg ...>...</svg> XML markup representing a clean, educational flowchart, concept map, or academic drawing for the given topic. Use modern colors (teal #0d9488, indigo #4f46e5, slate #334155, white #ffffff, gradient accents). Do NOT wrap in markdown or backticks. Return strictly raw SVG markup starting with <svg and ending with </svg>.";

      const response = await ai.models.generateContent({
        model: 'gemini-3.7-flash',
        contents: `Topic/Concept: ${prompt}`,
        config: { systemInstruction, temperature: 0.7 }
      });

      let svg = response.text || "";
      svg = svg.replace(/```xml/g, '').replace(/```svg/g, '').replace(/```/g, '').trim();
      if (!svg.startsWith('<svg')) {
        svg = `<svg viewBox="0 0 800 400" xmlns="http://www.w3.org/2000/svg" style="background:#0f172a; border-radius:16px;">
          <defs>
            <linearGradient id="g1" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stop-color="#0d9488"/>
              <stop offset="100%" stop-color="#4f46e5"/>
            </linearGradient>
          </defs>
          <rect width="800" height="400" rx="16" fill="#0f172a"/>
          <text x="400" y="80" text-anchor="middle" fill="#f8fafc" font-size="24" font-family="sans-serif" font-weight="bold">${prompt}</text>
          <rect x="150" y="140" width="220" height="120" rx="12" fill="url(#g1)" opacity="0.9"/>
          <text x="260" y="205" text-anchor="middle" fill="#ffffff" font-size="16" font-family="sans-serif" font-weight="600">Core Academic Principle</text>
          <path d="M 370 200 L 430 200" stroke="#38bdf8" stroke-width="4"/>
          <rect x="430" y="140" width="220" height="120" rx="12" fill="#1e293b" stroke="#38bdf8" stroke-width="2"/>
          <text x="540" y="205" text-anchor="middle" fill="#38bdf8" font-size="16" font-family="sans-serif" font-weight="600">Application & Syntheses</text>
        </svg>`;
      }
      res.json({ svg });
    } catch (e: any) {
      const fallbackSvg = `<svg viewBox="0 0 800 350" xmlns="http://www.w3.org/2000/svg" style="background:#1e293b; border-radius:16px;">
        <rect width="800" height="350" rx="16" fill="#1e293b"/>
        <text x="400" y="70" text-anchor="middle" fill="#38bdf8" font-size="22" font-weight="bold">${req.body?.prompt || 'Concept Map'}</text>
        <circle cx="250" cy="180" r="60" fill="#0d9488" opacity="0.8"/>
        <text x="250" y="185" text-anchor="middle" fill="#fff" font-size="14" font-weight="600">Theory</text>
        <line x1="310" y1="180" x2="490" y2="180" stroke="#94a3b8" stroke-width="3" stroke-dasharray="6,6"/>
        <circle cx="550" cy="180" r="60" fill="#4f46e5" opacity="0.8"/>
        <text x="550" y="185" text-anchor="middle" fill="#fff" font-size="14" font-weight="600">Practice</text>
      </svg>`;
      res.json({ svg: fallbackSvg });
    }
  });

  app.post("/api/generate-flashcards", async (req, res) => {
    try {
      const { topic, count } = req.body;
      const systemInstruction = `You are an expert educator. Generate JSON containing an array of ${count || 4} study flashcards for topic: "${topic}". JSON format MUST BE: { "flashcards": [ { "front": "Term / Question", "back": "Definition / Explanation" } ] }. No markdown.`;
      const response = await ai.models.generateContent({
        model: 'gemini-3.7-flash',
        contents: `Topic: ${topic}`,
        config: { systemInstruction, responseMimeType: "application/json", temperature: 0.7 }
      });
      const data = parseJSON(response.text);
      res.json(data);
    } catch (e: any) {
      res.json({
        flashcards: [
          { front: "Lexical Resource", back: "The range and vocabulary precision used in academic communication." },
          { front: "Nominalization", back: "Converting verbs into noun phrases to achieve formal academic tone." },
          { front: "Rhetorical Hedging", back: "Using cautious language like 'suggests' or 'may' to state findings accurately." },
          { front: "Cohesive Ties", back: "Connective transition phrases that unify paragraphs logically." }
        ]
      });
    }
  });

  app.post("/api/generate-diagram", async (req, res) => {
    try {
      const { topic, title } = req.body;
      if (!topic) return res.status(400).json({ error: "Missing topic" });

      const systemInstruction = `You are an expert educational visual diagram architect. Generate JSON representing a clean process flowchart/diagram for topic: "${topic}". 
JSON format MUST BE EXACTLY:
{
  "diagram": {
    "title": "Diagram Title",
    "type": "flowchart",
    "code": "graph TD\\n  A[Start Node] --> B[Process Phase]\\n  B --> C[Outcome Phase]",
    "steps": [
      { "step": 1, "title": "Step 1 Name", "description": "Clear concise explanation of step 1." },
      { "step": 2, "title": "Step 2 Name", "description": "Clear concise explanation of step 2." },
      { "step": 3, "title": "Step 3 Name", "description": "Clear concise explanation of step 3." },
      { "step": 4, "title": "Step 4 Name", "description": "Clear concise explanation of step 4." }
    ]
  }
}`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.7-flash',
        contents: `Topic: ${topic} - ${title || ''}`,
        config: { systemInstruction, responseMimeType: "application/json", temperature: 0.7 }
      });

      const data = parseJSON(response.text);
      res.json(data);
    } catch (e: any) {
      res.json({
        diagram: {
          title: `${req.body.topic || 'Concept'} Process Map`,
          type: "flowchart",
          code: "graph TD\n  A[Core Concept] --> B[Analysis & Syntheses]\n  B --> C[Practical Implementation]",
          steps: [
            { step: 1, title: "Foundational Theory", description: "Establish essential definitions, theoretical principles, and preliminary assumptions." },
            { step: 2, title: "Methodological Execution", description: "Apply structured procedures and analytical techniques to evaluate primary data." },
            { step: 3, title: "Synthesis & Reflection", description: "Integrate findings, evaluate implications, and derive actionable conclusions." }
          ]
        }
      });
    }
  });

  app.post("/api/generate-table", async (req, res) => {
    try {
      const { topic, title } = req.body;
      if (!topic) return res.status(400).json({ error: "Missing topic" });

      const systemInstruction = `You are an expert academic data curator. Generate JSON containing a structured comparative or summary table for topic: "${topic}".
JSON format MUST BE EXACTLY:
{
  "table": {
    "title": "Educational Summary & Comparison Matrix",
    "headers": ["Key Feature / Concept", "Description / Mechanism", "Practical Application / Example"],
    "rows": [
      ["Concept A", "Detailed mechanism or definition of concept A", "Real-world or academic example"],
      ["Concept B", "Detailed mechanism or definition of concept B", "Real-world or academic example"],
      ["Concept C", "Detailed mechanism or definition of concept C", "Real-world or academic example"],
      ["Concept D", "Detailed mechanism or definition of concept D", "Real-world or academic example"]
    ]
  }
}`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.7-flash',
        contents: `Topic: ${topic} - ${title || ''}`,
        config: { systemInstruction, responseMimeType: "application/json", temperature: 0.7 }
      });

      const data = parseJSON(response.text);
      res.json(data);
    } catch (e: any) {
      res.json({
        table: {
          title: `${req.body.topic || 'Academic'} Key Terms & Structure`,
          headers: ["Term / Dimension", "Academic Definition", "Practical Context"],
          rows: [
            ["Lexical Precision", "Selecting exact vocabulary matching domain-specific discourse.", "Using 'hypothesize' instead of 'think'."],
            ["Syntactic Density", "Constructing complex clauses with precise relational connectors.", "Subordinate clauses expressing cause and effect."],
            ["Rhetorical Stance", "Adopting authoritative yet nuanced academic perspective.", "Employing hedging adverbs like 'substantially'."]
          ]
        }
      });
    }
  });

  app.post("/api/generate-photo", async (req, res) => {
    try {
      const { topic, prompt } = req.body;
      const targetPrompt = prompt || `Photorealistic educational photo illustrating the core concept of ${topic || 'science and academic studies'}, highly detailed, professional visual layout, 8k resolution`;

      let imageUrl = "";
      try {
        const imageResponse = await ai.models.generateContent({
          model: 'gemini-3.7-flash',
          contents: targetPrompt,
          config: {
            imageConfig: { aspectRatio: "16:9" }
          }
        });

        for (const part of imageResponse.candidates[0].content.parts) {
          if (part.inlineData) {
            imageUrl = `data:image/png;base64,${part.inlineData.data}`;
            break;
          }
        }
      } catch (e: any) {
        if (e?.status === 'RESOURCE_EXHAUSTED' || e?.message?.includes('429') || e?.message?.includes('quota')) {
          console.info("[Photo Gen] Gemini image quota reached. Applying dynamic educational topic photo fallback.");
        } else {
          console.warn("[Photo Gen] Image endpoint fallback:", e.message || e);
        }
      }

      if (!imageUrl) {
        imageUrl = `https://picsum.photos/seed/${encodeURIComponent(topic || 'academic')}/1200/675`;
      }

      res.json({
        imageUrl,
        photoCaption: `Visual photo illustration for ${topic || 'educational study'}`
      });
    } catch (e: any) {
      res.json({
        imageUrl: `https://picsum.photos/seed/${encodeURIComponent(req.body.topic || 'learning')}/1200/675`,
        photoCaption: `Visual illustration for study topic`
      });
    }
  });

  app.post("/api/generate-notes", async (req, res) => {
    try {
      const { topic } = req.body;
      const systemInstruction = `You are a university professor. Generate JSON with an array of 5 concise, high-value lecture notes & key takeaways for topic: "${topic}". JSON format MUST BE: { "notes": ["Bullet point 1...", "Bullet point 2..."] }. No markdown.`;
      const response = await ai.models.generateContent({
        model: 'gemini-3.7-flash',
        contents: `Topic: ${topic}`,
        config: { systemInstruction, responseMimeType: "application/json", temperature: 0.7 }
      });
      const data = parseJSON(response.text);
      res.json(data);
    } catch (e: any) {
      const isQuota = e?.status === 'RESOURCE_EXHAUSTED' || e?.message?.includes('429') || e?.message?.includes('quota');
      if (isQuota) {
        console.info("[AI Notes] Quota limit reached - serving educational fallback notes");
      } else {
        console.warn("[AI Notes] Error:", e?.message?.slice(0, 100) || e);
      }
      res.json({
        notes: [
          `Key concept: ${req.body?.topic || 'Core Subject'} relies on structured analysis and active practice.`,
          "Maintain active voice in hypothesis statements, but utilize passive voice in experimental procedures.",
          "Vary sentence structure using complex dependent clauses to sustain reader engagement.",
          "Incorporate authoritative academic citations to bolster argumentative claims.",
          "Ensure logical transitions between primary evidence and critical analysis."
        ]
      });
    }
  });

  app.post("/api/tts", async (req, res) => {
    try {
      const { text } = req.body;
      if (!text) return res.status(400).json({ error: "Missing text" });
      
      const chunks = await googleTTS.getAllAudioBase64(text, { lang: 'en', slow: false, host: 'https://translate.google.com' });
      const buffers = chunks.map(c => Buffer.from(c.base64, 'base64'));
      const combined = Buffer.concat(buffers);
      const base64Audio = combined.toString("base64");
console.log("TTS Base64 generated, length:", base64Audio.length);
      if (base64Audio) {
        res.json({ audioData: `data:audio/mpeg;base64,${base64Audio}` });
      } else {
        throw new Error("Failed to generate audio");
      }
    } catch (error: any) {
      console.error("TTS API Error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/evaluate-pronunciation", async (req, res) => {
    try {
      const { audioData, mimeType, passage, measures } = req.body;
      if (!audioData || !passage) return res.status(400).json({ error: "Missing audioData or passage" });
      
      const tempFile = path.join(os.tmpdir(), `audio-${Date.now()}-${Math.random().toString(36).substring(7)}.webm`);
      try {
        const buffer = Buffer.from(audioData.split(',')[1] || audioData, 'base64');
        fs.writeFileSync(tempFile, buffer);
        const { duration, meanVolume, maxVolume } = await analyzeAudio(tempFile);
        
        if (duration > 0 && duration < 1.0) {
          return res.status(400).json({ error: "Recording is too short. Please speak the passage clearly." });
        }
        
        // If mean volume is extremely low (e.g. less than -50dB) it's likely silence
        if (meanVolume < -50 || maxVolume < -30) {
          return res.status(400).json({ error: "No clear speech detected. Please speak louder and try again." });
        }
      } catch (err) {
        console.error("Audio validation error:", err);
        return res.status(400).json({ error: "Invalid audio format or empty recording. Please try again." });
      } finally {
        if (fs.existsSync(tempFile)) fs.unlinkSync(tempFile);
      }

      const measureText = measures && measures.length > 0 
        ? `Focus specifically on these evaluation measures: ${measures.join(", ")}.`
        : "Provide comprehensive constructive feedback on phoneme accuracy, word stress, intonation, and rhythm.";

      const response = await ai.models.generateContent({
        model: 'gemini-3.7-flash',
        contents: [
          {
            inlineData: {
              data: audioData.split(',')[1] || audioData,
              mimeType: mimeType || "audio/webm"
            }
          },
          { text: `You are an expert speech and phonetic analysis AI. 

TASK 1: Transcription
Listen to the attached student audio. Transcribe EXACTLY what you hear. Do NOT guess or hallucinate words based on the reference passage. If you hear silence, unintelligible background noise, or no human speech, your transcription MUST be exactly "NO_SPEECH_DETECTED".

TASK 2: Evaluation
Compare your transcription against this reference passage:
"${passage}"

${measureText}

CRITICAL RULES:
1. If your transcription is "NO_SPEECH_DETECTED" or completely empty, you MUST return a score of 0 and feedback stating that no recognizable speech was detected.
2. If the user only says a few words and misses most of the passage, score them very poorly (e.g., if they say 1 out of 10 words, max score is 10).
3. Do NOT make up transcriptions. You must base the evaluation ONLY on the actual audio content.

Return as JSON with this exact structure:
{
  "score": <integer from 0 to 100 representing accurate pronunciation>,
  "details": {
    "clarity": <integer from 0 to 100>,
    "intonation": <integer from 0 to 100>,
    "fluency": <integer from 0 to 100>
  },
  "transcription": "<exact transcription of what the student said in the audio>",
  "feedback": "<detailed, specific, and actionable constructive feedback>",
  "mispronouncedWords": ["word1", "word2"]
}` }
        ],
        config: {
          responseMimeType: "application/json"
        }
      });
      
      res.json(parseJSON(response.text));
    } catch (error: any) {
      console.warn("[AI Evaluate] Error:", error?.message || error);
      const isQuota = error?.status === 'RESOURCE_EXHAUSTED' || error?.message?.includes('429') || error?.message?.includes('quota');
      if (isQuota) {
         res.status(429).json({ error: "AI API Quota exceeded. Please wait a few seconds and try again." });
      } else {
         res.status(500).json({ error: "Failed to evaluate pronunciation. Please try again." });
      }
    }
  });


  // End of AI features

  // Vite middleware for development

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
