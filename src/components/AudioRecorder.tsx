import React, { useState, useRef } from 'react';
import { Volume2, Mic, Square, Loader2, Play, Pause, RefreshCw, Activity } from 'lucide-react';

export function AudioRecorder({ 
  passage, 
  measures, 
  onEvaluate,
  onRecordingStart
}: { 
  passage?: string; 
  measures?: string[]; 
  onEvaluate?: (evaluation: { score: number, feedback: string, mispronouncedWords: string[], transcription?: string, audioData: string }) => void;
  onRecordingStart?: () => void;
}) {
  const [isRecording, setIsRecording] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [transcription, setTranscription] = useState<string | null>(null);
  const [evaluation, setEvaluation] = useState<{ score: number, details?: { clarity: number, intonation: number, fluency: number }, feedback: string, mispronouncedWords: string[], transcription?: string } | null>(null);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isPaused, setIsPaused] = useState(false);

  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

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
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const url = URL.createObjectURL(audioBlob);
        setAudioUrl(url);
        
        // Transcribe or evaluate
        await processAudio(audioBlob);
      };

      mediaRecorder.start();
      setIsRecording(true);
      setTranscription(null);
      setEvaluation(null);
      setAudioUrl(null);
      if (onRecordingStart) onRecordingStart();
    } catch (error) {
      console.error("Error accessing microphone:", error);
      alert("Microphone access is required for this feature.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
    }
  };

  const processAudio = async (blob: Blob) => {
    setIsTranscribing(true);
    try {

      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const arrayBuffer = await blob.arrayBuffer();
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
      const channelData = audioBuffer.getChannelData(0);
      let sum = 0;
      for (let i = 0; i < channelData.length; i++) {
        sum += channelData[i] * channelData[i];
      }
      const rms = Math.sqrt(sum / channelData.length);
      const db = rms > 0 ? 20 * Math.log10(rms) : -100;
      
      if (db < -40) {
        setIsTranscribing(false);
        setToastMsg('Voice too quiet, please try recording again.');
        setTimeout(() => setToastMsg(null), 4000);
        return;
      }

      const reader = new FileReader();
      reader.readAsDataURL(blob);
      reader.onloadend = async () => {
        const base64Audio = reader.result as string;
        
        if (passage) {
          const res = await fetch('/api/evaluate-pronunciation', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              audioData: base64Audio,
              mimeType: blob.type || 'audio/webm',
              passage,
              measures
            })
          });

          const data = await res.json();
          if (res.ok) {
            setEvaluation(data);
            if (data.transcription) {
              setTranscription(data.transcription);
            }
            if (onEvaluate) {
              onEvaluate({ ...data, audioData: base64Audio });
            }
          } else {
            throw new Error(data.error);
          }
        } else {
          const res = await fetch('/api/transcribe', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              audioData: base64Audio,
              mimeType: blob.type || 'audio/webm'
            })
          });

          const data = await res.json();
          if (res.ok) {
            setTranscription(data.text);
          } else {
            throw new Error(data.error);
          }
        }
      };
    } catch (error: any) {
      console.error("Processing error:", error);
      setTranscription(`Error: ${error.message}`);
    } finally {
      setIsTranscribing(false);
    }
  };

  return (
    <>
      {toastMsg && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-slate-900 text-white px-6 py-3 rounded-xl shadow-2xl animate-in fade-in slide-in-from-top-4">
          {toastMsg}
        </div>
      )}

    <div className="bg-slate-50 dark:bg-slate-800/50 p-8 rounded-2xl border-2 border-slate-200 dark:border-slate-700 shadow-sm space-y-8 max-w-2xl mx-auto">
      <div className="text-center space-y-2">
        <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100">
          {passage ? "Pronunciation Assessment" : "Speaking Practice"}
        </h3>
        <p className="text-slate-600 dark:text-slate-400">
          {passage 
            ? "Record yourself reading the passage. The AI will evaluate your pronunciation." 
            : "Practice speaking out loud and get instant AI transcription."}
        </p>
      </div>

      <div className="flex flex-col items-center justify-center space-y-6">
        <div className="relative">
          {isRecording && (
            <div className="absolute inset-0 bg-red-500 rounded-full animate-ping opacity-20 scale-150"></div>
          )}
          
          {!isRecording ? (
            <button 
              onClick={startRecording}
              disabled={isTranscribing}
              className="relative flex items-center justify-center w-24 h-24 bg-teal-600 text-white rounded-full hover:bg-teal-700 hover:scale-105 transition-all shadow-lg disabled:opacity-50 disabled:hover:scale-100"
              aria-label="Start Recording"
            >
              <Mic className="w-10 h-10" />
            </button>
          ) : (
            <button 
              onClick={stopRecording}
              className="relative flex items-center justify-center w-24 h-24 bg-red-600 text-white rounded-full hover:bg-red-700 hover:scale-105 transition-all shadow-lg"
              aria-label="Stop Recording"
            >
              <Square className="w-8 h-8" />
            </button>
          )}
        </div>
        
        <div className="flex items-center gap-4">
          {passage && (
            isSpeaking ? (
              <div className="flex gap-2">
                <button
                  onClick={isPaused ? speakPassage : pauseSpeaking}
                  className="flex items-center gap-2 px-4 py-2 bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400 rounded-full hover:bg-yellow-200 dark:hover:bg-yellow-900/50 transition-colors font-medium text-sm"
                >
                  {isPaused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />} {isPaused ? 'Resume' : 'Pause'}
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
          )}
        </div>
      </div>

      {(isTranscribing || audioUrl || evaluation || transcription) && (
        <div className="space-y-6 pt-6 border-t border-slate-200 dark:border-slate-700 animate-in fade-in duration-500">
          
          {isTranscribing && (
            <div className="flex flex-col items-center justify-center py-8 space-y-4">
              <Activity className="w-8 h-8 text-teal-600 dark:text-teal-400 animate-pulse" />
              <span className="text-teal-700 dark:text-teal-300 font-medium">
                {passage ? "Analyzing pronunciation and fluency..." : "Transcribing speech..."}
              </span>
            </div>
          )}

          {!isTranscribing && audioUrl && (
            <div className="bg-white dark:bg-slate-900 p-4 rounded-xl flex items-center justify-between border border-slate-200 dark:border-slate-700 shadow-sm">
              <span className="text-sm font-semibold text-slate-700 dark:text-slate-300 ml-2">Playback:</span>
              <audio controls src={audioUrl} className="h-10" />
            </div>
          )}

          {!isTranscribing && evaluation && (
            <div className="bg-white dark:bg-slate-900 rounded-xl border-2 border-teal-100 dark:border-teal-900/50 overflow-hidden shadow-sm">
              <div className="bg-teal-50 dark:bg-teal-900/30 p-6 border-b border-teal-100 dark:border-teal-900/50 flex items-center justify-between">
                <div>
                  <h4 className="text-sm uppercase tracking-wider font-bold text-teal-800 dark:text-teal-300 mb-1">Overall Score</h4>
                  <div className="text-4xl font-black text-teal-600 dark:text-teal-400">{evaluation.score}<span className="text-xl text-teal-400 dark:text-teal-600">/100</span></div>
                </div>
                <div className={`w-16 h-16 rounded-full flex items-center justify-center border-4 ${evaluation.score >= 90 ? 'border-green-500 text-green-500' : evaluation.score >= 70 ? 'border-yellow-500 text-yellow-500' : 'border-red-500 text-red-500'}`}>
                   <span className="text-xl font-bold">{evaluation.score >= 90 ? 'A' : evaluation.score >= 80 ? 'B' : evaluation.score >= 70 ? 'C' : 'F'}</span>
                </div>
              </div>
              
              {evaluation.details && (
                <div className="bg-white dark:bg-slate-900 px-6 py-4 border-b border-teal-100 dark:border-teal-900/50">
                  <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-4">Detailed Breakdown</h4>
                  <div className="space-y-4">
                    {/* Clarity */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-sm font-medium">
                        <span className="text-slate-700 dark:text-slate-300">Clarity</span>
                        <span className="text-slate-600 dark:text-slate-400">{evaluation.details.clarity}%</span>
                      </div>
                      <div className="h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                        <div className="h-full bg-teal-500 rounded-full transition-all duration-1000" style={{ width: `${evaluation.details.clarity}%` }}></div>
                      </div>
                    </div>
                    {/* Intonation */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-sm font-medium">
                        <span className="text-slate-700 dark:text-slate-300">Intonation</span>
                        <span className="text-slate-600 dark:text-slate-400">{evaluation.details.intonation}%</span>
                      </div>
                      <div className="h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                        <div className="h-full bg-blue-500 rounded-full transition-all duration-1000" style={{ width: `${evaluation.details.intonation}%` }}></div>
                      </div>
                    </div>
                    {/* Fluency */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-sm font-medium">
                        <span className="text-slate-700 dark:text-slate-300">Fluency</span>
                        <span className="text-slate-600 dark:text-slate-400">{evaluation.details.fluency}%</span>
                      </div>
                      <div className="h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                        <div className="h-full bg-indigo-500 rounded-full transition-all duration-1000" style={{ width: `${evaluation.details.fluency}%` }}></div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div className="p-6 space-y-6">
                <div>
                  <h5 className="font-semibold text-slate-800 dark:text-slate-200 mb-2 flex items-center gap-2">
                    <Mic className="w-4 h-4 text-teal-500" /> AI Feedback
                  </h5>
                  <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed whitespace-pre-wrap bg-slate-50 dark:bg-slate-800/50 p-4 rounded-lg border border-slate-100 dark:border-slate-700/50">
                    {evaluation.feedback}
                  </p>
                </div>
                
                {evaluation.mispronouncedWords && evaluation.mispronouncedWords.length > 0 && (
                  <div>
                    <h5 className="font-semibold text-slate-800 dark:text-slate-200 mb-2">Words to Practice:</h5>
                    <div className="flex flex-wrap gap-2">
                      {evaluation.mispronouncedWords.map((word, i) => (
                        <span key={i} className="px-3 py-1.5 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 text-sm font-medium rounded-full border border-red-200 dark:border-red-800/50">
                          {word}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                
                {evaluation.transcription && (
                   <div>
                     <h5 className="font-semibold text-slate-800 dark:text-slate-200 mb-2">What we heard:</h5>
                     <p className="text-slate-500 dark:text-slate-400 text-sm italic border-l-4 border-teal-200 dark:border-teal-800 pl-3">
                       "{evaluation.transcription}"
                     </p>
                   </div>
                )}
              </div>
            </div>
          )}

          {!isTranscribing && !evaluation && transcription && (
            <div className={`bg-white dark:bg-slate-900 border ${transcription.startsWith('Error:') ? 'border-red-200 dark:border-red-800/50' : 'border-teal-100 dark:border-teal-800'} p-6 rounded-xl shadow-sm`}>
              <h4 className={`text-sm font-bold uppercase tracking-wider mb-3 ${transcription.startsWith('Error:') ? 'text-red-600 dark:text-red-400' : 'text-teal-800 dark:text-teal-300'}`}>
                {transcription.startsWith('Error:') ? 'Processing Error:' : 'Transcription:'}
              </h4>
              <p className={`text-lg leading-relaxed ${transcription.startsWith('Error:') ? 'text-red-700 dark:text-red-300' : 'text-slate-700 dark:text-slate-300'}`}>
                {transcription.startsWith('Error:') ? transcription.replace('Error: ', '') : transcription}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
    </>
  );
}
