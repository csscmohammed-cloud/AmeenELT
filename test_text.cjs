const { GoogleGenAI } = require('@google/genai');
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
async function test() {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: "Hello",
    });
    console.log("Success with gemini-3.5-flash!", response.text);
  } catch(e) {
    console.error("gemini-3.5-flash Error:", e.message);
  }
}
test();
