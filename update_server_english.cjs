const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf-8');

const oldLine = '7. "sentence-builder": title, exercises (array of { scrambledWords (array of strings), correctSentence, translation })';
const newLine = '7. "sentence-builder": title, exercises (array of { scrambledWords (array of strings), correctSentence, hint })';

code = code.replace(oldLine, newLine);

const oldEnsure = 'Ensure the content is pedagogical, engaging, and aligned with ${cefrLevel} proficiency. Include the provided keywords if given.';
const newEnsure = 'Ensure the content is pedagogical, engaging, and aligned with ${cefrLevel} proficiency. Include the provided keywords if given.\\n\\nCRITICAL INSTRUCTION: The entire course, including all explanations, instructions, passages, questions, and hints MUST be exclusively in English. DO NOT include any other languages (no Spanish, no French, no other translations).';

code = code.replace(oldEnsure, newEnsure);
fs.writeFileSync('server.ts', code);
