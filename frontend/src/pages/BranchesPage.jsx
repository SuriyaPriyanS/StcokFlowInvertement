import React, { useState, useEffect } from "react";
import { useSelector } from "react-redux";
import { Plus, Building2, Pencil, Trash2 } from "lucide-react";
import api from "../utils/api";
import { Btn, Modal, Field, inputCls, ConfirmModal } from "../components/SharedComponents";

export default function BranchesPage() {
  const { user } = useSelector((state) => state.auth);
  const [branches, setBranches] = useState([]);
  const [modal, setModal] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchBranches = async () => {
    try {
      const res = await api.get("/branches");
      setBranches(res.data.data);
    } catch (err) {
      console.error("Failed to load branches data:", err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBranches();
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      if (modal._id) {
        await api.put(`/branches/${modal._id}`, modal);
      } else {
        await api.post("/branches", modal);
      }
      setModal(null);
      fetchBranches();
    } catch (err) {
      alert(err.response?.data?.message || "Failed to save branch");
    }
  };

  const handleDelete = async (id) => {
    try {
      await api.delete(`/branches/${id}`);
      fetchBranches();
    } catch (err) {
      alert(err.response?.data?.message || "Failed to delete branch");
    }
  };

  const canManage = ["Admin", "Manager"].includes(user?.role);
  const canDelete = user?.role === "Admin";

  if (loading) return <div className="text-[var(--text-muted)] text-sm">Loading branches...</div>;

  return (
    <div className="flex flex-col gap-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-[var(--text-primary)]">Retail Outlets &amp; Branches</h1>
          <p className="text-xs text-[var(--text-muted)] mt-0.5">{branches.length} customer-facing branches and outlets.</p>
        </div>
        {canManage && (
          <Btn onClick={() => setModal({ name: "", location: "", managerName: "", managerPhone: "" })}>
            <Plus size={15} /> Add Branch
          </Btn>
        )}
      </div>

      {/* Grid */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {branches.map((b) => (
          <div key={b._id} className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl p-4 flex flex-col gap-2.5 shadow-sm hover:border-[var(--accent-color)]/30 transition">
            <div className="flex items-center justify-between pb-2 border-b border-[var(--border-color)]">
              <h3 className="font-bold text-sm text-[var(--text-primary)] flex items-center gap-2">
                <Building2 size={16} className="text-[var(--accent-color)]" /> 
                {b.name}
              </h3>
              <div className="flex gap-1">
                {canManage && (
                  <Btn size="sm" variant="ghost" onClick={() => setModal(b)}>
                    <Pencil size={12} />
                  </Btn>
                )}
                {canDelete && (
                  <Btn size="sm" variant="danger" onClick={() => setDeleteConfirm(b._id)}>
                    <Trash2 size={12} />
                  </Btn>
                )}
              </div>
            </div>
            <p className="text-xs text-[var(--text-secondary)]">{b.location}</p>
            <div className="mt-1 flex flex-col gap-1 text-xs text-[var(--text-muted)] pt-2 border-t border-[var(--border-color)] font-mono">
              <div>Manager: <span className="text-[var(--text-primary)] font-sans font-semibold">{b.managerName || "—"}</span></div>
              <div>Phone: <span className="text-[var(--text-secondary)]">{b.managerPhone || "—"}</span></div>
            </div>
          </div>
        ))}
        {branches.length === 0 && (
          <div className="col-span-full py-12 text-center text-xs text-[var(--text-muted)]">
            No retail branches configured. Click Add Branch above.
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      <Modal open={!!modal} title={modal?._id ? "Edit Branch" : "Add Branch"} onClose={() => setModal(null)}>
        {modal && (
          <form className="flex flex-col gap-3.5" onSubmit={handleSave}>
            <Field label="Branch Name">
              <input
                required
                className={inputCls}
                value={modal.name}
                onChange={(e) => setModal({ ...modal, name: e.target.value })}
                placeholder="e.g. Retail Branch - T. Nagar"
              />
            </Field>
            <Field label="Location / City">
              <input
                required
                className={inputCls}
                value={modal.location}
                onChange={(e) => setModal({ ...modal, location: e.target.value })}
                placeholder="e.g. Chennai"
              />
            </Field>
            <Field label="Manager Name">
              <input
                required
                className={inputCls}
                value={modal.managerName}
                onChange={(e) => setModal({ ...modal, managerName: e.target.value })}
                placeholder="e.g. Kavitha Rajan"
              />
            </Field>
            <Field label="Manager Phone Number">
              <input
                required
                className={inputCls}
                value={modal.managerPhone}
                onChange={(e) => setModal({ ...modal, managerPhone: e.target.value })}
                placeholder="e.g. 9840099001"
              />
            </Field>
            <div className="flex justify-end gap-2 pt-3 border-t border-[var(--border-color)]">
              <Btn variant="ghost" onClick={() => setModal(null)}>Cancel</Btn>
              <Btn type="submit">Save Branch</Btn>
            </div>
          </form>
        )}
      </Modal>

      <ConfirmModal
        open={!!deleteConfirm}
        title="Delete Branch"
        message="Are you sure you want to delete this branch? This action cannot be undone."
        onConfirm={() => {
          handleDelete(deleteConfirm);
          setDeleteConfirm(null);
        }}
        onCancel={() => setDeleteConfirm(null)}
      />
    </div>
  );
}
