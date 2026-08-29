const googleTTS = require('google-tts-api');
async function run() {
  const results = await googleTTS.getAllAudioBase64('Hello world. This is test 1. This is test 2.', { lang: 'en', slow: false });
  const buffers = results.map(r => Buffer.from(r.base64, 'base64'));
  const combined = Buffer.concat(buffers);
  console.log(combined.toString('base64').substring(0, 100));
}
run();
