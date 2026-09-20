import React, { useState, useEffect, useMemo } from "react";
import { Plus, CheckCircle2, XCircle, CreditCard, Ban, ThumbsUp } from "lucide-react";
import api from "../utils/api";
import { money } from "../utils/money";
import { Btn, Modal, StatusBadge, Field, inputCls, Card, ConfirmModal, Pagination } from "../components/SharedComponents";
import OrderForm from "../components/OrderForm";

export default function SalesPage() {
  const [orders, setOrders] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [products, setProducts] = useState([]);
  const [modal, setModal] = useState(null);
  const [paymentModal, setPaymentModal] = useState(null);
  const [cardDetails, setCardDetails] = useState({ number: "4242 4242 4242 4242", expiry: "12/28", cvc: "123" });
  const [loading, setLoading] = useState(true);
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  
  // Confirmation state
  const [confirmModalData, setConfirmModalData] = useState(null);

  const fetchAllData = async () => {
    try {
      const [orderRes, custRes, whRes, prodRes] = await Promise.all([
        api.get("/orders?type=SALE"),
        api.get("/parties?type=customer"),
        api.get("/warehouses"),
        api.get("/products"),
      ]);
      setOrders(orderRes.data.data);
      setCustomers(custRes.data.data);
      setWarehouses(whRes.data.data);
      setProducts(prodRes.data.data);
    } catch (err) {
      console.error("Failed to load SO page data:", err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, []);

  // Compute Sales stats for top mini cards
  const stats = useMemo(() => {
    const totalCount = orders.length;
    const revenue = orders
      .filter((o) => o.status === "CONFIRMED")
      .reduce((sum, o) => sum + o.items.reduce((s, i) => s + i.quantity * i.price, 0), 0);
    const unpaidCount = orders.filter((o) => o.status !== "CANCELLED" && o.paymentStatus === "UNPAID").length;
    return { totalCount, revenue, unpaidCount };
  }, [orders]);

  // Paginated Orders
  const paginatedOrders = useMemo(() => {
    const start = (currentPage - 1) * rowsPerPage;
    return orders.slice(start, start + rowsPerPage);
  }, [orders, currentPage, rowsPerPage]);

  const totalPages = Math.ceil(orders.length / rowsPerPage);

  const handleCreateSO = async (payload) => {
    try {
      await api.post("/orders/sales", payload);
      setModal(null);
      fetchAllData();
    } catch (err) {
      alert(err.response?.data?.message || "Failed to create SO");
    }
  };

  const handleConfirm = async (id) => {
    try {
      await api.put(`/orders/sales/${id}/confirm`);
      fetchAllData();
    } catch (err) {
      alert(err.response?.data?.message || "Failed to confirm SO");
    }
  };

  const handleCancel = async (id) => {
    try {
      await api.put(`/orders/sales/${id}/cancel`);
      fetchAllData();
    } catch (err) {
      alert(err.response?.data?.message || "Failed to cancel SO");
    }
  };

  const handleStartPayment = async (order) => {
    try {
      const res = await api.post("/payments/create-intent", { orderId: order._id });
      setPaymentModal({
        order,
        clientSecret: res.data.clientSecret,
        amount: res.data.amount,
      });
    } catch (err) {
      alert(err.response?.data?.message || "Failed to initiate payment");
    }
  };

  const handleProcessPayment = async (e) => {
    e.preventDefault();
    try {
      await api.post("/payments/confirm-mock-payment", {
        orderId: paymentModal.order._id,
        transactionId: `ch_stripe_${Math.random().toString(36).substring(2, 9)}`,
      });
      setPaymentModal(null);
      fetchAllData();
    } catch (err) {
      alert(err.response?.data?.message || "Payment process failed");
    }
  };

  if (loading) return <div className="text-[var(--text-muted)] text-sm">Loading sales orders...</div>;

  return (
    <div className="flex flex-col gap-5">
      {/* Page Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-[var(--text-primary)]">Sales Orders</h1>
          <p className="text-xs text-[var(--text-muted)] mt-0.5">Manage client orders, process payments, and approve shipment transfers.</p>
        </div>
        <Btn onClick={() => setModal({
          customer: customers[0]?._id || "",
          warehouse: warehouses[0]?._id || "",
          items: [{ product: products[0]?._id || "", quantity: 1, price: products[0]?.sellingPrice || 0 }]
        })}>
          <Plus size={15} /> New Sales Order
        </Btn>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
        <Card title="Total Sales Orders" value={stats.totalCount} />
        <Card title="Confirmed Revenue" value={money(stats.revenue)} tone="good" />
        <Card title="Unpaid Orders" value={stats.unpaidCount} tone={stats.unpaidCount ? "warn" : "default"} />
      </div>

      {/* Orders Table */}
      <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left min-w-[850px] border-collapse">
            <thead>
              <tr className="bg-[var(--table-header)] text-[var(--text-muted)] border-b border-[var(--border-color)] font-semibold">
                <th className="py-3 px-4">Order Number</th>
                <th className="py-3 px-4">Customer</th>
                <th className="py-3 px-4">Source Warehouse</th>
                <th className="py-3 px-4">Line Items</th>
                <th className="py-3 px-4">Total Amount</th>
                <th className="py-3 px-4">Order Status</th>
                <th className="py-3 px-4">Payment Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-color)]">
              {paginatedOrders.map((so) => {
                const total = so.items.reduce((s, i) => s + i.quantity * i.price, 0);
                return (
                  <tr key={so._id} className="hover:bg-[var(--table-row-hover)] transition">
                    <td className="py-3.5 px-4 font-mono text-[var(--text-primary)] font-bold">{so.orderNumber}</td>
                    <td className="py-3.5 px-4 font-semibold text-[var(--text-primary)]">{so.party?.name || "—"}</td>
                    <td className="py-3.5 px-4 text-[var(--text-secondary)] font-medium">{so.warehouse?.name || "—"}</td>
                    <td className="py-3.5 px-4 text-[var(--text-muted)] font-mono">{so.items.length} item(s)</td>
                    <td className="py-3.5 px-4 text-[var(--text-primary)] font-mono font-bold">{money(total)}</td>
                    <td className="py-3.5 px-4"><StatusBadge status={so.status} /></td>
                    <td className="py-3.5 px-4">
                      <StatusBadge status={so.paymentStatus} />
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex justify-end gap-1.5 items-center">
                        {so.status === "PENDING" && (
                          <>
                            <Btn size="sm" onClick={() => setConfirmModalData({ id: so._id, action: 'confirm', orderNumber: so.orderNumber })}>
                              <ThumbsUp size={12} /> Confirm
                            </Btn>
                            <Btn size="sm" variant="danger" onClick={() => setConfirmModalData({ id: so._id, action: 'cancel', orderNumber: so.orderNumber })}>
                              <Ban size={12} /> Cancel
                            </Btn>
                          </>
                        )}
                        {so.status === "CONFIRMED" && <CheckCircle2 size={16} className="text-emerald-500" />}
                        {so.status === "CANCELLED" && <XCircle size={16} className="text-rose-500" />}
                        
                        {so.status !== "CANCELLED" && so.paymentStatus === "UNPAID" && (
                          <Btn size="sm" variant="subtle" onClick={() => handleStartPayment(so)}>
                            <CreditCard size={13} /> Pay
                          </Btn>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {paginatedOrders.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-[var(--text-muted)]">
                    No sales orders found. Click New Sales Order to register an invoice.
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

      {/* New Sales Order Modal */}
      <Modal open={!!modal} title="New Sales Order" onClose={() => setModal(null)} wide>
        {modal && (
          <OrderForm
            entity={modal}
            products={products}
            partyOptions={customers}
            partyLabel="Customer"
            warehouses={warehouses}
            priceKey="price"
            priceSource="sellingPrice"
            onSave={handleCreateSO}
            onCancel={() => setModal(null)}
          />
        )}
      </Modal>

      {/* Stripe Payment Modal */}
      <Modal open={!!paymentModal} title="Stripe Secure Payment Simulation" onClose={() => setPaymentModal(null)}>
        {paymentModal && (
          <form className="flex flex-col gap-4 text-xs" onSubmit={handleProcessPayment}>
            <div className="bg-[var(--bg-main)] p-3 rounded-xl border border-[var(--border-color)] font-mono text-xs flex flex-col gap-1">
              <span className="text-[var(--text-muted)]">ORDER NUMBER:</span>
              <span className="text-[var(--text-primary)] font-bold">{paymentModal.order.orderNumber}</span>
              <span className="text-[var(--text-muted)] mt-2">TOTAL AMOUNT DUE:</span>
              <span className="text-[var(--accent-color)] text-sm font-bold">{money(paymentModal.amount)}</span>
            </div>

            <div className="flex flex-col gap-3">
              <Field label="Card Number">
                <input 
                  required
                  className={inputCls} 
                  value={cardDetails.number}
                  onChange={(e) => setCardDetails({ ...cardDetails, number: e.target.value })}
                />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Expiry Date">
                  <input 
                    required 
                    className={inputCls} 
                    placeholder="MM/YY" 
                    value={cardDetails.expiry}
                    onChange={(e) => setCardDetails({ ...cardDetails, expiry: e.target.value })}
                  />
                </Field>
                <Field label="CVC">
                  <input 
                    required 
                    className={inputCls} 
                    maxLength={3} 
                    value={cardDetails.cvc}
                    onChange={(e) => setCardDetails({ ...cardDetails, cvc: e.target.value })}
                  />
                </Field>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-[var(--border-color)]">
              <Btn variant="ghost" onClick={() => setPaymentModal(null)}>Cancel</Btn>
              <Btn type="submit">Submit Payment</Btn>
            </div>
          </form>
        )}
      </Modal>

      {/* Confirmation Modal */}
      <ConfirmModal
        open={!!confirmModalData}
        title={confirmModalData?.action === 'confirm' ? "Confirm Sales Order" : "Cancel Sales Order"}
        message={
          confirmModalData?.action === 'confirm'
            ? `Are you sure you want to confirm Sales Order ${confirmModalData?.orderNumber}? This will reserve the corresponding inventory stock.`
            : `Are you sure you want to cancel Sales Order ${confirmModalData?.orderNumber}? This action cannot be undone.`
        }
        onConfirm={() => {
          if (confirmModalData.action === 'confirm') {
            handleConfirm(confirmModalData.id);
          } else {
            handleCancel(confirmModalData.id);
          }
          setConfirmModalData(null);
        }}
        onCancel={() => setConfirmModalData(null)}
      />
    </div>
  );
}
