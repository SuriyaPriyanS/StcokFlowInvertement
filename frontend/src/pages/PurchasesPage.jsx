import React, { useState, useEffect, useMemo } from "react";
import { Plus, CheckCircle2, ShieldAlert, PackageOpen, HelpCircle } from "lucide-react";
import api from "../utils/api";
import { money } from "../utils/money";
import { Btn, Modal, StatusBadge, Card, ConfirmModal, Pagination } from "../components/SharedComponents";
import OrderForm from "../components/OrderForm";

export default function PurchasesPage() {
  const [orders, setOrders] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [products, setProducts] = useState([]);
  const [modal, setModal] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  
  // Confirmation state
  const [confirmModalData, setConfirmModalData] = useState(null);

  const fetchAllData = async () => {
    try {
      const [orderRes, supRes, whRes, prodRes] = await Promise.all([
        api.get("/orders?type=PURCHASE"),
        api.get("/parties?type=supplier"),
        api.get("/warehouses"),
        api.get("/products"),
      ]);
      setOrders(orderRes.data.data);
      setSuppliers(supRes.data.data);
      setWarehouses(whRes.data.data);
      setProducts(prodRes.data.data);
    } catch (err) {
      console.error("Failed to load PO page data:", err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, []);

  // Compute stats for top mini cards
  const stats = useMemo(() => {
    const totalCount = orders.length;
    const pendingCount = orders.filter((o) => o.status === "PENDING").length;
    const outlay = orders
      .filter((o) => o.status !== "CANCELLED")
      .reduce((sum, o) => sum + o.items.reduce((s, i) => s + i.quantity * i.price, 0), 0);
    return { totalCount, pendingCount, outlay };
  }, [orders]);

  // Paginated Orders
  const paginatedOrders = useMemo(() => {
    const start = (currentPage - 1) * rowsPerPage;
    return orders.slice(start, start + rowsPerPage);
  }, [orders, currentPage, rowsPerPage]);

  const totalPages = Math.ceil(orders.length / rowsPerPage);

  const handleCreatePO = async (payload) => {
    try {
      await api.post("/orders/purchase", payload);
      setModal(null);
      fetchAllData();
    } catch (err) {
      alert(err.response?.data?.message || "Failed to create PO");
    }
  };

  const handleApprove = async (id) => {
    try {
      await api.put(`/orders/purchase/${id}/approve`);
      fetchAllData();
    } catch (err) {
      alert(err.response?.data?.message || "Failed to approve PO");
    }
  };

  const handleReceive = async (id) => {
    try {
      await api.put(`/orders/purchase/${id}/receive`);
      fetchAllData();
    } catch (err) {
      alert(err.response?.data?.message || "Failed to receive goods");
    }
  };

  if (loading) return <div className="text-[var(--text-muted)] text-sm">Loading purchase orders...</div>;

  return (
    <div className="flex flex-col gap-5">
      {/* Header Section */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-[var(--text-primary)]">Purchase Orders</h1>
          <p className="text-xs text-[var(--text-muted)] mt-0.5">Manage vendor procurements, track approvals, and record stock receipts.</p>
        </div>
        <Btn onClick={() => setModal({
          supplier: suppliers[0]?._id || "",
          warehouse: warehouses[0]?._id || "",
          items: [{ product: products[0]?._id || "", quantity: 1, price: products[0]?.costPrice || 0 }]
        })}>
          <Plus size={15} /> New Purchase Order
        </Btn>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
        <Card title="Total Purchase Orders" value={stats.totalCount} />
        <Card title="Pending Approvals" value={stats.pendingCount} tone={stats.pendingCount ? "warn" : "default"} />
        <Card title="Total Procurement Outlay" value={money(stats.outlay)} tone="good" />
      </div>

      {/* PO Table */}
      <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left min-w-[800px] border-collapse">
            <thead>
              <tr className="bg-[var(--table-header)] text-[var(--text-muted)] border-b border-[var(--border-color)] font-semibold">
                <th className="py-3 px-4">PO Number</th>
                <th className="py-3 px-4">Supplier</th>
                <th className="py-3 px-4">Destination Warehouse</th>
                <th className="py-3 px-4">Line Items</th>
                <th className="py-3 px-4">Total Amount</th>
                <th className="py-3 px-4">Order Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-color)]">
              {paginatedOrders.map((po) => {
                const total = po.items.reduce((s, i) => s + i.quantity * i.price, 0);
                return (
                  <tr key={po._id} className="hover:bg-[var(--table-row-hover)] transition">
                    <td className="py-3.5 px-4 font-mono text-[var(--text-primary)] font-bold">{po.orderNumber}</td>
                    <td className="py-3.5 px-4 font-semibold text-[var(--text-primary)]">{po.party?.name || "—"}</td>
                    <td className="py-3.5 px-4 text-[var(--text-secondary)] font-medium">{po.warehouse?.name || "—"}</td>
                    <td className="py-3.5 px-4 text-[var(--text-muted)] font-mono">{po.items.length} item(s)</td>
                    <td className="py-3.5 px-4 text-[var(--text-primary)] font-mono font-bold">{money(total)}</td>
                    <td className="py-3.5 px-4"><StatusBadge status={po.status} /></td>
                    <td className="py-3.5 px-4">
                      <div className="flex justify-end gap-2 items-center">
                        {po.status === "PENDING" && (
                          <Btn size="sm" variant="subtle" onClick={() => setConfirmModalData({ id: po._id, action: 'approve', orderNumber: po.orderNumber })}>
                            <ShieldAlert size={12} /> Approve
                          </Btn>
                        )}
                        {po.status === "APPROVED" && (
                          <Btn size="sm" onClick={() => setConfirmModalData({ id: po._id, action: 'receive', orderNumber: po.orderNumber })}>
                            <PackageOpen size={12} /> Receive Goods
                          </Btn>
                        )}
                        {po.status === "RECEIVED" && <CheckCircle2 size={16} className="text-emerald-500" />}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {paginatedOrders.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-[var(--text-muted)]">
                    No purchase orders found. Click New Purchase Order above to create one.
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
            totalItems={orders.length}
            rowsPerPage={rowsPerPage}
            onPageChange={setCurrentPage}
            onRowsPerPageChange={(n) => {
              setRowsPerPage(n);
              setCurrentPage(1);
            }}
          />
        </div>
      </div>

      {/* New Purchase Order Modal */}
      <Modal open={!!modal} title="New Purchase Order" onClose={() => setModal(null)} wide>
        {modal && (
          <OrderForm
            entity={modal}
            products={products}
            partyOptions={suppliers}
            partyLabel="Supplier"
            warehouses={warehouses}
            priceKey="price"
            priceSource="costPrice"
            onSave={handleCreatePO}
            onCancel={() => setModal(null)}
          />
        )}
      </Modal>

      {/* Confirmation Modal */}
      <ConfirmModal
        open={!!confirmModalData}
        title={confirmModalData?.action === 'approve' ? "Approve Purchase Order" : "Receive Procurement Goods"}
        message={
          confirmModalData?.action === 'approve'
            ? `Are you sure you want to approve Purchase Order ${confirmModalData?.orderNumber}?`
            : `Are you sure you want to confirm receipt of goods for Purchase Order ${confirmModalData?.orderNumber}? This will increase inventory levels in the selected warehouse.`
        }
        onConfirm={() => {
          if (confirmModalData.action === 'approve') {
            handleApprove(confirmModalData.id);
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
