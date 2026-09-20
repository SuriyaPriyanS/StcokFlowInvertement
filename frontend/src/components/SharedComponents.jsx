import React from "react";
import { X, ChevronLeft, ChevronRight } from "lucide-react";

export function Badge({ tone = "slate", children }) {
  const tones = {
    slate: "bg-slate-500/15 text-slate-400 border-slate-700/50",
    green: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
    amber: "bg-amber-500/15 text-amber-400 border-amber-500/30",
    red: "bg-rose-500/15 text-rose-400 border-rose-500/30",
    blue: "bg-sky-500/15 text-sky-400 border-sky-500/30",
  };
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded border text-xs font-mono tracking-wide ${tones[tone] || tones.slate}`}>
      {children}
    </span>
  );
}

export function StatusBadge({ status }) {
  const map = {
    DRAFT: "slate",
    PENDING: "amber",
    APPROVED: "blue",
    RECEIVED: "green",
    PARTIAL: "amber",
    CANCELLED: "red",
    CONFIRMED: "green",
    IN_TRANSIT: "blue",
    active: "green",
    inactive: "red",
    PAID: "green",
    UNPAID: "amber",
    REFUNDED: "red",
  };
  return <Badge tone={map[status] || "slate"}>{status}</Badge>;
}

export function Card({ title, value, tone }) {
  const tones = {
    default: "text-[var(--text-primary)]",
    warn: "text-amber-500",
    danger: "text-rose-500",
    good: "text-emerald-500",
    blue: "text-sky-500",
  };
  return (
    <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl p-4 flex flex-col gap-1 shadow-sm hover:border-[var(--accent-color)]/40 transition">
      <span className="text-[11px] uppercase tracking-wider text-[var(--text-muted)] font-bold">{title}</span>
      <span className={`text-2xl font-bold font-mono ${tones[tone || "default"] || tones.default}`}>{value}</span>
    </div>
  );
}

export function Modal({ open, title, onClose, children, wide }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-150" onClick={onClose}>
      <div
        className={`bg-[var(--bg-card)] text-[var(--text-primary)] border border-[var(--border-color)] rounded-xl shadow-2xl w-full ${wide ? "max-w-3xl" : "max-w-md"} max-h-[90vh] overflow-y-auto`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-[var(--border-color)] sticky top-0 bg-[var(--bg-card)] z-10">
          <h3 className="font-bold text-sm text-[var(--text-primary)]">{title}</h3>
          <button onClick={onClose} className="text-[var(--text-muted)] hover:text-[var(--text-primary)] p-1 rounded-md transition">
            <X size={18} />
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

export function Field({ label, children }) {
  return (
    <label className="flex flex-col gap-1 text-xs">
      <span className="text-[var(--text-secondary)] font-semibold">{label}</span>
      {children}
    </label>
  );
}

export const inputCls =
  "bg-[var(--input-bg)] border border-[var(--input-border)] text-[var(--text-primary)] rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-[var(--accent-color)] focus:border-transparent w-full transition placeholder:text-[var(--text-muted)]";

export function Btn({ children, onClick, variant = "primary", type = "button", size = "md", disabled, className = "", title }) {
  const variants = {
    primary: "bg-[var(--accent-color)] hover:bg-[var(--accent-hover)] text-[var(--accent-text)] font-semibold shadow-sm",
    ghost: "bg-transparent hover:bg-[var(--bg-card-hover)] text-[var(--text-primary)] border border-[var(--border-color)]",
    danger: "bg-rose-600 hover:bg-rose-500 text-white font-semibold shadow-sm",
    subtle: "bg-[var(--badge-bg)] hover:bg-[var(--border-color)] text-[var(--text-primary)] border border-[var(--border-color)]",
  };
  const sizes = { sm: "px-2.5 py-1 text-xs", md: "px-3.5 py-1.5 text-xs font-medium" };
  return (
    <button
      type={type}
      title={title}
      onClick={onClick}
      disabled={disabled}
      className={`rounded-lg inline-flex items-center gap-1.5 transition active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed ${variants[variant]} ${sizes[size]} ${className}`}
    >
      {children}
    </button>
  );
}

export function ConfirmModal({ open, title = "Confirm Action", message, onConfirm, onCancel }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={onCancel}>
      <div
        className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl shadow-2xl w-full max-w-sm overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 py-3.5 border-b border-[var(--border-color)] bg-[var(--bg-card)] flex items-center justify-between">
          <h3 className="font-bold text-sm text-[var(--text-primary)]">{title}</h3>
          <button onClick={onCancel} className="text-[var(--text-muted)] hover:text-[var(--text-primary)]">
            <X size={18} />
          </button>
        </div>
        <div className="p-5 flex flex-col gap-4">
          <p className="text-xs text-[var(--text-secondary)] leading-relaxed">{message}</p>
          <div className="flex justify-end gap-2">
            <Btn variant="ghost" onClick={onCancel}>
              Cancel
            </Btn>
            <Btn variant="danger" onClick={onConfirm}>
              Confirm
            </Btn>
          </div>
        </div>
      </div>
    </div>
  );
}

export function Pagination({ currentPage, totalPages, totalItems, rowsPerPage, onPageChange, onRowsPerPageChange }) {
  if (totalItems === 0) return null;

  const startItem = (currentPage - 1) * rowsPerPage + 1;
  const endItem = Math.min(currentPage * rowsPerPage, totalItems);

  return (
    <div className="flex items-center justify-between flex-wrap gap-3 pt-3 border-t border-[var(--border-color)] text-xs text-[var(--text-muted)]">
      <div className="flex items-center gap-2">
        <span>
          Showing <span className="text-[var(--text-primary)] font-bold">{startItem}</span> - <span className="text-[var(--text-primary)] font-bold">{endItem}</span> of <span className="text-[var(--text-primary)] font-bold">{totalItems}</span> records
        </span>
        {onRowsPerPageChange && (
          <div className="flex items-center gap-1.5 ml-2 pl-2 border-l border-[var(--border-color)]">
            <span>Rows:</span>
            <select
              className="bg-[var(--input-bg)] border border-[var(--border-color)] text-[var(--text-primary)] rounded px-1.5 py-0.5 text-xs focus:outline-none"
              value={rowsPerPage}
              onChange={(e) => onRowsPerPageChange(Number(e.target.value))}
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>
        )}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center gap-1">
          <Btn
            size="sm"
            variant="ghost"
            disabled={currentPage <= 1}
            onClick={() => onPageChange(Math.max(1, currentPage - 1))}
          >
            <ChevronLeft size={13} /> Prev
          </Btn>

          {Array.from({ length: totalPages }, (_, i) => i + 1)
            .filter((p) => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1)
            .map((page, idx, arr) => {
              const showEllipsis = idx > 0 && page - arr[idx - 1] > 1;
              return (
                <React.Fragment key={page}>
                  {showEllipsis && <span className="px-1 text-[var(--text-muted)]">...</span>}
                  <button
                    onClick={() => onPageChange(page)}
                    className={`min-w-7 h-7 rounded text-xs font-bold transition flex items-center justify-center ${
                      currentPage === page
                        ? "bg-[var(--accent-color)] text-[var(--accent-text)] shadow-sm"
                        : "text-[var(--text-secondary)] hover:bg-[var(--bg-card-hover)] hover:text-[var(--text-primary)]"
                    }`}
                  >
                    {page}
                  </button>
                </React.Fragment>
              );
            })}

          <Btn
            size="sm"
            variant="ghost"
            disabled={currentPage >= totalPages}
            onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
          >
            Next <ChevronRight size={13} />
          </Btn>
        </div>
      )}
    </div>
  );
}
