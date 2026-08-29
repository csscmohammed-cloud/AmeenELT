import { GoogleGenAI } from "@google/genai";
import dotenv from 'dotenv';
dotenv.config();

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
async function test() {
  const modelsToTest = [
    'gemini-3.5-flash',
    'gemini-3.1-pro-preview',
    'gemini-3.1-flash-lite'
  ];
  for (const m of modelsToTest) {
    try {
      const resp = await ai.models.generateContent({
        model: m,
        contents: "Say hi"
      });
      console.log(`${m}: success`);
    } catch (e) {
      console.log(`${m}: error ${e.message}`);
    }
  }
}
test().catch(console.error);
