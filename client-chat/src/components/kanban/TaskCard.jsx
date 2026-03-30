import { Calendar, Flag, User, GripVertical } from 'lucide-react';

const priorityConfig = {
  high:   { label: 'High',   className: 'bg-red-100 text-red-700' },
  medium: { label: 'Medium', className: 'bg-amber-100 text-amber-700' },
  low:    { label: 'Low',    className: 'bg-sky-100 text-sky-700' },
};

const TaskCard = ({ task, onClick, onDragStart }) => {
  const pCfg = priorityConfig[task.priority] || priorityConfig.medium;

  const isOverdue =
    task.deadline_at && new Date(task.deadline_at) < new Date() ? true : false;

  const deadlineLabel = task.deadline_at
    ? new Date(task.deadline_at).toLocaleDateString('id-ID', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      })
    : null;

  return (
    <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-3 hover:shadow-md hover:border-indigo-200 transition-all group flex gap-2">
      {onDragStart && (
        <span
          draggable
          onDragStart={(e) => {
            e.stopPropagation();
            onDragStart(e);
          }}
          className="flex-shrink-0 pt-0.5 text-slate-300 hover:text-slate-500 cursor-grab active:cursor-grabbing"
          title="Seret ke kolom lain"
          role="presentation"
        >
          <GripVertical className="w-4 h-4" />
        </span>
      )}
      <button
        type="button"
        className="flex-1 min-w-0 text-left cursor-pointer"
        onClick={() => onClick(task)}
      >
        {/* Title */}
        <p className="text-sm font-medium text-slate-800 leading-snug mb-2 group-hover:text-indigo-700 transition-colors">
          {task.title}
        </p>

        {/* Description preview */}
        {task.description && (
          <p className="text-xs text-slate-500 line-clamp-2 mb-2">{task.description}</p>
        )}

        {/* Meta row */}
        <div className="flex items-center flex-wrap gap-1.5 mt-1 pointer-events-none">
          {/* Priority */}
          <span className={`inline-flex items-center gap-1 text-xs font-medium px-1.5 py-0.5 rounded-md ${pCfg.className}`}>
            <Flag className="w-3 h-3" />
            {pCfg.label}
          </span>

          {/* Deadline */}
          {deadlineLabel && (
            <span className={`inline-flex items-center gap-1 text-xs font-medium px-1.5 py-0.5 rounded-md ${
              isOverdue ? 'bg-red-50 text-red-600' : 'bg-slate-100 text-slate-600'
            }`}>
              <Calendar className="w-3 h-3" />
              {deadlineLabel}
            </span>
          )}

          {/* Assignee avatars */}
          {task.assignees && task.assignees.length > 0 && (
            <div className="flex -space-x-1 ml-auto">
              {task.assignees.slice(0, 3).map((a) => (
                <div
                  key={a.id}
                  title={a.username || a.email}
                  className="w-5 h-5 rounded-full bg-indigo-500 border border-white flex items-center justify-center text-[9px] font-bold text-white overflow-hidden"
                >
                  {a.avatar ? (
                    <img src={a.avatar} alt="" className="w-full h-full object-cover" />
                  ) : (
                    (a.username || a.email || '?')[0].toUpperCase()
                  )}
                </div>
              ))}
              {task.assignees.length > 3 && (
                <div className="w-5 h-5 rounded-full bg-slate-300 border border-white flex items-center justify-center text-[9px] font-bold text-slate-600">
                  +{task.assignees.length - 3}
                </div>
              )}
            </div>
          )}
          {(!task.assignees || task.assignees.length === 0) && (
            <User className="w-3.5 h-3.5 text-slate-300 ml-auto" />
          )}
        </div>
      </button>
    </div>
  );
};

export default TaskCard;
