import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
async function test() {
  const systemInstruction = "You are an expert English language teacher. Generate a JSON response with a single multiple-choice question about the given topic. The format MUST be: { \"question\": \"...\", \"options\": [\"A\", \"B\", \"C\", \"D\"], \"correctAnswer\": \"A\", \"ttsText\": \"Optional text to read out loud for listening exercises\", \"mediaType\": \"audio\" }.";
  const prompt = "Topic: Food\nContext: Food";
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: prompt,
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        temperature: 0.7,
      }
    });
    console.log("Response:", response.text);
  } catch (e) {
    console.error("Error:", e);
  }
}
test();
