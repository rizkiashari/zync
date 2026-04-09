import { ExternalLink } from "lucide-react";

const LinkPreviewCard = ({ preview, dark = false }) => {
  if (!preview?.title && !preview?.description) return null;

  return (
    <a
      href={preview.url}
      target="_blank"
      rel="noopener noreferrer"
      className={`block mt-2 rounded-xl overflow-hidden border transition-opacity hover:opacity-90
        ${dark ? "border-white/20 bg-white/10" : "border-slate-200 bg-white shadow-sm"}`}
    >
      {preview.image && (
        <img
          src={preview.image}
          alt={preview.title || ""}
          className="w-full h-32 object-cover"
          onError={(e) => { e.currentTarget.style.display = "none"; }}
        />
      )}
      <div className="px-3 py-2">
        {preview.site_name && (
          <p className={`text-xs mb-0.5 ${dark ? "text-white/50" : "text-slate-400"}`}>
            {preview.site_name}
          </p>
        )}
        {preview.title && (
          <p className={`text-sm font-semibold leading-tight line-clamp-2
            ${dark ? "text-white" : "text-slate-800"}`}>
            {preview.title}
          </p>
        )}
        {preview.description && (
          <p className={`text-xs mt-0.5 line-clamp-2
            ${dark ? "text-white/60" : "text-slate-500"}`}>
            {preview.description}
          </p>
        )}
        <div className={`flex items-center gap-1 mt-1.5 text-xs
          ${dark ? "text-white/40" : "text-slate-400"}`}>
          <ExternalLink className="w-3 h-3" />
          <span className="truncate">{preview.url}</span>
        </div>
      </div>
    </a>
  );
};

export default LinkPreviewCard;
