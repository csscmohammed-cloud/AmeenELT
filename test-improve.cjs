const { GoogleGenAI } = require("@google/genai");
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
async function run() {
  try {
      const type = 'quiz';
      const content = {"questions": [{"question": "What did you do yesterday?", "options": ["I do it", "I did it", "I doing it", "I does it"], "correctAnswer": "I did it"}]};
      let systemInstruction = "You are an expert English language teacher and curriculum designer. Improve the provided material content to make it more engaging, grammatically perfect, and educational. Keep the exact same JSON schema structure as the input, just improve the text content.";
      
      const prompt = `Type: ${type}\nOriginal Content:\n${JSON.stringify(content, null, 2)}`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.6-flash',
        contents: prompt,
        config: {
          systemInstruction,
          responseMimeType: "application/json",
          temperature: 0.7,
        }
      });

    console.log("Success with 3.6! " + response.text);
  } catch (e) {
    console.log("Failed 3.6:", e.message);
  }
}
run();
