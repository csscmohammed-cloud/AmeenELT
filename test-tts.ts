import * as googleTTS from 'google-tts-api';

async function test() {
  try {
    const text = "For my main course, I would like to have the grilled salmon with a side of steamed vegetables, please.";
    console.log("Generating TTS...");
    const chunks = await googleTTS.getAllAudioBase64(text, { lang: 'en', slow: false, host: 'https://translate.google.com' });
    const buffers = chunks.map(c => Buffer.from(c.base64, 'base64'));
    const combined = Buffer.concat(buffers);
    const base64Audio = combined.toString('base64');
    console.log("Done, length:", base64Audio.length);
  } catch (e) {
    console.error(e);
  }
}
test();
