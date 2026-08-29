const { GoogleGenAI } = require('@google/genai');
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
async function test() {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: [{ parts: [{ text: "Hello world" }] }],
      config: {
        responseModalities: ["AUDIO"],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: 'Kore' },
          },
        },
      }
    });
    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (base64Audio) {
        console.log("Success with gemini-3.5-flash! Audio length:", base64Audio.length);
    } else {
        console.log("Response:", JSON.stringify(response, null, 2));
    }
  } catch(e) {
    console.error("gemini-3.5-flash Error:", e.message);
  }
}
test();
