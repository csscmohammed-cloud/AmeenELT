import { GoogleGenAI } from "@google/genai";
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
async function test(model: string) {
  try {
    await ai.models.generateContent({ model, contents: "Hi" });
    console.log(model, "works");
  } catch (e: any) {
    console.log(model, "failed:", e.message);
  }
}
async function run() {
  await test("gemini-1.5-flash");
}
run();
