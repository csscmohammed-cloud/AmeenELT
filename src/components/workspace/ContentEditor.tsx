import React from "react";
import { MaterialType, QuizQuestion } from "../../types";
import { Plus, Trash2, GripVertical } from "lucide-react";

interface ContentEditorProps {
  type: MaterialType;
  content: any;
  onChange: (newContent: any) => void;
}

export function ContentEditor({ type, content, onChange }: ContentEditorProps) {
  if (type === "quiz") {
    const questions: QuizQuestion[] = content.questions || [];

    const [generatingAudioFor, setGeneratingAudioFor] = React.useState<
      number | null
    >(null);
    const handleGenerateAudio = async (qIdx: number, text: string) => {
      if (!text) return alert("Please enter some text to generate audio for.");
      setGeneratingAudioFor(qIdx);
      try {
        const res = await fetch("/api/tts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text }),
        });
        const data = await res.json();
        if (res.ok) {
          updateQuestion(qIdx, "mediaUrl", data.audioData);
          updateQuestion(qIdx, "mediaType", "audio");
        } else {
          alert(data.error || "Failed to generate audio");
        }
      } catch (e) {
        console.error(e);
        alert("Failed to generate audio");
      } finally {
        setGeneratingAudioFor(null);
      }
    };

    const updateQuestion = (index: number, field: string, value: any) => {
      const newQuestions = [...questions];
      newQuestions[index] = { ...newQuestions[index], [field]: value };
      onChange({ ...content, questions: newQuestions });
    };

    const addQuestion = () => {
      onChange({
        ...content,
        questions: [
          ...questions,
          {
            question: "",
            options: ["", "", "", ""],
            correctAnswer: "",
            questionType: "multiple-choice",
          },
        ],
      });
    };

    const removeQuestion = (index: number) => {
      onChange({
        ...content,
        questions: questions.filter((_, i) => i !== index),
      });
    };

    return (
      <div className="space-y-6">
        {questions.map((q, qIndex) => (
          <div
            key={qIndex}
            className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-4"
          >
            <div className="flex justify-between items-start mb-4">
              <h4 className="font-medium text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <GripVertical className="w-4 h-4 text-slate-400 cursor-move" />
                Question {qIndex + 1}
              </h4>
              <button
                onClick={() => removeQuestion(qIndex)}
                className="p-1 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Question Text
                </label>
                <input
                  type="text"
                  value={q.question}
                  onChange={(e) =>
                    updateQuestion(qIndex, "question", e.target.value)
                  }
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md bg-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Question Type
                </label>
                <select
                  value={q.questionType}
                  onChange={(e) =>
                    updateQuestion(qIndex, "questionType", e.target.value)
                  }
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md bg-transparent"
                >
                  <option value="multiple-choice">Multiple Choice</option>
                  <option value="short-answer">Short Answer</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Media Type
                </label>
                <select
                  value={q.mediaType || "none"}
                  onChange={(e) => {
                    const val = e.target.value;
                    updateQuestion(qIndex, "mediaType", val === "none" ? undefined : val);
                  }}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md bg-transparent mb-2"
                >
                  <option value="none">None</option>
                  <option value="photo">Photo / Image</option>
                  <option value="video">Video</option>
                  <option value="audio">Audio</option>
                </select>

                {q.mediaType && q.mediaType !== "none" && (
                  <div className="mt-2">
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Media URL
                    </label>
                    <input
                      type="text"
                      value={q.mediaUrl || ""}
                      onChange={(e) =>
                        updateQuestion(qIndex, "mediaUrl", e.target.value)
                      }
                      placeholder={`Enter ${q.mediaType} URL...`}
                      className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md bg-transparent"
                    />
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1 flex justify-between items-center">
                  <span>TTS Text / Spoken Audio (Optional)</span>
                  <button
                    type="button"
                    onClick={() =>
                      handleGenerateAudio(qIndex, q.ttsText || q.question)
                    }
                    disabled={
                      generatingAudioFor === qIndex ||
                      (!q.ttsText && !q.question)
                    }
                    className="text-teal-600 hover:text-teal-700 disabled:opacity-50 text-xs font-bold"
                  >
                    {generatingAudioFor === qIndex
                      ? "Generating..."
                      : "Generate TTS Audio"}
                  </button>
                </label>
                <input
                  type="text"
                  value={q.ttsText || ""}
                  onChange={(e) =>
                    updateQuestion(qIndex, "ttsText", e.target.value)
                  }
                  placeholder="Text to speak..."
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md bg-transparent mb-2"
                />
                {q.mediaType === "audio" && q.mediaUrl && q.mediaUrl.startsWith('data:audio') && (
                  <audio
                    src={q.mediaUrl}
                    controls
                    className="h-8 w-full mt-2"
                  />
                )}
              </div>

              {q.questionType === "multiple-choice" && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Options & Correct Answer
                  </label>
                  <div className="space-y-2">
                    {q.options?.map((opt, oIndex) => (
                      <div key={oIndex} className="flex gap-2 items-center">
                        <input
                          type="radio"
                          name={`correct-${qIndex}`}
                          checked={q.correctAnswer === opt && opt !== ""}
                          onChange={() =>
                            updateQuestion(qIndex, "correctAnswer", opt)
                          }
                          className="text-teal-600"
                        />
                        <input
                          type="text"
                          value={opt}
                          onChange={(e) => {
                            const newOptions = [...(q.options || [])];
                            newOptions[oIndex] = e.target.value;
                            updateQuestion(qIndex, "options", newOptions);
                            // If this was the correct answer, update that too
                            if (q.correctAnswer === opt) {
                              updateQuestion(
                                qIndex,
                                "correctAnswer",
                                e.target.value,
                              );
                            }
                          }}
                          placeholder={`Option ${oIndex + 1}`}
                          className="flex-1 px-3 py-1.5 border border-slate-300 dark:border-slate-600 rounded-md bg-transparent text-sm"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {q.questionType === "short-answer" && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Correct Answer
                  </label>
                  <input
                    type="text"
                    value={q.correctAnswer}
                    onChange={(e) =>
                      updateQuestion(qIndex, "correctAnswer", e.target.value)
                    }
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md bg-transparent"
                  />
                </div>
              )}
            </div>
          </div>
        ))}

        <button
          onClick={addQuestion}
          className="w-full py-3 border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-lg text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors flex items-center justify-center gap-2 font-medium"
        >
          <Plus className="w-4 h-4" /> Add Question
        </button>
      </div>
    );
  }


  if (type === "pronunciation") {
    const defaultMeasures = ['fluency', 'accent', 'clarity', 'pacing'];
    const currentMeasures = content.measures || ['fluency'];

    const toggleMeasure = (m: string) => {
      const newMeasures = currentMeasures.includes(m) 
        ? currentMeasures.filter((x: string) => x !== m)
        : [...currentMeasures, m];
      onChange({ ...content, measures: newMeasures });
    };

    return (
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
            Reading Passage
          </label>
          <textarea
            value={content.passage || ""}
            onChange={(e) => onChange({ ...content, passage: e.target.value })}
            className="w-full px-4 py-3 border border-slate-300 dark:border-slate-600 rounded-lg bg-transparent text-lg font-serif"
            rows={8}
            placeholder="Enter the text students need to read aloud..."
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
            AI Evaluation Measures (tick what to evaluate)
          </label>
          <div className="flex gap-4 flex-wrap">
            {defaultMeasures.map(m => (
              <label key={m} className="flex items-center gap-2 cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={currentMeasures.includes(m)}
                  onChange={() => toggleMeasure(m)}
                  className="w-4 h-4 text-teal-600 rounded border-slate-300"
                />
                <span className="capitalize text-slate-700 dark:text-slate-300">{m}</span>
              </label>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (type === "interactive-course") {
    return (
      <div className="space-y-4">
        <div className="bg-purple-50 dark:bg-purple-900/20 text-purple-800 dark:text-purple-300 p-4 rounded-lg text-sm border border-purple-200 dark:border-purple-800">
          This is an AI-generated interactive course. You can manually edit the underlying JSON structure if needed.
        </div>
        <textarea
          defaultValue={JSON.stringify(content, null, 2)}
          onBlur={(e) => {
            try {
              const parsed = JSON.parse(e.target.value);
              onChange(parsed);
            } catch (err) {
              alert("Invalid JSON");
            }
          }}
          className="w-full h-[600px] p-4 font-mono text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200"
        />
      </div>
    );
  }

  return (
    <div className="p-4 bg-yellow-50 text-yellow-800 rounded-lg">
      Editor not available for this material type.
    </div>
  );
}
