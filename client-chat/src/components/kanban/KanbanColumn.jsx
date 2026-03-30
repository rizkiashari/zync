import { useState } from 'react';
import { Plus, Pencil, Trash2, MoreHorizontal } from 'lucide-react';
import TaskCard from './TaskCard';
import { taskService } from '../../services/taskService';
import toast from 'react-hot-toast';
import {
  TASK_DRAG_MIME,
  serializeTaskForDrag,
  parseTaskDragPayload,
} from '../../lib/taskDragPayload';

const KanbanColumn = ({
  column,
  boardId: _boardId,
  members: _members,
  groupId,
  onTaskClick,
  onEditColumn,
  onColumnDeleted,
  onTaskCreated,
  onTaskMove,
}) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [dropActive, setDropActive] = useState(false);

  const handleDeleteColumn = async () => {
    if (!window.confirm(`Hapus kolom "${column.name}"? Semua task di dalamnya akan dihapus.`)) return;
    try {
      await taskService.deleteColumn(column.id);
      onColumnDeleted();
    } catch {
      toast.error('Gagal menghapus kolom');
    }
  };

  return (
    <div className="flex-shrink-0 w-72 flex flex-col max-h-full">
      {/* Column header */}
      <div
        className="flex items-center justify-between px-3 py-2.5 rounded-t-xl mb-1"
        style={{ backgroundColor: column.color + '22', borderTop: `3px solid ${column.color}` }}
      >
        <div className="flex items-center gap-2">
          <span
            className="w-2.5 h-2.5 rounded-full flex-shrink-0"
            style={{ backgroundColor: column.color }}
          />
          <span className="text-sm font-semibold text-slate-700">{column.name}</span>
          <span className="text-xs text-slate-500 bg-white/60 px-1.5 py-0.5 rounded-full font-medium">
            {column.tasks?.length ?? 0}
          </span>
        </div>

        {/* Column menu */}
        <div className="relative">
          <button
            onClick={() => setMenuOpen((v) => !v)}
            className="p-1 rounded-lg hover:bg-white/60 transition-colors"
          >
            <MoreHorizontal className="w-4 h-4 text-slate-500" />
          </button>
          {menuOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
              <div className="absolute right-0 top-8 z-20 bg-white border border-slate-100 rounded-xl shadow-lg py-1 w-36">
                <button
                  onClick={() => { setMenuOpen(false); onEditColumn(column); }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
                >
                  <Pencil className="w-3.5 h-3.5" /> Edit Kolom
                </button>
                <button
                  onClick={() => { setMenuOpen(false); handleDeleteColumn(); }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Hapus Kolom
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Task list (drop zone) */}
      <div
        className={`flex-1 overflow-y-auto rounded-b-xl px-2 py-2 space-y-2 min-h-16 transition-colors ${
          dropActive ? 'bg-indigo-50/90 ring-2 ring-indigo-200 ring-inset' : 'bg-slate-50/80'
        }`}
        onDragOver={(e) => {
          if (!onTaskMove) return;
          e.preventDefault();
          e.dataTransfer.dropEffect = 'move';
          setDropActive(true);
        }}
        onDragLeave={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget)) setDropActive(false);
        }}
        onDrop={(e) => {
          if (!onTaskMove) return;
          e.preventDefault();
          setDropActive(false);
          const task = parseTaskDragPayload(e.dataTransfer);
          if (task) onTaskMove(task, column.id);
        }}
      >
        {column.tasks && column.tasks.map((task) => (
          <TaskCard
            key={task.id}
            task={task}
            onClick={onTaskClick}
            onDragStart={
              onTaskMove
                ? (e) => {
                    e.dataTransfer.setData(
                      TASK_DRAG_MIME,
                      serializeTaskForDrag({ ...task, groupId }),
                    );
                    e.dataTransfer.effectAllowed = 'move';
                  }
                : undefined
            }
          />
        ))}
      </div>

      {/* Add task button */}
      <button
        onClick={() => onTaskCreated(column.id)}
        className="flex items-center gap-1.5 w-full mt-2 px-3 py-2 rounded-xl text-sm text-slate-500 hover:bg-white hover:text-indigo-600 hover:shadow-sm transition-all border-2 border-dashed border-slate-200 hover:border-indigo-300"
      >
        <Plus className="w-4 h-4" />
        Tambah Task
      </button>
    </div>
  );
};

export default KanbanColumn;
