import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { AlertTriangle, TrendingUp, Package, Boxes, ShoppingCart, ShoppingBag, ArrowRight, ChevronLeft, ChevronRight as ChevronRightIcon, BarChart2, PieChart as PieChartIcon, Warehouse } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from "recharts";
import api from "../utils/api";
import { money } from "../utils/money";
import { Badge } from "../components/SharedComponents";

const PIE_COLORS = [
  "#2563eb","#38bdf8","#34d399","#a78bfa","#fb7185","#f59e0b",
  "#06b6d4","#10b981","#8b5cf6","#f43f5e","#fbbf24","#22d3ee",
];

const CRIT_PAGE = 8;

function StatCard({ icon, label, value, tone, sub }) {
  const tones = {
    default: { text: "text-[var(--text-primary)]",  bg: "bg-[var(--accent-color)]/10", ic: "text-[var(--accent-color)]" },
    warn:    { text: "text-amber-400",               bg: "bg-amber-500/10",             ic: "text-amber-400" },
    danger:  { text: "text-rose-400",                bg: "bg-rose-500/10",              ic: "text-rose-400" },
    good:    { text: "text-emerald-400",              bg: "bg-emerald-500/10",           ic: "text-emerald-400" },
    blue:    { text: "text-sky-400",                  bg: "bg-sky-500/10",               ic: "text-sky-400" },
  };
  const t = tones[tone] || tones.default;
  return (
    <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl p-4 flex flex-col gap-3 shadow-sm hover:border-[var(--accent-color)]/30 hover:shadow-md transition duration-200 group">
      <div className="flex items-center justify-between">
        <span className="text-[11px] uppercase tracking-wider text-[var(--text-muted)] font-bold">{label}</span>
        <div className={`${t.bg} ${t.ic} p-2 rounded-lg group-hover:scale-110 transition-transform duration-200`}>{icon}</div>
      </div>
      <span className={`text-2xl font-bold font-mono ${t.text}`}>{value}</span>
      {sub && <span className="text-[11px] text-[var(--text-muted)]">{sub}</span>}
    </div>
  );
}

function CustomBarTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl px-4 py-3 shadow-xl text-xs">
      <div className="font-bold text-[var(--text-primary)] mb-2">{label}</div>
      {payload.map((p) => (
        <div key={p.name} className="flex items-center gap-2 mb-1">
          <span className="w-2 h-2 rounded-full inline-block" style={{ background: p.fill }} />
          <span className="text-[var(--text-secondary)]">{p.name}:</span>
          <span className="font-bold text-[var(--text-primary)]">{money(p.value)}</span>
        </div>
      ))}
    </div>
  );
}

function CustomPieTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const d = payload[0];
  return (
    <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl px-4 py-3 shadow-xl text-xs">
      <div className="flex items-center gap-2 mb-1">
        <span className="w-2.5 h-2.5 rounded-full" style={{ background: d.payload.fill }} />
        <span className="font-bold text-[var(--text-primary)]">{d.name}</span>
      </div>
      <div className="text-[var(--text-secondary)]">Stock Units: <span className="font-bold text-[var(--text-primary)]">{d.value.toLocaleString("en-IN")}</span></div>
    </div>
  );
}

