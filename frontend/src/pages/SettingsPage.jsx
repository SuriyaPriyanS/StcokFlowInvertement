import React, { useState, useEffect, useMemo } from "react";
import { useSelector } from "react-redux";
import { 
  User, Shield, Users as UsersIcon, History, 
  Warehouse, ShoppingBag, ShieldCheck, AlertTriangle,
  Mail, Calendar, KeyRound, Plus, Trash2, Pencil,
  Search, Filter, CheckCircle2, XCircle, Download,
  Activity, Layers, Building2, Package, RefreshCw,
  Boxes, Clock, Eye, AlertCircle, Check
} from "lucide-react";
import api from "../utils/api";
import { Badge, Btn, Field, inputCls, Modal, ConfirmModal, Pagination } from "../components/SharedComponents";
import { downloadCSV } from "../utils/csv";

export default function SettingsPage() {
  const { user } = useSelector((state) => state.auth);
  
  const [activeTab, setActiveTab] = useState("users");
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  
  // Users state
  const [users, setUsers] = useState([]);
  const [userSearch, setUserSearch] = useState("");
  const [userRoleFilter, setUserRoleFilter] = useState("");
  const [userPage, setUserPage] = useState(1);
  const [userPerPage, setUserPerPage] = useState(10);
  
  // Modals state
  const [createUserModal, setCreateUserModal] = useState(false);
  const [editUserModal, setEditUserModal] = useState(null);
  const [passwordModal, setPasswordModal] = useState(null);
  const [deleteConfirmUser, setDeleteConfirmUser] = useState(null);
  
  // Form data for creating user
  const [newUserForm, setNewUserForm] = useState({
    name: "",
    email: "",
    password: "",
    role: "Inventory Staff",
    status: "active",
  });
  
  // Form data for password reset
  const [newPasswordValue, setNewPasswordValue] = useState("");
  
  // Audit Logs state
  const [auditLogs, setAuditLogs] = useState([]);
  const [auditSearch, setAuditSearch] = useState("");
  const [auditActionFilter, setAuditActionFilter] = useState("ALL");
  const [auditPage, setAuditPage] = useState(1);
  const [auditPerPage, setAuditPerPage] = useState(15);

  // Stock Approvals state
  const [stockRequests, setStockRequests] = useState([]);
  const [stockReqStatusFilter, setStockReqStatusFilter] = useState("PENDING");
  const [stockReqPage, setStockReqPage] = useState(1);
  const [stockReqPerPage, setStockReqPerPage] = useState(10);
  const [selectedStockRequest, setSelectedStockRequest] = useState(null);
  const [rejectModalData, setRejectModalData] = useState(null);
  const [rejectionReasonInput, setRejectionReasonInput] = useState("");
  const [approvalToast, setApprovalToast] = useState("");

  const isAdmin = user?.role === "Admin";

  const fetchSettingsData = async () => {
    setLoading(true);
    try {
      if (isAdmin) {
        const [usersRes, logsRes, statsRes, reqRes] = await Promise.all([
          api.get("/settings/users"),
          api.get("/settings/audit-logs?limit=300"),
          api.get("/settings/stats"),
          api.get("/inventory/requests"),
        ]);
        setUsers(usersRes.data.data || []);
        setAuditLogs(logsRes.data.data || []);
        setStats(statsRes.data.data || null);
        setStockRequests(reqRes.data.data || []);
      }
    } catch (err) {
      console.error("Failed to load settings data:", err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettingsData();
  }, [user]);

  const pendingStockCount = useMemo(() => {
    return stockRequests.filter((r) => r.status === "PENDING").length;
  }, [stockRequests]);

  // Handle Create User
  const handleCreateUser = async (e) => {
    e.preventDefault();
    try {
      await api.post("/settings/users", newUserForm);
      setCreateUserModal(false);
      setNewUserForm({
        name: "",
        email: "",
        password: "",
        role: "Inventory Staff",
        status: "active",
      });
      fetchSettingsData();
    } catch (err) {
      alert(err.response?.data?.message || "Failed to create user");
    }
  };

  // Handle Edit User
  const handleUpdateUser = async (e) => {
    e.preventDefault();
    try {
      await api.put(`/settings/users/${editUserModal._id}`, {
        name: editUserModal.name,
        email: editUserModal.email,
        role: editUserModal.role,
        status: editUserModal.status,
      });
      setEditUserModal(null);
      fetchSettingsData();
    } catch (err) {
      alert(err.response?.data?.message || "Failed to update user");
    }
  };

  // Handle Password Reset
  const handleResetPassword = async (e) => {
    e.preventDefault();
    try {
      await api.put(`/settings/users/${passwordModal._id}/password`, {
        newPassword: newPasswordValue,
      });
      setPasswordModal(null);
      setNewPasswordValue("");
      alert("Password updated successfully!");
    } catch (err) {
      alert(err.response?.data?.message || "Failed to reset password");
    }
  };

  // Handle Delete User
  const handleDeleteUser = async (userId) => {
    try {
      await api.delete(`/settings/users/${userId}`);
      setDeleteConfirmUser(null);
      fetchSettingsData();
    } catch (err) {
      alert(err.response?.data?.message || "Failed to delete user");
    }
  };

  // Handle Approve Stock Request
  const handleApproveStockRequest = async (id) => {
    try {
      const res = await api.put(`/inventory/requests/${id}/approve`);
      setApprovalToast(`Request approved! ${res.data.message || "Stock applied to inventory."}`);
      setTimeout(() => setApprovalToast(""), 5000);
      if (selectedStockRequest?._id === id) {
        setSelectedStockRequest(null);
      }
      fetchSettingsData();
    } catch (err) {
      alert(err.response?.data?.message || "Failed to approve stock update");
    }
  };

  // Handle Reject Stock Request
  const handleRejectStockRequest = async () => {
    if (!rejectModalData) return;
    try {
      await api.put(`/inventory/requests/${rejectModalData._id}/reject`, {
        rejectionReason: rejectionReasonInput || "Rejected by Admin",
      });
      setRejectModalData(null);
      setRejectionReasonInput("");
      if (selectedStockRequest?._id === rejectModalData._id) {
        setSelectedStockRequest(null);
      }
      fetchSettingsData();
    } catch (err) {
      alert(err.response?.data?.message || "Failed to reject stock update");
    }
  };

  // Filtered users
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const matchText = (u.name + u.email).toLowerCase().includes(userSearch.toLowerCase());
      const matchRole = !userRoleFilter || u.role === userRoleFilter;
      return matchText && matchRole;
    });
  }, [users, userSearch, userRoleFilter]);

  const paginatedUsers = useMemo(() => {
    const start = (userPage - 1) * userPerPage;
    return filteredUsers.slice(start, start + userPerPage);
  }, [filteredUsers, userPage, userPerPage]);

  const totalUserPages = Math.ceil(filteredUsers.length / userPerPage) || 1;

  // Filtered audit logs
  const filteredAuditLogs = useMemo(() => {
    return auditLogs.filter((log) => {
      const matchSearch = (log.detail + log.action + log.performedBy)
        .toLowerCase()
        .includes(auditSearch.toLowerCase());
      const matchAction = auditActionFilter === "ALL" || log.action === auditActionFilter;
      return matchSearch && matchAction;
    });
  }, [auditLogs, auditSearch, auditActionFilter]);

  const paginatedAuditLogs = useMemo(() => {
    const start = (auditPage - 1) * auditPerPage;
    return filteredAuditLogs.slice(start, start + auditPerPage);
  }, [filteredAuditLogs, auditPage, auditPerPage]);

  const totalAuditPages = Math.ceil(filteredAuditLogs.length / auditPerPage) || 1;

  // Filtered stock requests
  const filteredStockRequests = useMemo(() => {
    return stockRequests.filter((r) => {
      if (stockReqStatusFilter === "ALL") return true;
      return r.status === stockReqStatusFilter;
    });
  }, [stockRequests, stockReqStatusFilter]);

  const paginatedStockRequests = useMemo(() => {
    const start = (stockReqPage - 1) * stockReqPerPage;
    return filteredStockRequests.slice(start, start + stockReqPerPage);
  }, [filteredStockRequests, stockReqPage, stockReqPerPage]);

  const totalStockReqPages = Math.ceil(filteredStockRequests.length / stockReqPerPage) || 1;

  // Role details reference
  const roleDetails = [
    {
      role: "Admin (Full Control)",
      icon: Shield,
      color: "border-[var(--accent-color)]/30 bg-[var(--accent-color)]/5 text-[var(--accent-color)]",
      desc: "SuperAdmin with 100% unrestricted access. Can manage users, approve stock updates from Store Managers, alter permissions, configure warehouses, override inventory, approve/receive purchase orders, execute sales, and view complete system audit records.",
      scope: "All Modules & Approvals (100% Unrestricted)",
    },
    {
      role: "Manager",
      icon: ShieldCheck,
      color: "border-sky-500/30 bg-sky-500/5 text-sky-500",
      desc: "Access to dashboards, products, inventory categories, supplier databases, purchase order approvals, and comprehensive analytics reports.",
      scope: "Products, Categories, PO Approvals, Warehouses, Reports",
    },
    {
      role: "Inventory Staff",
      icon: Warehouse,
      color: "border-emerald-500/30 bg-emerald-500/5 text-emerald-500",
      desc: "Handles warehouse storage locations, submits stock inward/adjustments for Admin approval, inter-warehouse stock transfers, and receiving procurement shipments.",
      scope: "Inventory Levels, Stock Inward Requests, Goods Receiving, Transfers",
    },
    {
      role: "Sales Staff",
      icon: ShoppingBag,
      color: "border-purple-500/30 bg-purple-500/5 text-purple-500",
      desc: "Access to client databases, dashboard sales trends, creating sales orders, confirming sales dispatches, and processing payments.",
      scope: "Customer Directory, Sales Orders, Invoices, Payment Tracking",
    },
  ];

  // Permission Matrix definitions
  const matrixData = [
    { module: "Dashboard Analytics", admin: "Full Access", manager: "Full Access", inventory: "View Only", sales: "Sales Trends" },
    { module: "Product Catalog", admin: "Create, Edit, Delete", manager: "Create, Edit", inventory: "View Only", sales: "View Only" },
    { module: "Categories", admin: "Create, Edit, Delete", manager: "Create, Edit", inventory: "None", sales: "None" },
    { module: "Warehouses & Locations", admin: "Create, Edit, Delete", manager: "Create, Edit", inventory: "View Only", sales: "None" },
    { module: "Retail Branches", admin: "Create, Edit, Delete", manager: "Create, Edit", inventory: "View Only", sales: "View Only" },
    { module: "Live Inventory & Stock Inward", admin: "Direct Update & Approve", manager: "Submit Requests", inventory: "Submit Requests", sales: "View Available" },
    { module: "Stock Approval Center", admin: "Approve & Reject All", manager: "View Status", inventory: "View Status", sales: "None" },
    { module: "Purchase Orders (PO)", admin: "Create, Approve, Receive", manager: "Create, Approve", inventory: "Receive Goods", sales: "None" },
    { module: "Sales Orders (SO)", admin: "Create, Confirm, Pay, Cancel", manager: "View Only", inventory: "None", sales: "Create, Confirm, Pay" },
    { module: "Stock Transfers", admin: "Create, Dispatch, Receive", manager: "View Only", inventory: "Create, Dispatch, Receive", sales: "None" },
    { module: "Suppliers & Customers", admin: "Full CRUD", manager: "Manage Suppliers", inventory: "None", sales: "Manage Customers" },
    { module: "Analytics Reports & CSV", admin: "Full Export", manager: "Full Export", inventory: "None", sales: "None" },
    { module: "User & Role Management", admin: "Master Admin Control", manager: "None", inventory: "None", sales: "None" },
    { module: "System Audit Logs", admin: "View & Export All", manager: "None", inventory: "None", sales: "None" },
  ];

  return (
    <div className="flex flex-col gap-5 max-w-6xl text-[var(--text-primary)]">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2 text-[var(--text-primary)]">
            Admin Control Center
            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-[var(--accent-color)]/15 text-[var(--accent-color)] border border-[var(--accent-color)]/30">
              SUPERADMIN
            </span>
          </h1>
          <p className="text-xs text-[var(--text-muted)] mt-0.5">Manage user credentials, review Store Manager stock approvals, configure role permissions, and track audit history.</p>
        </div>
        {isAdmin && (
          <Btn size="sm" variant="ghost" onClick={fetchSettingsData}>
            <RefreshCw size={13} className={loading ? "animate-spin" : ""} /> Refresh Data
          </Btn>
        )}
      </div>

      {/* Approval Toast */}
      {approvalToast && (
        <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 p-3 rounded-xl text-xs flex items-center justify-between gap-2 animate-in fade-in">
          <div className="flex items-center gap-2 font-semibold">
            <CheckCircle2 size={16} /> {approvalToast}
          </div>
          <button onClick={() => setApprovalToast("")} className="text-emerald-400 hover:text-white">
            <XCircle size={15} />
          </button>
        </div>
      )}

      {/* Admin System Diagnostics Counters */}
      {isAdmin && stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
          <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl p-3 flex flex-col shadow-sm">
            <span className="text-[10px] uppercase font-bold text-[var(--text-muted)] tracking-wider">Total Users</span>
            <span className="text-xl font-bold text-[var(--text-primary)] font-mono mt-0.5">{stats.users.total}</span>
            <span className="text-[10px] text-emerald-500 font-mono">{stats.users.active} Active accounts</span>
          </div>
          <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl p-3 flex flex-col shadow-sm">
            <span className="text-[10px] uppercase font-bold text-[var(--text-muted)] tracking-wider">Stock Approvals</span>
            <span className="text-xl font-bold text-amber-400 font-mono mt-0.5">{pendingStockCount}</span>
            <span className="text-[10px] text-amber-500 font-mono">Pending Review</span>
          </div>
          <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl p-3 flex flex-col shadow-sm">
            <span className="text-[10px] uppercase font-bold text-[var(--text-muted)] tracking-wider">Staff Users</span>
            <span className="text-xl font-bold text-sky-500 font-mono mt-0.5">
              {(stats.users.byRole.Manager || 0) + (stats.users.byRole["Inventory Staff"] || 0) + (stats.users.byRole["Sales Staff"] || 0)}
            </span>
            <span className="text-[10px] text-[var(--text-muted)] font-mono">Managers &amp; Staff</span>
          </div>
          <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl p-3 flex flex-col shadow-sm">
            <span className="text-[10px] uppercase font-bold text-[var(--text-muted)] tracking-wider">Audit Events</span>
            <span className="text-xl font-bold text-[var(--text-primary)] font-mono mt-0.5">{stats.counts.auditLogs}</span>
            <span className="text-[10px] text-[var(--text-muted)] font-mono">Recorded Logs</span>
          </div>
          <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl p-3 flex flex-col shadow-sm">
            <span className="text-[10px] uppercase font-bold text-[var(--text-muted)] tracking-wider">Warehouses / Branches</span>
            <span className="text-xl font-bold text-emerald-500 font-mono mt-0.5">
              {stats.counts.warehouses} / {stats.counts.branches}
            </span>
            <span className="text-[10px] text-[var(--text-muted)] font-mono">Locations</span>
          </div>
          <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl p-3 flex flex-col shadow-sm">
            <span className="text-[10px] uppercase font-bold text-[var(--text-muted)] tracking-wider">Catalog / Orders</span>
            <span className="text-xl font-bold text-purple-500 font-mono mt-0.5">
              {stats.counts.products} / {stats.counts.orders}
            </span>
            <span className="text-[10px] text-[var(--text-muted)] font-mono">Products &amp; Orders</span>
          </div>
        </div>
      )}

      {/* Main Tabs Navigation */}
      <div className="flex gap-1.5 bg-[var(--bg-card)] border border-[var(--border-color)] p-1.5 rounded-xl self-start overflow-x-auto max-w-full shadow-sm">
        <button
          onClick={() => setActiveTab("users")}
          className={`flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-lg transition whitespace-nowrap ${
            activeTab === "users"
              ? "bg-[var(--accent-color)] text-[var(--accent-text)] shadow-sm font-bold"
              : "text-[var(--text-secondary)] hover:bg-[var(--bg-card-hover)] hover:text-[var(--text-primary)]"
          }`}
        >
          <UsersIcon size={15} /> User Access &amp; Management ({users.length})
        </button>
        <button
          onClick={() => setActiveTab("stock-approvals")}
          className={`flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-lg transition whitespace-nowrap ${
            activeTab === "stock-approvals"
              ? "bg-[var(--accent-color)] text-[var(--accent-text)] shadow-sm font-bold"
              : "text-[var(--text-secondary)] hover:bg-[var(--bg-card-hover)] hover:text-[var(--text-primary)]"
          }`}
        >
          <Boxes size={15} /> Stock Approvals Center
          {pendingStockCount > 0 && (
            <span className="px-1.5 py-0.2 rounded-full bg-amber-500 text-slate-950 font-bold text-[10px]">
              {pendingStockCount}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab("matrix")}
          className={`flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-lg transition whitespace-nowrap ${
            activeTab === "matrix"
              ? "bg-[var(--accent-color)] text-[var(--accent-text)] shadow-sm font-bold"
              : "text-[var(--text-secondary)] hover:bg-[var(--bg-card-hover)] hover:text-[var(--text-primary)]"
          }`}
        >
          <Layers size={15} /> Role Permissions Matrix
        </button>
        <button
          onClick={() => setActiveTab("audit")}
          className={`flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-lg transition whitespace-nowrap ${
            activeTab === "audit"
              ? "bg-[var(--accent-color)] text-[var(--accent-text)] shadow-sm font-bold"
              : "text-[var(--text-secondary)] hover:bg-[var(--bg-card-hover)] hover:text-[var(--text-primary)]"
          }`}
        >
          <History size={15} /> System Audit Trail ({auditLogs.length})
        </button>
        <button
          onClick={() => setActiveTab("profile")}
          className={`flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-lg transition whitespace-nowrap ${
            activeTab === "profile"
              ? "bg-[var(--accent-color)] text-[var(--accent-text)] shadow-sm font-bold"
              : "text-[var(--text-secondary)] hover:bg-[var(--bg-card-hover)] hover:text-[var(--text-primary)]"
          }`}
        >
          <User size={15} /> My Profile &amp; Security
        </button>
      </div>

      {/* TAB 1: USER MANAGEMENT */}
      {activeTab === "users" && (
        <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl p-5 flex flex-col gap-4 shadow-sm">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <h3 className="text-sm font-bold text-[var(--text-primary)]">
                User Management &amp; Access Controls
              </h3>
              <p className="text-xs text-[var(--text-muted)] mt-0.5">
                Create new user accounts, assign roles, reset passwords, or suspend access credentials.
              </p>
            </div>
            {isAdmin && (
              <Btn onClick={() => setCreateUserModal(true)}>
                <Plus size={15} /> Create New User
              </Btn>
            )}
          </div>

          {/* Search & Filter Bar */}
          <div className="flex gap-3 flex-wrap items-center justify-between border-y border-[var(--border-color)] py-3">
            <div className="flex gap-3 flex-1 max-w-md items-center">
              <div className="relative flex-1">
                <input
                  type="text"
                  placeholder="Search user by name or email..."
                  value={userSearch}
                  onChange={(e) => {
                    setUserSearch(e.target.value);
                    setUserPage(1);
                  }}
                  className={`${inputCls} pl-9 text-xs`}
                />
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
              </div>
              <select
                className={`${inputCls} w-44 text-xs`}
                value={userRoleFilter}
                onChange={(e) => {
                  setUserRoleFilter(e.target.value);
                  setUserPage(1);
                }}
              >
                <option value="">All Roles</option>
                <option value="Admin">Admin</option>
                <option value="Manager">Manager</option>
                <option value="Inventory Staff">Inventory Staff</option>
                <option value="Sales Staff">Sales Staff</option>
              </select>
            </div>
            <div className="text-xs text-[var(--text-muted)]">
              Showing <span className="text-[var(--text-primary)] font-bold">{filteredUsers.length}</span> of {users.length} users
            </div>
          </div>

          {/* Users Table */}
          <div className="overflow-x-auto border border-[var(--border-color)] rounded-xl">
            <table className="w-full text-xs text-left border-collapse min-w-[700px]">
              <thead>
                <tr className="bg-[var(--table-header)] text-[var(--text-muted)] border-b border-[var(--border-color)] font-semibold">
                  <th className="py-3 px-4">User</th>
                  <th className="py-3 px-4">Email</th>
                  <th className="py-3 px-4">Assigned Role</th>
                  <th className="py-3 px-4">Access Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-color)]">
                {paginatedUsers.map((u) => {
                  const isSelf = u._id === user?.id;

                  return (
                    <tr key={u._id} className="hover:bg-[var(--table-row-hover)] transition">
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-full bg-[var(--bg-main)] flex items-center justify-center text-xs font-bold text-[var(--accent-color)] border border-[var(--border-color)]">
                            {u.name ? u.name[0].toUpperCase() : "?"}
                          </div>
                          <div>
                            <div className="font-semibold text-[var(--text-primary)] flex items-center gap-1.5">
                              {u.name}
                              {isSelf && (
                                <span className="text-[9px] px-1.5 py-0.2 rounded bg-[var(--accent-color)]/15 text-[var(--accent-color)] font-mono font-bold">YOU</span>
                              )}
                            </div>
                            <div className="text-[10px] text-[var(--text-muted)] font-mono">
                              Joined {u.createdAt ? u.createdAt.substring(0, 10) : "System Default"}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 font-mono text-[var(--text-secondary)]">{u.email}</td>
                      <td className="py-3.5 px-4">
                        <span className={`px-2 py-0.5 rounded text-xs font-mono font-bold border ${
                          u.role === "Admin"
                            ? "bg-amber-500/15 text-amber-500 border-amber-500/30"
                            : u.role === "Manager"
                            ? "bg-sky-500/15 text-sky-500 border-sky-500/30"
                            : u.role === "Inventory Staff"
                            ? "bg-emerald-500/15 text-emerald-500 border-emerald-500/30"
                            : "bg-purple-500/15 text-purple-500 border-purple-500/30"
                        }`}>
                          {u.role}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold font-mono ${
                          u.status === "active"
                            ? "bg-emerald-500/15 text-emerald-500 border border-emerald-500/30"
                            : "bg-rose-500/15 text-rose-500 border border-rose-500/30"
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${u.status === "active" ? "bg-emerald-500" : "bg-rose-500"}`} />
                          {u.status === "active" ? "Active" : "Suspended"}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => {
                              setPasswordModal(u);
                              setNewPasswordValue("");
                            }}
                            title="Reset User Password"
                            className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-amber-500 hover:bg-[var(--bg-main)] transition"
                          >
                            <KeyRound size={14} />
                          </button>
                          <button
                            onClick={() => setEditUserModal(u)}
                            title="Edit User Profile & Role"
                            className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--accent-color)] hover:bg-[var(--bg-main)] transition"
                          >
                            <Pencil size={14} />
                          </button>
                          {!isSelf && (
                            <button
                              onClick={() => setDeleteConfirmUser(u)}
                              title="Delete User Account"
                              className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-rose-500 hover:bg-[var(--bg-main)] transition"
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <Pagination
            currentPage={userPage}
            totalPages={totalUserPages}
            totalItems={filteredUsers.length}
            rowsPerPage={userPerPage}
            onPageChange={setUserPage}
            onRowsPerPageChange={(n) => {
              setUserPerPage(n);
              setUserPage(1);
            }}
          />
        </div>
      )}

      {/* TAB 2: STOCK APPROVALS CENTER */}
      {activeTab === "stock-approvals" && (
        <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl p-5 flex flex-col gap-4 shadow-sm">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <h3 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-2">
                Store Manager Stock Approvals &amp; Import Review
                {pendingStockCount > 0 && (
                  <span className="px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-500 border border-amber-500/30 text-xs font-mono font-bold">
                    {pendingStockCount} PENDING
                  </span>
                )}
              </h3>
              <p className="text-xs text-[var(--text-muted)] mt-0.5">
                Review and approve manual stock adjustments and Excel bulk imports submitted by Store Managers and Inventory Staff.
              </p>
            </div>
            <Btn size="sm" variant="ghost" onClick={fetchSettingsData}>
              <RefreshCw size={13} className={loading ? "animate-spin" : ""} /> Refresh Requests
            </Btn>
          </div>

          {/* Status Filter */}
          <div className="flex items-center justify-between flex-wrap gap-2 border-y border-[var(--border-color)] py-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-[var(--text-secondary)]">Filter:</span>
              <div className="flex gap-1.5">
                {["PENDING", "APPROVED", "REJECTED", "ALL"].map((st) => (
                  <button
                    key={st}
                    onClick={() => {
                      setStockReqStatusFilter(st);
                      setStockReqPage(1);
                    }}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold border transition ${
                      stockReqStatusFilter === st
                        ? "bg-[var(--accent-color)] text-[var(--accent-text)] border-[var(--accent-color)]"
                        : "bg-[var(--bg-main)] border-[var(--border-color)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                    }`}
                  >
                    {st === "PENDING" ? `Pending (${pendingStockCount})` : st}
                  </button>
                ))}
              </div>
            </div>

            <div className="text-xs text-[var(--text-muted)]">
              Showing <strong className="text-[var(--text-primary)]">{filteredStockRequests.length}</strong> update requests
            </div>
          </div>

          {/* Stock Requests Table */}
          <div className="overflow-x-auto border border-[var(--border-color)] rounded-xl">
            <table className="w-full text-xs text-left border-collapse min-w-[800px]">
              <thead>
                <tr className="bg-[var(--table-header)] text-[var(--text-muted)] border-b border-[var(--border-color)] font-semibold uppercase tracking-wider">
                  <th className="py-3 px-4">Request / File</th>
                  <th className="py-3 px-4">Submitted By</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4">Items / Qty</th>
                  <th className="py-3 px-4">Submitted At</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Approval Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-color)]">
                {paginatedStockRequests.map((req) => (
                  <tr key={req._id} className="hover:bg-[var(--table-row-hover)] transition">
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-[var(--text-primary)]">{req.title}</div>
                      <div className="text-[10px] text-[var(--text-muted)] truncate max-w-xs">{req.notes || "—"}</div>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-[var(--text-primary)]">{req.submittedByName}</div>
                      <div className="text-[10px] text-[var(--text-muted)] font-mono">{req.submittedByRole}</div>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-xs">
                      {req.requestType === "EXCEL_IMPORT" ? (
                        <span className="inline-flex items-center gap-1 text-[var(--accent-color)] font-semibold">
                          Excel Batch
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-slate-400 font-semibold">
                          Manual
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 font-mono">
                      <span className="font-bold text-[var(--text-primary)]">{req.totalQuantity} units</span>
                      <span className="text-[var(--text-muted)] text-[10px] ml-1.5">({req.totalItemsCount} items)</span>
                    </td>
                    <td className="py-3.5 px-4 text-[var(--text-muted)] font-mono text-xs">
                      {new Date(req.createdAt).toLocaleString("en-IN", {
                        day: "2-digit",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                    <td className="py-3.5 px-4">
                      {req.status === "PENDING" ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/30 text-xs font-bold font-mono">
                          <Clock size={12} /> PENDING
                        </span>
                      ) : req.status === "APPROVED" ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 text-xs font-bold font-mono">
                          <CheckCircle2 size={12} /> APPROVED
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-rose-500/15 text-rose-400 border border-rose-500/30 text-xs font-bold font-mono">
                          <XCircle size={12} /> REJECTED
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Btn size="sm" variant="ghost" onClick={() => setSelectedStockRequest(req)} title="Inspect items">
                          <Eye size={12} /> Details
                        </Btn>
                        {req.status === "PENDING" && (
                          <>
                            <Btn
                              size="sm"
                              onClick={() => handleApproveStockRequest(req._id)}
                              className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold"
                              title="Approve and apply stock to inventory"
                            >
                              <Check size={12} /> Approve
                            </Btn>
                            <Btn
                              size="sm"
                              variant="danger"
                              onClick={() => {
                                setRejectModalData(req);
                                setRejectionReasonInput("");
                              }}
                              title="Reject stock request"
                            >
                              <XCircle size={12} /> Reject
                            </Btn>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {paginatedStockRequests.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-[var(--text-muted)]">
                      No stock requests found matching filter.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <Pagination
            currentPage={stockReqPage}
            totalPages={totalStockReqPages}
            totalItems={filteredStockRequests.length}
            rowsPerPage={stockReqPerPage}
            onPageChange={setStockReqPage}
            onRowsPerPageChange={(n) => {
              setStockReqPerPage(n);
              setStockReqPage(1);
            }}
          />
        </div>
      )}

      {/* TAB 3: ROLE PERMISSIONS MATRIX */}
      {activeTab === "matrix" && (
        <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl p-5 flex flex-col gap-5 shadow-sm">
          <div>
            <h3 className="text-sm font-bold text-[var(--text-primary)]">
              Enterprise Role Hierarchy &amp; Permission Boundaries
            </h3>
            <p className="text-xs text-[var(--text-muted)] mt-0.5">
              Overview of module capabilities and access scopes across user roles.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {roleDetails.map((r) => {
              const Icon = r.icon;
              return (
                <div key={r.role} className={`p-4 rounded-xl border flex flex-col gap-2 ${r.color}`}>
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm flex items-center gap-2">
                      <Icon size={16} /> {r.role}
                    </span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-white/10 font-semibold">
                      {r.scope}
                    </span>
                  </div>
                  <p className="text-xs text-[var(--text-secondary)] leading-relaxed">{r.desc}</p>
                </div>
              );
            })}
          </div>

          {/* Matrix Table */}
          <div className="overflow-x-auto border border-[var(--border-color)] rounded-xl mt-2">
            <table className="w-full text-xs text-left border-collapse min-w-[700px]">
              <thead>
                <tr className="bg-[var(--table-header)] text-[var(--text-muted)] border-b border-[var(--border-color)] font-semibold">
                  <th className="py-3 px-4">System Module</th>
                  <th className="py-3 px-4 text-amber-500 font-bold">Admin</th>
                  <th className="py-3 px-4 text-sky-500 font-bold">Manager</th>
                  <th className="py-3 px-4 text-emerald-500 font-bold">Inventory Staff</th>
                  <th className="py-3 px-4 text-purple-500 font-bold">Sales Staff</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-color)]">
                {matrixData.map((m) => (
                  <tr key={m.module} className="hover:bg-[var(--table-row-hover)] transition">
                    <td className="py-3 px-4 font-semibold text-[var(--text-primary)]">{m.module}</td>
                    <td className="py-3 px-4 font-mono text-amber-500">{m.admin}</td>
                    <td className="py-3 px-4 font-mono text-sky-500">{m.manager}</td>
                    <td className="py-3 px-4 font-mono text-emerald-500">{m.inventory}</td>
                    <td className="py-3 px-4 font-mono text-purple-500">{m.sales}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: SYSTEM AUDIT TRAIL */}
      {activeTab === "audit" && (
        <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl p-5 flex flex-col gap-4 shadow-sm">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <h3 className="text-sm font-bold text-[var(--text-primary)]">
                Live Audit Logs &amp; Security Compliance
              </h3>
              <p className="text-xs text-[var(--text-muted)] mt-0.5">
                Immutable event stream of stock adjustments, approvals, logins, user updates, and order dispatches.
              </p>
            </div>
            <Btn size="sm" variant="ghost" onClick={() => downloadCSV("system-audit-trail.csv", filteredAuditLogs)}>
              <Download size={13} /> Export Logs (CSV)
            </Btn>
          </div>

          {/* Filter Bar */}
          <div className="flex gap-3 flex-wrap items-center justify-between border-y border-[var(--border-color)] py-3">
            <div className="flex gap-3 flex-1 max-w-md items-center">
              <div className="relative flex-1">
                <input
                  type="text"
                  placeholder="Search logs by action, detail or user..."
                  value={auditSearch}
                  onChange={(e) => {
                    setAuditSearch(e.target.value);
                    setAuditPage(1);
                  }}
                  className={`${inputCls} pl-9 text-xs`}
                />
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
              </div>
              <select
                className={`${inputCls} w-48 text-xs`}
                value={auditActionFilter}
                onChange={(e) => {
                  setAuditActionFilter(e.target.value);
                  setAuditPage(1);
                }}
              >
                <option value="ALL">All Actions</option>
                <option value="STOCK_UPDATE_APPROVED">Stock Approvals</option>
                <option value="STOCK_UPDATE_REQUEST_SUBMITTED">Stock Requests</option>
                <option value="STOCK_ADJUSTMENT">Stock Adjustments</option>
                <option value="EXCEL_STOCK_IMPORT">Excel Imports</option>
                <option value="USER_CREATED">User Created</option>
                <option value="USER_UPDATED">User Updated</option>
                <option value="USER_PASSWORD_RESET">Password Reset</option>
                <option value="USER_DELETED">User Deleted</option>
              </select>
            </div>
            <div className="text-xs text-[var(--text-muted)]">
              Showing <span className="text-[var(--text-primary)] font-bold">{filteredAuditLogs.length}</span> recorded events
            </div>
          </div>

          {/* Audit Logs Table */}
          <div className="overflow-x-auto border border-[var(--border-color)] rounded-xl">
            <table className="w-full text-xs text-left border-collapse min-w-[700px]">
              <thead>
                <tr className="bg-[var(--table-header)] text-[var(--text-muted)] border-b border-[var(--border-color)] font-semibold">
                  <th className="py-3 px-4">Timestamp</th>
                  <th className="py-3 px-4">Event Action</th>
                  <th className="py-3 px-4">Performed By</th>
                  <th className="py-3 px-4">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-color)]">
                {paginatedAuditLogs.map((log) => (
                  <tr key={log._id} className="hover:bg-[var(--table-row-hover)] transition">
                    <td className="py-3.5 px-4 font-mono text-[var(--text-muted)] text-[11px] whitespace-nowrap">
                      {new Date(log.createdAt).toLocaleString("en-IN", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                        second: "2-digit",
                      })}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="font-mono font-bold text-[10px] px-2 py-0.5 rounded bg-[var(--bg-main)] text-[var(--accent-color)] border border-[var(--border-color)]">
                        {log.action}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-medium text-[var(--text-primary)] whitespace-nowrap">
                      {log.performedBy}
                    </td>
                    <td className="py-3.5 px-4 text-[var(--text-secondary)] leading-relaxed">
                      {log.detail}
                    </td>
                  </tr>
                ))}
                {paginatedAuditLogs.length === 0 && (
                  <tr>
                    <td colSpan={4} className="py-12 text-center text-[var(--text-muted)]">
                      No audit logs match the current filter.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <Pagination
            currentPage={auditPage}
            totalPages={totalAuditPages}
            totalItems={filteredAuditLogs.length}
            rowsPerPage={auditPerPage}
            onPageChange={setAuditPage}
            onRowsPerPageChange={(n) => {
              setAuditPerPage(n);
              setAuditPage(1);
            }}
          />
        </div>
      )}

      {/* TAB 5: PROFILE & SECURITY */}
      {activeTab === "profile" && (
        <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl p-5 flex flex-col gap-4 shadow-sm">
          <div>
            <h3 className="text-sm font-bold text-[var(--text-primary)]">My Account &amp; Active Session</h3>
            <p className="text-xs text-[var(--text-muted)] mt-0.5">View your authenticated profile and active session parameters.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-[var(--bg-main)] p-4 rounded-xl border border-[var(--border-color)]">
            <div>
              <span className="text-[10px] text-[var(--text-muted)] uppercase font-bold block">User Name</span>
              <span className="font-bold text-sm text-[var(--text-primary)]">{user?.name}</span>
            </div>
            <div>
              <span className="text-[10px] text-[var(--text-muted)] uppercase font-bold block">Email Address</span>
              <span className="font-mono text-xs text-[var(--text-primary)]">{user?.email}</span>
            </div>
            <div>
              <span className="text-[10px] text-[var(--text-muted)] uppercase font-bold block">Active Role</span>
              <span className="font-mono font-bold text-xs text-[var(--accent-color)]">{user?.role}</span>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: STOCK REQUEST DETAILS */}
      <Modal
        open={!!selectedStockRequest}
        title={selectedStockRequest ? selectedStockRequest.title : "Stock Update Details"}
        onClose={() => setSelectedStockRequest(null)}
        wide
      >
        {selectedStockRequest && (
          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-[var(--bg-main)] p-3.5 rounded-xl border border-[var(--border-color)] text-xs">
              <div>
                <span className="text-[10px] uppercase font-bold text-[var(--text-muted)] block">Submitted By</span>
                <span className="font-semibold text-[var(--text-primary)]">{selectedStockRequest.submittedByName}</span>
                <span className="text-[10px] text-[var(--text-muted)] font-mono block">({selectedStockRequest.submittedByRole})</span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-[var(--text-muted)] block">Current Status</span>
                <span className={`font-bold font-mono text-xs ${
                  selectedStockRequest.status === "APPROVED" ? "text-emerald-400" : selectedStockRequest.status === "PENDING" ? "text-amber-400" : "text-rose-400"
                }`}>
                  {selectedStockRequest.status}
                </span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-[var(--text-muted)] block">Total Units</span>
                <span className="font-mono font-bold text-sm text-[var(--text-primary)]">{selectedStockRequest.totalQuantity} units</span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-[var(--text-muted)] block">Date</span>
                <span className="font-mono text-[var(--text-secondary)]">{new Date(selectedStockRequest.createdAt).toLocaleDateString("en-IN")}</span>
              </div>
            </div>

            {selectedStockRequest.reviewedByName && (
              <div className="p-3 bg-[var(--bg-card-hover)] rounded-xl border border-[var(--border-color)] text-xs flex items-center justify-between">
                <span>Reviewed by: <strong className="text-[var(--text-primary)]">{selectedStockRequest.reviewedByName}</strong></span>
                <span className="font-mono text-[var(--text-muted)]">{new Date(selectedStockRequest.reviewedAt).toLocaleString("en-IN")}</span>
              </div>
            )}

            {selectedStockRequest.rejectionReason && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs text-rose-400 flex items-center gap-2">
                <AlertCircle size={15} /> Rejection Reason: <strong>{selectedStockRequest.rejectionReason}</strong>
              </div>
            )}

            <div className="border border-[var(--border-color)] rounded-xl overflow-hidden max-h-60 overflow-y-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-[var(--table-header)] text-[var(--text-muted)] border-b border-[var(--border-color)] font-semibold">
                  <tr>
                    <th className="py-2.5 px-3">Product Name</th>
                    <th className="py-2.5 px-3">SKU</th>
                    <th className="py-2.5 px-3">Warehouse</th>
                    <th className="py-2.5 px-3">Adjustment</th>
                    <th className="py-2.5 px-3">Reason</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-color)]">
                  {selectedStockRequest.items?.map((it, idx) => (
                    <tr key={idx} className="hover:bg-[var(--bg-card-hover)]">
                      <td className="py-2.5 px-3 font-semibold text-[var(--text-primary)]">{it.productName}</td>
                      <td className="py-2.5 px-3 font-mono text-[var(--text-muted)]">{it.sku}</td>
                      <td className="py-2.5 px-3 text-[var(--text-secondary)]">{it.warehouseName}</td>
                      <td className="py-2.5 px-3 font-mono font-bold">
                        <span className={it.type === "ADJUSTMENT_IN" ? "text-emerald-400" : "text-rose-400"}>
                          {it.type === "ADJUSTMENT_IN" ? `+${it.quantity}` : `-${it.quantity}`}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-[var(--text-muted)] text-[11px]">{it.reason || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-[var(--border-color)]">
              <Btn variant="ghost" onClick={() => setSelectedStockRequest(null)}>Close</Btn>

              {selectedStockRequest.status === "PENDING" && (
                <div className="flex items-center gap-2">
                  <Btn
                    variant="danger"
                    size="sm"
                    onClick={() => {
                      setRejectModalData(selectedStockRequest);
                      setRejectionReasonInput("");
                    }}
                  >
                    <XCircle size={13} /> Reject Request
                  </Btn>
                  <Btn
                    size="sm"
                    onClick={() => handleApproveStockRequest(selectedStockRequest._id)}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold"
                  >
                    <Check size={13} /> Approve &amp; Apply Stock
                  </Btn>
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* MODAL: REJECT STOCK REQUEST CONFIRMATION */}
      <Modal
        open={!!rejectModalData}
        title="Reject Stock Update Request"
        onClose={() => setRejectModalData(null)}
      >
        {rejectModalData && (
          <div className="flex flex-col gap-4">
            <p className="text-xs text-[var(--text-secondary)]">
              Are you sure you want to reject the stock update request <strong className="text-[var(--text-primary)]">{rejectModalData.title}</strong> submitted by {rejectModalData.submittedByName}?
            </p>

            <Field label="Rejection Reason / Note">
              <input
                className={inputCls}
                value={rejectionReasonInput}
                onChange={(e) => setRejectionReasonInput(e.target.value)}
                placeholder="e.g. Quantity discrepancy or incorrect warehouse location"
              />
            </Field>

            <div className="flex justify-end gap-2 pt-3 border-t border-[var(--border-color)]">
              <Btn variant="ghost" onClick={() => setRejectModalData(null)}>Cancel</Btn>
              <Btn variant="danger" onClick={handleRejectStockRequest}>Confirm Rejection</Btn>
            </div>
          </div>
        )}
      </Modal>

      {/* MODAL: CREATE USER */}
      <Modal open={createUserModal} title="Create New System User" onClose={() => setCreateUserModal(false)}>
        <form onSubmit={handleCreateUser} className="flex flex-col gap-3.5">
          <Field label="Full Name">
            <input
              type="text"
              required
              className={inputCls}
              placeholder="e.g. Alex Henderson"
              value={newUserForm.name}
              onChange={(e) => setNewUserForm({ ...newUserForm, name: e.target.value })}
            />
          </Field>

          <Field label="Email Address">
            <input
              type="email"
              required
              className={inputCls}
              placeholder="e.g. alex@stockflow.com"
              value={newUserForm.email}
              onChange={(e) => setNewUserForm({ ...newUserForm, email: e.target.value })}
            />
          </Field>

          <Field label="Initial Password">
            <input
              type="password"
              required
              minLength={6}
              className={inputCls}
              placeholder="•••••••• (Min 6 characters)"
              value={newUserForm.password}
              onChange={(e) => setNewUserForm({ ...newUserForm, password: e.target.value })}
            />
          </Field>

          <Field label="Role Assignment">
            <select
              className={inputCls}
              value={newUserForm.role}
              onChange={(e) => setNewUserForm({ ...newUserForm, role: e.target.value })}
            >
              <option value="Admin">Admin (Full Master Access)</option>
              <option value="Manager">Manager (Catalog &amp; PO Approvals)</option>
              <option value="Inventory Staff">Inventory Staff (Warehouses &amp; Stock)</option>
              <option value="Sales Staff">Sales Staff (Clients &amp; Sales Orders)</option>
            </select>
          </Field>

          <Field label="Initial Account Status">
            <select
              className={inputCls}
              value={newUserForm.status}
              onChange={(e) => setNewUserForm({ ...newUserForm, status: e.target.value })}
            >
              <option value="active">Active (Can Login)</option>
              <option value="inactive">Inactive (Suspended)</option>
            </select>
          </Field>

          <div className="flex justify-end gap-2 pt-3 border-t border-[var(--border-color)]">
            <Btn variant="ghost" onClick={() => setCreateUserModal(false)}>Cancel</Btn>
            <Btn type="submit">Create User</Btn>
          </div>
        </form>
      </Modal>

      {/* MODAL: EDIT USER */}
      <Modal open={!!editUserModal} title="Edit User Information" onClose={() => setEditUserModal(null)}>
        {editUserModal && (
          <form onSubmit={handleUpdateUser} className="flex flex-col gap-3.5">
            <Field label="Full Name">
              <input
                type="text"
                required
                className={inputCls}
                value={editUserModal.name}
                onChange={(e) => setEditUserModal({ ...editUserModal, name: e.target.value })}
              />
            </Field>

            <Field label="Email Address">
              <input
                type="email"
                required
                className={inputCls}
                value={editUserModal.email}
                onChange={(e) => setEditUserModal({ ...editUserModal, email: e.target.value })}
              />
            </Field>

            <Field label="Assigned Role">
              <select
                className={inputCls}
                value={editUserModal.role}
                disabled={editUserModal._id === user?.id}
                onChange={(e) => setEditUserModal({ ...editUserModal, role: e.target.value })}
              >
                <option value="Admin">Admin</option>
                <option value="Manager">Manager</option>
                <option value="Inventory Staff">Inventory Staff</option>
                <option value="Sales Staff">Sales Staff</option>
              </select>
            </Field>

            <Field label="Access Status">
              <select
                className={inputCls}
                value={editUserModal.status}
                disabled={editUserModal._id === user?.id}
                onChange={(e) => setEditUserModal({ ...editUserModal, status: e.target.value })}
              >
                <option value="active">Active</option>
                <option value="inactive">Suspended</option>
              </select>
            </Field>

            <div className="flex justify-end gap-2 pt-3 border-t border-[var(--border-color)]">
              <Btn variant="ghost" onClick={() => setEditUserModal(null)}>Cancel</Btn>
              <Btn type="submit">Save Changes</Btn>
            </div>
          </form>
        )}
      </Modal>

      {/* MODAL: RESET PASSWORD */}
      <Modal open={!!passwordModal} title={`Reset Password for ${passwordModal?.name}`} onClose={() => setPasswordModal(null)}>
        {passwordModal && (
          <form onSubmit={handleResetPassword} className="flex flex-col gap-3.5">
            <p className="text-xs text-[var(--text-muted)]">
              Set a new password for <span className="text-[var(--text-primary)] font-semibold">{passwordModal.email}</span>. The user will be able to log in with this new password immediately.
            </p>

            <Field label="New Password">
              <input
                type="password"
                required
                minLength={6}
                className={inputCls}
                placeholder="•••••••• (Min 6 characters)"
                value={newPasswordValue}
                onChange={(e) => setNewPasswordValue(e.target.value)}
              />
            </Field>

            <div className="flex justify-end gap-2 pt-3 border-t border-[var(--border-color)]">
              <Btn variant="ghost" onClick={() => setPasswordModal(null)}>Cancel</Btn>
              <Btn type="submit">Update Password</Btn>
            </div>
          </form>
        )}
      </Modal>

      {/* MODAL: CONFIRM DELETE USER */}
      <ConfirmModal
        open={!!deleteConfirmUser}
        title="Delete User Account"
        message={`Are you sure you want to permanently delete the user account for ${deleteConfirmUser?.name} (${deleteConfirmUser?.email})? This action cannot be undone.`}
        onConfirm={() => handleDeleteUser(deleteConfirmUser?._id)}
        onCancel={() => setDeleteConfirmUser(null)}
      />
    </div>
  );
}
