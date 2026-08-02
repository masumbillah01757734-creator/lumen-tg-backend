"use client";

export default function ConfirmDialog({ open, title, description, confirmLabel = "Confirm", danger, onConfirm, onCancel, children }) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 px-4">
      <div className="bg-surface border border-border rounded-xl2 p-5 w-full max-w-sm shadow-panel">
        <h3 className="font-display font-semibold text-base mb-1">{title}</h3>
        {description && <p className="text-sm text-text-muted mb-3">{description}</p>}
        {children}
        <div className="flex justify-end gap-2 mt-4">
          <button
            onClick={onCancel}
            className="px-3.5 py-2 text-sm rounded-lg text-text-muted hover:bg-elevated transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className={`px-3.5 py-2 text-sm rounded-lg text-white transition-colors ${
              danger ? "bg-danger hover:bg-danger/80" : "bg-accent hover:bg-accent-dim"
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