export default function Dashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    productCount: 0, totalStock: 0, lowStockCount: 0,
    outOfStockCount: 0, pendingPurchases: 0, pendingSales: 0,
    inventoryValue: 0, salesByMonth: [],
  });
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [critPage, setCritPage] = useState(1);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [statsRes, prodRes, catRes, invRes] = await Promise.all([
          api.get("/reports/dashboard-stats"),
          api.get("/products"),
          api.get("/categories"),
          api.get("/inventory"),
        ]);
        setStats(statsRes.data.data);
        setProducts(prodRes.data.data);
        setCategories(catRes.data.data);
        setInventory(invRes.data.data);
      } catch (error) {
        console.error("Dashboard data load failed:", error.message);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const stockByProduct = useMemo(() => {
    const map = {};
    inventory.forEach((i) => {
      const prodId = i.productId?._id || i.productId;
      if (prodId) map[prodId] = (map[prodId] || 0) + i.quantity;
    });
    return map;
  }, [inventory]);

  const criticalStockList = useMemo(() =>
    products
      .filter((p) => (stockByProduct[p._id] || 0) <= p.reorderLevel)
      .sort((a, b) => (stockByProduct[a._id] || 0) - (stockByProduct[b._id] || 0)),
    [products, stockByProduct]
  );

  const categoryInventory = useMemo(() => {
    const topCats = categories.filter((c) => !c.parent);
    return topCats.map((c) => {
      const childIds = categories.filter((x) => (x.parent?._id || x.parent) === c._id).map((x) => x._id);
      const allIds = [c._id, ...childIds];
      const value = products
        .filter((p) => allIds.includes(p.category?._id || p.category))
        .reduce((sum, p) => sum + (stockByProduct[p._id] || 0), 0);
      return { name: c.name, value };
    }).filter((c) => c.value > 0).sort((a, b) => b.value - a.value);
  }, [categories, products, stockByProduct]);

  const salesByMonth = stats.salesByMonth || [];

  const totalCritPages = Math.ceil(criticalStockList.length / CRIT_PAGE) || 1;
  const paginatedCrit = useMemo(() => {
    const start = (critPage - 1) * CRIT_PAGE;
    return criticalStockList.slice(start, start + CRIT_PAGE);
  }, [criticalStockList, critPage]);

  if (loading) {
    return (
      <div className="flex flex-col gap-6 animate-pulse">
        <div className="h-7 w-48 bg-[var(--border-color)] rounded-lg" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
          {Array.from({ length: 7 }).map((_, i) => (
            <div key={i} className="h-24 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="h-64 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl" />
          <div className="h-64 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-xl font-bold text-[var(--text-primary)] tracking-tight">Dashboard Overview</h1>
          <p className="text-xs text-[var(--text-muted)] mt-0.5">Real-time inventory levels, sales revenue, and procurement metrics.</p>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-[var(--text-muted)] font-mono bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg px-3 py-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse inline-block" />
          Live Data
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
        <StatCard icon={<Package size={16} />}        label="Total Products"       value={stats.productCount.toLocaleString("en-IN")} tone="default" />
        <StatCard icon={<Warehouse size={16} />}      label="Total Stock"          value={stats.totalStock.toLocaleString("en-IN")}   tone="blue" />
        <StatCard icon={<AlertTriangle size={16} />}  label="Low Stock Alerts"     value={stats.lowStockCount}
          tone={stats.lowStockCount ? "warn" : "default"}
          sub={stats.lowStockCount ? "Products need reorder" : "All levels healthy"} />
        <StatCard icon={<Boxes size={16} />}           label="Out of Stock"         value={stats.outOfStockCount}
          tone={stats.outOfStockCount ? "danger" : "default"}
          sub={stats.outOfStockCount ? "Immediate action needed" : "None out of stock"} />
        <StatCard icon={<ShoppingCart size={16} />}   label="Pending Purchases"    value={stats.pendingPurchases} tone={stats.pendingPurchases ? "warn" : "default"} />
        <StatCard icon={<ShoppingBag size={16} />}    label="Pending Sales Orders" value={stats.pendingSales}     tone={stats.pendingSales ? "warn" : "default"} />
        <StatCard icon={<TrendingUp size={16} />}     label="Total Inventory Value" value={money(stats.inventoryValue)} tone="good" sub="Based on cost price" />
      </div>

      {criticalStockList.length > 0 && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 shrink-0">
              <AlertTriangle size={20} />
            </div>
            <div>
              <div className="text-xs font-bold text-amber-300 flex items-center gap-2 flex-wrap">
                <span>Automated Inventory Alert: {criticalStockList.length} product(s) below reorder threshold</span>
                <span className="px-1.5 rounded bg-amber-500/20 text-amber-400 font-mono text-[10px] font-bold border border-amber-500/30">ACTION REQUIRED</span>
              </div>
              <div className="text-xs text-[var(--text-muted)] mt-0.5">Immediate inward stock adjustment or purchase order reorder is recommended to prevent stockouts.</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate("/purchases")}
              className="px-3 py-1.5 rounded-lg bg-[var(--bg-card)] hover:bg-[var(--bg-card-hover)] border border-[var(--border-color)] text-[var(--text-primary)] text-xs font-semibold transition flex items-center gap-1.5"
            >
              <ShoppingCart size={13} /> Create Purchase Order
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <div className="bg-[var(--accent-color)]/10 text-[var(--accent-color)] p-1.5 rounded-lg">
              <BarChart2 size={15} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[var(--text-primary)]">Sales vs Purchases (₹)</h3>
              <p className="text-[11px] text-[var(--text-muted)]">Last 6 months revenue and procurement</p>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={salesByMonth} barGap={4} barCategoryGap="30%">
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" vertical={false} />
              <XAxis dataKey="month" stroke="var(--text-muted)" fontSize={11} tickLine={false} axisLine={false} />
              <YAxis stroke="var(--text-muted)" fontSize={11} tickLine={false} axisLine={false}
                tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}K` : v} />
              <Tooltip content={<CustomBarTooltip />} cursor={{ fill: "var(--border-color)", opacity: 0.4 }} />
              <Legend wrapperStyle={{ fontSize: "11px", paddingTop: "12px" }} />
              <Bar dataKey="sales"     name="Sales Revenue"    fill="#2563eb" radius={[5, 5, 0, 0]} />
              <Bar dataKey="purchases" name="Purchases Outlay" fill="#38bdf8" radius={[5, 5, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <div className="bg-emerald-500/10 text-emerald-400 p-1.5 rounded-lg">
              <PieChartIcon size={15} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[var(--text-primary)]">Category Stock Distribution</h3>
              <p className="text-[11px] text-[var(--text-muted)]">Stock units by top-level category</p>
            </div>
          </div>
          {categoryInventory.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={categoryInventory}
                  dataKey="value"
                  nameKey="name"
                  cx="40%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={85}
                  paddingAngle={2}
                >
                  {categoryInventory.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} stroke="transparent" />
                  ))}
                </Pie>
                <Tooltip content={<CustomPieTooltip />} />
                <Legend
                  layout="vertical"
                  align="right"
                  verticalAlign="middle"
                  iconType="circle"
                  iconSize={8}
                  wrapperStyle={{ fontSize: "10px", lineHeight: "20px", paddingLeft: "12px", maxHeight: "200px", overflowY: "auto" }}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[220px] flex items-center justify-center text-xs text-[var(--text-muted)]">
              No category stock data available.
            </div>
          )}
        </div>
      </div>

      <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl overflow-hidden shadow-sm">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-[var(--border-color)] bg-[var(--bg-card-hover)]">
          <div className="flex items-center gap-2">
            <div className="bg-amber-500/10 text-amber-400 p-1.5 rounded-lg">
              <AlertTriangle size={14} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[var(--text-primary)]">Low Stock &amp; Out of Stock Products</h3>
              <p className="text-[11px] text-[var(--text-muted)]">
                {criticalStockList.length} product{criticalStockList.length !== 1 ? "s" : ""} need attention · sorted by most critical first
              </p>
            </div>
          </div>
          {criticalStockList.length > 0 && (
            <button
              onClick={() => navigate("/products")}
              className="flex items-center gap-1 text-xs text-[var(--accent-color)] font-semibold hover:underline"
            >
              View All <ArrowRight size={12} />
            </button>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="bg-[var(--table-header)] text-[var(--text-muted)] border-b border-[var(--border-color)] uppercase tracking-wider font-semibold">
                <th className="py-2.5 px-4">Product Name</th>
                <th className="py-2.5 px-4">SKU</th>
                <th className="py-2.5 px-4">Category</th>
                <th className="py-2.5 px-4 text-center">Current Stock</th>
                <th className="py-2.5 px-4 text-center">Reorder Threshold</th>
                <th className="py-2.5 px-4 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-color)]/60">
              {paginatedCrit.map((p) => {
                const s = stockByProduct[p._id] || 0;
                const pct = p.reorderLevel > 0 ? Math.min(100, Math.round((s / p.reorderLevel) * 100)) : 0;
                return (
                  <tr key={p._id} className="hover:bg-[var(--table-row-hover)] transition-colors">
                    <td className="py-2.5 px-4">
                      <div className="font-semibold text-[var(--text-primary)]">{p.name}</div>
                      {p.brand && <div className="text-[var(--text-muted)] text-[10px]">{p.brand}</div>}
                    </td>
                    <td className="py-2.5 px-4 font-mono text-[var(--text-muted)]">{p.sku}</td>
                    <td className="py-2.5 px-4 text-[var(--text-secondary)]">{p.category?.name || "—"}</td>
                    <td className="py-2.5 px-4 text-center">
                      <div className="flex flex-col items-center gap-1">
                        <span className={`font-bold font-mono ${s === 0 ? "text-rose-400" : "text-amber-400"}`}>{s}</span>
                        <div className="w-16 h-1 rounded-full bg-[var(--border-color)] overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${s === 0 ? "bg-rose-500" : "bg-amber-400"}`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    </td>
                    <td className="py-2.5 px-4 text-center font-mono text-[var(--text-secondary)]">{p.reorderLevel}</td>
                    <td className="py-2.5 px-4 text-right">
                      {s === 0
                        ? <Badge tone="red">OUT OF STOCK</Badge>
                        : <Badge tone="amber">LOW STOCK</Badge>}
                    </td>
                  </tr>
                );
              })}
              {criticalStockList.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-[var(--text-muted)]">
                    <div className="flex flex-col items-center gap-2">
                      <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center">
                        <Package size={18} className="text-emerald-400" />
                      </div>
                      <p>All products are within healthy stock levels. 🎉</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {criticalStockList.length > CRIT_PAGE && (
          <div className="px-4 py-3 border-t border-[var(--border-color)] flex items-center justify-between flex-wrap gap-3 text-xs text-[var(--text-muted)]">
            <span>
              Showing{" "}
              <span className="text-[var(--text-primary)] font-bold">{(critPage - 1) * CRIT_PAGE + 1}</span> –{" "}
              <span className="text-[var(--text-primary)] font-bold">{Math.min(critPage * CRIT_PAGE, criticalStockList.length)}</span>{" "}
              of <span className="text-[var(--text-primary)] font-bold">{criticalStockList.length}</span> critical items
            </span>
            <div className="flex items-center gap-1">
              <button
                disabled={critPage <= 1}
                onClick={() => setCritPage((p) => Math.max(1, p - 1))}
                className="p-1.5 rounded-lg border border-[var(--border-color)] hover:bg-[var(--bg-card-hover)] disabled:opacity-40 disabled:cursor-not-allowed transition"
              >
                <ChevronLeft size={13} />
              </button>
              {Array.from({ length: totalCritPages }, (_, i) => i + 1)
                .filter((p) => p === 1 || p === totalCritPages || Math.abs(p - critPage) <= 1)
                .map((p, idx, arr) => {
                  const showEllipsis = idx > 0 && p - arr[idx - 1] > 1;
                  return (
                    <React.Fragment key={p}>
                      {showEllipsis && <span className="px-1">...</span>}
                      <button
                        onClick={() => setCritPage(p)}
                        className={`min-w-7 h-7 rounded text-xs font-bold transition flex items-center justify-center ${
                          critPage === p
                            ? "bg-[var(--accent-color)] text-[var(--accent-text)]"
                            : "hover:bg-[var(--bg-card-hover)] text-[var(--text-secondary)]"
                        }`}
                      >
                        {p}
                      </button>
                    </React.Fragment>
                  );
                })}
              <button
                disabled={critPage >= totalCritPages}
                onClick={() => setCritPage((p) => Math.min(totalCritPages, p + 1))}
                className="p-1.5 rounded-lg border border-[var(--border-color)] hover:bg-[var(--bg-card-hover)] disabled:opacity-40 disabled:cursor-not-allowed transition"
              >
                <ChevronRightIcon size={13} />
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Go to Products",  sub: "Manage catalogue",   icon: <Package size={18} />,      path: "/products",  color: "text-[var(--accent-color)] bg-[var(--accent-color)]/10" },
          { label: "Inventory",       sub: "View stock levels",  icon: <Warehouse size={18} />,    path: "/inventory", color: "text-emerald-400 bg-emerald-500/10" },
          { label: "New Purchase",    sub: "Create PO",          icon: <ShoppingCart size={18} />, path: "/purchases", color: "text-amber-400 bg-amber-500/10" },
          { label: "New Sale",        sub: "Record sale order",  icon: <ShoppingBag size={18} />,  path: "/sales",     color: "text-rose-400 bg-rose-500/10" },
        ].map((q) => (
          <button
            key={q.path}
            onClick={() => navigate(q.path)}
            className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl p-4 flex items-center gap-3 hover:border-[var(--accent-color)]/30 hover:shadow-md transition duration-200 text-left group"
          >
            <div className={`p-2.5 rounded-xl ${q.color} shrink-0 group-hover:scale-110 transition-transform duration-200`}>
              {q.icon}
            </div>
            <div className="min-w-0">
              <div className="text-xs font-bold text-[var(--text-primary)] truncate">{q.label}</div>
              <div className="text-[11px] text-[var(--text-muted)] truncate">{q.sub}</div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
