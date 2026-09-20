import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { 
  Bell, AlertTriangle, AlertCircle, Clock, CheckCircle2, 
  ExternalLink, Check, ShoppingCart, Boxes, RefreshCw, X 
} from "lucide-react";
import api from "../utils/api";

export default function NotificationDropdown() {
  const navigate = useNavigate();
  const dropdownRef = useRef(null);

  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);

  const fetchNotifications = async () => {
    try {
      const res = await api.get("/notifications");
      setNotifications(res.data.data || []);
      setUnreadCount(res.data.unreadCount || 0);
    } catch (err) {
      console.error("Failed to load notifications:", err.message);
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 20000); // 20s polling
    return () => clearInterval(interval);
  }, []);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  const handleMarkAllRead = async () => {
    try {
      await api.put("/notifications/read-all");
      setUnreadCount(0);
      fetchNotifications();
    } catch (err) {
      console.error(err);
    }
  };

  const handleItemClick = (notif) => {
    setOpen(false);
    if (notif.link) {
      navigate(notif.link);
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Trigger Button */}
      <button
        type="button"
        onClick={() => {
          setOpen(!open);
          if (!open) fetchNotifications();
        }}
        title="Low Stock Alerts & Notifications"
        className="relative flex items-center justify-center w-8 h-8 rounded-lg bg-[var(--bg-main)] hover:bg-[var(--bg-card-hover)] border border-[var(--border-color)] text-[var(--text-primary)] transition"
      >
        <Bell size={15} className={unreadCount > 0 ? "text-amber-400 animate-bounce" : "text-[var(--text-muted)]"} />
        
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-rose-500 px-1 text-[9px] font-bold font-mono text-white shadow-md animate-pulse">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {/* Notifications Dropdown Panel */}
      {open && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl shadow-2xl p-0 z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150">
          
          {/* Header */}
          <div className="px-4 py-3 bg-[var(--bg-card-hover)] border-b border-[var(--border-color)] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="font-bold text-xs text-[var(--text-primary)] flex items-center gap-1.5">
                <AlertTriangle size={14} className="text-amber-500" /> Stock Alerts &amp; Notifications
              </span>
              {unreadCount > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-amber-500/20 text-amber-400 font-mono font-bold text-[10px] border border-amber-500/30">
                  {unreadCount} new
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllRead}
                  className="text-[10px] text-[var(--accent-color)] hover:underline font-semibold"
                >
                  Mark all read
                </button>
              )}
              <button
                onClick={() => setOpen(false)}
                className="text-[var(--text-muted)] hover:text-[var(--text-primary)] p-0.5"
              >
                <X size={14} />
              </button>
            </div>
          </div>

          {/* Notifications List */}
          <div className="max-h-80 overflow-y-auto divide-y divide-[var(--border-color)]/60">
            {notifications.map((notif) => {
              const isCritical = notif.severity === "critical";
              const isWarning = notif.severity === "warning";

              return (
                <div
                  key={notif._id}
                  className={`p-3.5 flex flex-col gap-2 transition hover:bg-[var(--bg-card-hover)] ${
                    isCritical
                      ? "bg-rose-500/5"
                      : isWarning
                      ? "bg-amber-500/5"
                      : "bg-transparent"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-2">
                      <div className={`p-1.5 rounded-lg shrink-0 mt-0.5 ${
                        isCritical
                          ? "bg-rose-500/20 text-rose-400 border border-rose-500/30"
                          : isWarning
                          ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                          : "bg-blue-500/20 text-blue-400 border border-blue-500/30"
                      }`}>
                        {isCritical ? (
                          <AlertCircle size={14} />
                        ) : isWarning ? (
                          <AlertTriangle size={14} />
                        ) : (
                          <Clock size={14} />
                        )}
                      </div>
                      <div>
                        <div className="font-bold text-xs text-[var(--text-primary)] leading-tight">
                          {notif.title}
                        </div>
                        <div className="text-[11px] text-[var(--text-secondary)] mt-0.5 leading-snug">
                          {notif.message}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Badges & Reorder recommendation */}
                  {notif.currentStock !== undefined && (
                    <div className="flex items-center justify-between text-[10px] font-mono pt-1 border-t border-[var(--border-color)]/40 text-[var(--text-muted)]">
                      <div>
                        Current: <strong className={isCritical ? "text-rose-400" : "text-amber-400"}>{notif.currentStock} units</strong>
                        <span className="mx-1">•</span>
                        Threshold: <strong>{notif.reorderLevel}</strong>
                      </div>
                      {notif.suggestedReorderQty && (
                        <span className="text-[var(--accent-color)] font-semibold">
                          Reorder: +{notif.suggestedReorderQty}
                        </span>
                      )}
                    </div>
                  )}

                  {/* 1-Click Action Buttons */}
                  <div className="flex items-center justify-end gap-1.5 pt-1">
                    {notif.type === "STOCK_REQUEST_PENDING" ? (
                      <button
                        onClick={() => handleItemClick(notif)}
                        className="px-2.5 py-1 rounded bg-[var(--accent-color)] text-[var(--accent-text)] text-[10px] font-bold hover:opacity-90 transition flex items-center gap-1"
                      >
                        Review in Portal <ExternalLink size={10} />
                      </button>
                    ) : (
                      <>
                        <button
                          onClick={() => {
                            setOpen(false);
                            navigate("/inventory");
                          }}
                          className="px-2 py-0.5 rounded bg-[var(--bg-main)] hover:bg-[var(--bg-card-hover)] border border-[var(--border-color)] text-[var(--text-primary)] text-[10px] font-semibold transition flex items-center gap-1"
                        >
                          <Boxes size={10} /> Add Stock
                        </button>
                        <button
                          onClick={() => {
                            setOpen(false);
                            navigate("/purchases");
                          }}
                          className="px-2 py-0.5 rounded bg-[var(--accent-color)] text-[var(--accent-text)] text-[10px] font-bold hover:opacity-90 transition flex items-center gap-1"
                        >
                          <ShoppingCart size={10} /> Create PO
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}

            {notifications.length === 0 && (
              <div className="py-8 text-center text-xs text-[var(--text-muted)] flex flex-col items-center justify-center gap-2">
                <CheckCircle2 size={24} className="text-emerald-500" />
                <span>All stock levels are healthy! No active alerts.</span>
              </div>
            )}
          </div>

          {/* Footer Link */}
          <div className="p-2 bg-[var(--bg-card-hover)] border-t border-[var(--border-color)] text-center">
            <button
              onClick={() => {
                setOpen(false);
                navigate("/inventory");
              }}
              className="text-[11px] font-semibold text-[var(--accent-color)] hover:underline flex items-center justify-center gap-1 w-full"
            >
              View Full Live Inventory <ExternalLink size={11} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
