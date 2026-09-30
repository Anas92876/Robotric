import { useEffect, useState } from "react";
import { Routes, Route } from "react-router-dom";
import { useTranslation } from 'react-i18next';
import { api } from "../../lib/api";
import Posts from "../common/Posts";
import Projects from "../common/Projects";
import Teams from "../common/Teams";
import Competitions from "../common/Competitions";
import AdjustStockModal from "../../components/stock/AdjustStockModal";
import { PartFormModal } from "../../components/parts/PartFormModal";
import AdminHeader from "../../components/layout/AdminHeader";

type Order = {
  _id: string;
  status: string;
  studentId: string;
  items: { partId: { name: string }; qty: number }[];
  createdAt: string;
};

type Part = {
  _id: string;
  name: string;
  category?: string;
  description?: string;
  sku?: string;
  availableQty: number;
  reservedQty: number;
};

function Dashboard() {
  const { t, i18n } = useTranslation(['dashboardCommon', 'dashboardAdmin']);
  const isRTL = i18n.language === 'ar';
  const [stats, setStats] = useState({
    totalOrders: 0,
    pendingOrders: 0,
    lowStockParts: 0,
    totalParts: 0,
  });
  // Live low-stock alerts came over sockets; they return with the realtime phase.
  const [alerts] = useState<string[]>([]);
  const [ordersByDay, setOrdersByDay] = useState<number[]>([]);
  const [topParts, setTopParts] = useState<{ name: string; count: number }[]>(
    []
  );
  const [lowStock, setLowStock] = useState<
    { name: string; availableQty: number; reorderPoint: number }[]
  >([]);

  useEffect(() => {
    const loadStats = async () => {
      try {
        const [ordersRes, partsRes] = await Promise.all([
          api.get("/orders"),
          api.get("/parts"),
        ]);

        const orders = ordersRes.data;
        const parts = partsRes.data;

        setStats({
          totalOrders: orders.length,
          pendingOrders: orders.filter((o: Order) => o.status === "pending")
            .length,
          lowStockParts: parts.filter(
            (p: Part) => (p.availableQty || 0) <= 5
          ).length,
          totalParts: parts.length,
        });

        // Orders trend - last 7 days
        const days = Array.from({ length: 7 }).map((_, i) => {
          const d = new Date();
          d.setDate(d.getDate() - (6 - i));
          d.setHours(0, 0, 0, 0);
          return d.getTime();
        });
        const counts = days.map((start, idx) => {
          const end =
            idx < days.length - 1 ? days[idx + 1] : start + 24 * 60 * 60 * 1000;
          return orders.filter((o: any) => {
            const t = new Date(o.createdAt || 0).getTime();
            return t >= start && t < end;
          }).length;
        });
        setOrdersByDay(counts);

        // Top parts by ordered quantity
        const partCount: Record<string, number> = {};
        for (const o of orders) {
          for (const it of o.items || []) {
            const key = it.partId?.name || it.partId || "Unknown";
            partCount[key] = (partCount[key] || 0) + (it.qty || 0);
          }
        }
        const top = Object.entries(partCount)
          .map(([name, count]) => ({ name, count }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 5);
        setTopParts(top);

        // Low stock list
        setLowStock(
          parts
            .filter((p: Part) => (p.availableQty || 0) <= 5)
            .slice(0, 5)
            .map((p: Part) => ({
              name: p.name,
              availableQty: p.availableQty,
              reorderPoint: 5,
            }))
        );
      } catch (error) {
        console.error("Failed to load stats:", error);
      }
    };

    loadStats();
  }, []);

  const statCards = [
    {
      title: t('dashboardAdmin:totalOrders'),
      value: stats.totalOrders,
      color: "text-blue-400",
      bg: "from-blue-500/10 via-blue-400/5 to-transparent",
      icon: (
        <svg
          className="w-5 h-5 text-blue-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M3 7h18M6 10h12M4 14h16M6 18h12"
          />
        </svg>
      ),
    },
    {
      title: t('dashboardAdmin:pendingOrders'),
      value: stats.pendingOrders,
      color: "text-yellow-400",
      bg: "from-yellow-500/10 via-yellow-400/5 to-transparent",
      icon: (
        <svg
          className="w-5 h-5 text-yellow-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 8v4l3 3"
          />
        </svg>
      ),
    },
    {
      title: t('dashboardAdmin:inventory'),
      value: stats.lowStockParts,
      color: "text-red-400",
      bg: "from-red-500/10 via-red-400/5 to-transparent",
      icon: (
        <svg
          className="w-5 h-5 text-red-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 9v4m0 4h.01M4.93 19h14.14a2 2 0 001.73-3l-7.07-12a2 2 0 00-3.46 0l-7.07 12a2 2 0 001.73 3z"
          />
        </svg>
      ),
    },
    {
      title: t('dashboardAdmin:inventory'),
      value: stats.totalParts,
      color: "text-green-400",
      bg: "from-green-500/10 via-green-400/5 to-transparent",
      icon: (
        <svg
          className="w-5 h-5 text-green-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M3 7l9-4 9 4-9 4-9-4zM3 7v6l9 4 9-4V7"
          />
        </svg>
      ),
    },
  ];

  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-primary mb-2">
          {t('dashboardAdmin:adminDashboard')}
        </h1>
        <p className="text-ink/60">
          Manage your robotics inventory and orders
        </p>
      </div>

      {/* Alerts */}
      {alerts.length > 0 && (
        <div className="mb-6 bg-yellow-900/20 border border-yellow-900/30 rounded-xl p-4">
          <div className={`flex items-center gap-2 mb-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
            <svg
              className="w-5 h-5 text-yellow-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
              />
            </svg>
            <h3 className="font-semibold text-yellow-400">{t('dashboardAdmin:inventory')}</h3>
          </div>
          <ul className="space-y-1 text-sm text-ink/70">
            {alerts.map((alert, index) => (
              <li key={index}>• {alert}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((card, index) => (
          <div
            key={index}
            className="group relative bg-white rounded-xl sm:rounded-2xl p-6 border border-ink/20 hover:border-ink/40 hover:shadow-2xl transition-all duration-500 ease-out overflow-hidden hover:-translate-y-2"
          >
            {/* Animated Background Gradient on Hover */}
            <div className="absolute inset-0 bg-ink/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-xl sm:rounded-2xl -z-10" />
            
            {/* Shimmer Effect */}
            <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-in-out bg-transparent rounded-xl sm:rounded-2xl -z-10" />
            
            <div className={`relative z-10 flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
              <div>
                <div className="text-3xl font-bold inline-block" style={{ 
                  color: '#0f1f33',
                  backgroundClip: 'text'
                }}>
                  {card.value}
                </div>
                <h3 className="text-sm font-medium mt-1 transition-colors duration-300" style={{ color: '#0f1f33' }}>
                  {card.title}
                </h3>
              </div>
              <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ 
                background: '#0f1f33',
                color: '#eefcf1'
              }}>
                {card.icon}
              </div>
            </div>
            
            {/* Corner Decoration */}
            <div className="absolute top-0 right-0 w-20 h-20 bg-ink/5 rounded-bl-full opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          </div>
        ))}
      </div>

      {/* Analytics widgets */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
        {/* Orders Trend */}
        <div className="bg-white border border-ink/15 rounded-2xl p-6">
          <h3 className="text-ink font-semibold mb-3">
            {t('dashboardAdmin:orders')}
          </h3>
          {ordersByDay.length ? (
            <div className="flex items-end gap-2 h-24">
              {ordersByDay.map((v, i) => {
                const max = Math.max(1, ...ordersByDay);
                const h = Math.max(4, Math.round((v / max) * 96));
                return (
                  <div key={i} className="flex flex-col items-center">
                    <div
                      className="w-6 bg-primary/30 border border-primary/40 rounded-t"
                      style={{ height: `${h}px` }}
                    />
                    <span className="text-xs text-ink/60 mt-1">{v}</span>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-ink/60">No recent orders</div>
          )}
        </div>

        {/* Top Parts */}
        <div className="bg-white border border-ink/15 rounded-2xl p-6">
          <h3 className="text-ink font-semibold mb-3">{t('dashboardAdmin:inventory')}</h3>
          {topParts.length ? (
            <ul className="space-y-2">
              {topParts.map((p) => (
                <li
                  key={p.name}
                  className={`flex items-center justify-between text-sm ${isRTL ? 'flex-row-reverse' : ''}`}
                >
                  <span className="text-ink/80">{p.name}</span>
                  <span className="text-primary font-medium">× {p.count}</span>
                </li>
              ))}
            </ul>
          ) : (
            <div className="text-ink/60">No order items yet</div>
          )}
        </div>

        {/* Low Stock */}
        <div className="bg-white border border-ink/15 rounded-2xl p-6">
          <h3 className="text-ink font-semibold mb-3">{t('dashboardAdmin:inventory')}</h3>
          {lowStock.length ? (
            <ul className="space-y-2">
              {lowStock.map((p) => (
                <li
                  key={p.name}
                  className={`flex items-center justify-between text-sm ${isRTL ? 'flex-row-reverse' : ''}`}
                >
                  <span className="text-ink/80">{p.name}</span>
                  <span className="text-red-400">
                    {p.availableQty}/{p.reorderPoint}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <div className="text-ink/60">All stock above threshold</div>
          )}
        </div>
      </div>
    </div>
  );
}

function OrdersManagement() {
  const { t, i18n } = useTranslation(['dashboardCommon', 'dashboardAdmin']);
  const isRTL = i18n.language === 'ar';
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");

  useEffect(() => {
    // Live order updates return with the realtime phase.
    loadOrders();
  }, []);

  async function loadOrders() {
    try {
      const res = await api.get("/orders");
      setOrders(res.data);
    } catch (error) {
      console.error("Failed to load orders:", error);
    } finally {
      setLoading(false);
    }
  }

  async function handleOrderAction(
    id: string,
    action: "approve" | "reject" | "fulfill"
  ) {
    try {
      await api.post(`/orders/${id}/${action}`);
      await loadOrders();
    } catch (error) {
      console.error(`Failed to ${action} order:`, error);
    }
  }

  const filteredOrders = orders.filter(
    (order) => filter === "all" || order.status === filter
  );

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center">
        {/* Loading... */}
      </div>
    );
  }

  return (
    <div className="p-6">
      <AdminHeader
        title={t('dashboardAdmin:orders')}
        subtitle="Review and process student orders"
        breadcrumbs={[{ label: "Admin", to: "/admin" }, { label: "Orders" }]}
        actions={
          <select
            className="bg-white border border-ink/20 text-ink rounded-xl px-4 py-2 focus:border-primary focus:outline-none"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          >
            <option value="all">All Orders</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
            <option value="fulfilled">Fulfilled</option>
            <option value="cancelled">Cancelled</option>
          </select>
        }
      />

      <div className="space-y-4">
        {filteredOrders.map((order) => (
          <div
            key={order._id}
            className="bg-white border border-ink/15 rounded-2xl p-6 hover:border-primary/30 transition-all duration-300"
          >
            <div className={`flex justify-between items-start mb-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
              <div>
                <h3 className="text-lg font-semibold text-ink">
                  Order #{order._id.slice(-8)}
                </h3>
                <p className="text-ink/60 text-sm">
                  {new Date(order.createdAt).toLocaleDateString()}
                </p>
              </div>
              <span
                className={`px-3 py-1 rounded-full text-xs font-medium capitalize ${
                  order.status === "pending"
                    ? "bg-yellow-900/20 text-yellow-400"
                    : order.status === "approved"
                    ? "bg-blue-900/20 text-blue-400"
                    : order.status === "fulfilled"
                    ? "bg-green-900/20 text-green-400"
                    : order.status === "rejected"
                    ? "bg-red-900/20 text-red-400"
                    : "bg-ink/10 text-ink/60"
                }`}
              >
                {order.status}
              </span>
            </div>

            <div className="mb-4">
              <h4 className="text-ink font-medium mb-2">Items:</h4>
              <ul className="space-y-1">
                {order.items.map((item, idx) => (
                  <li key={idx} className="text-ink/70 text-sm">
                    • {item.partId?.name || "Unknown Part"} × {item.qty}
                  </li>
                ))}
              </ul>
            </div>

            {order.status === "pending" && (
              <div className={`flex gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                <button
                  onClick={() => handleOrderAction(order._id, "approve")}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors duration-300"
                >
                  Approve
                </button>
                <button
                  onClick={() => handleOrderAction(order._id, "reject")}
                  className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-medium transition-colors duration-300"
                >
                  Reject
                </button>
              </div>
            )}

            {order.status === "approved" && (
              <button
                onClick={() => handleOrderAction(order._id, "fulfill")}
                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium transition-colors duration-300"
              >
                Mark as Fulfilled
              </button>
            )}
          </div>
        ))}

        {filteredOrders.length === 0 && (
          <div className="text-center py-12">
            <svg
              className="w-16 h-16 text-gray-600 mx-auto mb-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
              />
            </svg>
            <p className="text-ink/60">{t('dashboardAdmin:noOrders')}</p>
          </div>
        )}
      </div>
    </div>
  );
}

function PartsManagement() {
  const { t, i18n } = useTranslation(['dashboardCommon', 'dashboardAdmin']);
  const isRTL = i18n.language === 'ar';
  const [parts, setParts] = useState<Part[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [adjustFor, setAdjustFor] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [partForm, setPartForm] = useState<{
    mode: "create" | "edit";
    initial?: any;
  } | null>(null);

  useEffect(() => {
    loadParts();
  }, []);

  async function loadParts() {
    try {
      const res = await api.get("/parts");
      setParts(res.data);
    } catch (error) {
      console.error("Failed to load parts:", error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center">
        {/* Loading... */}
      </div>
    );
  }

  return (
    <div className="p-6">
      <AdminHeader
        title={t('dashboardAdmin:inventory')}
        subtitle="Manage your inventory of robotics parts"
        breadcrumbs={[{ label: "Admin", to: "/admin" }, { label: "Parts" }]}
        actions={
          <>
            <input
              className="input w-64"
              placeholder="Search parts..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <button
              onClick={() => setPartForm({ mode: "create" })}
              className="btn"
            >
              Add Part
            </button>
          </>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {parts
          .filter((p) =>
            query.trim()
              ? (p.name || "").toLowerCase().includes(query.toLowerCase()) ||
                (p.category || "").toLowerCase().includes(query.toLowerCase())
              : true
          )
          .map((part) => (
            <div
              key={part._id}
              className="bg-white border border-ink/15 rounded-2xl p-6 hover:border-primary/30 transition-all duration-300"
            >
              <div className={`flex justify-between items-start mb-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-ink mb-1">
                    {part.name}
                  </h3>
                  {part.category && (
                    <span className="text-xs bg-ink/10 text-ink/70 px-2 py-1 rounded-full">
                      {part.category}
                    </span>
                  )}
                </div>
              </div>

              {part.description && (
                <p className="text-ink/60 text-sm mb-4">{part.description}</p>
              )}

              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="bg-ink/5 p-3 rounded-lg">
                  <p className="text-xs text-ink/60">Available</p>
                  <p className="text-xl font-bold text-green-400">
                    {part.availableQty}
                  </p>
                </div>
                <div className="bg-ink/5 p-3 rounded-lg">
                  <p className="text-xs text-ink/60">Reserved</p>
                  <p className="text-xl font-bold text-yellow-400">
                    {part.reservedQty}
                  </p>
                </div>
              </div>

              {/* Reorder point and price removed */}

              {(part.availableQty || 0) <= 5 && (
                <div className="bg-red-900/20 border border-red-900/30 text-red-400 px-3 py-2 rounded-lg text-sm mb-4">
                  <span className="font-medium">Low Stock Alert!</span>
                </div>
              )}

              <div className={`flex gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                <button
                  className="flex-1 bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 px-3 py-2 rounded-lg text-sm font-medium transition-colors duration-300"
                  onClick={() => setPartForm({ mode: "edit", initial: part })}
                >
                  Edit
                </button>
                <button
                  className="flex-1 bg-green-600/20 hover:bg-green-600/30 text-green-400 px-3 py-2 rounded-lg text-sm font-medium transition-colors duration-300"
                  onClick={() =>
                    setAdjustFor({ id: part._id, name: part.name })
                  }
                >
                  Adjust Stock
                </button>
              </div>
            </div>
          ))}
      </div>

      {parts.length === 0 && (
        <div className="text-center py-12">
          <svg
            className="w-16 h-16 text-gray-600 mx-auto mb-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
            />
          </svg>
          <p className="text-ink/60 mb-4">No parts found</p>
          <button
            onClick={() => setPartForm({ mode: "create" })}
            className="bg-primary hover:bg-primary-dark text-background px-6 py-2 rounded-xl font-semibold transition-all duration-300"
          >
            Add Your First Part
          </button>
        </div>
      )}

      {adjustFor && (
        <AdjustStockModal
          partId={adjustFor.id}
          partName={adjustFor.name}
          onClose={() => setAdjustFor(null)}
          onSuccess={async () => {
            const res = await api.get("/parts");
            setParts(res.data);
          }}
        />
      )}
      {partForm && (
        <PartFormModal
          part={partForm.initial}
          onClose={() => setPartForm(null)}
          onSaved={async () => {
            const res = await api.get("/parts");
            setParts(res.data);
          }}
        />
      )}
    </div>
  );
}

export default function AdminDashboard() {
  return (
    <Routes>
      <Route path="/" element={<Dashboard />} />
      <Route path="/orders" element={<OrdersManagement />} />
      <Route path="/parts" element={<PartsManagement />} />
      <Route
        path="/posts"
        element={
          <div className="p-6">
            <Posts />
          </div>
        }
      />
      <Route
        path="/projects"
        element={
          <div className="p-6">
            <Projects />
          </div>
        }
      />
      <Route
        path="/teams"
        element={
          <div className="p-6">
            <Teams />
          </div>
        }
      />
      <Route
        path="/competitions"
        element={
          <div className="p-6">
            <Competitions />
          </div>
        }
      />
    </Routes>
  );
}
