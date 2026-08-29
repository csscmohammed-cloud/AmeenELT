import React from 'react';
import { CourseModule } from '../types';

interface AICanvasEditorProps {
  modules: CourseModule[];
  onChangeModules: (updated: CourseModule[]) => void;
  courseTopic: string;
}

export function AICanvasEditor({ modules, onChangeModules, courseTopic }: AICanvasEditorProps) {

  const updateModule = (index: number, updatedFields: Partial<CourseModule>) => {
    const updated = [...modules];
    updated[index] = { ...updated[index], ...updatedFields };
    onChangeModules(updated);
  };

  const addModule = () => {
    onChangeModules([...modules, { title: 'New Lesson', content: '' }]);
  };

  const removeModule = (index: number) => {
    onChangeModules(modules.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-4">
      {modules.map((m, idx) => (
        <div key={idx} className="p-4 border border-slate-700 rounded-lg space-y-2">
          <input
            type="text"
            value={m.title}
            onChange={(e) => updateModule(idx, { title: e.target.value })}
            className="w-full font-bold text-lg bg-transparent border-b border-slate-700 pb-1"
          />
          <textarea
            value={m.content}
            onChange={(e) => updateModule(idx, { content: e.target.value })}
            className="w-full bg-slate-900 p-2 rounded"
            rows={4}
          />
          <button onClick={() => removeModule(idx)} className="text-red-400 text-sm">Remove</button>
        </div>
      ))}
      <button onClick={addModule} className="px-4 py-2 bg-teal-600 text-white rounded">Add Lesson</button>
    </div>
  );
}
