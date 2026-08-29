import { Trash2 } from 'lucide-react';

interface DeleteButtonProps {
  onDelete: () => void;
  title?: string;
  className?: string;
}

export function DeleteButton({ onDelete, title = "Delete", className = "p-1.5 text-slate-400 hover:text-red-500 rounded transition-colors" }: DeleteButtonProps) {
  return (
    <button
      type="button"
      onClick={(e) => {
        console.log("DeleteButton clicked");
        e.stopPropagation();
        onDelete();
      }}
      className={className}
      title={title}
    >
      <Trash2 className="w-5 h-5 pointer-events-none" />
    </button>
  );
}
