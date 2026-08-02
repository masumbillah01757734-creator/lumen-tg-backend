"use client";

import { useEffect, useRef, useState } from "react";
import {
  X,
  Plus,
  Trash2,
  ChevronUp,
  ChevronDown,
  Type as TypeIcon,
  Image as ImageIcon,
  Music,
  Video as VideoIcon,
  FileText,
  Loader2,
  Clock,
} from "lucide-react";
import api from "../lib/api";
import VoicePlayer from "./VoicePlayer";
import ConfirmDialog from "./ConfirmDialog";

// Keep in sync with backend MAX_UPLOAD_MB (src/routes/sequences.js). Until the Local
// Bot API Server is deployed, the backend caps at a lower value than this — either way,
// a failed upload always returns a clear message now, this is just an instant local check.
const MAX_UPLOAD_MB = Number(process.env.NEXT_PUBLIC_MAX_UPLOAD_MB) || 2000;

function fileTooLarge(file) {
  return file.size > MAX_UPLOAD_MB * 1024 * 1024;
}

const TYPE_META = {
  text: { icon: TypeIcon, label: "Text message", accept: null },
  photo: { icon: ImageIcon, label: "Photo", accept: "image/*" },
  audio: { icon: Music, label: "Audio", accept: "audio/*" },
  video: { icon: VideoIcon, label: "Video", accept: "video/*" },
  document: { icon: FileText, label: "File (PDF/ZIP/other)", accept: "*/*" },
};

function assetUrl(itemId) {
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : "";
  return `${process.env.NEXT_PUBLIC_API_URL}/sequences/items/${itemId}/asset?token=${encodeURIComponent(token || "")}`;
}

