const googleTTS = require('google-tts-api');
async function run() {
  try {
    const results = await googleTTS.getAllAudioBase64('Hello world, this is a very long text that might need to be split into multiple chunks if it exceeds the two hundred character limit of the google translate text to speech unofficial api that we are using here.', { lang: 'en', slow: false });
    console.log(results.length, 'chunks');
    // combine the base64 chunks? Wait, we can't just concatenate base64 strings if they are mp3s? 
    // Actually you CAN concatenate MP3 files directly! 
    // Let's check the result structure.
    console.log(results[0].shortText);
  } catch(e) {
    console.error(e);
  }
}
run();
