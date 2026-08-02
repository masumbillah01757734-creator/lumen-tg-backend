"use client";

import { AlertTriangle } from "lucide-react";

export default function AlertDialog({ open, title, description, onClose }) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 px-4">
      <div className="bg-surface border border-border rounded-xl2 p-5 w-full max-w-sm shadow-panel">
        <div className="flex items-start gap-3 mb-1">
          <div className="h-9 w-9 shrink-0 rounded-full bg-danger/15 flex items-center justify-center">
            <AlertTriangle size={17} className="text-danger" />
          </div>
          <div className="min-w-0">
            <h3 className="font-display font-semibold text-base">{title}</h3>
            {description && <p className="text-sm text-text-muted mt-1">{description}</p>}
          </div>
        </div>
        <div className="flex justify-end mt-4">
          <button
            onClick={onClose}
            className="px-3.5 py-2 text-sm rounded-lg bg-accent hover:bg-accent-dim text-white transition-colors"
          >
            OK
          </button>
        </div>
      </div>
    </div>
  );
}
