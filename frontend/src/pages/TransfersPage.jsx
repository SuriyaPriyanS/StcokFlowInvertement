import React, { useState, useEffect, useMemo } from "react";
import { Plus, ArrowLeftRight, CheckCircle2, Truck, PackageCheck } from "lucide-react";
import api from "../utils/api";
import { Btn, Modal, StatusBadge, Field, inputCls, Card, ConfirmModal, Pagination } from "../components/SharedComponents";

export default function TransfersPage() {
  const [transfers, setTransfers] = useState([]);
  const [products, setProducts] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [modal, setModal] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  
  // Confirmation state
  const [confirmModalData, setConfirmModalData] = useState(null);

  const fetchAllData = async () => {
    try {
      const [trRes, prodRes, whRes] = await Promise.all([
        api.get("/transfers"),
        api.get("/products"),
        api.get("/warehouses"),
      ]);
      setTransfers(trRes.data.data);
      setProducts(prodRes.data.data);
      setWarehouses(whRes.data.data);
    } catch (err) {
      console.error("Failed to load transfers:", err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, []);

  // Compute stock transfer stats for top mini cards
  const stats = useMemo(() => {
    const totalCount = transfers.length;
    const transitCount = transfers.filter((t) => t.status === "IN_TRANSIT").length;
    const pendingCount = transfers.filter((t) => t.status === "PENDING").length;
    return { totalCount, transitCount, pendingCount };
  }, [transfers]);

  // Paginated Transfers
  const paginatedTransfers = useMemo(() => {
    const start = (currentPage - 1) * rowsPerPage;
    return transfers.slice(start, start + rowsPerPage);
  }, [transfers, currentPage, rowsPerPage]);

  const totalPages = Math.ceil(transfers.length / rowsPerPage);

  const handleCreateTransfer = async (e) => {
    e.preventDefault();
    try {
      await api.post("/transfers", modal);
      setModal(null);
      fetchAllData();
    } catch (err) {
      alert(err.response?.data?.message || "Failed to create transfer");
    }
  };

  const handleDispatch = async (id) => {
    try {
      await api.put(`/transfers/${id}/dispatch`);
      fetchAllData();
    } catch (err) {
      alert(err.response?.data?.message || "Failed to dispatch transfer");
    }
  };

  const handleReceive = async (id) => {
    try {
      await api.put(`/transfers/${id}/receive`);
      fetchAllData();
    } catch (err) {
      alert(err.response?.data?.message || "Failed to receive transfer");
    }
  };

  if (loading) return <div className="text-[var(--text-muted)] text-sm">Loading transfers...</div>;

  return (
    <div className="flex flex-col gap-5">
      {/* Header Section */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-[var(--text-primary)]">Stock Transfers</h1>
          <p className="text-xs text-[var(--text-muted)] mt-0.5">Move products safely across different warehouse storage locations.</p>
        </div>
        <Btn onClick={() => setModal({
          fromWarehouse: warehouses[0]?._id || "",
          toWarehouse: warehouses[1]?._id || "",
          product: products[0]?._id || "",
          quantity: 1
        })}>
          <Plus size={15} /> New Transfer
        </Btn>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
        <Card title="Total Inter-Warehouse Transfers" value={stats.totalCount} />
        <Card title="In Transit" value={stats.transitCount} tone={stats.transitCount ? "warn" : "default"} />
        <Card title="Pending Shipment" value={stats.pendingCount} tone={stats.pendingCount ? "danger" : "default"} />
      </div>

      {/* Transfers Table */}
      <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left min-w-[800px] border-collapse">
            <thead>
              <tr className="bg-[var(--table-header)] text-[var(--text-muted)] border-b border-[var(--border-color)] font-semibold">
                <th className="py-3 px-4">Transfer Number</th>
                <th className="py-3 px-4">Product Name</th>
                <th className="py-3 px-4">Transfer Route</th>
                <th className="py-3 px-4">Quantity</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-color)]">
              {paginatedTransfers.map((tr) => {
                const product = tr.product || {};
                const fromWh = tr.fromWarehouse || {};
                const toWh = tr.toWarehouse || {};
                return (
                  <tr key={tr._id} className="hover:bg-[var(--table-row-hover)] transition">
                    <td className="py-3.5 px-4 font-mono text-[var(--text-primary)] font-bold">{tr.transferNumber}</td>
                    <td className="py-3.5 px-4 font-semibold text-[var(--text-primary)]">{product.name || "—"}</td>
                    <td className="py-3.5 px-4">
                      <span className="flex items-center gap-2 text-[var(--text-secondary)] font-medium">
                        {fromWh.name || "—"}
                        <ArrowLeftRight size={13} className="text-sky-500" />
                        {toWh.name || "—"}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-mono font-bold text-[var(--text-primary)]">{tr.quantity}</td>
                    <td className="py-3.5 px-4"><StatusBadge status={tr.status} /></td>
                    <td className="py-3.5 px-4">
                      <div className="flex justify-end gap-1.5 items-center">
                        {tr.status === "PENDING" && (
                          <Btn size="sm" onClick={() => setConfirmModalData({ id: tr._id, action: 'dispatch', transferNumber: tr.transferNumber })}>
                            <Truck size={12} /> Dispatch
                          </Btn>
                        )}
                        {tr.status === "IN_TRANSIT" && (
                          <Btn size="sm" onClick={() => setConfirmModalData({ id: tr._id, action: 'receive', transferNumber: tr.transferNumber })}>
                            <PackageCheck size={12} /> Receive
                          </Btn>
                        )}
                        {tr.status === "RECEIVED" && <CheckCircle2 size={16} className="text-emerald-500" />}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {paginatedTransfers.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-[var(--text-muted)]">
                    No stock transfers registered yet. Click New Transfer above to initiate one.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="p-4 bg-[var(--bg-card)]">
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={transfers.length}
            rowsPerPage={rowsPerPage}
            onPageChange={setCurrentPage}
            onRowsPerPageChange={(n) => {
              setRowsPerPage(n);
              setCurrentPage(1);
            }}
          />
        </div>
      </div>

      {/* New Stock Transfer Modal */}
      <Modal open={!!modal} title="New Stock Transfer" onClose={() => setModal(null)}>
        {modal && (
          <form className="flex flex-col gap-3.5" onSubmit={handleCreateTransfer}>
            <Field label="Product">
              <select
                className={inputCls}
                value={modal.product}
                onChange={(e) => setModal({ ...modal, product: e.target.value })}
              >
                {products.map((p) => <option key={p._id} value={p._id}>{p.name} ({p.sku})</option>)}
              </select>
            </Field>
            <Field label="Source Warehouse">
              <select
                className={inputCls}
                value={modal.fromWarehouse}
                onChange={(e) => setModal({ ...modal, fromWarehouse: e.target.value })}
              >
                {warehouses.map((w) => <option key={w._id} value={w._id}>{w.name}</option>)}
              </select>
            </Field>
            <Field label="Destination Warehouse">
              <select
                className={inputCls}
                value={modal.toWarehouse}
                onChange={(e) => setModal({ ...modal, toWarehouse: e.target.value })}
              >
                {warehouses
                  .filter((w) => w._id !== modal.fromWarehouse)
                  .map((w) => <option key={w._id} value={w._id}>{w.name}</option>)}
              </select>
            </Field>
            <Field label="Transfer Quantity">
              <input
                type="number"
                min="1"
                required
                className={inputCls}
                value={modal.quantity}
                onChange={(e) => setModal({ ...modal, quantity: parseInt(e.target.value, 10) || 1 })}
              />
            </Field>
            <div className="flex justify-end gap-2 pt-3 border-t border-[var(--border-color)]">
              <Btn variant="ghost" onClick={() => setModal(null)}>Cancel</Btn>
              <Btn type="submit">Create Transfer</Btn>
            </div>
          </form>
        )}
      </Modal>

      {/* Confirmation Modal */}
      <ConfirmModal
        open={!!confirmModalData}
        title={confirmModalData?.action === 'dispatch' ? "Dispatch Shipment" : "Receive Stock Transfer"}
        message={
          confirmModalData?.action === 'dispatch'
            ? `Are you sure you want to dispatch stock transfer ${confirmModalData?.transferNumber}? This will deduct inventory from the source warehouse.`
            : `Are you sure you want to confirm receipt for stock transfer ${confirmModalData?.transferNumber}? This will add inventory to the destination warehouse.`
        }
        onConfirm={() => {
          if (confirmModalData.action === 'dispatch') {
            handleDispatch(confirmModalData.id);
          } else {
            handleReceive(confirmModalData.id);
          }
          setConfirmModalData(null);
        }}
        onCancel={() => setConfirmModalData(null)}
      />
    </div>
  );
}
