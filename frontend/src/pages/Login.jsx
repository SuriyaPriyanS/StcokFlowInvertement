import React, { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate, useLocation } from "react-router-dom";
import { 
  ShieldCheck, Zap, Lock, Mail, ArrowRight, UserCheck, 
  Eye, EyeOff, CheckCircle2, Shield, Activity, Sparkles, User, RefreshCw
} from "lucide-react";
import api from "../utils/api";
import { loginStart, loginSuccess, loginFailure, clearError } from "../store/slices/authSlice";
import { Btn, Field } from "../components/SharedComponents";

const ROLE_BADGE_STYLES = {
  Admin: {
    badge: "bg-sky-500/20 text-sky-300 border-sky-500/40",
    scope: "Full SuperAdmin Access (All Modules & Approvals)",
    desc: "Complete master system control across all modules, settings & users",
  },
  Manager: {
    badge: "bg-blue-500/20 text-blue-300 border-blue-500/40",
    scope: "PO Approvals, Stock Inward, Catalog, Reports",
    desc: "PO approvals, analytics reports, products, and inventory catalog",
  },
  "Inventory Staff": {
    badge: "bg-cyan-500/20 text-cyan-300 border-cyan-500/40",
    scope: "Warehouse Stock Inward Submissions & Transfers",
    desc: "Stock adjustments, warehouse receipts, and inter-warehouse transfers",
  },
  "Sales Staff": {
    badge: "bg-indigo-500/20 text-indigo-300 border-indigo-500/40",
    scope: "Sales Orders, Client Directory, Payments Tracking",
    desc: "Customer relationship management, sales order dispatch & payments",
  },
};

