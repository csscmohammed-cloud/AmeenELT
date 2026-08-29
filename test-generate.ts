import { GoogleGenAI } from "@google/genai";
import * as googleTTS from 'google-tts-api';

function parseJSON(str) {
  try {
    return JSON.parse(str);
  } catch (e) {
    const cleaned = str.replace(/^\s*```json/m, '').replace(/```\s*$/m, '').trim();
    return JSON.parse(cleaned);
  }
}

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

async function test() {
    try {
      const type = "quiz";
      const topic = "Food";
      const context = "Food";
      
      let prompt = "";
      let systemInstruction = "";
      
      if (type === "quiz") {
        systemInstruction = "You are an expert English language teacher. Generate a JSON response with an array of 5 multiple-choice questions about the given topic. The format MUST be: { \"questions\": [ { \"id\": \"1\", \"question\": \"...\", \"options\": [\"A\", \"B\", \"C\", \"D\"], \"correctAnswer\": \"A\", \"ttsText\": \"Optional text to read out loud for listening exercises\", \"mediaType\": \"audio\" } ] }. For listening questions, put the spoken text in 'ttsText'.";
        prompt = `Topic: ${topic}\nContext: ${context || ""}`;
      } else if (type === "course") {
        systemInstruction = "You are an expert English language teacher. Generate a JSON response for a short MOOC module (course). The format MUST be: { \"title\": \"Course Title\", \"description\": \"...\", \"modules\": [ { \"title\": \"Module 1\", \"content\": \"...detailed text...\" } ] }";
        prompt = `Topic: ${topic}\nContext: ${context || ""}`;
      }

      const response = await ai.models.generateContent({
        model: 'gemini-3.5-flash',
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
      
      console.log("Raw Response:", response.text);

      const data = parseJSON(response.text);
      
      if (type === "quiz" && data.questions) {
        for (const q of data.questions) {
          if (q.ttsText) {
            try {
              console.log("Generating TTS for:", data.ttsText || q.ttsText);
              const chunks = await googleTTS.getAllAudioBase64(q.ttsText, { lang: 'en', slow: false, host: 'https://translate.google.com' });
              const buffers = chunks.map(c => Buffer.from(c.base64, 'base64'));
              const combined = Buffer.concat(buffers);
              const base64Audio = combined.toString("base64");
              console.log("TTS Base64 generated, length:", base64Audio.length);
              if (base64Audio) {
                q.mediaUrl = `data:audio/mpeg;base64,${base64Audio}`;
                q.mediaType = 'audio';
              }
            } catch (err) {
              console.error("Failed to auto-generate TTS for question", err);
            }
          }
        }
      }
      
      console.log(JSON.stringify(data).substring(0, 500));
    } catch (error: any) {
      console.error("Gemini API Error:", error);
    }
}
test();
