import React, { useState, useEffect, useMemo } from "react";
import { Plus, Warehouse as WarehouseIcon, Pencil, Trash2 } from "lucide-react";
import api from "../utils/api";
import { Btn, Modal, Field, inputCls, ConfirmModal } from "../components/SharedComponents";

export default function WarehousesPage() {
  const [warehouses, setWarehouses] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [modal, setModal] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchAllData = async () => {
    try {
      const [whRes, invRes] = await Promise.all([
        api.get("/warehouses"),
        api.get("/inventory"),
      ]);
      setWarehouses(whRes.data.data);
      setInventory(invRes.data.data);
    } catch (err) {
      console.error("Failed to load warehouses data:", err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, []);

  const stockByWh = useMemo(() => {
    const map = {};
    inventory.forEach((i) => {
      const whId = i.warehouseId?._id || i.warehouseId;
      if (whId) {
        map[whId] = (map[whId] || 0) + i.quantity;
      }
    });
    return map;
  }, [inventory]);

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      if (modal._id) {
        await api.put(`/warehouses/${modal._id}`, modal);
      } else {
        await api.post("/warehouses", modal);
      }
      setModal(null);
      fetchAllData();
    } catch (err) {
      alert(err.response?.data?.message || "Failed to save warehouse");
    }
  };

  const handleDelete = async (id) => {
    try {
      await api.delete(`/warehouses/${id}`);
      fetchAllData();
    } catch (err) {
      alert(err.response?.data?.message || "Failed to delete warehouse");
    }
  };

  if (loading) return <div className="text-[var(--text-muted)] text-sm">Loading locations...</div>;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-[var(--text-primary)]">Warehouses &amp; Storage Locations</h1>
          <p className="text-xs text-[var(--text-muted)] mt-0.5">{warehouses.length} physical distribution centers and hubs.</p>
        </div>
        <Btn onClick={() => setModal({ name: "", location: "" })}>
          <Plus size={15} /> Add Warehouse
        </Btn>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {warehouses.map((w) => (
          <div key={w._id} className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl p-4 flex flex-col gap-2.5 shadow-sm hover:border-[var(--accent-color)]/30 transition">
            <div className="flex items-center justify-between pb-2 border-b border-[var(--border-color)]">
              <h3 className="font-bold text-sm text-[var(--text-primary)] flex items-center gap-2">
                <WarehouseIcon size={16} className="text-[var(--accent-color)]" /> {w.name}
              </h3>
              <div className="flex gap-1">
                <Btn size="sm" variant="ghost" onClick={() => setModal(w)}><Pencil size={12} /></Btn>
                <Btn size="sm" variant="danger" onClick={() => setDeleteConfirm(w._id)}><Trash2 size={12} /></Btn>
              </div>
            </div>
            <p className="text-xs text-[var(--text-secondary)]">{w.location || "Central Storage Hub"}</p>
            <div className="text-xs text-[var(--text-muted)] font-mono pt-1">
              Stock on hand: <span className="text-[var(--text-primary)] font-bold font-sans">{stockByWh[w._id] || 0} units</span>
            </div>
          </div>
        ))}
        {warehouses.length === 0 && (
          <div className="col-span-full py-12 text-center text-xs text-[var(--text-muted)]">
            No warehouses configured. Click Add Warehouse above.
          </div>
        )}
      </div>

      <Modal open={!!modal} title={modal?._id ? "Edit Warehouse" : "Add Warehouse"} onClose={() => setModal(null)}>
        {modal && (
          <form className="flex flex-col gap-3.5" onSubmit={handleSave}>
            <Field label="Warehouse Name">
              <input
                required
                className={inputCls}
                value={modal.name}
                onChange={(e) => setModal({ ...modal, name: e.target.value })}
                placeholder="e.g. Instastock Central Warehouse"
              />
            </Field>
            <Field label="Physical Location / City">
              <input
                required
                className={inputCls}
                value={modal.location}
                onChange={(e) => setModal({ ...modal, location: e.target.value })}
                placeholder="e.g. Industrial Park, Chennai"
              />
            </Field>
            <div className="flex justify-end gap-2 pt-3 border-t border-[var(--border-color)]">
              <Btn variant="ghost" onClick={() => setModal(null)}>Cancel</Btn>
              <Btn type="submit">Save Warehouse</Btn>
            </div>
          </form>
        )}
      </Modal>

      <ConfirmModal
        open={!!deleteConfirm}
        title="Delete Warehouse"
        message="Are you sure you want to delete this warehouse? This action cannot be undone."
        onConfirm={() => {
          handleDelete(deleteConfirm);
          setDeleteConfirm(null);
        }}
        onCancel={() => setDeleteConfirm(null)}
      />
    </div>
  );
}
