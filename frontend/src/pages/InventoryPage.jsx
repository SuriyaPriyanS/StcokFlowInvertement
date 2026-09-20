import React, { useState, useEffect, useMemo } from "react";
import { useSelector } from "react-redux";
import { 
  Plus, FileSpreadsheet, Search, RefreshCw, Boxes, 
  ArrowDownToLine, CheckCircle2, Clock, XCircle, 
  Download, Eye, ShieldCheck, AlertCircle, FileText,
  ArrowRight, ShieldAlert 
} from "lucide-react";
import api from "../utils/api";
import { money } from "../utils/money";
import { Btn, Modal, Badge, StatusBadge, Field, inputCls, Pagination } from "../components/SharedComponents";
import ExcelImportModal from "../components/ExcelImportModal";

export default function InventoryPage() {
  const { user } = useSelector((state) => state.auth);
  const isAdmin = user?.role === "Admin";
  const canUpdateStock = ["Admin", "Manager", "Inventory Staff"].includes(user?.role);
  const isStoreManager = ["Manager", "Inventory Staff"].includes(user?.role);

  const [activeTab, setActiveTab] = useState("inventory"); // "inventory" | "requests"
  const [inventory, setInventory] = useState([]);
  const [products, setProducts] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [whFilter, setWhFilter] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  
  // Stock requests state
  const [requests, setRequests] = useState([]);
  const [requestStatusFilter, setRequestStatusFilter] = useState("ALL");
  const [viewRequestDetails, setViewRequestDetails] = useState(null);
  
  const [modal, setModal] = useState(null);
  const [excelModalOpen, setExcelModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [notification, setNotification] = useState("");

  // Pagination State for Inventory Table
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  // Pagination State for Requests Table
  const [reqPage, setReqPage] = useState(1);
  const [reqPerPage, setReqPerPage] = useState(10);

  const fetchAllData = async () => {
    try {
      const [invRes, prodRes, whRes, reqRes] = await Promise.all([
        api.get("/inventory"),
        api.get("/products"),
        api.get("/warehouses"),
        api.get("/inventory/requests"),
      ]);
      setInventory(invRes.data.data || []);
      setProducts(prodRes.data.data || []);
      setWarehouses(whRes.data.data || []);
      setRequests(reqRes.data.data || []);
    } catch (err) {
      console.error("Failed to load inventory data:", err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, []);

  const pendingRequestsCount = useMemo(() => {
    return requests.filter((r) => r.status === "PENDING").length;
  }, [requests]);

  // Filtered Rows for Inventory
  const filteredRows = useMemo(() => {
    return inventory
      .filter((i) => !whFilter || (i.warehouseId?._id || i.warehouseId) === whFilter)
      .filter((i) => {
        if (!searchQuery) return true;
        const prod = i.productId || {};
        const q = searchQuery.toLowerCase();
        return (
          (prod.name || "").toLowerCase().includes(q) ||
          (prod.sku || "").toLowerCase().includes(q) ||
          (prod.barcode || "").toLowerCase().includes(q)
        );
      })
      .map((i) => {
        const available = i.quantity - (i.reserved || 0);
        const prod = i.productId || {};
        const costPrice = prod.costPrice || 0;
        const stockValue = i.quantity * costPrice;
        return {
          ...i,
          available,
          stockValue,
        };
      });
  }, [inventory, whFilter, searchQuery]);

  // Paginated Rows
  const paginatedRows = useMemo(() => {
    const startIndex = (currentPage - 1) * rowsPerPage;
    return filteredRows.slice(startIndex, startIndex + rowsPerPage);
  }, [filteredRows, currentPage, rowsPerPage]);

  const totalPages = Math.ceil(filteredRows.length / rowsPerPage) || 1;

  // Filtered Requests
  const filteredRequests = useMemo(() => {
    return requests.filter((r) => {
      if (requestStatusFilter === "ALL") return true;
      return r.status === requestStatusFilter;
    });
  }, [requests, requestStatusFilter]);

  const paginatedRequests = useMemo(() => {
    const start = (reqPage - 1) * reqPerPage;
    return filteredRequests.slice(start, start + reqPerPage);
  }, [filteredRequests, reqPage, reqPerPage]);

  const totalReqPages = Math.ceil(filteredRequests.length / reqPerPage) || 1;

  // Handle Export Excel (.xlsx)
  const handleExportExcel = () => {
    const exportData = filteredRows.map((r, idx) => {
      const prod = r.productId || {};
      const wh = r.warehouseId || {};
      return {
        "Index": idx + 1,
        "Product Name": prod.name || "—",
        "SKU": prod.sku || "—",
        "Barcode": prod.barcode || "—",
        "Warehouse Location": wh.name || "—",
        "Current Stock (Units)": r.quantity,
        "Reserved Stock": r.reserved || 0,
        "Available Stock": r.available,
        "Reorder Level": prod.reorderLevel ?? 0,
        "Cost Price (₹)": prod.costPrice || 0,
        "Selling Price (₹)": prod.sellingPrice || 0,
        "Total Stock Value (₹)": r.stockValue,
        "Stock Status": r.quantity === 0 ? "OUT OF STOCK" : r.quantity <= (prod.reorderLevel || 0) ? "LOW STOCK" : "IN STOCK",
      };
    });

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Inventory_Stock");
    XLSX.writeFile(wb, `StockFlow_Inventory_Export_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  const handleAdjustSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post("/inventory/adjust", {
        productId: modal.productId,
        warehouseId: modal.warehouseId,
        qty: parseInt(modal.qty, 10),
        reason: modal.reason || "",
        type: modal.type || "ADJUSTMENT_IN",
      });

      setModal(null);
      fetchAllData();

      if (res.data.pendingApproval) {
        setNotification("Stock update request submitted! It is currently PENDING Admin approval in the Admin Portal.");
      } else {
        setNotification("Stock updated successfully in inventory!");
      }
      setTimeout(() => setNotification(""), 5000);
    } catch (err) {
      alert(err.response?.data?.message || "Stock adjustment failed");
    }
  };

  if (loading) return <div className="text-[var(--text-muted)] text-sm p-4">Loading stock levels...</div>;

  return (
    <div className="flex flex-col gap-5 text-[var(--text-primary)]">
      {/* Header Section */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-[var(--text-primary)] flex items-center gap-2">
            Inventory &amp; Stock Management
            {isStoreManager && (
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-sky-500/15 text-sky-400 border border-sky-500/30 uppercase">
                Store Manager Inward
              </span>
            )}
            {isAdmin && (
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-[var(--accent-color)]/15 text-[var(--accent-color)] border border-[var(--accent-color)]/30 uppercase">
                Admin Control
              </span>
            )}
          </h1>
          <p className="text-xs text-[var(--text-muted)] mt-0.5">
            Store Managers update stock entries and import Excel sheets; Administrators approve changes in Admin Portal.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Excel Export Button */}
          <Btn 
            variant="ghost" 
            onClick={handleExportExcel}
            title="Export all inventory rows to Excel workbook"
          >
            <Download size={14} /> Export Excel (.xlsx)
          </Btn>

          {/* Store Manager & Admin Stock Inward Controls */}
          {canUpdateStock && (
            <>
              <Btn 
                variant="ghost" 
                onClick={() => setExcelModalOpen(true)}
                className="border-[var(--accent-color)]/30 text-[var(--accent-color)] hover:bg-[var(--accent-color)]/10"
              >
                <FileSpreadsheet size={15} /> Import Excel / CSV Stock
              </Btn>

              <Btn onClick={() => setModal({ 
                productId: products[0]?._id || "", 
                warehouseId: warehouses[0]?._id || "", 
                qty: 1, 
                reason: "", 
                type: "ADJUSTMENT_IN" 
              })}>
                <Plus size={15} /> Add Stock (Inward)
              </Btn>
            </>
          )}
        </div>
      </div>

      {/* Notification Toast */}
      {notification && (
        <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 p-3 rounded-xl text-xs flex items-center justify-between gap-2 animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={16} />
            <span className="font-semibold">{notification}</span>
          </div>
          <button onClick={() => setNotification("")} className="text-emerald-400 hover:text-white">
            <XCircle size={15} />
          </button>
        </div>
      )}

      {/* Navigation Tabs (Live Stock vs Approvals History) */}
      <div className="flex items-center justify-between border-b border-[var(--border-color)] pb-2 flex-wrap gap-2">
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab("inventory")}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 ${
              activeTab === "inventory"
                ? "bg-[var(--accent-color)] text-[var(--accent-text)] shadow-sm"
                : "text-[var(--text-secondary)] hover:bg-[var(--bg-card)] hover:text-[var(--text-primary)]"
            }`}
          >
            <Boxes size={14} /> Live Inventory ({filteredRows.length})
          </button>
          <button
            onClick={() => setActiveTab("requests")}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 ${
              activeTab === "requests"
                ? "bg-[var(--accent-color)] text-[var(--accent-text)] shadow-sm"
                : "text-[var(--text-secondary)] hover:bg-[var(--bg-card)] hover:text-[var(--text-primary)]"
            }`}
          >
            <Clock size={14} /> Stock Approvals &amp; History ({requests.length})
            {pendingRequestsCount > 0 && (
              <span className="ml-1 px-1.5 py-0.2 rounded-full bg-amber-500 text-slate-950 font-bold text-[10px]">
                {pendingRequestsCount} PENDING
              </span>
            )}
          </button>
        </div>
      </div>

      {activeTab === "inventory" ? (
        <>
          {/* Filter and Search Bar */}
          <div className="flex gap-3 flex-wrap items-center justify-between bg-[var(--bg-card)] p-3 rounded-xl border border-[var(--border-color)]">
            <div className="flex gap-3 flex-1 max-w-md items-center">
              <div className="relative flex-1">
                <input
                  type="text"
                  placeholder="Search by Product Name or SKU..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setCurrentPage(1);
                  }}
                  className={`${inputCls} pl-9 text-xs`}
                />
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
              </div>

              <select 
                className={`${inputCls} w-48 text-xs`} 
                value={whFilter} 
                onChange={(e) => {
                  setWhFilter(e.target.value);
                  setCurrentPage(1);
                }}
              >
                <option value="">All Warehouses</option>
                {warehouses.map((w) => (
                  <option key={w._id} value={w._id}>
                    {w.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-3 text-xs text-[var(--text-muted)]">
              <button 
                onClick={fetchAllData} 
                className="flex items-center gap-1 hover:text-[var(--text-primary)] transition"
              >
                <RefreshCw size={13} /> Refresh
              </button>
              <span>Total: <strong className="text-[var(--text-primary)]">{filteredRows.length}</strong> items</span>
            </div>
          </div>

          {/* Inventory Table */}
          <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl overflow-hidden shadow-sm flex flex-col">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left min-w-[850px] border-collapse">
                <thead>
                  <tr className="bg-[var(--table-header)] text-[var(--text-muted)] border-b border-[var(--border-color)] font-semibold uppercase tracking-wider">
                    <th className="py-3 px-4">Product</th>
                    <th className="py-3 px-4">SKU</th>
                    <th className="py-3 px-4">Warehouse</th>
                    <th className="py-3 px-4">Current Stock</th>
                    <th className="py-3 px-4">Reserved</th>
                    <th className="py-3 px-4">Available</th>
                    <th className="py-3 px-4">Reorder Level</th>
                    <th className="py-3 px-4">Stock Value</th>
                    {canUpdateStock && <th className="py-3 px-4 text-right">Inward Action</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-color)]/60">
                  {paginatedRows.map((r) => {
                    const prod = r.productId || {};
                    const wh = r.warehouseId || {};
                    return (
                      <tr key={r._id} className="hover:bg-[var(--table-row-hover)] transition">
                        <td className="py-3.5 px-4 font-semibold text-[var(--text-primary)]">
                          {prod.name || "—"}
                        </td>
                        <td className="py-3.5 px-4 font-mono text-[var(--text-muted)] font-medium">
                          {prod.sku || "—"}
                        </td>
                        <td className="py-3.5 px-4 text-[var(--text-secondary)] font-medium">
                          {wh.name || "—"}
                        </td>
                        <td className="py-3.5 px-4 font-bold font-mono">
                          <span className={`px-2 py-0.5 rounded text-xs ${
                            r.quantity === 0 
                              ? "bg-rose-500/15 text-rose-500 border border-rose-500/30" 
                              : r.quantity <= (prod.reorderLevel || 0)
                              ? "bg-amber-500/15 text-amber-500 border border-amber-500/30"
                              : "bg-emerald-500/15 text-emerald-500 border border-emerald-500/30"
                          }`}>
                            {r.quantity}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 font-mono text-[var(--text-muted)]">
                          {r.reserved || 0}
                        </td>
                        <td className="py-3.5 px-4 font-mono font-bold text-[var(--text-primary)]">
                          {r.available}
                        </td>
                        <td className="py-3.5 px-4 font-mono text-[var(--text-secondary)]">
                          {prod.reorderLevel ?? "—"}
                        </td>
                        <td className="py-3.5 px-4 font-mono font-bold text-[var(--text-primary)]">
                          {money(r.stockValue)}
                        </td>
                        {canUpdateStock && (
                          <td className="py-3.5 px-4 text-right">
                            <Btn
                              size="sm"
                              variant="subtle"
                              onClick={() => setModal({
                                productId: prod._id,
                                warehouseId: wh._id,
                                qty: 1,
                                type: "ADJUSTMENT_IN",
                                reason: "",
                              })}
                              title="Add Stock for this product"
                            >
                              <Plus size={12} /> Add Stock
                            </Btn>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                  {paginatedRows.length === 0 && (
                    <tr>
                      <td colSpan={canUpdateStock ? 9 : 8} className="py-12 text-center text-[var(--text-muted)]">
                        No inventory records found. Use the buttons above to add stock or import an Excel file.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            <div className="p-4 bg-[var(--bg-card)] border-t border-[var(--border-color)]">
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                totalItems={filteredRows.length}
                rowsPerPage={rowsPerPage}
                onPageChange={setCurrentPage}
                onRowsPerPageChange={(n) => {
                  setRowsPerPage(n);
                  setCurrentPage(1);
                }}
              />
            </div>
          </div>
        </>
      ) : (
        /* Stock Approvals & History Tab */
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between flex-wrap gap-3 bg-[var(--bg-card)] p-3 rounded-xl border border-[var(--border-color)]">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-[var(--text-secondary)]">Filter Status:</span>
              <div className="flex gap-1.5">
                {["ALL", "PENDING", "APPROVED", "REJECTED"].map((st) => (
                  <button
                    key={st}
                    onClick={() => {
                      setRequestStatusFilter(st);
                      setReqPage(1);
                    }}
                    className={`px-2.5 py-1 rounded-md text-xs font-semibold border transition ${
                      requestStatusFilter === st
                        ? "bg-[var(--accent-color)] text-[var(--accent-text)] border-[var(--accent-color)]"
                        : "bg-[var(--bg-main)] border-[var(--border-color)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                    }`}
                  >
                    {st}
                  </button>
                ))}
              </div>
            </div>

            <div className="text-xs text-[var(--text-muted)]">
              Showing <strong className="text-[var(--text-primary)]">{filteredRequests.length}</strong> stock update requests
            </div>
          </div>

          <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl overflow-hidden shadow-sm flex flex-col">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left min-w-[800px] border-collapse">
                <thead>
                  <tr className="bg-[var(--table-header)] text-[var(--text-muted)] border-b border-[var(--border-color)] font-semibold uppercase tracking-wider">
                    <th className="py-3 px-4">Request Title</th>
                    <th className="py-3 px-4">Type</th>
                    <th className="py-3 px-4">Submitted By</th>
                    <th className="py-3 px-4">Items / Qty</th>
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-color)]/60">
                  {paginatedRequests.map((req) => (
                    <tr key={req._id} className="hover:bg-[var(--table-row-hover)] transition">
                      <td className="py-3.5 px-4 font-semibold text-[var(--text-primary)]">
                        {req.title}
                      </td>
                      <td className="py-3.5 px-4 font-mono text-xs text-[var(--text-muted)]">
                        {req.requestType === "EXCEL_IMPORT" ? (
                          <span className="inline-flex items-center gap-1 text-[var(--accent-color)] font-semibold">
                            <FileSpreadsheet size={13} /> Excel Batch
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-slate-400 font-semibold">
                            <Plus size={13} /> Manual Inward
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-[var(--text-primary)]">{req.submittedByName}</div>
                        <div className="text-[10px] text-[var(--text-muted)] font-mono">{req.submittedByRole}</div>
                      </td>
                      <td className="py-3.5 px-4 font-mono">
                        <span className="font-bold text-[var(--text-primary)]">{req.totalQuantity} units</span>
                        <span className="text-[var(--text-muted)] text-[11px] ml-1.5">({req.totalItemsCount} items)</span>
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
                        <Btn size="sm" variant="ghost" onClick={() => setViewRequestDetails(req)}>
                          <Eye size={12} /> View Items
                        </Btn>
                      </td>
                    </tr>
                  ))}
                  {paginatedRequests.length === 0 && (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-[var(--text-muted)]">
                        No stock update requests found matching filter.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="p-4 bg-[var(--bg-card)] border-t border-[var(--border-color)]">
              <Pagination
                currentPage={reqPage}
                totalPages={totalReqPages}
                totalItems={filteredRequests.length}
                rowsPerPage={reqPerPage}
                onPageChange={setReqPage}
                onRowsPerPageChange={(n) => {
                  setReqPerPage(n);
                  setReqPage(1);
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Manual Stock Add / Inward Modal */}
      <Modal 
        open={!!modal} 
        title={isAdmin ? "Direct Stock Adjustment" : "Store Manager Stock Inward (Requires Admin Approval)"} 
        onClose={() => setModal(null)}
      >
        {modal && (
          <form className="flex flex-col gap-4" onSubmit={handleAdjustSubmit}>
            {!isAdmin && (
              <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-xs text-amber-300 flex items-start gap-2">
                <Clock size={16} className="text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold">Store Manager Submission:</span> This stock adjustment will be submitted to the Admin Approval Portal. Only the Administrator can approve and apply this change to live inventory.
                </div>
              </div>
            )}

            <Field label="Target Product">
              <select 
                className={inputCls} 
                value={modal.productId} 
                onChange={(e) => setModal({ ...modal, productId: e.target.value })}
              >
                {products.map((p) => <option key={p._id} value={p._id}>{p.name} ({p.sku})</option>)}
              </select>
            </Field>

            <Field label="Warehouse Destination">
              <select 
                className={inputCls} 
                value={modal.warehouseId} 
                onChange={(e) => setModal({ ...modal, warehouseId: e.target.value })}
              >
                {warehouses.map((w) => <option key={w._id} value={w._id}>{w.name}</option>)}
              </select>
            </Field>

            <Field label="Operation Type">
              <select 
                className={inputCls} 
                value={modal.type} 
                onChange={(e) => setModal({ ...modal, type: e.target.value })}
              >
                <option value="ADJUSTMENT_IN">+ Inward / Add Stock (New Shipment / Delivery)</option>
                <option value="ADJUSTMENT_OUT">- Outward / Reduce Stock (Damaged / Expired)</option>
              </select>
            </Field>

            <Field label="How Many Stock to Add (Quantity)">
              <div className="space-y-1.5">
                <input 
                  type="number" 
                  min="1" 
                  required 
                  className={`${inputCls} text-sm font-bold font-mono`}
                  value={modal.qty} 
                  onChange={(e) => setModal({ ...modal, qty: e.target.value })} 
                  placeholder="Enter quantity..."
                />
                <div className="flex gap-1.5">
                  {[10, 25, 50, 100].map((num) => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => setModal({ ...modal, qty: (parseInt(modal.qty, 10) || 0) + num })}
                      className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-[var(--bg-main)] border border-[var(--border-color)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--accent-color)]"
                    >
                      +{num}
                    </button>
                  ))}
                </div>
              </div>
            </Field>

            <Field label="Note / Reference (Optional)">
              <input 
                className={inputCls} 
                value={modal.reason} 
                onChange={(e) => setModal({ ...modal, reason: e.target.value })} 
                placeholder="e.g. Stock arrival from supplier or physical audit" 
              />
            </Field>

            <div className="flex justify-end gap-2 pt-3 border-t border-[var(--border-color)]">
              <Btn variant="ghost" onClick={() => setModal(null)}>Cancel</Btn>
              <Btn type="submit">
                {isAdmin ? (
                  <>
                    <ShieldCheck size={14} /> Apply Stock to Inventory
                  </>
                ) : (
                  <>
                    <ArrowRight size={14} /> Submit for Admin Approval
                  </>
                )}
              </Btn>
            </div>
          </form>
        )}
      </Modal>

      {/* Stock Update Request Details Modal */}
      <Modal
        open={!!viewRequestDetails}
        title={viewRequestDetails ? viewRequestDetails.title : "Request Details"}
        onClose={() => setViewRequestDetails(null)}
        wide
      >
        {viewRequestDetails && (
          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-[var(--bg-main)] p-3.5 rounded-xl border border-[var(--border-color)] text-xs">
              <div>
                <span className="text-[10px] text-[var(--text-muted)] uppercase font-bold block">Submitted By</span>
                <span className="font-semibold text-[var(--text-primary)]">{viewRequestDetails.submittedByName}</span>
                <span className="text-[10px] text-[var(--text-muted)] block font-mono">({viewRequestDetails.submittedByRole})</span>
              </div>
              <div>
                <span className="text-[10px] text-[var(--text-muted)] uppercase font-bold block">Status</span>
                <span className={`inline-flex items-center gap-1 font-bold text-xs ${
                  viewRequestDetails.status === "APPROVED" ? "text-emerald-400" : viewRequestDetails.status === "PENDING" ? "text-amber-400" : "text-rose-400"
                }`}>
                  {viewRequestDetails.status}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-[var(--text-muted)] uppercase font-bold block">Total Quantity</span>
                <span className="font-mono font-bold text-[var(--text-primary)] text-sm">{viewRequestDetails.totalQuantity} units</span>
              </div>
              <div>
                <span className="text-[10px] text-[var(--text-muted)] uppercase font-bold block">Submission Date</span>
                <span className="font-mono text-[var(--text-secondary)]">
                  {new Date(viewRequestDetails.createdAt).toLocaleDateString("en-IN")}
                </span>
              </div>
            </div>

            {viewRequestDetails.reviewedByName && (
              <div className="p-3 bg-[var(--bg-card-hover)] rounded-xl border border-[var(--border-color)] text-xs flex items-center justify-between">
                <span>Reviewed by Admin: <strong className="text-[var(--text-primary)]">{viewRequestDetails.reviewedByName}</strong></span>
                <span className="font-mono text-[var(--text-muted)]">{new Date(viewRequestDetails.reviewedAt).toLocaleString("en-IN")}</span>
              </div>
            )}

            {viewRequestDetails.rejectionReason && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs text-rose-400 flex items-center gap-2">
                <AlertCircle size={15} /> Rejection Reason: <strong>{viewRequestDetails.rejectionReason}</strong>
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
                    <th className="py-2.5 px-3">Note</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-color)]">
                  {viewRequestDetails.items?.map((it, idx) => (
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

            <div className="flex justify-end pt-2">
              <Btn onClick={() => setViewRequestDetails(null)}>Close</Btn>
            </div>
          </div>
        )}
      </Modal>

      {/* Excel Import Modal */}
      <ExcelImportModal
        open={excelModalOpen}
        onClose={() => setExcelModalOpen(false)}
        products={products}
        warehouses={warehouses}
        onSuccess={fetchAllData}
      />
    </div>
  );
}
