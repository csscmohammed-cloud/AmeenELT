import React, { useState } from 'react';
import { MessageSquare, Send, Sparkles, CheckCircle2, User, Bot } from 'lucide-react';

interface Props {
  scenarioTitle?: string;
  scenarioDescription?: string;
  initialPrompt?: string;
}

export function InteractiveRolePlay({ scenarioTitle, scenarioDescription, initialPrompt }: Props) {
  const [messages, setMessages] = useState<Array<{ sender: 'ai' | 'user'; text: string }>>([
    { sender: 'ai', text: initialPrompt || "Hello! Let's practice a real-life English conversation. Imagine you are in an academic office hours meeting with your professor discussing your research proposal. How would you start the conversation?" }
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMessage.trim()) return;

    const userText = inputMessage.trim();
    const newMessages = [...messages, { sender: 'user' as const, text: userText }];
    setMessages(newMessages);
    setInputMessage('');
    setIsEvaluating(true);

    setTimeout(() => {
      setIsEvaluating(false);
      let aiReply = "";
      let evalText = "";

      if (newMessages.length <= 3) {
        aiReply = "That's a very polite opening. Could you elaborate specifically on your main research question and methodology?";
        evalText = "👍 Good formal tone and clear phrasing! Consider adding a transition phrase like 'Furthermore' or 'Specifically'.";
      } else {
        aiReply = "Excellent justification! You've successfully explained the core objectives with strong academic register. Ready to conclude the discussion?";
        evalText = "🌟 Outstanding communicative competence! Your vocabulary and sentence structure demonstrate upper-intermediate fluency.";
      }

      setMessages(prev => [...prev, { sender: 'ai', text: aiReply }]);
      setFeedback(evalText);
    }, 1000);
  };

  return (
    <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-6 rounded-2xl shadow-sm space-y-5">
      <div>
        <h4 className="font-extrabold text-slate-900 dark:text-slate-100 text-base flex items-center gap-2">
          💬 Scenario Role-Play & Dialogue Practice
        </h4>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          {scenarioDescription || "Engage in an interactive role-play simulation to build real-life conversational fluency."}
        </p>
      </div>

      {/* Chat Conversation Box */}
      <div className="h-72 overflow-y-auto p-4 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200 dark:border-slate-700 space-y-3">
        {messages.map((m, idx) => (
          <div key={idx} className={`flex items-start gap-2.5 ${m.sender === 'user' ? 'flex-row-reverse' : ''}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0 ${
              m.sender === 'user' ? 'bg-indigo-600' : 'bg-teal-600'
            }`}>
              {m.sender === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
            </div>
            <div className={`max-w-[80%] p-3.5 rounded-2xl text-xs font-medium leading-relaxed shadow-sm ${
              m.sender === 'user'
                ? 'bg-indigo-600 text-white rounded-tr-none'
                : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 rounded-tl-none'
            }`}>
              {m.text}
            </div>
          </div>
        ))}
        {isEvaluating && (
          <div className="flex items-center gap-2 text-xs text-teal-600 dark:text-teal-400 animate-pulse font-medium">
            <Sparkles className="w-4 h-4" /> AI Tutor is reviewing your response & formulating reply...
          </div>
        )}
      </div>

      {/* Instant AI Feedback Banner */}
      {feedback && (
        <div className="p-3.5 bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800 rounded-xl text-xs text-teal-900 dark:text-teal-200 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-teal-600 shrink-0" />
          <span><strong>AI Feedback:</strong> {feedback}</span>
        </div>
      )}

      {/* Message Input Form */}
      <form onSubmit={handleSendMessage} className="flex gap-2">
        <input
          type="text"
          value={inputMessage}
          onChange={e => setInputMessage(e.target.value)}
          placeholder="Type your spoken response in English..."
          className="flex-1 px-4 py-2.5 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 rounded-xl text-xs font-medium"
        />
        <button
          type="submit"
          disabled={!inputMessage.trim() || isEvaluating}
          className="px-5 py-2.5 bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md transition-colors"
        >
          <Send className="w-4 h-4" /> Send
        </button>
      </form>
    </div>
  );
}
