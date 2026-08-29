import fs from 'fs';

let content = fs.readFileSync('src/components/AudioRecorder.tsx', 'utf8');

const originalSpeakLogic = `  const speakPassage = () => {
    if (!passage) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(passage);
    utterance.lang = 'en-US';
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    window.speechSynthesis.speak(utterance);
  };

  const stopSpeaking = () => {
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
  };`;

const newSpeakLogic = `  const [isPaused, setIsPaused] = useState(false);

  const speakPassage = () => {
    if (!passage) return;
    if (isPaused) {
      window.speechSynthesis.resume();
      setIsPaused(false);
      return;
    }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(passage);
    utterance.lang = 'en-US';
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => { setIsSpeaking(false); setIsPaused(false); };
    utterance.onerror = () => { setIsSpeaking(false); setIsPaused(false); };
    window.speechSynthesis.speak(utterance);
  };

  const pauseSpeaking = () => {
    window.speechSynthesis.pause();
    setIsPaused(true);
  };

  const stopSpeaking = () => {
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
    setIsPaused(false);
  };`;

content = content.replace(originalSpeakLogic, newSpeakLogic);

const originalButtonLogic = `{passage && (
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

const newButtonLogic = `{passage && (
            isSpeaking ? (
              <div className="flex gap-2">
                <button
                  onClick={isPaused ? speakPassage : pauseSpeaking}
                  className="flex items-center gap-2 px-4 py-2 bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400 rounded-full hover:bg-yellow-200 dark:hover:bg-yellow-900/50 transition-colors font-medium text-sm"
                >
                  {isPaused ? <Play className="w-4 h-4" /> : <Loader2 className="w-4 h-4" />} {isPaused ? 'Resume' : 'Pause'}
                </button>
                <button
                  onClick={stopSpeaking}
                  className="flex items-center gap-2 px-4 py-2 bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 rounded-full hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors font-medium text-sm"
                >
                  <Square className="w-4 h-4" /> Stop
                </button>
              </div>
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

content = content.replace(originalButtonLogic, newButtonLogic);
fs.writeFileSync('src/components/AudioRecorder.tsx', content);
console.log('Patched UI for pause/resume');
