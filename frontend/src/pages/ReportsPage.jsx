import React, { useState, useEffect, useMemo } from "react";
import { Download, RefreshCw, FileText } from "lucide-react";
import api from "../utils/api";
import { money } from "../utils/money";
import { downloadCSV } from "../utils/csv";
import { Btn, Pagination } from "../components/SharedComponents";

export default function ReportsPage() {
  const [tab, setTab] = useState("inventory");
  const [reportData, setReportData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const reports = {
    inventory: { title: "Inventory Report", url: "/reports/inventory" },
    sales: { title: "Sales Report", url: "/reports/sales" },
    purchase: { title: "Purchase Report", url: "/reports/purchase" },
    movement: { title: "Stock Movement Report", url: "/reports/movement" },
  };

  const fetchReport = async () => {
    setLoading(true);
    try {
      const res = await api.get(reports[tab].url);
      setReportData(res.data.data || []);
    } catch (err) {
      console.error(`Failed to load ${tab} report:`, err.message);
      setReportData([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
    setCurrentPage(1);
  }, [tab]);

  // Paginated data calculation
  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * rowsPerPage;
    return reportData.slice(startIndex, startIndex + rowsPerPage);
  }, [reportData, currentPage, rowsPerPage]);

  const totalPages = Math.ceil(reportData.length / rowsPerPage);

  return (
    <div className="flex flex-col gap-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-[var(--text-primary)]">Reports &amp; Analytics</h1>
          <p className="text-xs text-[var(--text-muted)] mt-0.5">Export any report as CSV for further accounting and inventory analysis.</p>
        </div>

        <Btn size="sm" onClick={() => downloadCSV(`${tab}-report.csv`, reportData)}>
          <Download size={13} /> Export CSV
        </Btn>
      </div>

      {/* Tabs Menu */}
      <div className="flex gap-2 flex-wrap items-center">
        {Object.entries(reports).map(([key, r]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold border transition ${
              tab === key
                ? "bg-[var(--accent-color)] text-[var(--accent-text)] border-[var(--accent-color)] shadow-sm"
                : "bg-[var(--bg-card)] border-[var(--border-color)] text-[var(--text-secondary)] hover:bg-[var(--bg-card-hover)] hover:text-[var(--text-primary)]"
            }`}
          >
            {r.title}
          </button>
        ))}
      </div>

      {/* Table Container */}
      <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          {loading ? (
            <div className="py-16 text-center text-xs text-[var(--text-muted)] flex items-center justify-center gap-2">
              <RefreshCw size={15} className="animate-spin text-[var(--accent-color)]" /> Generating report data...
            </div>
          ) : (
            <table className="w-full text-xs text-left min-w-[750px] border-collapse">
              <thead>
                <tr className="bg-[var(--table-header)] text-[var(--text-muted)] border-b border-[var(--border-color)] font-semibold">
                  {reportData[0] &&
                    Object.keys(reportData[0]).map((h) => (
                      <th key={h} className="py-3 px-4 capitalize">
                        {h.replace(/([A-Z])/g, " $1")}
                      </th>
                    ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-color)]">
                {paginatedData.map((row, i) => (
                  <tr key={i} className="hover:bg-[var(--table-row-hover)] transition">
                    {Object.entries(row).map(([k, v]) => (
                      <td key={k} className="py-3 px-4 text-[var(--text-primary)] font-medium">
                        {typeof v === "number" &&
                        (k.includes("Value") ||
                          k.includes("Revenue") ||
                          k.includes("Amount") ||
                          k.includes("Cost") ||
                          k.includes("Price"))
                          ? money(v)
                          : String(v)}
                      </td>
                    ))}
                  </tr>
                ))}
                {reportData.length === 0 && (
                  <tr>
                    <td colSpan={10} className="py-12 text-center text-[var(--text-muted)]">
                      No report records available for this period.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination Controls */}
        {!loading && (
          <div className="p-4 bg-[var(--bg-card)]">
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={reportData.length}
              rowsPerPage={rowsPerPage}
              onPageChange={setCurrentPage}
              onRowsPerPageChange={(n) => {
                setRowsPerPage(n);
                setCurrentPage(1);
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
}