export default function SequenceManagerModal({ open, onClose }) {
  const [sequences, setSequences] = useState([]);
  const [selectedKey, setSelectedKey] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [addingStep, setAddingStep] = useState(false);
  const [newStepKey, setNewStepKey] = useState("");
  const [newStepName, setNewStepName] = useState("");
  const [confirmDeleteStep, setConfirmDeleteStep] = useState(null);
  const [confirmDeleteItem, setConfirmDeleteItem] = useState(null); // itemId or null

  useEffect(() => {
    if (!open) return;
    load();
  }, [open]);

  function load() {
    setLoading(true);
    setError("");
    api
      .get("/sequences")
      .then(({ data }) => {
        setSequences(data.sequences);
        setSelectedKey((prev) => prev && data.sequences.some((s) => s.step_key === prev) ? prev : data.sequences[0]?.step_key || null);
      })
      .catch(() => setError("Failed to load steps."))
      .finally(() => setLoading(false));
  }

  function replaceSequence(updated) {
    setSequences((prev) => {
      const exists = prev.some((s) => s.step_key === updated.step_key);
      return exists ? prev.map((s) => (s.step_key === updated.step_key ? updated : s)) : [...prev, updated];
    });
  }

  async function createStep() {
    const key = newStepKey.trim().toLowerCase().replace(/\s+/g, "-");
    const name = newStepName.trim();
    if (!key || !name) return;
    try {
      const { data } = await api.put(`/sequences/${key}`, { name });
      replaceSequence(data.sequence);
      setSelectedKey(data.sequence.step_key);
      setAddingStep(false);
      setNewStepKey("");
      setNewStepName("");
    } catch (err) {
      setError(err.response?.data?.message || "Failed to create step.");
    }
  }

  async function deleteStep(stepKey) {
    await api.delete(`/sequences/${stepKey}`);
    setSequences((prev) => {
      const next = prev.filter((s) => s.step_key !== stepKey);
      setSelectedKey((cur) => (cur === stepKey ? next[0]?.step_key || null : cur));
      return next;
    });
    setConfirmDeleteStep(null);
  }

  async function updateStepMeta(stepKey, patch) {
    const { data } = await api.put(`/sequences/${stepKey}`, patch);
    replaceSequence(data.sequence);
  }

  async function addItem(stepKey, type, { text = "", file } = {}) {
    const form = new FormData();
    form.append("type", type);
    form.append("text", text);
    if (file) form.append("file", file);
    const { data } = await api.post(`/sequences/${stepKey}/items`, form);
    replaceSequence(data.sequence);
  }

  async function updateItem(stepKey, itemId, patch, file) {
    if (file) {
      const form = new FormData();
      if (patch.text !== undefined) form.append("text", patch.text);
      form.append("file", file);
      const { data } = await api.put(`/sequences/${stepKey}/items/${itemId}`, form);
      replaceSequence(data.sequence);
    } else {
      const { data } = await api.put(`/sequences/${stepKey}/items/${itemId}`, patch);
      replaceSequence(data.sequence);
    }
  }

  async function deleteItem(stepKey, itemId) {
    const { data } = await api.delete(`/sequences/${stepKey}/items/${itemId}`);
    replaceSequence(data.sequence);
    setConfirmDeleteItem(null);
  }

  async function moveItem(stepKey, items, itemId, direction) {
    const sorted = [...items].sort((a, b) => a.order - b.order);
    const idx = sorted.findIndex((i) => i._id === itemId);
    const swapWith = direction === "up" ? idx - 1 : idx + 1;
    if (swapWith < 0 || swapWith >= sorted.length) return;
    [sorted[idx], sorted[swapWith]] = [sorted[swapWith], sorted[idx]];
    const order = sorted.map((i) => i._id);
    const { data } = await api.put(`/sequences/${stepKey}/items/reorder`, { order });
    replaceSequence(data.sequence);
  }

  if (!open) return null;

  const current = sequences.find((s) => s.step_key === selectedKey) || null;

  const addStepForm = (
    <div className="bg-elevated border border-border rounded-lg p-2 flex flex-col gap-1.5 w-full sm:w-auto">
      <input
        autoFocus
        value={newStepName}
        onChange={(e) => setNewStepName(e.target.value)}
        placeholder="Name e.g. Step 4"
        className="bg-base border border-border rounded-md px-2 py-1.5 text-xs outline-none focus:border-accent"
      />
      <input
        value={newStepKey}
        onChange={(e) => setNewStepKey(e.target.value)}
        placeholder="key e.g. step4"
        className="bg-base border border-border rounded-md px-2 py-1.5 text-xs outline-none focus:border-accent"
      />
      <div className="flex gap-1.5">
        <button
          onClick={createStep}
          className="flex-1 bg-accent hover:bg-accent-dim text-white text-xs rounded-md py-1.5 transition-colors"
        >
          Create
        </button>
        <button
          onClick={() => setAddingStep(false)}
          className="px-2 text-xs text-text-muted hover:text-text-primary"
        >
          Cancel
        </button>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 sm:px-4">
      <div className="bg-surface border-0 sm:border border-border rounded-none sm:rounded-xl2 w-full h-full sm:h-auto sm:max-w-3xl sm:max-h-[85vh] flex flex-col shadow-panel overflow-hidden">
        <div className="flex items-center justify-between px-4 sm:px-5 py-3 sm:py-4 border-b border-border shrink-0">
          <div className="min-w-0">
            <h3 className="font-display font-semibold text-base">Manage Steps</h3>
            <p className="text-xs text-text-muted mt-0.5 hidden sm:block">
              Content shown here is edited once and reused whenever a Step is triggered from any chat's menu.
            </p>
          </div>
          <button onClick={onClose} className="text-text-muted hover:text-text-primary shrink-0 h-8 w-8 flex items-center justify-center">
            <X size={18} />
          </button>
        </div>

        <div className="flex flex-col sm:flex-row flex-1 min-h-0">
          {/* Step list — horizontal scrolling tabs on mobile, vertical sidebar on desktop */}
          <div className="sm:w-44 sm:shrink-0 border-b sm:border-b-0 sm:border-r border-border sm:overflow-y-auto shrink-0">
            <div className="flex sm:flex-col gap-1.5 sm:gap-0 overflow-x-auto sm:overflow-x-visible px-3 sm:px-0 py-2.5 sm:py-2">
              {sequences.map((s) => (
                <button
                  key={s.step_key}
                  onClick={() => setSelectedKey(s.step_key)}
                  className={`shrink-0 sm:w-full text-left rounded-full sm:rounded-none px-3.5 py-2 sm:py-2.5 text-xs sm:text-sm whitespace-nowrap sm:whitespace-normal sm:truncate transition-colors ${
                    s.step_key === selectedKey
                      ? "bg-elevated text-text-primary font-medium"
                      : "bg-elevated/40 sm:bg-transparent text-text-muted hover:bg-elevated/60"
                  }`}
                >
                  {s.name}
                  <span className="hidden sm:block text-[10px] text-text-faint">{s.items.length} item{s.items.length === 1 ? "" : "s"}</span>
                </button>
              ))}

              {!addingStep && (
                <button
                  onClick={() => {
                    setAddingStep(true);
                    setNewStepKey(`step${sequences.length + 2}`);
                  }}
                  className="shrink-0 sm:w-full flex items-center justify-center gap-1.5 text-xs font-medium text-accent hover:bg-accent-soft rounded-full sm:rounded-lg px-3.5 sm:px-0 py-2 sm:mt-2 transition-colors whitespace-nowrap"
                >
                  <Plus size={13} /> Add step
                </button>
              )}
            </div>

            {addingStep && <div className="px-3 sm:px-2 pb-2.5 sm:pb-2">{addStepForm}</div>}
          </div>

          {/* Selected step editor */}
          <div className="flex-1 min-w-0 overflow-y-auto p-3.5 sm:p-4">
            {loading && <p className="text-center text-xs text-text-muted mt-6">Loading…</p>}
            {error && <p className="text-center text-xs text-danger mt-6">{error}</p>}

            {!loading && current && (
              <StepEditor
                key={current.step_key}
                seq={current}
                onUpdateMeta={(patch) => updateStepMeta(current.step_key, patch)}
                onAddItem={(type, opts) => addItem(current.step_key, type, opts)}
                onUpdateItem={(itemId, patch, file) => updateItem(current.step_key, itemId, patch, file)}
                onDeleteItem={(itemId) => setConfirmDeleteItem(itemId)}
                onMoveItem={(itemId, dir) => moveItem(current.step_key, current.items, itemId, dir)}
                onDeleteStep={() => setConfirmDeleteStep(current.step_key)}
              />
            )}

            {!loading && !current && !error && (
              <p className="text-center text-xs text-text-muted mt-6">No steps yet — add one on the left.</p>
            )}
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={!!confirmDeleteStep}
        title={`Delete "${sequences.find((s) => s.step_key === confirmDeleteStep)?.name}"?`}
        description="This removes the whole step and its uploaded media. This can't be undone."
        confirmLabel="Delete step"
        danger
        onCancel={() => setConfirmDeleteStep(null)}
        onConfirm={() => deleteStep(confirmDeleteStep)}
      />

      <ConfirmDialog
        open={!!confirmDeleteItem}
        title="Delete this item?"
        description="It will no longer be sent as part of this step."
        confirmLabel="Delete item"
        danger
        onCancel={() => setConfirmDeleteItem(null)}
        onConfirm={() => deleteItem(selectedKey, confirmDeleteItem)}
      />
    </div>
  );
}

