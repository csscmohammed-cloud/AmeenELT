import { GoogleGenAI } from "@google/genai";
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
async function run() {
  const model = "gemini-3.5-flash-lite";
  for (let i=0; i<30; i++) {
    try {
      await ai.models.generateContent({ model, contents: "Hi" });
      process.stdout.write(".");
    } catch(e) {
      console.log("\nFailed at", i, ":", e.message);
      break;
    }
  }
}
run();
