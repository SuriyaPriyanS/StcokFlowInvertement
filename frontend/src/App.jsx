import React, { useState, Suspense, lazy } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Routes, Route, Navigate, NavLink, useNavigate, Outlet, useLocation } from "react-router-dom";
import {
  LayoutDashboard, Package, FolderTree, Truck, Warehouse as WarehouseIcon,
  Boxes, ShoppingCart, ShoppingBag, ArrowLeftRight, Users, FileBarChart,
  Settings as SettingsIcon, LogOut, Building2, ShieldCheck, Plus,
  Palette, Type, ChevronDown, Check, Sparkles, Menu, X, Loader2
} from "lucide-react";
import { logout } from "./store/slices/authSlice";
import { useTheme } from "./context/ThemeContext";
import NotificationDropdown from "./components/NotificationDropdown";

// Code-split / Lazy-loaded Pages for instant rendering and maximum performance
const Login = lazy(() => import("./pages/Login"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const ProductsPage = lazy(() => import("./pages/ProductsPage"));
const CategoriesPage = lazy(() => import("./pages/CategoriesPage"));
const PartyPage = lazy(() => import("./pages/PartyPage"));
const WarehousesPage = lazy(() => import("./pages/WarehousesPage"));
const InventoryPage = lazy(() => import("./pages/InventoryPage"));
const PurchasesPage = lazy(() => import("./pages/PurchasesPage"));
const SalesPage = lazy(() => import("./pages/SalesPage"));
const TransfersPage = lazy(() => import("./pages/TransfersPage"));
const ReportsPage = lazy(() => import("./pages/ReportsPage"));
const SettingsPage = lazy(() => import("./pages/SettingsPage"));
const BranchesPage = lazy(() => import("./pages/BranchesPage"));

// Lightweight skeleton loader for fast page transitions
function PageLoader() {
  return (
    <div className="flex flex-col gap-5 animate-pulse p-1 sm:p-2">
      <div className="flex items-center justify-between">
        <div className="h-7 w-44 bg-[var(--border-color)] rounded-lg"></div>
        <div className="h-8 w-28 bg-[var(--border-color)] rounded-lg"></div>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
        <div className="h-20 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl"></div>
        <div className="h-20 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl"></div>
        <div className="h-20 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl"></div>
        <div className="h-20 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl"></div>
      </div>
      <div className="h-64 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl"></div>
    </div>
  );
}

// Grouped Navigation Definition
const NAV_GROUPS = [
  {
    groupTitle: "Overview",
    items: [
      { key: "dashboard", label: "Dashboard", icon: LayoutDashboard, roles: ["Admin", "Manager", "Inventory Staff", "Sales Staff"] },
    ],
  },
  {
    groupTitle: "Catalog",
    items: [
      { key: "products", label: "Products", icon: Package, roles: ["Admin", "Manager", "Inventory Staff", "Sales Staff"] },
      { key: "categories", label: "Categories", icon: FolderTree, roles: ["Admin", "Manager"] },
      { key: "suppliers", label: "Suppliers", icon: Truck, roles: ["Admin", "Manager"] },
      { key: "customers", label: "Customers", icon: Users, roles: ["Admin", "Manager", "Sales Staff"] },
    ],
  },
  {
    groupTitle: "Locations",
    items: [
      { key: "warehouses", label: "Warehouses", icon: WarehouseIcon, roles: ["Admin", "Manager"] },
      { key: "branches", label: "Branches", icon: Building2, roles: ["Admin", "Manager", "Inventory Staff", "Sales Staff"] },
    ],
  },
  {
    groupTitle: "Operations",
    items: [
      { key: "inventory", label: "Inventory", icon: Boxes, roles: ["Admin", "Manager", "Inventory Staff", "Sales Staff"] },
      { key: "purchases", label: "Purchases", icon: ShoppingCart, roles: ["Admin", "Manager"] },
      { key: "sales", label: "Sales", icon: ShoppingBag, roles: ["Admin", "Manager", "Sales Staff"] },
      { key: "transfers", label: "Transfers", icon: ArrowLeftRight, roles: ["Admin", "Manager", "Inventory Staff"] },
    ],
  },
  {
    groupTitle: "Administration",
    items: [
      { key: "reports", label: "Reports", icon: FileBarChart, roles: ["Admin", "Manager"] },
      { key: "settings", label: "Admin Control", icon: SettingsIcon, roles: ["Admin"] },
    ],
  },
];

const getAllNavItems = () => NAV_GROUPS.flatMap((g) => g.items);
const getRoles = (key) => getAllNavItems().find((n) => n.key === key)?.roles || [];

function ProtectedRoute({ children }) {
  const { isAuthenticated, user } = useSelector((state) => state.auth);
  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />;
  }
  return children;
}

function RoleProtectedRoute({ roles, children }) {
  const { isAuthenticated, user } = useSelector((state) => state.auth);
  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />;
  }
  if (!roles.includes(user.role) && user.role !== "Admin") {
    return <Navigate to="/dashboard" replace />;
  }
  return children;
}

