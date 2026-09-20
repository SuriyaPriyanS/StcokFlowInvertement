import React, { useState, useEffect, useMemo } from "react";
import {
  Plus, FolderTree, Pencil, Trash2, Search, ChevronDown, ChevronRight,
  Tag, Layers, X, LayoutGrid, List
} from "lucide-react";
import api from "../utils/api";
import {
  Btn, Modal, Field, inputCls, ConfirmModal, Pagination,
} from "../components/SharedComponents";

const PAGE_SIZE_OPTIONS = [9, 18, 36];
const TABLE_PAGE_SIZE = 15;

export default function CategoriesPage() {
  const [categories, setCategories] = useState([]);
  const [modal, setModal] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState("grid");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(9);
  const [tablePage, setTablePage] = useState(1);
  const [expandedCards, setExpandedCards] = useState({});

  const fetchCategories = async () => {
    try {
      const res = await api.get("/categories");
      setCategories(res.data.data);
    } catch (err) {
      console.error("Failed to load categories:", err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchCategories(); }, []);
  useEffect(() => { setPage(1); setTablePage(1); }, [search, viewMode]);

  const topCategories = useMemo(() => categories.filter((c) => !c.parent), [categories]);
  const totalSubcats = useMemo(() => categories.filter((c) => c.parent).length, [categories]);

  const getSubcategories = (parentId) =>
    categories.filter((x) => (x.parent?._id || x.parent) === parentId);

  const filteredTop = useMemo(() => {
    const q = search.toLowerCase();
    if (!q) return topCategories;
    return topCategories.filter((c) => {
      const matchSelf = c.name.toLowerCase().includes(q);
      const matchChild = getSubcategories(c._id).some((ch) => ch.name.toLowerCase().includes(q));
      return matchSelf || matchChild;
    });
  }, [topCategories, search, categories]);

  const filteredAll = useMemo(() => {
    const q = search.toLowerCase();
    if (!q) return categories;
    return categories.filter((c) => c.name.toLowerCase().includes(q));
  }, [categories, search]);

  const totalGridPages = Math.ceil(filteredTop.length / pageSize) || 1;
  const paginatedTop = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredTop.slice(start, start + pageSize);
  }, [filteredTop, page, pageSize]);

  const totalTablePages = Math.ceil(filteredAll.length / TABLE_PAGE_SIZE) || 1;
  const paginatedAll = useMemo(() => {
    const start = (tablePage - 1) * TABLE_PAGE_SIZE;
    return filteredAll.slice(start, start + TABLE_PAGE_SIZE);
  }, [filteredAll, tablePage]);

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      if (modal._id) {
        await api.put(`/categories/${modal._id}`, modal);
      } else {
        await api.post("/categories", modal);
      }
      setModal(null);
      fetchCategories();
    } catch (err) {
      alert(err.response?.data?.message || "Failed to save category");
    }
  };

  const handleDelete = async (id) => {
    try {
      await api.delete(`/categories/${id}`);
      fetchCategories();
    } catch (err) {
      alert(err.response?.data?.message || "Failed to delete category");
    }
  };

  const toggleExpand = (id) =>
    setExpandedCards((prev) => ({ ...prev, [id]: !prev[id] }));

  if (loading)
    return (
      <div className="flex items-center justify-center py-24 text-[var(--text-muted)] text-sm gap-2">
        <div className="w-4 h-4 border-2 border-[var(--accent-color)] border-t-transparent rounded-full animate-spin" />
        Loading categories...
      </div>
    );

  return (
    <div className="flex flex-col gap-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-[var(--text-primary)] tracking-tight">Categories</h1>
          <p className="text-xs text-[var(--text-muted)] mt-0.5">
            Organise your products into categories and subcategories.
          </p>
        </div>
        <Btn onClick={() => setModal({ name: "", parent: "" })}>
          <Plus size={15} /> Add Category
        </Btn>
      </div>

      {/* Stat Pills */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {[
          { label: "Total Categories", value: categories.length, icon: <Tag size={16} />, color: "text-[var(--accent-color)]", bg: "bg-[var(--accent-color)]/10" },
          { label: "Top-Level", value: topCategories.length, icon: <FolderTree size={16} />, color: "text-emerald-400", bg: "bg-emerald-500/10" },
          { label: "Subcategories", value: totalSubcats, icon: <Layers size={16} />, color: "text-amber-400", bg: "bg-amber-500/10" },
        ].map((s) => (
          <div key={s.label} className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl p-4 flex items-center gap-3 shadow-sm">
            <div className={`${s.bg} ${s.color} p-2.5 rounded-lg`}>{s.icon}</div>
            <div>
              <div className="text-xs text-[var(--text-muted)] font-semibold uppercase tracking-wider">{s.label}</div>
              <div className="text-xl font-bold font-mono text-[var(--text-primary)] mt-0.5">{s.value}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="relative w-64">
          <Search size={14} className="absolute left-2.5 top-2.5 text-[var(--text-muted)]" />
          <input
            className={`${inputCls} pl-8 pr-8`}
            placeholder="Search categories…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && (
            <button onClick={() => setSearch("")} className="absolute right-2.5 top-2.5 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition">
              <X size={13} />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          {search && (
            <span className="text-xs text-[var(--text-muted)] font-mono">
              {viewMode === "grid" ? filteredTop.length : filteredAll.length} result{(viewMode === "grid" ? filteredTop.length : filteredAll.length) !== 1 ? "s" : ""}
            </span>
          )}
          <div className="flex bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg p-0.5 shadow-sm">
            <button
              onClick={() => setViewMode("grid")}
              className={`p-1.5 rounded transition ${viewMode === "grid" ? "bg-[var(--accent-color)]/15 text-[var(--accent-color)] border border-[var(--accent-color)]/30" : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"}`}
              title="Card Grid View"
            >
              <LayoutGrid size={15} />
            </button>
            <button
              onClick={() => setViewMode("table")}
              className={`p-1.5 rounded transition ${viewMode === "table" ? "bg-[var(--accent-color)]/15 text-[var(--accent-color)] border border-[var(--accent-color)]/30" : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"}`}
              title="Table List View"
            >
              <List size={15} />
            </button>
          </div>
        </div>
      </div>

      {/* GRID VIEW */}
      {viewMode === "grid" && (
        <>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {paginatedTop.map((c) => {
              const subs = getSubcategories(c._id);
              const isExpanded = expandedCards[c._id];
              const visibleSubs = isExpanded ? subs : subs.slice(0, 4);
              return (
                <div key={c._id} className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl overflow-hidden shadow-sm hover:border-[var(--accent-color)]/40 hover:shadow-md transition duration-200 flex flex-col">
                  {/* Card Header */}
                  <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border-color)] bg-[var(--bg-card-hover)]">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="bg-[var(--accent-color)]/10 text-[var(--accent-color)] p-1.5 rounded-lg shrink-0">
                        <FolderTree size={14} />
                      </div>
                      <span className="font-bold text-sm text-[var(--text-primary)] truncate">{c.name}</span>
                    </div>
                    <div className="flex items-center gap-1 shrink-0 ml-2">
                      <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-[var(--accent-color)]/10 text-[var(--accent-color)] border border-[var(--accent-color)]/20">
                        {subs.length} sub
                      </span>
                      <Btn size="sm" variant="ghost" onClick={() => setModal(c)}><Pencil size={11} /></Btn>
                      <Btn size="sm" variant="danger" onClick={() => setDeleteConfirm(c._id)}><Trash2 size={11} /></Btn>
                    </div>
                  </div>

                  {/* Subcategory list */}
                  <div className="flex-1 px-4 py-3 flex flex-col gap-1.5">
                    {visibleSubs.length > 0 ? (
                      visibleSubs.map((child) => (
                        <div key={child._id} className="flex items-center justify-between text-xs text-[var(--text-secondary)] pl-3 border-l-2 border-[var(--accent-color)]/30 hover:border-[var(--accent-color)] hover:text-[var(--text-primary)] group transition">
                          <span className="truncate">{child.name}</span>
                          <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition shrink-0 ml-1">
                            <button onClick={() => setModal(child)} className="text-[var(--text-muted)] hover:text-[var(--text-primary)] p-0.5 rounded transition"><Pencil size={10} /></button>
                            <button onClick={() => setDeleteConfirm(child._id)} className="text-[var(--text-muted)] hover:text-rose-500 p-0.5 rounded transition"><Trash2 size={10} /></button>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-[11px] text-[var(--text-muted)] italic py-1">No subcategories defined</div>
                    )}
                    {subs.length > 4 && (
                      <button onClick={() => toggleExpand(c._id)} className="flex items-center gap-1 text-[11px] text-[var(--accent-color)] font-semibold mt-1 hover:underline">
                        {isExpanded ? <><ChevronDown size={11} /> Show less</> : <><ChevronRight size={11} /> +{subs.length - 4} more</>}
                      </button>
                    )}
                  </div>

                  {/* Add subcategory shortcut */}
                  <div className="border-t border-[var(--border-color)] px-4 py-2">
                    <button onClick={() => setModal({ name: "", parent: c._id })} className="flex items-center gap-1 text-[11px] text-[var(--text-muted)] hover:text-[var(--accent-color)] font-medium transition">
                      <Plus size={11} /> Add subcategory
                    </button>
                  </div>
                </div>
              );
            })}

            {filteredTop.length === 0 && (
              <div className="col-span-full py-16 text-center">
                <FolderTree size={36} className="mx-auto text-[var(--text-muted)] opacity-40 mb-3" />
                <p className="text-sm text-[var(--text-muted)]">
                  {search ? `No categories match "${search}"` : "No categories yet. Click Add Category to create one."}
                </p>
              </div>
            )}
          </div>

          {/* Grid Pagination */}
          {filteredTop.length > 0 && (
            <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl p-3 shadow-sm">
              <div className="flex items-center justify-between flex-wrap gap-3 text-xs text-[var(--text-muted)]">
                <div className="flex items-center gap-2">
                  <span>
                    Showing <span className="text-[var(--text-primary)] font-bold">{(page - 1) * pageSize + 1}</span> – <span className="text-[var(--text-primary)] font-bold">{Math.min(page * pageSize, filteredTop.length)}</span> of <span className="text-[var(--text-primary)] font-bold">{filteredTop.length}</span> top-level categories
                  </span>
                  <div className="flex items-center gap-1.5 ml-2 pl-2 border-l border-[var(--border-color)]">
                    <span>Per page:</span>
                    <select
                      className="bg-[var(--input-bg)] border border-[var(--border-color)] text-[var(--text-primary)] rounded px-1.5 py-0.5 text-xs focus:outline-none"
                      value={pageSize}
                      onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}
                    >
                      {PAGE_SIZE_OPTIONS.map((n) => <option key={n} value={n}>{n}</option>)}
                    </select>
                  </div>
                </div>

                {totalGridPages > 1 && (
                  <div className="flex items-center gap-1">
                    <Btn size="sm" variant="ghost" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>‹ Prev</Btn>
                    {Array.from({ length: totalGridPages }, (_, i) => i + 1)
                      .filter((p) => p === 1 || p === totalGridPages || Math.abs(p - page) <= 1)
                      .map((p, idx, arr) => {
                        const showEllipsis = idx > 0 && p - arr[idx - 1] > 1;
                        return (
                          <React.Fragment key={p}>
                            {showEllipsis && <span className="px-1 text-[var(--text-muted)]">...</span>}
                            <button
                              onClick={() => setPage(p)}
                              className={`min-w-7 h-7 rounded text-xs font-bold transition flex items-center justify-center ${page === p ? "bg-[var(--accent-color)] text-[var(--accent-text)] shadow-sm" : "text-[var(--text-secondary)] hover:bg-[var(--bg-card-hover)] hover:text-[var(--text-primary)]"}`}
                            >
                              {p}
                            </button>
                          </React.Fragment>
                        );
                      })}
                    <Btn size="sm" variant="ghost" disabled={page >= totalGridPages} onClick={() => setPage((p) => Math.min(totalGridPages, p + 1))}>Next ›</Btn>
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}

      {/* TABLE VIEW */}
      {viewMode === "table" && (
        <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl overflow-hidden shadow-sm flex flex-col">
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[520px]">
              <thead>
                <tr className="text-left bg-[var(--table-header)] text-[var(--text-secondary)] border-b border-[var(--border-color)] text-xs uppercase font-semibold tracking-wider">
                  <th className="py-3 px-4 font-semibold">Category Name</th>
                  <th className="py-3 px-4 font-semibold">Type</th>
                  <th className="py-3 px-4 font-semibold">Parent</th>
                  <th className="py-3 px-4 font-semibold text-center">Subcategories</th>
                  <th className="py-3 px-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-color)]/60">
                {paginatedAll.map((c) => {
                  const isTop = !c.parent;
                  const subsCount = isTop ? getSubcategories(c._id).length : 0;
                  const parentName = isTop
                    ? null
                    : categories.find((p) => p._id === (c.parent?._id || c.parent))?.name;

                  return (
                    <tr key={c._id} className="hover:bg-[var(--table-row-hover)] transition-colors">
                      <td className="py-2.5 px-4">
                        <div className="flex items-center gap-2">
                          <div className={`p-1.5 rounded-lg ${isTop ? "bg-[var(--accent-color)]/10 text-[var(--accent-color)]" : "bg-amber-500/10 text-amber-400"}`}>
                            {isTop ? <FolderTree size={12} /> : <Tag size={12} />}
                          </div>
                          <span className="font-semibold text-xs text-[var(--text-primary)]">{c.name}</span>
                        </div>
                      </td>
                      <td className="py-2.5 px-4">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold border ${isTop ? "bg-[var(--accent-color)]/10 text-[var(--accent-color)] border-[var(--accent-color)]/25" : "bg-amber-500/10 text-amber-400 border-amber-500/25"}`}>
                          {isTop ? "Top-Level" : "Sub"}
                        </span>
                      </td>
                      <td className="py-2.5 px-4 text-xs text-[var(--text-muted)]">
                        {parentName ? (
                          <span className="flex items-center gap-1"><FolderTree size={11} />{parentName}</span>
                        ) : (
                          <span className="italic">—</span>
                        )}
                      </td>
                      <td className="py-2.5 px-4 text-center">
                        {isTop ? (
                          <span className="font-bold font-mono text-xs text-[var(--text-primary)]">{subsCount}</span>
                        ) : (
                          <span className="text-[var(--text-muted)] text-xs">—</span>
                        )}
                      </td>
                      <td className="py-2.5 px-4">
                        <div className="flex justify-end gap-1.5">
                          <Btn size="sm" variant="ghost" onClick={() => setModal(c)} title="Edit"><Pencil size={12} /></Btn>
                          <Btn size="sm" variant="danger" onClick={() => setDeleteConfirm(c._id)} title="Delete"><Trash2 size={12} /></Btn>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {paginatedAll.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-xs text-[var(--text-muted)]">
                      {search ? `No categories match "${search}"` : "No categories yet."}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Table Pagination */}
          <div className="p-3 border-t border-[var(--border-color)] bg-[var(--bg-card)]">
            <Pagination
              currentPage={tablePage}
              totalPages={totalTablePages}
              totalItems={filteredAll.length}
              rowsPerPage={TABLE_PAGE_SIZE}
              onPageChange={setTablePage}
            />
          </div>
        </div>
      )}

      {/* Add / Edit Modal */}
      <Modal open={!!modal} title={modal?._id ? "Edit Category" : "Add Category"} onClose={() => setModal(null)}>
        {modal && (
          <form className="flex flex-col gap-3.5" onSubmit={handleSave}>
            <Field label="Category Name">
              <input
                required
                autoFocus
                className={inputCls}
                value={modal.name}
                onChange={(e) => setModal({ ...modal, name: e.target.value })}
                placeholder="e.g. Smart Electronics"
              />
            </Field>
            <Field label="Parent Category (Optional)">
              <select
                className={inputCls}
                value={typeof modal.parent === "object" ? (modal.parent?._id || "") : (modal.parent || "")}
                onChange={(e) => setModal({ ...modal, parent: e.target.value || null })}
              >
                <option value="">None (Top-Level Category)</option>
                {topCategories
                  .filter((t) => t._id !== modal._id)
                  .map((t) => (
                    <option key={t._id} value={t._id}>{t.name}</option>
                  ))}
              </select>
            </Field>
            <div className="flex justify-end gap-2 pt-3 border-t border-[var(--border-color)]">
              <Btn variant="ghost" onClick={() => setModal(null)}>Cancel</Btn>
              <Btn type="submit">Save Category</Btn>
            </div>
          </form>
        )}
      </Modal>

      {/* Delete Confirm */}
      <ConfirmModal
        open={!!deleteConfirm}
        title="Delete Category"
        message="Are you sure you want to delete this category? Subcategories will be detached and set to top-level."
        onConfirm={() => { handleDelete(deleteConfirm); setDeleteConfirm(null); }}
        onCancel={() => setDeleteConfirm(null)}
      />
    </div>
  );
}
