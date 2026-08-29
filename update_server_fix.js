import fs from 'fs';

let code = fs.readFileSync('server.ts', 'utf8');

// 1. Update GoogleGenAI initialization
code = code.replace(
  `const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });`,
  `const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});`
);

// 2. Replace all gemini-3.5-flash with gemini-3.6-flash
code = code.replaceAll('gemini-3.5-flash', 'gemini-3.6-flash');

// 3. Update parseJSON function with robust implementation
const oldParseFn = `function parseJSON(str) {
  try {
    return JSON.parse(str);
  } catch (e) {
    const cleaned = str.replace(/^\\s*\`\`\`json/m, '').replace(/\`\`\`\\s*$/m, '').trim();
    return JSON.parse(cleaned);
  }
}`;

const newParseFn = `function fixJSONControlChars(str: string): string {
  let result = '';
  let inString = false;
  let isEscaped = false;

  for (let i = 0; i < str.length; i++) {
    const char = str[i];
    if (inString) {
      if (isEscaped) {
        result += char;
        isEscaped = false;
      } else if (char === '\\\\') {
        result += char;
        isEscaped = true;
      } else if (char === '"') {
        result += char;
        inString = false;
      } else if (char === '\\n') {
        result += '\\\\n';
      } else if (char === '\\r') {
        result += '\\\\r';
      } else if (char === '\\t') {
        result += '\\\\t';
      } else {
        result += char;
      }
    } else {
      if (char === '"') inString = true;
      result += char;
    }
  }
  return result;
}

function repairTruncatedJSON(str: string): string {
  let inString = false;
  let isEscaped = false;
  const stack: string[] = [];

  for (let i = 0; i < str.length; i++) {
    const char = str[i];
    if (inString) {
      if (isEscaped) {
        isEscaped = false;
      } else if (char === '\\\\') {
        isEscaped = true;
      } else if (char === '"') {
        inString = false;
      }
    } else {
      if (char === '"') {
        inString = true;
      } else if (char === '{' || char === '[') {
        stack.push(char);
      } else if (char === '}') {
        if (stack.length > 0 && stack[stack.length - 1] === '{') stack.pop();
      } else if (char === ']') {
        if (stack.length > 0 && stack[stack.length - 1] === '[') stack.pop();
      }
    }
  }

  let repaired = str.trim();
  if (inString) repaired += '"';
  repaired = repaired.replace(/,\\s*$/, '');
  repaired = repaired.replace(/:\\s*$/, ': null');

  while (stack.length > 0) {
    const openChar = stack.pop();
    if (openChar === '{') repaired += '}';
    else if (openChar === '[') repaired += ']';
  }

  return repaired;
}

function parseJSON(str: string): any {
  if (!str) throw new Error("Empty string provided to parseJSON");

  let cleaned = str.trim();

  if (cleaned.startsWith('\`\`\`')) {
    cleaned = cleaned.replace(/^\`\`\`(?:json)?\\s*/i, '').replace(/\\s*\`\`\`$/i, '').trim();
  } else {
    const match = cleaned.match(/\`\`\`(?:json)?\\s*([\\s\\S]*?)\\s*\`\`\`/i);
    if (match && match[1]) {
      cleaned = match[1].trim();
    } else {
      const firstBrace = cleaned.indexOf('{');
      const firstBracket = cleaned.indexOf('[');
      let startIndex = -1;
      if (firstBrace !== -1 && firstBracket !== -1) {
        startIndex = Math.min(firstBrace, firstBracket);
      } else if (firstBrace !== -1) {
        startIndex = firstBrace;
      } else if (firstBracket !== -1) {
        startIndex = firstBracket;
      }
      if (startIndex > 0) {
        cleaned = cleaned.slice(startIndex);
      }
    }
  }

  try {
    return JSON.parse(cleaned);
  } catch (e1) {}

  let sanitized = cleaned.replace(/,\\s*([}\\]])/g, '$1');
  try {
    return JSON.parse(sanitized);
  } catch (e2) {}

  sanitized = fixJSONControlChars(sanitized);
  try {
    return JSON.parse(sanitized);
  } catch (e3) {}

  sanitized = sanitized.replace(/,\\s*([}\\]])/g, '$1');
  try {
    return JSON.parse(sanitized);
  } catch (e4) {}

  try {
    const repaired = repairTruncatedJSON(sanitized);
    return JSON.parse(repaired);
  } catch (e5) {}

  return JSON.parse(cleaned);
}`;

code = code.replace(oldParseFn, newParseFn);

fs.writeFileSync('server.ts', code);
console.log('Successfully updated server.ts!');
