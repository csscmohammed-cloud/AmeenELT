import fs from 'fs';

let content = fs.readFileSync('/app/applet/server.ts', 'utf8');

content = content.replace(
`Return as JSON with this exact structure:
{
  "score": <integer from 0 to 100 representing accurate pronunciation>,
  "transcription": "<exact transcription of what the student said in the audio>",
  "feedback": "<detailed, specific, and actionable constructive feedback>",
  "mispronouncedWords": ["word1", "word2"]
}`,
`Return as JSON with this exact structure:
{
  "score": <integer from 0 to 100 representing accurate pronunciation>,
  "details": {
    "clarity": <integer from 0 to 100>,
    "intonation": <integer from 0 to 100>,
    "fluency": <integer from 0 to 100>
  },
  "transcription": "<exact transcription of what the student said in the audio>",
  "feedback": "<detailed, specific, and actionable constructive feedback>",
  "mispronouncedWords": ["word1", "word2"]
}`);

fs.writeFileSync('/app/applet/server.ts', content);
console.log('Patched server.ts');
