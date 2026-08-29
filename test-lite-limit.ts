import { GoogleGenAI } from "@google/genai";
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
async function run() {
  const model = "gemini-3.5-flash-lite";
  let count = 0;
  for (let i=0; i<5; i++) {
    try {
      await ai.models.generateContent({ model, contents: "Hi" });
      count++;
    } catch(e) {}
  }
  console.log("Success count:", count);
}
run();
