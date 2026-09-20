import React, { useState, useEffect, useMemo } from "react";
import { Plus, Pencil, Trash2 } from "lucide-react";
import api from "../utils/api";
import { Btn, Modal, Field, inputCls, ConfirmModal, Pagination } from "../components/SharedComponents";

export default function PartyPage({ type }) {
  const [list, setList] = useState([]);
  const [modal, setModal] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [loading, setLoading] = useState(true);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const title = type === "supplier" ? "Suppliers" : "Customers";
  const fields = type === "supplier" 
    ? ["name", "email", "phone", "address"] 
    : ["name", "email", "phone"];

  const fetchParties = async () => {
    try {
      const res = await api.get(`/parties?type=${type}`);
      setList(res.data.data);
    } catch (err) {
      console.error(`Failed to load ${type} records:`, err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchParties();
    setCurrentPage(1);
  }, [type]);

  // Paginated List
  const paginatedList = useMemo(() => {
    const start = (currentPage - 1) * rowsPerPage;
    return list.slice(start, start + rowsPerPage);
  }, [list, currentPage, rowsPerPage]);

  const totalPages = Math.ceil(list.length / rowsPerPage);

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      const payload = { ...modal, type };
      if (modal._id) {
        await api.put(`/parties/${modal._id}`, payload);
      } else {
        await api.post("/parties", payload);
      }
      setModal(null);
      fetchParties();
    } catch (err) {
      alert(err.response?.data?.message || "Failed to save record");
    }
  };

  const handleDelete = async (id) => {
    try {
      await api.delete(`/parties/${id}`);
      fetchParties();
    } catch (err) {
      alert(err.response?.data?.message || "Failed to delete record");
    }
  };

  if (loading) return <div className="text-[var(--text-muted)] text-sm">Loading records...</div>;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-[var(--text-primary)]">{title} Directory</h1>
          <p className="text-xs text-[var(--text-muted)] mt-0.5">{list.length} active {title.toLowerCase()} recorded in system.</p>
        </div>
        <Btn onClick={() => setModal(Object.fromEntries(fields.map((f) => [f, ""])))}>
          <Plus size={15} /> Add {title.slice(0, -1)}
        </Btn>
      </div>

      <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left min-w-[700px] border-collapse">
            <thead>
              <tr className="bg-[var(--table-header)] text-[var(--text-muted)] border-b border-[var(--border-color)] font-semibold">
                {fields.map((f) => <th key={f} className="py-3 px-4 capitalize">{f}</th>)}
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-color)]">
              {paginatedList.map((item) => (
                <tr key={item._id} className="hover:bg-[var(--table-row-hover)] transition">
                  {fields.map((f) => (
                    <td key={f} className={`py-3.5 px-4 ${f === "name" ? "font-semibold text-[var(--text-primary)]" : "text-[var(--text-secondary)]"}`}>
                      {item[f] || "—"}
                    </td>
                  ))}
                  <td className="py-3.5 px-4 text-right">
                    <div className="flex justify-end gap-1.5">
                      <Btn size="sm" variant="ghost" onClick={() => setModal(item)}><Pencil size={12} /></Btn>
                      <Btn size="sm" variant="danger" onClick={() => setDeleteConfirm(item._id)}><Trash2 size={12} /></Btn>
                    </div>
                  </td>
                </tr>
              ))}
              {paginatedList.length === 0 && (
                <tr>
                  <td colSpan={fields.length + 1} className="py-12 text-center text-xs text-[var(--text-muted)]">
                    No {title.toLowerCase()} found. Click Add {title.slice(0, -1)} to create one.
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
            totalItems={list.length}
            rowsPerPage={rowsPerPage}
            onPageChange={setCurrentPage}
            onRowsPerPageChange={(n) => {
              setRowsPerPage(n);
              setCurrentPage(1);
            }}
          />
        </div>
      </div>

      <Modal open={!!modal} title={modal?._id ? `Edit ${title.slice(0, -1)}` : `Add ${title.slice(0, -1)}`} onClose={() => setModal(null)}>
        {modal && (
          <form className="flex flex-col gap-3.5" onSubmit={handleSave}>
            {fields.map((f) => (
              <Field key={f} label={f[0].toUpperCase() + f.slice(1)}>
                <input
                  required={f === "name"}
                  className={inputCls}
                  value={modal[f] || ""}
                  onChange={(e) => setModal({ ...modal, [f]: e.target.value })}
                  placeholder={`Enter ${f}...`}
                />
              </Field>
            ))}
            <div className="flex justify-end gap-2 pt-3 border-t border-[var(--border-color)]">
              <Btn variant="ghost" onClick={() => setModal(null)}>Cancel</Btn>
              <Btn type="submit">Save</Btn>
            </div>
          </form>
        )}
      </Modal>

      <ConfirmModal
        open={!!deleteConfirm}
        title={`Delete ${title.slice(0, -1)}`}
        message={`Are you sure you want to delete this ${type}? This action cannot be undone.`}
        onConfirm={() => {
          handleDelete(deleteConfirm);
          setDeleteConfirm(null);
        }}
        onCancel={() => setDeleteConfirm(null)}
      />
    </div>
  );
}
