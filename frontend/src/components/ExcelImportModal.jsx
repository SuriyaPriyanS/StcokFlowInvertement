import React, { useState, useRef, useMemo } from "react";
import { useSelector } from "react-redux";
import { 
  FileSpreadsheet, Upload, Download, CheckCircle2, 
  AlertTriangle, X, RefreshCw, Layers, ArrowRight, Clock, ShieldCheck,
  Sparkles, PackagePlus, Check, Boxes, MapPin, Tag
} from "lucide-react";
import api from "../utils/api";
import { Modal, Btn, Badge } from "./SharedComponents";

export default function ExcelImportModal({ open, onClose, products = [], warehouses = [], onSuccess }) {
  const { user } = useSelector((state) => state.auth);
  const isAdmin = user?.role === "Admin";

  const fileInputRef = useRef(null);
  const [parsedRows, setParsedRows] = useState([]);
  const [fileName, setFileName] = useState("");
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const [targetWarehouseFilter, setTargetWarehouseFilter] = useState("");

  const resetModal = () => {
    setParsedRows([]);
    setFileName("");
    setImportResult(null);
    setTargetWarehouseFilter("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleClose = () => {
    resetModal();
    onClose();
  };

  // Download Sample Template
  const handleDownloadTemplate = async () => {
    const XLSX = await import("xlsx");
    const sampleData = [
      {
        "Product Name": "1200 MM FAN UTSAV ES BROWN",
        "Product Code": "1151",
        "HSNCode": "84145120",
        "Category": "FAN",
        "Location": "Theni",
        "Stock": 2,
      },
      {
        "Product Name": "AMSTRAD 80CM 32INCH HD SMART LED TV",
        "Product Code": "708",
        "HSNCode": "85287215",
        "Category": "TV",
        "Location": "Theni",
        "Stock": 2,
      },
      {
        "Product Name": "BUTTERFLY TABLE TOP GRINDER 2.0L BLOOM",
        "Product Code": "35",
        "HSNCode": "85094010",
        "Category": "GRINDER",
        "Location": "Theni",
        "Stock": 5,
      },
    ];

    const ws = XLSX.utils.json_to_sheet(sampleData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Stock_Import");
    XLSX.writeFile(wb, "StockFlow_Stock_Import_Template.xlsx");
  };

  // Handle File Upload and Smart Parsing (Header auto-detection & title skipping)
  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setImportResult(null);

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const XLSX = await import("xlsx");
        const bstr = evt.target.result;
        const wb = XLSX.read(bstr, { type: "binary" });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];

        // 1. Read as 2D Array to handle any header offsets / title rows
        const raw2D = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" });

        if (!raw2D || raw2D.length === 0) {
          alert("The uploaded sheet is empty.");
          return;
        }

        // 2. Scan for the real header row
        let headerRowIdx = -1;
        const colMap = {
          name: -1,
          sku: -1,
          hsn: -1,
          category: -1,
          warehouse: -1,
          stock: -1,
          type: -1,
          reason: -1,
          price: -1,
        };

        for (let r = 0; r < Math.min(raw2D.length, 25); r++) {
          const row = raw2D[r].map((c) => String(c || "").toLowerCase().trim());
          const hasName = row.some((c) => c.includes("product") || c.includes("item") || c.includes("name") || c.includes("description"));
          const hasStock = row.some((c) => c.includes("stock") || c.includes("qty") || c.includes("quantity") || c.includes("count") || c.includes("balance"));
          const hasSku = row.some((c) => c.includes("code") || c.includes("sku") || c.includes("barcode") || c.includes("hsn"));

          if ((hasName && hasStock) || (hasName && hasSku) || (hasSku && hasStock)) {
            headerRowIdx = r;
            raw2D[r].forEach((rawCol, idx) => {
              const c = String(rawCol || "").toLowerCase().trim();
              if (!c) return;
              if (c.includes("product name") || c === "product" || c === "name" || c === "item name" || c === "item" || c === "description") {
                if (colMap.name === -1) colMap.name = idx;
              } else if (c.includes("product code") || c === "code" || c === "sku" || c === "item code" || c === "barcode" || c === "id") {
                if (colMap.sku === -1) colMap.sku = idx;
              } else if (c.includes("hsn") || c.includes("hsncode") || c.includes("hsn code")) {
                if (colMap.hsn === -1) colMap.hsn = idx;
              } else if (c.includes("category") || c.includes("group") || c.includes("brand")) {
                if (colMap.category === -1) colMap.category = idx;
              } else if (c.includes("location") || c.includes("warehouse") || c.includes("branch") || c.includes("godown") || c.includes("store")) {
                if (colMap.warehouse === -1) colMap.warehouse = idx;
              } else if (c.includes("stock") || c.includes("qty") || c.includes("quantity") || c.includes("count") || c.includes("available") || c.includes("balance")) {
                if (colMap.stock === -1) colMap.stock = idx;
              } else if (c.includes("adjustment") || c.includes("adjust type") || c.includes("type")) {
                if (colMap.type === -1) colMap.type = idx;
              } else if (c.includes("reason") || c.includes("notes") || c.includes("remark")) {
                if (colMap.reason === -1) colMap.reason = idx;
              } else if (c.includes("price") || c.includes("cost") || c.includes("rate") || c.includes("mrp")) {
                if (colMap.price === -1) colMap.price = idx;
              }
            });
            break;
          }
        }

        const startDataIdx = headerRowIdx >= 0 ? headerRowIdx + 1 : 0;
        if (colMap.name === -1 && colMap.sku === -1) colMap.name = 0;
        if (colMap.stock === -1) {
          // Find the last numeric column
          for (let c = (raw2D[startDataIdx]?.length || 0) - 1; c >= 0; c--) {
            if (c !== colMap.name && c !== colMap.sku) {
              colMap.stock = c;
              break;
            }
          }
        }

        // 3. Process every data row
        const standardized = [];
        for (let idx = startDataIdx; idx < raw2D.length; idx++) {
          const row = raw2D[idx];
          if (!row || !Array.isArray(row) || row.every((cell) => !cell || String(cell).trim() === "")) {
            continue; // skip blank row
          }

          const firstNonEmpty = row.find((c) => c !== undefined && c !== null && String(c).trim() !== "");
          const firstStr = String(firstNonEmpty || "").toLowerCase().trim();
          if (firstStr.startsWith("sum:") || firstStr.startsWith("total") || firstStr.startsWith("grand total")) {
            continue; // skip summary/total row
          }

          const productName = colMap.name >= 0 ? String(row[colMap.name] || "").trim() : "";
          const sku = colMap.sku >= 0 ? String(row[colMap.sku] || "").trim() : "";
          const hsnCode = colMap.hsn >= 0 ? String(row[colMap.hsn] || "").trim() : "";
          const category = colMap.category >= 0 ? String(row[colMap.category] || "General").trim() : "General";
          const warehouseName = colMap.warehouse >= 0 ? String(row[colMap.warehouse] || "Theni").trim() : (warehouses[0]?.name || "Theni");
          const rawStock = colMap.stock >= 0 ? row[colMap.stock] : 1;
          const quantity = parseInt(rawStock, 10);
          const reason = colMap.reason >= 0 && row[colMap.reason] ? String(row[colMap.reason]).trim() : `Stock Import (${file.name})`;
          const type = "ADJUSTMENT_IN";

          if (!productName && !sku) {
            continue; // skip empty line
          }

          const validQty = !isNaN(quantity) && quantity > 0 ? quantity : 1;

          // Check if already in catalog
          const matchedProduct = products.find(
            (p) => (p.sku && p.sku.toLowerCase() === (sku || productName).toLowerCase()) ||
                   (p.name && p.name.toLowerCase() === (productName || sku).toLowerCase())
          );

          const matchedWarehouse = warehouses.find(
            (w) => w.name && w.name.toLowerCase() === warehouseName.toLowerCase()
          ) || warehouses[0];

          standardized.push({
            rowId: standardized.length + 1,
            sku: sku || matchedProduct?.sku || (productName ? `SKU-${productName.replace(/[^A-Za-z0-9]/g, "").substring(0, 8).toUpperCase()}` : "—"),
            productName: productName || matchedProduct?.name || sku,
            productId: matchedProduct?._id,
            category: category || "General",
            hsnCode: hsnCode || "",
            warehouseName: warehouseName || matchedWarehouse?.name || "Theni",
            warehouseId: matchedWarehouse?._id,
            quantity: validQty,
            type,
            reason,
            isNewProduct: !matchedProduct,
            isValid: true,
            issue: "",
          });
        }

        setParsedRows(standardized);
      } catch (err) {
        console.error("Excel parse error:", err);
        alert("Failed to parse Excel file. Please ensure it is a valid .xlsx, .xls, or .csv file.");
      }
    };

    reader.readAsBinaryString(file);
  };

  // Total Quantity calculation
  const totalStockUnits = useMemo(() => {
    return parsedRows.reduce((sum, r) => sum + (r.quantity || 0), 0);
  }, [parsedRows]);

  const newProductsCount = useMemo(() => {
    return parsedRows.filter((r) => r.isNewProduct).length;
  }, [parsedRows]);

  // Submit Import to Backend
  const handleConfirmImport = async () => {
    const validRows = parsedRows.filter((r) => r.isValid);
    if (validRows.length === 0) {
      alert("No valid rows to import.");
      return;
    }

    setImporting(true);
    try {
      const payload = validRows.map((r) => ({
        sku: r.sku,
        productName: r.productName,
        productId: r.productId,
        category: r.category,
        hsnCode: r.hsnCode,
        warehouseName: r.warehouseName,
        warehouseId: r.warehouseId,
        quantity: r.quantity,
        type: r.type,
        reason: r.reason,
      }));

      const res = await api.post("/inventory/import", {
        items: payload,
        title: `Excel Stock Import (${validRows.length} items from ${fileName})`,
        notes: `Imported by ${user?.name} (${user?.role}) from ${fileName}`,
      });

      setImportResult({
        pendingApproval: res.data.pendingApproval,
        importedCount: res.data.importedCount,
        errorCount: res.data.errorCount,
        message: res.data.message,
        errors: res.data.errors,
      });

      if (onSuccess) onSuccess();
    } catch (err) {
      alert(err.response?.data?.message || "Stock import failed");
    } finally {
      setImporting(false);
    }
  };

  const validCount = parsedRows.filter((r) => r.isValid).length;
  const invalidCount = parsedRows.filter((r) => !r.isValid).length;

  return (
    <Modal open={open} title="Import Stock Data via Excel / CSV" onClose={handleClose} wide>
      <div className="flex flex-col gap-4">
        {/* Top Header & Template Download */}
        <div className="flex items-center justify-between flex-wrap gap-3 bg-[var(--bg-main)] p-3.5 rounded-xl border border-[var(--border-color)]">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
              <FileSpreadsheet size={20} />
            </div>
            <div>
              <h4 className="text-xs font-bold text-[var(--text-primary)]">Bulk Stock Adjustment &amp; Inward</h4>
              <p className="text-xs text-[var(--text-muted)]">Upload any Excel sheet (.xlsx, .csv). Automatic header detection &amp; product catalog auto-sync enabled.</p>
            </div>
          </div>
          <Btn size="sm" variant="ghost" onClick={handleDownloadTemplate}>
            <Download size={13} /> Download Sample Template
          </Btn>
        </div>

        {/* File Drop / Select Area */}
        {parsedRows.length === 0 && !importResult && (
          <div 
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-[var(--border-color)] hover:border-[var(--accent-color)] bg-[var(--bg-card)] hover:bg-[var(--bg-card-hover)] rounded-xl p-8 flex flex-col items-center justify-center gap-2 cursor-pointer transition text-center group"
          >
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleFileUpload} 
              accept=".xlsx,.xls,.csv" 
              className="hidden" 
            />
            <div className="p-3 rounded-full bg-[var(--bg-main)] text-[var(--text-muted)] group-hover:text-[var(--accent-color)] group-hover:scale-110 transition">
              <Upload size={24} />
            </div>
            <div className="text-xs font-bold text-[var(--text-primary)]">
              Click to select or drag and drop your Excel / CSV file
            </div>
            <div className="text-xs text-[var(--text-muted)] font-mono">
              Supports any stock report layout with Product Name, Code/SKU, Category, Location, and Stock
            </div>
          </div>
        )}

        {/* Import Result Banner */}
        {importResult && (
          <div className={`p-4 rounded-xl border flex flex-col gap-2.5 ${
            importResult.pendingApproval
              ? "bg-amber-500/10 border-amber-500/30 text-amber-300"
              : "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
          }`}>
            <div className="flex items-center gap-2 font-bold text-sm">
              {importResult.pendingApproval ? (
                <>
                  <Clock size={18} className="text-amber-400" />
                  <span className="text-amber-400">Stock Inward Request Submitted for Admin Approval! (Status: PENDING)</span>
                </>
              ) : (
                <>
                  <CheckCircle2 size={18} className="text-emerald-400" />
                  <span className="text-emerald-400">All Products &amp; Stock Inward Successfully Applied!</span>
                </>
              )}
            </div>
            <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
              {importResult.message || `Processed ${importResult.importedCount} items from ${fileName}.`}
            </p>
            {importResult.pendingApproval && (
              <div className="text-xs text-amber-400/90 font-mono bg-amber-950/40 p-2.5 rounded-lg border border-amber-500/20 flex items-center gap-2">
                <ShieldCheck size={14} className="text-amber-400 shrink-0" />
                Store Manager batch recorded. Administrator will review, approve, and finalize catalog and stock levels in Admin Approvals.
              </div>
            )}
            <div className="flex justify-end gap-2 mt-2 pt-2 border-t border-[var(--border-color)]">
              <Btn size="sm" variant="ghost" onClick={resetModal}>
                <RefreshCw size={12} /> Import Another File
              </Btn>
              <Btn size="sm" onClick={handleClose}>
                Done &amp; View Inventory
              </Btn>
            </div>
          </div>
        )}

        {/* Parsed Rows Preview Table */}
        {parsedRows.length > 0 && !importResult && (
          <div className="flex flex-col gap-3">
            {/* Highlights Banner */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-[var(--bg-main)] p-3 rounded-xl border border-[var(--border-color)] text-xs">
              <div className="flex flex-col">
                <span className="text-[10px] uppercase font-bold text-[var(--text-muted)]">File Name</span>
                <span className="font-mono text-[var(--text-primary)] font-bold truncate" title={fileName}>{fileName}</span>
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] uppercase font-bold text-[var(--text-muted)]">Total Line Items</span>
                <span className="font-mono text-emerald-500 font-extrabold text-sm">{parsedRows.length} Products</span>
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] uppercase font-bold text-[var(--text-muted)]">Total Inward Units</span>
                <span className="font-mono text-blue-500 font-extrabold text-sm">{totalStockUnits} Units</span>
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] uppercase font-bold text-[var(--text-muted)]">Catalog Sync</span>
                <span className="font-semibold text-sky-500 flex items-center gap-1">
                  <Sparkles size={12} /> {newProductsCount} New, {parsedRows.length - newProductsCount} Matched
                </span>
              </div>
            </div>

            {/* Ready vs Issues Badge */}
            <div className="flex items-center justify-between flex-wrap gap-2 text-xs">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-500 font-bold border border-emerald-500/30 text-xs flex items-center gap-1">
                  <CheckCircle2 size={12} /> {validCount} Ready to Inward
                </span>
                {invalidCount > 0 && (
                  <span className="px-2.5 py-0.5 rounded-full bg-rose-500/15 text-rose-400 font-bold border border-rose-500/30 text-xs flex items-center gap-1">
                    <AlertTriangle size={12} /> {invalidCount} Issues
                  </span>
                )}
              </div>
              <div className="text-[11px] text-[var(--text-muted)]">
                All products without existing catalog records will be auto-created upon submission/approval.
              </div>
            </div>

            {/* Table */}
            <div className="max-h-72 overflow-y-auto border border-[var(--border-color)] rounded-xl bg-[var(--bg-main)] scrollbar-thin">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="sticky top-0 bg-[var(--table-header)] border-b border-[var(--border-color)] text-[var(--text-muted)] font-semibold z-10">
                  <tr>
                    <th className="py-2.5 px-3">#</th>
                    <th className="py-2.5 px-3">Product Name &amp; Code</th>
                    <th className="py-2.5 px-3">Category</th>
                    <th className="py-2.5 px-3">HSN Code</th>
                    <th className="py-2.5 px-3">Location</th>
                    <th className="py-2.5 px-3">Inward Stock</th>
                    <th className="py-2.5 px-3 text-right">Catalog Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-color)]">
                  {parsedRows.map((r) => (
                    <tr key={r.rowId} className="hover:bg-[var(--bg-card-hover)] transition">
                      <td className="py-2.5 px-3 font-mono text-[var(--text-muted)]">#{r.rowId}</td>
                      <td className="py-2.5 px-3">
                        <div className="font-bold text-[var(--text-primary)]">{r.productName}</div>
                        <div className="font-mono text-[11px] text-[var(--text-muted)] flex items-center gap-1">
                          <Tag size={10} /> SKU/Code: {r.sku}
                        </div>
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="px-1.5 py-0.5 rounded bg-[var(--bg-card)] border border-[var(--border-color)] text-[var(--text-secondary)] font-mono text-[11px]">
                          {r.category || "General"}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 font-mono text-[11px] text-[var(--text-muted)]">
                        {r.hsnCode || "—"}
                      </td>
                      <td className="py-2.5 px-3 font-semibold text-[var(--text-secondary)]">
                        <span className="flex items-center gap-1">
                          <MapPin size={11} className="text-sky-400" /> {r.warehouseName}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 font-mono font-bold">
                        <span className="px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-500 border border-emerald-500/30">
                          +{r.quantity}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        {r.isNewProduct ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-500 border border-blue-500/30 font-bold text-[10px]">
                            <Sparkles size={11} /> ✨ Auto-creates in Catalog
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-500 border border-emerald-500/30 font-semibold text-[10px]">
                            <Check size={11} /> ✓ Matched Catalog
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Bottom Actions Bar */}
            <div className="flex items-center justify-between flex-wrap gap-2 pt-3 border-t border-[var(--border-color)]">
              <Btn variant="ghost" size="sm" onClick={resetModal}>
                <X size={13} /> Change File
              </Btn>

              <div className="flex items-center gap-2">
                <Btn variant="ghost" size="sm" onClick={handleClose}>
                  Cancel
                </Btn>
                <Btn
                  size="sm"
                  onClick={handleConfirmImport}
                  disabled={importing || validCount === 0}
                  className="gap-1.5"
                >
                  {importing ? (
                    <>
                      <RefreshCw size={13} className="animate-spin" /> Processing Import...
                    </>
                  ) : isAdmin ? (
                    <>
                      <ShieldCheck size={14} /> ⚡ 1-Click Approve &amp; Inward {validCount} Items ({totalStockUnits} Units)
                    </>
                  ) : (
                    <>
                      <ArrowRight size={14} /> Submit {validCount} Items ({totalStockUnits} Units) for Admin Approval
                    </>
                  )}
                </Btn>
              </div>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
