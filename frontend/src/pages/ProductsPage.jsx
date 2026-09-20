import React, { useState, useEffect, useMemo } from "react";
import {
  Plus, Search, Pencil, Trash2, Image as ImageIcon, AlertCircle, FileText,
  ChevronLeft, ChevronRight, X, LayoutGrid, List
} from "lucide-react";
import { useForm } from "react-hook-form";
import api from "../utils/api";
import { money } from "../utils/money";
import {
  Btn,
  Modal,
  Badge,
  StatusBadge,
  Field,
  inputCls,
  ConfirmModal,
  Pagination,
} from "../components/SharedComponents";

function emptyProduct() {
  return {
    name: "",
    sku: "",
    barcode: "",
    category: "",
    brand: "",
    costPrice: 0,
    sellingPrice: 0,
    tax: 18,
    unit: "piece",
    minimumStock: 0,
    maximumStock: 0,
    reorderLevel: 0,
    status: "active",
    imageUrl: "",
    imageUrls: [],
  };
}

export default function ProductsPage() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [search, setSearch] = useState("");
  const [catFilter, setCatFilter] = useState("");
  const [modal, setModal] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [viewCarouselProduct, setViewCarouselProduct] = useState(null);
  const [viewMode, setViewMode] = useState("table");
  const [loading, setLoading] = useState(true);

  // Pagination state
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const fetchAllData = async () => {
    try {
      const [prodRes, catRes, invRes] = await Promise.all([
        api.get("/products"),
        api.get("/categories"),
        api.get("/inventory"),
      ]);
      setProducts(prodRes.data.data || []);
      setCategories(catRes.data.data || []);
      setInventory(invRes.data.data || []);
    } catch (e) {
      console.error("Failed to load products list:", e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, []);

  // Reset pagination on search or filter change
  useEffect(() => {
    setPage(1);
  }, [search, catFilter]);

  const stockByProduct = useMemo(() => {
    const map = {};
    inventory.forEach((i) => {
      const pId = i.productId?._id || i.productId;
      if (pId) map[pId] = (map[pId] || 0) + i.quantity;
    });
    return map;
  }, [inventory]);

  const filtered = useMemo(() => {
    return products.filter((p) => {
      const matchesSearch = (p.name + p.sku + (p.brand || ""))
        .toLowerCase()
        .includes(search.toLowerCase());
      const catId = p.category?._id || p.category;
      const matchesCat = !catFilter || catId === catFilter;
      return matchesSearch && matchesCat;
    });
  }, [products, search, catFilter]);

  const totalPages = Math.ceil(filtered.length / pageSize) || 1;
  const paginatedProducts = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, page, pageSize]);

  const handleSave = async (data) => {
    try {
      const formData = new FormData();
      const existingUrls = data.imageUrls || [];
      formData.append("imageUrls", JSON.stringify(existingUrls));

      Object.keys(data).forEach((key) => {
        if (key === "category" && typeof data[key] === "object") {
          formData.append(key, data[key]?._id || "");
        } else if (key === "imageFiles" || key === "imageUrls" || key === "imageUrl") {
          // Handled separately
        } else {
          formData.append(key, data[key]);
        }
      });

      if (data.imageFiles && data.imageFiles.length > 0) {
        Array.from(data.imageFiles).forEach((file) => {
          formData.append("images", file);
        });
      }

      if (data._id) {
        await api.put(`/products/${data._id}`, formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
      } else {
        await api.post("/products", formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
      }
      setModal(null);
      fetchAllData();
    } catch (err) {
      alert(err.response?.data?.message || "Failed to save product");
    }
  };

  const handleDelete = async (id) => {
    try {
      await api.delete(`/products/${id}`);
      fetchAllData();
    } catch (err) {
      alert(err.response?.data?.message || "Failed to delete product");
    }
  };

  if (loading)
    return <div className="text-[var(--text-muted)] text-sm p-4">Loading products...</div>;

  return (
    <div className="flex flex-col gap-4 text-[var(--text-primary)]">
      {/* Header bar */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-xl font-bold text-[var(--text-primary)] tracking-tight">Products</h1>
          <p className="text-xs text-[var(--text-muted)] font-mono mt-0.5">
            {filtered.length} of {products.length} products listed
          </p>
        </div>
        <Btn
          onClick={() => {
            setModal(emptyProduct());
          }}
        >
          <Plus size={15} /> Add Product
        </Btn>
      </div>

      {/* Filter and View Layout mode toggles */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex gap-2 flex-wrap items-center">
          <div className="relative w-64">
            <Search
              size={14}
              className="absolute left-2.5 top-2.5 text-[var(--text-muted)]"
            />
            <input
              className={`${inputCls} pl-8`}
              placeholder="Search name, SKU, brand…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="w-48">
            <select
              className={inputCls}
              value={catFilter}
              onChange={(e) => setCatFilter(e.target.value)}
            >
              <option value="">All categories</option>
              {categories.map((c) => (
                <option key={c._id} value={c._id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* View Mode controls */}
        <div className="flex bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg p-0.5 shrink-0 shadow-sm">
          <button
            onClick={() => setViewMode("table")}
            className={`p-1.5 rounded transition ${
              viewMode === "table"
                ? "bg-[var(--accent-color)]/15 text-[var(--accent-color)] font-medium border border-[var(--accent-color)]/30"
                : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
            }`}
            title="List Table view"
          >
            <List size={15} />
          </button>
          <button
            onClick={() => setViewMode("grid")}
            className={`p-1.5 rounded transition ${
              viewMode === "grid"
                ? "bg-[var(--accent-color)]/15 text-[var(--accent-color)] font-medium border border-[var(--accent-color)]/30"
                : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
            }`}
            title="Image Grid view"
          >
            <LayoutGrid size={15} />
          </button>
        </div>
      </div>

      {/* Conditionally render selected view mode */}
      {viewMode === "table" ? (
        <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl overflow-hidden shadow-sm flex flex-col">
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[800px]">
              <thead>
                <tr className="text-left bg-[var(--table-header)] text-[var(--text-secondary)] border-b border-[var(--border-color)] text-xs uppercase font-semibold tracking-wider">
                  <th className="py-2.5 px-3 font-semibold">Image</th>
                  <th className="py-2.5 px-3 font-semibold">Product</th>
                  <th className="py-2.5 px-3 font-semibold">SKU</th>
                  <th className="py-2.5 px-3 font-semibold">Category</th>
                  <th className="py-2.5 px-3 font-semibold">Cost / Sell</th>
                  <th className="py-2.5 px-3 font-semibold">Stock</th>
                  <th className="py-2.5 px-3 font-semibold">Status</th>
                  <th className="py-2.5 px-3 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-color)]/60">
                {paginatedProducts.map((p) => {
                  const s = stockByProduct[p._id] || 0;
                  const hasImages = p.imageUrls && p.imageUrls.length > 0;
                  const displayImage = hasImages ? p.imageUrls[0] : p.imageUrl;

                  return (
                    <tr
                      key={p._id}
                      className="hover:bg-[var(--table-row-hover)] transition-colors"
                    >
                      <td className="py-2.5 px-3">
                        {displayImage ? (
                          <div
                            onClick={() => setViewCarouselProduct(p)}
                            className="relative group cursor-pointer hover:scale-105 transition-transform"
                            title="Click to view all images in a carousel"
                          >
                            <img
                              src={displayImage}
                              alt={p.name}
                              className="w-10 h-10 object-cover rounded-lg border border-[var(--border-color)] hover:border-[var(--accent-color)] transition-colors shadow-xs"
                            />
                            {p.imageUrls && p.imageUrls.length > 1 && (
                              <span className="absolute bottom-0 right-0 bg-slate-900/90 text-[9px] font-bold px-1 rounded text-[var(--accent-color)] border border-slate-700">
                                {p.imageUrls.length}
                              </span>
                            )}
                          </div>
                        ) : (
                          <div className="w-10 h-10 bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg flex items-center justify-center text-[var(--text-muted)]">
                            <ImageIcon size={16} />
                          </div>
                        )}
                      </td>
                      <td className="py-2.5 px-3">
                        <div className="font-semibold text-sm text-[var(--text-primary)]">{p.name}</div>
                        <div className="text-xs text-[var(--text-muted)]">{p.brand || "—"}</div>
                      </td>
                      <td className="py-2.5 px-3 font-mono text-xs text-[var(--text-secondary)] font-medium">
                        {p.sku}
                      </td>
                      <td className="py-2.5 px-3 text-xs text-[var(--text-secondary)]">
                        {p.category?.name || "—"}
                      </td>
                      <td className="py-2.5 px-3 text-xs font-mono">
                        <span className="text-[var(--text-muted)]">{money(p.costPrice)}</span>
                        <span className="mx-1 text-[var(--text-muted)]">/</span>
                        <span className="font-bold text-[var(--text-primary)]">{money(p.sellingPrice)}</span>
                      </td>
                      <td className="py-2.5 px-3">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-xs text-[var(--text-primary)]">{s}</span>
                          {s === 0 ? (
                            <Badge tone="red">OUT</Badge>
                          ) : s <= p.reorderLevel ? (
                            <Badge tone="amber">LOW</Badge>
                          ) : (
                            <Badge tone="green">OK</Badge>
                          )}
                        </div>
                      </td>
                      <td className="py-2.5 px-3">
                        <StatusBadge status={p.status} />
                      </td>
                      <td className="py-2.5 px-3">
                        <div className="flex justify-end gap-1.5">
                          <Btn
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setModal(p);
                            }}
                            title="Edit Product"
                          >
                            <Pencil size={13} />
                          </Btn>
                          <Btn
                            size="sm"
                            variant="danger"
                            onClick={() => setDeleteConfirm(p._id)}
                            title="Delete Product"
                          >
                            <Trash2 size={13} />
                          </Btn>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {paginatedProducts.length === 0 && (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-xs text-[var(--text-muted)]">
                      No products match your search or filter.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="p-3 border-t border-[var(--border-color)] bg-[var(--bg-card)]">
            <Pagination
              currentPage={page}
              totalPages={totalPages}
              totalItems={filtered.length}
              rowsPerPage={pageSize}
              onPageChange={setPage}
              onRowsPerPageChange={setPageSize}
            />
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 animate-fadeIn">
            {paginatedProducts.map((p) => {
              const s = stockByProduct[p._id] || 0;
              const hasImages = p.imageUrls && p.imageUrls.length > 0;
              const displayImage = hasImages ? p.imageUrls[0] : p.imageUrl;

              return (
                <div
                  key={p._id}
                  className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl overflow-hidden flex flex-col justify-between hover:border-[var(--accent-color)]/40 hover:shadow-md transition duration-200"
                >
                  {/* Image Section */}
                  <div
                    onClick={() => setViewCarouselProduct(p)}
                    className="relative aspect-video w-full bg-slate-900 flex items-center justify-center cursor-pointer border-b border-[var(--border-color)] group overflow-hidden"
                    title="Click to view all images in a carousel"
                  >
                    {displayImage ? (
                      <img
                        src={displayImage}
                        alt={p.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <ImageIcon size={28} className="text-slate-600" />
                    )}

                    {p.imageUrls && p.imageUrls.length > 1 && (
                      <span className="absolute bottom-2 right-2 bg-slate-950/90 text-xs font-bold px-2 py-0.5 rounded border border-slate-800 text-[var(--accent-color)] shadow">
                        {p.imageUrls.length} Photos
                      </span>
                    )}
                  </div>

                  {/* Body Details */}
                  <div className="p-4 flex-1 flex flex-col justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="font-bold text-sm text-[var(--text-primary)] tracking-tight truncate flex-1" title={p.name}>
                          {p.name}
                        </h3>
                        <StatusBadge status={p.status} />
                      </div>
                      
                      <div className="flex items-center gap-1.5 text-xs text-[var(--text-secondary)]">
                        <span className="font-medium text-[var(--accent-color)]">{p.category?.name || "—"}</span>
                        {p.brand && (
                          <>
                            <span className="text-[var(--text-muted)]">•</span>
                            <span>{p.brand}</span>
                          </>
                        )}
                      </div>

                      <div className="text-xs font-mono text-[var(--text-muted)]">
                        SKU: {p.sku}
                      </div>
                    </div>

                    {/* Stock and Price row */}
                    <div className="flex items-center justify-between border-t border-[var(--border-color)]/60 pt-3 mt-1">
                      <div>
                        <span className="block text-xs text-[var(--text-muted)] font-semibold uppercase tracking-wider">Selling Price</span>
                        <div className="text-sm font-bold font-mono text-[var(--text-primary)]">
                          {money(p.sellingPrice)}
                        </div>
                        <div className="text-xs text-[var(--text-muted)]">
                          Cost: {money(p.costPrice)}
                        </div>
                      </div>

                      <div className="text-right">
                        <span className="block text-xs text-[var(--text-muted)] font-semibold uppercase tracking-wider mb-0.5">Stock</span>
                        <div className="flex items-center gap-1.5 justify-end">
                          <span className="text-sm text-[var(--text-primary)] font-bold">{s}</span>
                          {s === 0 ? (
                            <Badge tone="red">OUT</Badge>
                          ) : s <= p.reorderLevel ? (
                            <Badge tone="amber">LOW</Badge>
                          ) : (
                            <Badge tone="green">OK</Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Actions bottom bar */}
                  <div className="bg-[var(--bg-card-hover)] px-4 py-2.5 border-t border-[var(--border-color)] flex justify-end gap-1.5">
                    <Btn
                      size="sm"
                      variant="ghost"
                      onClick={() => setModal(p)}
                    >
                      <Pencil size={12} /> Edit
                    </Btn>
                    <Btn
                      size="sm"
                      variant="danger"
                      onClick={() => setDeleteConfirm(p._id)}
                    >
                      <Trash2 size={12} /> Delete
                    </Btn>
                  </div>
                </div>
              );
            })}
            {paginatedProducts.length === 0 && (
              <div className="col-span-full py-12 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl text-center text-xs text-[var(--text-muted)]">
                No products match your search.
              </div>
            )}
          </div>

          <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl p-3 shadow-sm">
            <Pagination
              currentPage={page}
              totalPages={totalPages}
              totalItems={filtered.length}
              rowsPerPage={pageSize}
              onPageChange={setPage}
              onRowsPerPageChange={setPageSize}
            />
          </div>
        </div>
      )}

      {/* Add / Edit Modal */}
      <Modal
        open={!!modal}
        title={modal?._id ? "Edit Product" : "Add Product"}
        onClose={() => setModal(null)}
        wide
      >
        {modal && (
          <ProductForm
            product={modal}
            categories={categories}
            onSave={handleSave}
            onCancel={() => setModal(null)}
          />
        )}
      </Modal>

      {/* Lightbox Carousel Modal */}
      <Modal
        open={!!viewCarouselProduct}
        title={viewCarouselProduct ? `${viewCarouselProduct.name} - Gallery` : ""}
        onClose={() => setViewCarouselProduct(null)}
      >
        {viewCarouselProduct && (
          <ProductCarouselModal
            images={
              viewCarouselProduct.imageUrls && viewCarouselProduct.imageUrls.length > 0
                ? viewCarouselProduct.imageUrls
                : [viewCarouselProduct.imageUrl].filter(Boolean)
            }
            onClose={() => setViewCarouselProduct(null)}
          />
        )}
      </Modal>

      <ConfirmModal
        open={!!deleteConfirm}
        title="Delete Product"
        message="Are you sure you want to delete this product? This action cannot be undone."
        onConfirm={() => {
          handleDelete(deleteConfirm);
          setDeleteConfirm(null);
        }}
        onCancel={() => setDeleteConfirm(null)}
      />
    </div>
  );
}

function ProductCarouselModal({ images, onClose }) {
  const [idx, setIdx] = useState(0);

  if (!images || images.length === 0) {
    return (
      <div className="text-center text-[var(--text-muted)] py-6 text-sm">
        No images available for this product.
      </div>
    );
  }

  const handlePrev = (e) => {
    e.preventDefault();
    setIdx((prev) => (prev - 1 + images.length) % images.length);
  };

  const handleNext = (e) => {
    e.preventDefault();
    setIdx((prev) => (prev + 1) % images.length);
  };

  return (
    <div className="space-y-4">
      {/* Lightbox Frame */}
      <div className="relative aspect-[16/10] w-full bg-slate-950 rounded-xl border border-[var(--border-color)] flex items-center justify-center overflow-hidden group">
        <img
          src={images[idx]}
          alt={`Slide ${idx + 1}`}
          className="w-full h-full object-contain select-none"
        />

        {images.length > 1 && (
          <>
            <button
              onClick={handlePrev}
              className="absolute left-3 w-8 h-8 rounded-full bg-slate-900/80 border border-slate-700 hover:border-slate-500 flex items-center justify-center text-white transition shadow hover:scale-105"
            >
              <ChevronLeft size={18} />
            </button>
            <button
              onClick={handleNext}
              className="absolute right-3 w-8 h-8 rounded-full bg-slate-900/80 border border-slate-700 hover:border-slate-500 flex items-center justify-center text-white transition shadow hover:scale-105"
            >
              <ChevronRight size={18} />
            </button>
          </>
        )}

        {images.length > 1 && (
          <div className="absolute bottom-3 inset-x-0 flex items-center justify-center gap-1.5">
            {images.map((_, i) => (
              <button
                key={i}
                onClick={() => setIdx(i)}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  i === idx ? "w-5 bg-[var(--accent-color)]" : "w-1.5 bg-slate-700 hover:bg-slate-500"
                }`}
              />
            ))}
          </div>
        )}
      </div>

      <div className="flex justify-between items-center text-xs text-[var(--text-muted)] font-mono px-1">
        <span>Image {idx + 1} of {images.length}</span>
        <button
          onClick={onClose}
          className="text-[var(--accent-color)] hover:underline font-bold text-xs"
        >
          Close Preview
        </button>
      </div>
    </div>
  );
}

function ProductForm({
  product,
  categories,
  onSave,
  onCancel,
}) {
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    trigger,
    formState: { errors }
  } = useForm({
    defaultValues: {
      ...product,
      category: typeof product.category === "object" ? product.category?._id || "" : product.category || "",
      imageUrls: product.imageUrls || (product.imageUrl ? [product.imageUrl] : []),
      imageFiles: null
    }
  });

  const [carouselIdx, setCarouselIdx] = useState(0);

  const imageUrls = watch("imageUrls") || [];
  const watchedFiles = watch("imageFiles");

  const previewItems = useMemo(() => {
    const items = imageUrls.map((url, idx) => ({
      id: `existing-${idx}`,
      url,
      isExisting: true,
      index: idx
    }));

    if (watchedFiles) {
      Array.from(watchedFiles).forEach((file, idx) => {
        try {
          items.push({
            id: `new-${idx}`,
            url: URL.createObjectURL(file),
            isExisting: false,
            index: idx
          });
        } catch (e) {
          console.error(e);
        }
      });
    }
    return items;
  }, [imageUrls, watchedFiles]);

  useEffect(() => {
    if (carouselIdx >= previewItems.length && previewItems.length > 0) {
      setCarouselIdx(previewItems.length - 1);
    }
  }, [previewItems.length, carouselIdx]);

  const handlePrev = (e) => {
    e.preventDefault();
    if (previewItems.length === 0) return;
    setCarouselIdx((prev) => (prev - 1 + previewItems.length) % previewItems.length);
  };

  const handleNext = (e) => {
    e.preventDefault();
    if (previewItems.length === 0) return;
    setCarouselIdx((prev) => (prev + 1) % previewItems.length);
  };

  const handleRemoveSlide = (e, item) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (item.isExisting) {
      const nextUrls = imageUrls.filter((_, idx) => idx !== item.index);
      setValue("imageUrls", nextUrls);
      showNotice("Removed existing image");
    } else {
      if (watchedFiles) {
        const dt = new DataTransfer();
        Array.from(watchedFiles).forEach((file, idx) => {
          if (idx !== item.index) dt.items.add(file);
        });
        setValue("imageFiles", dt.files.length > 0 ? dt.files : null);
        trigger("imageFiles");
        showNotice("Removed selected file");
      }
    }
  };

  const handleFileChoose = async (e) => {
    if (e.target.files && e.target.files.length > 0) {
      const dt = new DataTransfer();
      if (watchedFiles) {
        Array.from(watchedFiles).forEach(file => dt.items.add(file));
      }
      Array.from(e.target.files).forEach(file => dt.items.add(file));
      
      setValue("imageFiles", dt.files);
      await trigger("imageFiles");
      setCarouselIdx(previewItems.length);
    }
  };

  const [notice, setNotice] = useState("");
  const showNotice = (msg) => {
    setNotice(msg);
    setTimeout(() => setNotice(""), 2000);
  };

  const activeItem = previewItems[carouselIdx] || null;

  return (
    <form
      className="grid grid-cols-2 gap-4 text-[var(--text-primary)]"
      onSubmit={handleSubmit(onSave)}
    >
      {/* Product Image Carousel Module */}
      <div className="col-span-2 bg-[var(--bg-card-hover)] p-4 border border-[var(--border-color)] rounded-xl space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider flex items-center gap-1.5">
            <ImageIcon size={14} className="text-[var(--accent-color)]" /> Product Images
            {previewItems.length > 0 && (
              <span className="text-xs text-[var(--text-muted)] font-mono">
                ({carouselIdx + 1} of {previewItems.length})
              </span>
            )}
          </label>
          
          {notice && (
            <span className="text-xs text-[var(--accent-color)] font-medium animate-pulse">
              {notice}
            </span>
          )}
        </div>

        {/* Carousel Frame */}
        <div className="relative aspect-[21/9] w-full bg-slate-900 rounded-lg border border-[var(--border-color)] flex items-center justify-center overflow-hidden group">
          {activeItem ? (
            <>
              <img
                src={activeItem.url}
                alt={`Slide ${carouselIdx}`}
                className="w-full h-full object-contain select-none"
              />
              
              <div className="absolute top-2 left-2 flex gap-1">
                <span className={`text-xs uppercase tracking-wider font-mono px-2 py-0.5 rounded border ${
                  activeItem.isExisting
                    ? "bg-slate-900/90 border-slate-700 text-slate-300"
                    : "bg-blue-950/90 border-blue-800 text-blue-300"
                }`}>
                  {activeItem.isExisting ? "Saved Image" : "New File"}
                </span>
              </div>

              <button
                onClick={(e) => handleRemoveSlide(e, activeItem)}
                title="Remove image from product"
                className="absolute top-2 right-2 p-1.5 bg-slate-900/90 hover:bg-rose-900/80 rounded border border-slate-700 text-slate-300 hover:text-white transition"
              >
                <X size={13} />
              </button>

              {previewItems.length > 1 && (
                <>
                  <button
                    onClick={handlePrev}
                    className="absolute left-3 w-7 h-7 rounded-full bg-slate-900/80 border border-slate-700 hover:border-slate-500 flex items-center justify-center text-white transition shadow"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <button
                    onClick={handleNext}
                    className="absolute right-3 w-7 h-7 rounded-full bg-slate-900/80 border border-slate-700 hover:border-slate-500 flex items-center justify-center text-white transition shadow"
                  >
                    <ChevronRight size={16} />
                  </button>
                </>
              )}

              {previewItems.length > 1 && (
                <div className="absolute bottom-2 inset-x-0 flex items-center justify-center gap-1.5">
                  {previewItems.map((_, idx) => (
                    <button
                      key={idx}
                      onClick={(e) => {
                        e.preventDefault();
                        setCarouselIdx(idx);
                      }}
                      className={`h-1.5 rounded-full transition-all duration-300 ${
                        idx === carouselIdx ? "w-5 bg-[var(--accent-color)]" : "w-1.5 bg-slate-600 hover:bg-slate-400"
                      }`}
                    />
                  ))}
                </div>
              )}
            </>
          ) : (
            <div className="text-[var(--text-muted)] flex flex-col items-center justify-center gap-2">
              <ImageIcon size={28} className="text-slate-500" />
              <span className="text-xs">No images attached to this product.</span>
            </div>
          )}
        </div>

        {/* Input file handler */}
        <div className="flex items-center gap-3">
          <input
            type="file"
            multiple
            accept="image/jpeg,image/jpg,image/png,image/webp,image/gif"
            className="hidden"
            id="product-images-uploader"
            onChange={handleFileChoose}
          />
          
          <label
            htmlFor="product-images-uploader"
            className="bg-[var(--bg-card)] hover:bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg px-3 py-1.5 text-xs font-semibold text-[var(--text-primary)] cursor-pointer transition inline-flex items-center gap-1.5 shrink-0 select-none shadow-xs"
          >
            <Plus size={13} className="text-[var(--accent-color)]" /> Choose Image Files
          </label>

          <span className="text-xs text-[var(--text-muted)] truncate max-w-xs">
            {previewItems.length > 0
              ? `${previewItems.length} images selected`
              : "Supports JPEG, PNG, WEBP up to 5MB each"}
          </span>

          <input
            type="hidden"
            {...register("imageFiles", {
              validate: {
                maxSize: (files) => {
                  if (!files) return true;
                  const tooLarge = Array.from(files).some(f => f.size > 5 * 1024 * 1024);
                  return !tooLarge || "All files must be under 5MB";
                },
                format: (files) => {
                  if (!files) return true;
                  const invalidFormat = Array.from(files).some(
                    f => !["image/jpeg", "image/jpg", "image/png", "image/webp", "image/gif"].includes(f.type)
                  );
                  return !invalidFormat || "Only JPG, PNG, WEBP, and GIF images are allowed";
                }
              }
            })}
          />
        </div>

        {errors.imageFiles && (
          <p className="text-xs text-rose-500 flex items-center gap-1 mt-1 font-medium">
            <AlertCircle size={12} /> {errors.imageFiles.message}
          </p>
        )}
      </div>

      <Field label="Name">
        <input
          className={inputCls}
          {...register("name", {
            required: "Product name is required",
            minLength: { value: 2, message: "Name must be at least 2 characters" }
          })}
        />
        {errors.name && (
          <p className="text-xs text-rose-500 flex items-center gap-1 mt-1">
            <AlertCircle size={12} /> {errors.name.message}
          </p>
        )}
      </Field>

      <Field label="SKU">
        <input
          className={inputCls}
          {...register("sku", {
            required: "SKU is required",
            minLength: { value: 3, message: "SKU must be at least 3 characters" }
          })}
        />
        {errors.sku && (
          <p className="text-xs text-rose-500 flex items-center gap-1 mt-1">
            <AlertCircle size={12} /> {errors.sku.message}
          </p>
        )}
      </Field>

      <Field label="Barcode">
        <input
          className={inputCls}
          {...register("barcode")}
        />
      </Field>

      <Field label="Brand">
        <input
          className={inputCls}
          {...register("brand")}
        />
      </Field>

      <Field label="Category">
        <select
          className={inputCls}
          {...register("category", { required: "Category is required" })}
        >
          <option value="">Select category</option>
          {categories.map((c) => (
            <option key={c._id} value={c._id}>
              {c.name}
            </option>
          ))}
        </select>
        {errors.category && (
          <p className="text-xs text-rose-500 flex items-center gap-1 mt-1">
            <AlertCircle size={12} /> {errors.category.message}
          </p>
        )}
      </Field>

      <Field label="Unit">
        <select
          className={inputCls}
          {...register("unit", { required: "Unit is required" })}
        >
          {["piece", "kg", "box", "litre", "pack"].map((u) => (
            <option key={u} value={u}>{u}</option>
          ))}
        </select>
      </Field>

      <Field label="Cost Price (₹)">
        <input
          type="number"
          step="0.01"
          className={inputCls}
          {...register("costPrice", {
            required: "Cost price is required",
            min: { value: 0, message: "Cost price cannot be negative" }
          })}
        />
        {errors.costPrice && (
          <p className="text-xs text-rose-500 flex items-center gap-1 mt-1">
            <AlertCircle size={12} /> {errors.costPrice.message}
          </p>
        )}
      </Field>

      <Field label="Selling Price (₹)">
        <input
          type="number"
          step="0.01"
          className={inputCls}
          {...register("sellingPrice", {
            required: "Selling price is required",
            min: { value: 0, message: "Selling price cannot be negative" }
          })}
        />
        {errors.sellingPrice && (
          <p className="text-xs text-rose-500 flex items-center gap-1 mt-1">
            <AlertCircle size={12} /> {errors.sellingPrice.message}
          </p>
        )}
      </Field>

      <Field label="Tax (%)">
        <input
          type="number"
          className={inputCls}
          {...register("tax", {
            required: "Tax percent is required",
            min: { value: 0, message: "Tax cannot be negative" },
            max: { value: 100, message: "Tax cannot exceed 100%" }
          })}
        />
        {errors.tax && (
          <p className="text-xs text-rose-500 flex items-center gap-1 mt-1">
            <AlertCircle size={12} /> {errors.tax.message}
          </p>
        )}
      </Field>

      <Field label="Status">
        <select
          className={inputCls}
          {...register("status", { required: "Status is required" })}
        >
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
      </Field>

      <Field label="Minimum Stock">
        <input
          type="number"
          className={inputCls}
          {...register("minimumStock", {
            required: "Minimum stock is required",
            min: { value: 0, message: "Stock cannot be negative" }
          })}
        />
        {errors.minimumStock && (
          <p className="text-xs text-rose-500 flex items-center gap-1 mt-1">
            <AlertCircle size={12} /> {errors.minimumStock.message}
          </p>
        )}
      </Field>

      <Field label="Maximum Stock">
        <input
          type="number"
          className={inputCls}
          {...register("maximumStock", {
            required: "Maximum stock is required",
            min: { value: 0, message: "Stock cannot be negative" }
          })}
        />
        {errors.maximumStock && (
          <p className="text-xs text-rose-500 flex items-center gap-1 mt-1">
            <AlertCircle size={12} /> {errors.maximumStock.message}
          </p>
        )}
      </Field>

      <Field label="Reorder Level">
        <input
          type="number"
          className={inputCls}
          {...register("reorderLevel", {
            required: "Reorder level is required",
            min: { value: 0, message: "Level cannot be negative" }
          })}
        />
        {errors.reorderLevel && (
          <p className="text-xs text-rose-500 flex items-center gap-1 mt-1">
            <AlertCircle size={12} /> {errors.reorderLevel.message}
          </p>
        )}
      </Field>

      <div className="col-span-2 flex justify-end gap-2 pt-3 border-t border-[var(--border-color)]">
        <Btn variant="ghost" onClick={onCancel}>
          Cancel
        </Btn>
        <Btn type="submit">Save Product</Btn>
      </div>
    </form>
  );
}
