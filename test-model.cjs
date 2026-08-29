const { GoogleGenAI } = require("@google/genai");
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
async function run() {
  try {
    const res = await ai.models.generateContent({
      model: 'gemini-3.6-flash',
      contents: "Hello",
    });
    console.log("Success with 3.6! " + res.text);
  } catch (e) {
    console.log("Failed 3.6:", e.message);
  }
}
run();
