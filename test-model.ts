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
  await test("gemini-3.5-flash");
  await test("gemini-3.5-flash-lite");
  await test("gemini-3.1-flash-lite-preview");
  await test("gemini-3.1-pro-preview");
}
run();
