import { GoogleGenAI } from "@google/genai";
import dotenv from 'dotenv';
dotenv.config();

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
async function test() {
  const modelsToTest = [
    'gemini-2.5-flash-lite',
    'gemini-2.0-flash-lite',
    'gemini-3.5-flash-lite',
    'gemini-2.5-flash'
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
