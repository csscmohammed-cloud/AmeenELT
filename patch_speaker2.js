import fs from 'fs';

let content = fs.readFileSync('src/components/AudioRecorder.tsx', 'utf8');

const originalButton = `{passage && (
             <button
               onClick={speakPassage}
               disabled={isRecording || isTranscribing}
               className="flex items-center gap-2 px-4 py-2 bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300 rounded-full hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors disabled:opacity-50 font-medium text-sm"
             >
               <Volume2 className="w-4 h-4" /> Listen to Native Speaker
             </button>
          )}`;

const newButton = `{passage && (
            isSpeaking ? (
              <button
                onClick={stopSpeaking}
                className="flex items-center gap-2 px-4 py-2 bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 rounded-full hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors font-medium text-sm"
              >
                <Square className="w-4 h-4" /> Stop Playback
              </button>
            ) : (
              <button
                onClick={speakPassage}
                disabled={isRecording || isTranscribing}
                className="flex items-center gap-2 px-4 py-2 bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300 rounded-full hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors disabled:opacity-50 font-medium text-sm"
              >
                <Volume2 className="w-4 h-4" /> Listen to Native Speaker
              </button>
            )
          )}`;

content = content.replace(originalButton, newButton);
fs.writeFileSync('src/components/AudioRecorder.tsx', content);
console.log('Patched UI for speaking button');