function StepEditor({ seq, onUpdateMeta, onAddItem, onUpdateItem, onDeleteItem, onMoveItem, onDeleteStep }) {
  const [name, setName] = useState(seq.name);
  const [delayMs, setDelayMs] = useState(seq.delay_ms);
  const [addType, setAddType] = useState("text");
  const [adding, setAdding] = useState(false);
  const [itemError, setItemError] = useState("");
  const addFileRef = useRef(null);

  const sortedItems = [...seq.items].sort((a, b) => a.order - b.order);

  async function handleAddClick() {
    setItemError("");
    if (addType === "text") {
      setAdding(true);
      try {
        await onAddItem("text", {});
      } finally {
        setAdding(false);
      }
    } else {
      addFileRef.current?.click();
    }
  }

  async function handleAddFileChosen(e) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setItemError("");
    if (fileTooLarge(file)) {
      setItemError(`"${file.name}" is ${(file.size / 1024 / 1024).toFixed(0)}MB — max allowed is ${MAX_UPLOAD_MB}MB.`);
      return;
    }
    setAdding(true);
    try {
      await onAddItem(addType, { file });
    } catch (err) {
      setItemError(err.response?.data?.message || "Upload failed. Please try again.");
    } finally {
      setAdding(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Step meta */}
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex-1 min-w-[140px]">
          <label className="text-[11px] text-text-muted block mb-1">Step name</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={() => name.trim() && name !== seq.name && onUpdateMeta({ name })}
            className="w-full bg-elevated border border-border rounded-lg px-3 py-2 text-sm outline-none focus:border-accent"
          />
        </div>
        <div className="w-28 sm:w-36">
          <label className="text-[11px] text-text-muted flex items-center gap-1 mb-1">
            <Clock size={11} /> Delay (ms)
          </label>
          <input
            type="number"
            min={200}
            max={5000}
            step={100}
            value={delayMs}
            onChange={(e) => setDelayMs(e.target.value)}
            onBlur={() => Number(delayMs) !== seq.delay_ms && onUpdateMeta({ delay_ms: Number(delayMs) })}
            className="w-full bg-elevated border border-border rounded-lg px-3 py-2 text-sm outline-none focus:border-accent"
          />
        </div>
        <button
          onClick={onDeleteStep}
          className="h-9 px-3 rounded-lg text-xs font-medium text-danger hover:bg-danger/10 transition-colors shrink-0"
        >
          Delete step
        </button>
      </div>

      {/* Items */}
      <div className="flex flex-col gap-2.5">
        {sortedItems.map((item, idx) => (
          <ItemCard
            key={item._id}
            item={item}
            index={idx}
            isFirst={idx === 0}
            isLast={idx === sortedItems.length - 1}
            onUpdate={(patch, file) => onUpdateItem(item._id, patch, file)}
            onDelete={() => onDeleteItem(item._id)}
            onMove={(dir) => onMoveItem(item._id, dir)}
            onError={setItemError}
          />
        ))}
        {sortedItems.length === 0 && (
          <p className="text-xs text-text-muted text-center py-4">No content yet — add the first item below.</p>
        )}
      </div>

      {itemError && <p className="text-xs text-danger">{itemError}</p>}

      {/* Add item */}
      <div className="flex items-center flex-wrap gap-2 pt-2 border-t border-border">
        <select
          value={addType}
          onChange={(e) => setAddType(e.target.value)}
          className="flex-1 sm:flex-none min-w-0 bg-elevated border border-border rounded-lg px-2.5 py-2 text-xs outline-none focus:border-accent"
        >
          {Object.entries(TYPE_META).map(([key, meta]) => (
            <option key={key} value={key}>
              {meta.label}
            </option>
          ))}
        </select>
        <input
          ref={addFileRef}
          type="file"
          className="hidden"
          accept={TYPE_META[addType].accept || undefined}
          onChange={handleAddFileChosen}
        />
        <button
          onClick={handleAddClick}
          disabled={adding}
          className="flex items-center gap-1.5 text-xs font-medium bg-accent hover:bg-accent-dim disabled:opacity-50 text-white rounded-lg px-3 py-2 transition-colors"
        >
          {adding ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />}
          Add item
        </button>
      </div>
    </div>
  );
}