export default function Login() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();

  const { loading, error } = useSelector((state) => state.auth);
  const successMessage = location.state?.message || "";

  const [dbUsers, setDbUsers] = useState([]);
  const [formData, setFormData] = useState({
    email: "admin@stockflow.com",
    password: "adminpassword",
  });
  const [selectedUserEmail, setSelectedUserEmail] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // Clear authentication errors and fetch dynamic database users on mount
  useEffect(() => {
    dispatch(clearError());
    const fetchDynamicUsers = async () => {
      try {
        const res = await api.get("/auth/demo-users");
        const list = res.data?.data || [];
        if (list.length > 0) {
          setDbUsers(list);
          const adminUser = list.find((u) => u.role === "Admin") || list[0];
          setSelectedUserEmail(adminUser.email);
          setFormData((prev) => ({
            ...prev,
            email: adminUser.email,
          }));
        }
      } catch (err) {
        console.error("Failed to load dynamic database users:", err.message);
      }
    };
    fetchDynamicUsers();
  }, [dispatch]);

  const handleLoginWithCredentials = async (email, password) => {
    dispatch(loginStart());
    try {
      const res = await api.post("/auth/login", { email, password });
      dispatch(loginSuccess(res.data));
      navigate("/dashboard");
    } catch (err) {
      dispatch(loginFailure(err.response?.data?.message || "Authentication failed. Please check credentials."));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    await handleLoginWithCredentials(formData.email, formData.password);
  };

  const currentAdminUser = dbUsers.find((u) => u.role === "Admin") || {
    name: "System Admin",
    email: formData.email,
    role: "Admin",
  };

  const handleQuickAdminLogin = async () => {
    const adminEmail = currentAdminUser.email;
    setSelectedUserEmail(adminEmail);
    setFormData((prev) => ({ ...prev, email: adminEmail }));
    await handleLoginWithCredentials(adminEmail, formData.password || "adminpassword");
  };

  const activeMatchedUser = dbUsers.find(
    (u) => u.email.toLowerCase() === formData.email.toLowerCase()
  ) || {
    name: "Active Account",
    email: formData.email,
    role: "User",
  };

  const activeStyle = ROLE_BADGE_STYLES[activeMatchedUser.role] || {
    badge: "bg-blue-500/20 text-blue-300 border-blue-500/40",
    scope: "Authenticated User Session",
    desc: "Dynamic workspace access",
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#070e1c] text-slate-100 p-4 relative overflow-hidden">
      {/* Deep Corporate Navy Background Glow */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-80 h-80 bg-sky-500/5 rounded-full blur-2xl pointer-events-none" />

      <div className="w-full max-w-md bg-[#0f1d35]/95 backdrop-blur-md border border-[#1e3a66] rounded-2xl p-6 sm:p-8 flex flex-col gap-5 shadow-2xl shadow-blue-950/60 relative z-10">
        
        {/* Header Branding */}
        <div className="flex items-center justify-between border-b border-[#1e3a66] pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-700 via-blue-600 to-sky-400 flex items-center justify-center text-white font-black text-xl shadow-lg shadow-blue-600/30">
              S
            </div>
            <div>
              <div className="font-bold tracking-wide text-lg text-white flex items-center gap-2">
                StockFlow <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-sky-500/15 text-sky-400 border border-sky-500/30 font-bold">Master</span>
              </div>
              <div className="text-[11px] text-slate-400 font-mono tracking-wider">MULTI-WAREHOUSE INVENTORY &amp; ERP</div>
            </div>
          </div>
        </div>

        {/* Dynamic Active Account Status Banner */}
        <div className="bg-[#091322] border border-[#1e3a66] rounded-xl p-3 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 truncate">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
            <div className="truncate">
              <div className="text-xs font-bold text-white flex items-center gap-1.5 truncate">
                <span>{activeMatchedUser.name}</span>
                <span className="text-[10px] font-mono font-normal text-sky-400">({formData.email})</span>
              </div>
              <div className="text-[10px] text-slate-400 font-mono truncate">{activeStyle.scope}</div>
            </div>
          </div>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-500/15 text-sky-300 border border-blue-500/30 font-bold shrink-0">
            {activeMatchedUser.role.toUpperCase()}
          </span>
        </div>

        {/* 1-Click Master Admin Quick Login Banner */}
        <button
          type="button"
          onClick={handleQuickAdminLogin}
          disabled={loading}
          className="w-full flex items-center justify-between p-3.5 rounded-xl bg-gradient-to-r from-blue-600/25 via-blue-500/15 to-transparent border border-blue-500/40 hover:border-sky-400 hover:from-blue-600/35 text-left transition group shadow-md"
        >
          <div className="flex items-center gap-3 truncate">
            <div className="p-2 rounded-lg bg-blue-600 text-white font-bold group-hover:scale-105 transition shadow-sm shrink-0">
              <Zap size={16} />
            </div>
            <div className="truncate">
              <div className="text-xs font-bold text-sky-300 flex items-center gap-1.5">
                1-Click Master Admin Login <ShieldCheck size={14} className="text-sky-400 shrink-0" />
              </div>
              <div className="text-[11px] text-slate-400 font-mono truncate">{currentAdminUser.email} • SuperAdmin</div>
            </div>
          </div>
          <ArrowRight size={16} className="text-sky-400 group-hover:translate-x-1 transition shrink-0" />
        </button>

        {successMessage && (
          <div className="bg-emerald-950/50 border border-emerald-800 text-emerald-300 text-xs p-3 rounded-xl flex items-center gap-2">
            <UserCheck size={16} /> {successMessage}
          </div>
        )}

        {error && (
          <div className="bg-rose-950/50 border border-rose-800 text-rose-300 text-xs p-3 rounded-xl flex items-center gap-2">
            <Lock size={16} /> {error}
          </div>
        )}

        {/* Dynamic Login Form */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
          <Field label="Email Address">
            <div className="relative">
              <input
                type="email"
                required
                className="bg-[#091322] border border-[#1e3a66] text-white rounded-lg px-3 py-2 pl-9 text-xs focus:outline-none focus:ring-2 focus:ring-sky-500/30 focus:border-sky-400 w-full transition placeholder:text-slate-500 font-mono"
                placeholder="e.g. user@stockflow.com"
                value={formData.email}
                onChange={(e) => {
                  setFormData({ ...formData, email: e.target.value });
                  setSelectedUserEmail(e.target.value);
                }}
              />
              <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            </div>
          </Field>

          <Field label="Password">
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                required
                className="bg-[#091322] border border-[#1e3a66] text-white rounded-lg px-3 py-2 pl-9 pr-9 text-xs focus:outline-none focus:ring-2 focus:ring-sky-500/30 focus:border-sky-400 w-full transition placeholder:text-slate-500 font-mono"
                placeholder="••••••••"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              />
              <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                title={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
          </Field>

          <button
            type="submit"
            disabled={loading}
            className="w-full justify-center mt-1 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs transition shadow-lg shadow-blue-600/30 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.99] flex items-center gap-2"
          >
            {loading ? "Authenticating Session..." : `Sign In as ${activeMatchedUser.name || activeMatchedUser.role}`}
          </button>
        </form>

        {/* Dynamic Database Roles Selection Grid */}
        {dbUsers.length > 0 && (
          <div className="pt-3 border-t border-[#1e3a66] flex flex-col gap-2.5">
            <div className="flex items-center justify-between text-xs text-slate-400 font-semibold">
              <span>Active System Accounts ({dbUsers.length}):</span>
              <span className="text-[10px] text-sky-400 font-mono">1-Click to prefill</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto scrollbar-thin">
              {dbUsers.map((account) => {
                const isSelected = selectedUserEmail.toLowerCase() === account.email.toLowerCase() ||
                                   formData.email.toLowerCase() === account.email.toLowerCase();
                const style = ROLE_BADGE_STYLES[account.role] || ROLE_BADGE_STYLES.Manager;

                return (
                  <button
                    key={account.email}
                    type="button"
                    onClick={() => {
                      setSelectedUserEmail(account.email);
                      setFormData((prev) => ({ ...prev, email: account.email }));
                    }}
                    className={`flex flex-col items-start p-2.5 rounded-xl text-left transition relative ${
                      isSelected
                        ? "bg-[#16284a] border-2 border-sky-400 shadow-md shadow-sky-900/30"
                        : "bg-[#091322]/80 hover:bg-[#13223f] border border-[#1e3a66] hover:border-sky-500/50"
                    }`}
                  >
                    <div className="flex items-center justify-between w-full">
                      <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded border ${style.badge}`}>
                        {account.role}
                      </span>
                      {isSelected && (
                        <span className="text-[9px] font-mono font-bold text-sky-400 flex items-center gap-0.5">
                          <CheckCircle2 size={11} /> ACTIVE
                        </span>
                      )}
                    </div>
                    <div className="text-xs font-bold text-white mt-1 truncate w-full">
                      {account.name}
                    </div>
                    <span className={`text-[10px] font-mono font-medium truncate w-full ${
                      isSelected ? "text-sky-300 font-bold" : "text-slate-300"
                    }`}>
                      {account.email}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