function PublicRoute({ children }) {
  const { isAuthenticated, user } = useSelector((state) => state.auth);
  if (isAuthenticated && user) {
    return <Navigate to="/dashboard" replace />;
  }
  return children;
}

function MainLayout() {
  const dispatch = useDispatch();
  const location = useLocation();
  const { user } = useSelector((state) => state.auth);
  const { theme, setTheme, font, setFont, activeTheme, activeFont, themes, fonts } = useTheme();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [themeDropdownOpen, setThemeDropdownOpen] = useState(false);
  const [fontDropdownOpen, setFontDropdownOpen] = useState(false);

  if (!user) return null;

  const isAdmin = user.role === "Admin";

  const handleLogout = () => {
    dispatch(logout());
  };

  const currentPathName = location.pathname.replace("/", "") || "Dashboard";

  return (
    <div className="flex h-screen overflow-hidden bg-[var(--bg-main)] text-[var(--text-primary)]">
      {/* MOBILE BACKDROP OVERLAY */}
      {mobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-xs z-40 md:hidden animate-in fade-in duration-200"
          onClick={() => setMobileMenuOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* SIDEBAR (Desktop docked, Mobile slide-over drawer) */}
      <aside 
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-[var(--bg-sidebar)] border-r border-[var(--border-sidebar)] flex flex-col h-full transition-transform duration-200 ease-in-out md:static md:translate-x-0 ${
          mobileMenuOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full md:translate-x-0"
        }`}
      >
        {/* Brand Header */}
        <div className="px-5 py-4 border-b border-[var(--border-sidebar)] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div 
              className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-black text-base shadow-md"
              style={{ backgroundColor: activeTheme.primary }}
            >
              S
            </div>
            <div>
              <div className="font-bold text-sm tracking-wide text-white flex items-center gap-1.5">
                StockFlow
                {isAdmin && (
                  <span 
                    className="text-[9px] px-1.5 py-0.2 rounded font-mono font-bold text-white uppercase"
                    style={{ backgroundColor: `${activeTheme.primary}99` }}
                  >
                    MASTER
                  </span>
                )}
              </div>
              <div className="text-[10px] text-slate-400 font-mono tracking-wider">MULTI-WAREHOUSE</div>
            </div>
          </div>

          {/* Close button on Mobile */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(false)}
            className="md:hidden text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition"
            aria-label="Close navigation menu"
          >
            <X size={18} />
          </button>
        </div>

        {/* Grouped Navigation Links */}
        <nav className="flex-1 overflow-y-auto py-3 px-2 flex flex-col gap-4 scrollbar-thin">
          {NAV_GROUPS.map((group) => {
            const visibleItems = group.items.filter(
              (item) => isAdmin || item.roles.includes(user.role)
            );

            if (visibleItems.length === 0) return null;

            return (
              <div key={group.groupTitle} className="flex flex-col gap-0.5">
                <div className="text-[10px] uppercase font-bold text-slate-400/80 font-mono px-3 mb-1 tracking-wider">
                  {group.groupTitle}
                </div>

                {visibleItems.map((n) => {
                  const Icon = n.icon;
                  const toPath = `/${n.key}`;

                  return (
                    <NavLink
                      key={n.key}
                      to={toPath}
                      onClick={() => setMobileMenuOpen(false)}
                      className={({ isActive }) =>
                        `w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition ${
                          isActive
                            ? "bg-[var(--bg-sidebar-active)] text-[var(--sidebar-text-active)] font-bold shadow-sm"
                            : "text-[var(--sidebar-text)] hover:bg-[var(--bg-sidebar-hover)] hover:text-[var(--sidebar-text-hover)]"
                        }`
                      }
                    >
                      <Icon size={16} />
                      <span className="flex-1">{n.label}</span>
                      {n.key === "settings" && isAdmin && (
                        <span 
                          className="text-[9px] font-mono px-1.5 py-0.2 rounded font-bold text-white uppercase"
                          style={{ backgroundColor: activeTheme.primary }}
                        >
                          ALL
                        </span>
                      )}
                    </NavLink>
                  );
                })}
              </div>
            );
          })}
        </nav>

        {/* User Session Footer */}
        <div className="p-3 border-t border-[var(--border-sidebar)] bg-[var(--bg-sidebar)] shrink-0">
          <div className="flex items-center justify-between gap-2 p-2 rounded-lg bg-[var(--quick-action-bg)] border border-white/5">
            <div className="flex items-center gap-2.5 truncate">
              <div 
                className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
                style={{ backgroundColor: activeTheme.primary }}
              >
                {user.name ? user.name[0].toUpperCase() : "U"}
              </div>
              <div className="truncate">
                <div className="text-xs font-bold text-white truncate">{user.name}</div>
                <div className="text-[10px] text-slate-400 font-mono truncate">{user.role}</div>
              </div>
            </div>
            <button
              onClick={handleLogout}
              title="Sign Out"
              aria-label="Sign Out"
              className="text-slate-400 hover:text-rose-400 p-1.5 rounded-lg hover:bg-white/5 transition shrink-0"
            >
              <LogOut size={15} />
            </button>
          </div>
        </div>
      </aside>

      {/* MAIN CONTAINER */}
      <div className="flex-1 flex flex-col h-full overflow-hidden min-w-0">
        
        {/* TOP HEADER BAR */}
        <header className="h-14 shrink-0 bg-[var(--bg-card)] border-b border-[var(--border-color)] px-4 sm:px-6 flex items-center justify-between z-10">
          <div className="flex items-center gap-3">
            {/* Hamburger button on mobile */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className="md:hidden p-1.5 rounded-lg bg-[var(--bg-main)] hover:bg-[var(--bg-card-hover)] border border-[var(--border-color)] text-[var(--text-primary)] transition"
              aria-label="Open Navigation Menu"
            >
              <Menu size={18} />
            </button>

            {/* Breadcrumbs */}
            <div className="flex items-center gap-2 text-xs font-medium text-[var(--text-muted)]">
              <span className="hidden sm:inline">StockFlow ERP</span>
              <span className="hidden sm:inline">/</span>
              <span className="text-[var(--text-primary)] font-bold capitalize">
                {currentPathName}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            {/* Real-time Low Stock Alerts & Notifications */}
            <NotificationDropdown />

            {/* Font Switcher Dropdown */}
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setFontDropdownOpen(!fontDropdownOpen);
                  setThemeDropdownOpen(false);
                }}
                aria-label="Select typography"
                className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg bg-[var(--bg-main)] hover:bg-[var(--bg-card-hover)] border border-[var(--border-color)] text-xs font-medium text-[var(--text-primary)] transition"
              >
                <Type size={14} className="text-[var(--text-muted)]" />
                <span className="hidden sm:inline">{activeFont.name}</span>
                <ChevronDown size={13} className="text-[var(--text-muted)]" />
              </button>

              {fontDropdownOpen && (
                <div className="absolute right-0 mt-1.5 w-40 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl shadow-xl p-1.5 z-50 animate-in fade-in">
                  <div className="text-[10px] font-bold text-[var(--text-muted)] uppercase px-2 py-1">Select Typography</div>
                  {fonts.map((f) => (
                    <button
                      key={f.id}
                      onClick={() => {
                        setFont(f.id);
                        setFontDropdownOpen(false);
                      }}
                      className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition ${
                        font === f.id
                          ? "bg-[var(--accent-color)] text-[var(--accent-text)] font-bold"
                          : "text-[var(--text-primary)] hover:bg-[var(--bg-card-hover)]"
                      }`}
                    >
                      <span className={f.fontClass}>{f.name}</span>
                      {font === f.id && <Check size={13} />}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Color Theme Selector Dropdown */}
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setThemeDropdownOpen(!themeDropdownOpen);
                  setFontDropdownOpen(false);
                }}
                aria-label="Select theme"
                className="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1.5 rounded-lg bg-[var(--bg-main)] hover:bg-[var(--bg-card-hover)] border border-[var(--border-color)] text-xs font-semibold text-[var(--text-primary)] transition"
              >
                <div 
                  className="w-3 h-3 rounded-full shrink-0 shadow-sm"
                  style={{ backgroundColor: activeTheme.primary }} 
                />
                <span className="hidden sm:inline">{activeTheme.name}</span>
                <ChevronDown size={13} className="text-[var(--text-muted)]" />
              </button>

              {themeDropdownOpen && (
                <div className="absolute right-0 mt-1.5 w-48 sm:w-52 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl shadow-xl p-1.5 z-50 animate-in fade-in">
                  <div className="text-[10px] font-bold text-[var(--text-muted)] uppercase px-2 py-1 flex items-center justify-between">
                    <span>App Color Base</span>
                    <Sparkles size={11} className="text-[var(--accent-color)]" />
                  </div>
                  {themes.map((t) => (
                    <button
                      key={t.id}
                      onClick={() => {
                        setTheme(t.id);
                        setThemeDropdownOpen(false);
                      }}
                      className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-xs transition ${
                        theme === t.id
                          ? "bg-[var(--accent-color)] text-[var(--accent-text)] font-bold"
                          : "text-[var(--text-primary)] hover:bg-[var(--bg-card-hover)]"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-3.5 h-3.5 rounded-full border border-white/20 shadow-sm" 
                          style={{ backgroundColor: t.primary }} 
                        />
                        <span>{t.name}</span>
                      </div>
                      {theme === t.id && <Check size={14} />}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Dynamic Main Page Content with Suspense Code-Splitting */}
        <main 
          className="flex-1 overflow-y-auto p-4 sm:p-6 bg-[var(--bg-main)]"
          onClick={() => {
            setThemeDropdownOpen(false);
            setFontDropdownOpen(false);
          }}
        >
          <Suspense fallback={<PageLoader />}>
            <Outlet />
          </Suspense>
        </main>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route
          path="/login"
          element={
            <PublicRoute>
              <Login />
            </PublicRoute>
          }
        />
        <Route
          element={
            <ProtectedRoute>
              <MainLayout />
            </ProtectedRoute>
          }
        >
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<RoleProtectedRoute roles={getRoles("dashboard")}><Dashboard /></RoleProtectedRoute>} />
          <Route path="/products" element={<RoleProtectedRoute roles={getRoles("products")}><ProductsPage /></RoleProtectedRoute>} />
          <Route path="/categories" element={<RoleProtectedRoute roles={getRoles("categories")}><CategoriesPage /></RoleProtectedRoute>} />
          <Route path="/suppliers" element={<RoleProtectedRoute roles={getRoles("suppliers")}><PartyPage type="supplier" /></RoleProtectedRoute>} />
          <Route path="/customers" element={<RoleProtectedRoute roles={getRoles("customers")}><PartyPage type="customer" /></RoleProtectedRoute>} />
          <Route path="/warehouses" element={<RoleProtectedRoute roles={getRoles("warehouses")}><WarehousesPage /></RoleProtectedRoute>} />
          <Route path="/branches" element={<RoleProtectedRoute roles={getRoles("branches")}><BranchesPage /></RoleProtectedRoute>} />
          <Route path="/inventory" element={<RoleProtectedRoute roles={getRoles("inventory")}><InventoryPage /></RoleProtectedRoute>} />
          <Route path="/purchases" element={<RoleProtectedRoute roles={getRoles("purchases")}><PurchasesPage /></RoleProtectedRoute>} />
          <Route path="/sales" element={<RoleProtectedRoute roles={getRoles("sales")}><SalesPage /></RoleProtectedRoute>} />
          <Route path="/transfers" element={<RoleProtectedRoute roles={getRoles("transfers")}><TransfersPage /></RoleProtectedRoute>} />
          <Route path="/reports" element={<RoleProtectedRoute roles={getRoles("reports")}><ReportsPage /></RoleProtectedRoute>} />
          <Route path="/settings" element={<RoleProtectedRoute roles={getRoles("settings")}><SettingsPage /></RoleProtectedRoute>} />
        </Route>
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </Suspense>
  );
}
