const googleTTS = require('google-tts-api');
async function test() {
  try {
    const url = googleTTS.getAudioUrl('Hello World', {
      lang: 'en',
      slow: false,
      host: 'https://translate.google.com',
    });
    console.log("URL:", url);
    const res = await fetch(url);
    const buffer = await res.arrayBuffer();
    console.log("Base64 length:", Buffer.from(buffer).toString('base64').length);
  } catch(e) {
    console.error(e);
  }
}
test();