function ItemCard({ item, index, isFirst, isLast, onUpdate, onDelete, onMove, onError }) {
  const [text, setText] = useState(item.text || "");
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef(null);
  const meta = TYPE_META[item.type] || TYPE_META.text;
  const Icon = meta.icon;

  async function handleReplaceFile(e) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    onError?.("");
    if (fileTooLarge(file)) {
      onError?.(`"${file.name}" is ${(file.size / 1024 / 1024).toFixed(0)}MB — max allowed is ${MAX_UPLOAD_MB}MB.`);
      return;
    }
    setUploading(true);
    try {
      await onUpdate({ text }, file);
    } catch (err) {
      onError?.(err.response?.data?.message || "Upload failed. Please try again.");
    } finally {
      setUploading(false);
    }
  }

  function saveTextIfChanged() {
    if (text !== (item.text || "")) onUpdate({ text });
  }

  return (
    <div className="border border-border rounded-lg p-3 bg-elevated/40 flex flex-col gap-2.5">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-medium text-text-muted flex items-center gap-1.5">
          <Icon size={13} className="text-accent" />
          {index + 1}. {meta.label}
        </span>
        <div className="flex items-center gap-0.5">
          <button
            onClick={() => onMove("up")}
            disabled={isFirst}
            className="h-6 w-6 flex items-center justify-center rounded text-text-muted hover:bg-base disabled:opacity-30 transition-colors"
          >
            <ChevronUp size={14} />
          </button>
          <button
            onClick={() => onMove("down")}
            disabled={isLast}
            className="h-6 w-6 flex items-center justify-center rounded text-text-muted hover:bg-base disabled:opacity-30 transition-colors"
          >
            <ChevronDown size={14} />
          </button>
          <button
            onClick={onDelete}
            className="h-6 w-6 flex items-center justify-center rounded text-text-muted hover:text-danger hover:bg-danger/10 transition-colors"
          >
            <Trash2 size={13} />
          </button>
        </div>
      </div>

      {item.type === "text" ? (
        <textarea
          rows={2}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onBlur={saveTextIfChanged}
          placeholder="Type the message text…"
          className="w-full bg-base border border-border rounded-lg px-3 py-2 text-sm outline-none focus:border-accent resize-none"
        />
      ) : (
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="shrink-0">
            {!item.asset_path ? (
              <div className="h-16 w-16 rounded-lg bg-base border border-dashed border-border flex items-center justify-center text-text-faint text-[10px] text-center px-1">
                Not uploaded
              </div>
            ) : item.type === "photo" ? (
              <img src={assetUrl(item._id)} alt="" className="h-16 w-16 rounded-lg object-cover border border-border" />
            ) : item.type === "video" ? (
              <video src={assetUrl(item._id)} className="h-16 w-28 rounded-lg border border-border object-cover" controls />
            ) : item.type === "audio" ? (
              <div className="w-56">
                <VoicePlayer src={assetUrl(item._id)} seed={item._id} variant="audio" fileName={item.file_name} />
              </div>
            ) : (
              <a
                href={assetUrl(item._id)}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-2 h-16 px-3 rounded-lg bg-base border border-border text-xs text-text-primary max-w-[180px]"
              >
                <FileText size={16} className="text-accent shrink-0" />
                <span className="truncate">{item.file_name || "File"}</span>
              </a>
            )}
          </div>

          <div className="flex-1 flex flex-col gap-1.5 min-w-0">
            <input
              value={text}
              onChange={(e) => setText(e.target.value)}
              onBlur={saveTextIfChanged}
              placeholder="Caption (optional)"
              className="w-full bg-base border border-border rounded-lg px-3 py-2 text-sm outline-none focus:border-accent"
            />
            <div>
              <input ref={fileRef} type="file" accept={meta.accept} className="hidden" onChange={handleReplaceFile} />
              <button
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                className="text-xs font-medium text-accent hover:text-accent-dim disabled:opacity-50 flex items-center gap-1.5"
              >
                {uploading && <Loader2 size={12} className="animate-spin" />}
                {item.asset_path ? "Replace file" : "Upload file"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
