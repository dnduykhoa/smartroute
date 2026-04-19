import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { analyticsService, authService } from '../../services/api';
import { getMenuItems } from '../../utils/rolePermissions';
import {
  LayoutDashboard,
  Package,
  Users,
  Route,
  ChartNoAxesCombined,
  ShieldCheck,
  LogOut,
  Truck,
  BarChart3,
} from 'lucide-react';

const iconMap = {
  LayoutDashboard,
  Package,
  Users,
  Route,
  Truck,
};

function formatPercent(value) {
  if (typeof value !== 'number' || Number.isNaN(value)) return '0%';
  return `${value >= 0 ? '+' : ''}${value}%`;
}

function MiniBarChart({ title, subtitle, series, colorClass = 'bg-indigo-500' }) {
  const values = Array.isArray(series) ? series.map((item) => Number(item?.value || 0)) : [];
  const max = Math.max(...values, 1);

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
      <div className="flex items-start justify-between gap-3 mb-5">
        <div>
          <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
          <p className="text-sm text-slate-500 mt-1">{subtitle}</p>
        </div>
        <BarChart3 className="w-5 h-5 text-slate-400" />
      </div>

      <div className="flex items-end gap-3 h-56">
        {series.map((item) => {
          const height = `${Math.max((Number(item.value || 0) / max) * 100, 8)}%`;

          return (
            <div key={item.label} className="flex-1 flex flex-col items-center justify-end h-full min-w-0">
              <div className="w-full flex flex-col items-center justify-end flex-1">
                <div className="text-xs font-semibold text-slate-700 mb-2">{item.value}</div>
                <div className="w-full flex-1 flex items-end">
                  <div
                    className={`w-full ${colorClass} rounded-t-xl transition-all duration-300`}
                    style={{ height }}
                    title={`${item.label}: ${item.value}`}
                  />
                </div>
              </div>
              <span className="text-xs text-slate-500 mt-3 whitespace-nowrap overflow-hidden text-ellipsis w-full text-center">
                {item.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

const demoTopDrivers = [
  { id: 'demo-1', username: 'driver01', fullName: 'Nguyen Van A', totalOrders: 18, confirmedOrders: 15 },
  { id: 'demo-2', username: 'driver02', fullName: 'Tran Thi B', totalOrders: 14, confirmedOrders: 11 },
  { id: 'demo-3', username: 'driver03', fullName: 'Le Van C', totalOrders: 10, confirmedOrders: 9 },
  { id: 'demo-4', username: 'driver04', fullName: 'Pham Thi D', totalOrders: 7, confirmedOrders: 5 },
  { id: 'demo-5', username: 'driver05', fullName: 'Hoang Van E', totalOrders: 4, confirmedOrders: 3 },
];

export default function AdminDashboard() {
  const navigate = useNavigate();
  const user = authService.getUser();
  const roleName = user?.role?.name?.toLowerCase();
  const isAdminOrModerator = ['admin', 'moderator'].includes(roleName);
  const [summary, setSummary] = useState(null);
  const [trends, setTrends] = useState([]);
  const [insights, setInsights] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!authService.isLoggedIn()) {
      navigate('/login');
      return;
    }

    if (!isAdminOrModerator) {
      navigate('/');
      return;
    }

    let mounted = true;

    const loadSummary = async () => {
      setLoading(true);
      setError('');

      try {
        const [summaryResponse, trendsResponse] = await Promise.all([
          analyticsService.getSummary(),
          analyticsService.getTrends({ days: 7 })
        ]);
        if (mounted) {
          setSummary(summaryResponse.data?.summary || null);
          setTrends(trendsResponse.data?.series || []);
          const insightsResponse = await analyticsService.getInsights({ limit: 5 });
          setInsights(insightsResponse.data?.insights || null);
        }
      } catch (err) {
        if (mounted) {
          setError(err.response?.data?.message || 'Không thể tải dữ liệu dashboard');
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    loadSummary();

    return () => {
      mounted = false;
    };
  }, [isAdminOrModerator, navigate]);

  if (!authService.isLoggedIn() || !isAdminOrModerator) {
    return null;
  }

  const handleLogout = () => {
    authService.logout();
    navigate('/');
  };

  const initials = (user?.fullName || user?.username || 'AD').slice(0, 2).toUpperCase();
  const menuItems = getMenuItems(roleName);

  const stats = useMemo(() => [
    {
      label: 'Đơn giao hôm nay',
      value: loading ? '...' : String(summary?.todayOrders ?? 0),
      icon: Route,
      color: 'text-indigo-600',
      bg: 'bg-indigo-50',
    },
    {
      label: 'Tài xế hoạt động',
      value: loading ? '...' : String(summary?.activeDrivers ?? 0),
      icon: Truck,
      color: 'text-emerald-600',
      bg: 'bg-emerald-50',
    },
    {
      label: 'Đơn lỗi cần xử lý',
      value: loading ? '...' : String(summary?.pendingOrders ?? 0),
      icon: ShieldCheck,
      color: 'text-rose-600',
      bg: 'bg-rose-50',
    },
    {
      label: 'Tăng trưởng tuần',
      value: loading ? '...' : `${summary?.orderGrowthPercent >= 0 ? '+' : ''}${summary?.orderGrowthPercent ?? 0}%`,
      icon: ChartNoAxesCombined,
      color: 'text-amber-600',
      bg: 'bg-amber-50',
    },
  ], [loading, summary]);

  const chartSeries = useMemo(() => {
    return trends.map((item) => ({
      label: item.label,
      orders: item.orders ?? 0,
      newUsers: item.newUsers ?? 0,
      confirmedOrders: item.confirmedOrders ?? 0,
    }));
  }, [trends]);

  const ordersSeries = chartSeries.map((item) => ({ label: item.label, value: item.orders }));
  const usersSeries = chartSeries.map((item) => ({ label: item.label, value: item.newUsers }));
  const confirmedRate = summary && summary.totalOrders > 0
    ? Math.round((summary.confirmedOrders / summary.totalOrders) * 100)
    : 0;

  const methodSeries = useMemo(() => {
    return (insights?.orderMethods || []).map((item) => ({
      label: item.label,
      value: item.value ?? 0
    }));
  }, [insights]);

  const topDrivers = (insights?.topDrivers && insights.topDrivers.length > 0)
    ? insights.topDrivers
    : demoTopDrivers;

  return (
    <div className="min-h-screen flex bg-slate-100">
      <aside className="w-64 bg-slate-950 text-white flex flex-col shrink-0 shadow-xl">
        <div className="px-5 py-5 border-b border-slate-800">
          <Link to="/admin" className="flex items-center gap-3">
            <div className="w-9 h-9 bg-indigo-600 rounded-xl flex items-center justify-center">
              <LayoutDashboard className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="font-bold text-sm">SmartRoute</p>
              <p className="text-xs text-slate-400">
                {roleName === 'admin' ? 'Admin Panel' : 'Moderator Panel'}
              </p>
            </div>
          </Link>
        </div>

        <nav className="px-3 py-4 space-y-1 flex-1">
          {menuItems.map((item) => {
            const Icon = iconMap[item.icon];
            const isActive = window.location.pathname === item.href;
            return (
              <Link
                key={item.href}
                to={item.href}
                className={`w-full text-left flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-indigo-600 text-white'
                    : 'text-slate-400 hover:bg-slate-800 hover:text-slate-100'
                }`}
              >
                <Icon className="w-4 h-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="px-3 py-4 border-t border-slate-800">
          <div className="flex items-center gap-3 px-3 py-2 mb-2">
            <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-xs font-bold">
              {initials}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-slate-200 truncate">{user?.fullName || user?.username}</p>
              <p className="text-xs text-slate-500 truncate">{user?.email}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-slate-400 hover:bg-slate-800 hover:text-rose-400 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Đăng xuất
          </button>
        </div>
      </aside>

      <div className="flex-1 min-w-0 flex flex-col">
        <header className="h-14 bg-white border-b border-slate-200 px-6 flex items-center justify-between">
          <h1 className="text-slate-800 font-semibold">Tổng quan hệ thống</h1>
          <Link to="/" className="text-sm text-indigo-600 hover:text-indigo-700 font-medium">
            Về trang chủ
          </Link>
        </header>

        <main className="p-6 space-y-6">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Dashboard</h2>
            <p className="text-sm text-slate-500 mt-1">Theo dõi hoạt động giao hàng và tình trạng hệ thống</p>
            {error && (
              <p className="text-sm text-rose-600 mt-2">{error}</p>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            {stats.map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.label} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
                  <div className={`w-10 h-10 rounded-xl ${item.bg} flex items-center justify-center mb-3`}>
                    <Icon className={`w-5 h-5 ${item.color}`} />
                  </div>
                  <p className="text-2xl font-bold text-slate-900">{item.value}</p>
                  <p className="text-sm text-slate-500 mt-1">{item.label}</p>
                </div>
              );
            })}
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            <MiniBarChart
              title="Đơn hàng 7 ngày gần nhất"
              subtitle="Số đơn tạo mới theo từng ngày"
              series={ordersSeries}
              colorClass="bg-indigo-500"
            />

            <MiniBarChart
              title="Người dùng mới 7 ngày gần nhất"
              subtitle="Số tài khoản mới được tạo theo từng ngày"
              series={usersSeries}
              colorClass="bg-emerald-500"
            />
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            <MiniBarChart
              title="Đơn hàng theo phương thức"
              subtitle="So sánh số đơn online và offline"
              series={methodSeries}
              colorClass="bg-amber-500"
            />

            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
              <div className="flex items-start justify-between gap-3 mb-5">
                <div>
                  <h3 className="text-lg font-semibold text-slate-900">Top tài xế</h3>
                  <p className="text-sm text-slate-500 mt-1">Xếp hạng theo số đơn đã tạo</p>
                </div>
                <Truck className="w-5 h-5 text-slate-400" />
              </div>

              <div className="space-y-4">
                {topDrivers.length > 0 ? topDrivers.map((driver, index) => {
                  const maxOrders = Math.max(...topDrivers.map((item) => item.totalOrders || 0), 1);
                  const width = `${Math.max(((driver.totalOrders || 0) / maxOrders) * 100, 8)}%`;

                  return (
                    <div key={driver.id} className="rounded-xl border border-slate-200 p-4">
                      <div className="flex items-center justify-between gap-4 mb-3">
                        <div>
                          <p className="font-semibold text-slate-900">#{index + 1} {driver.fullName}</p>
                          <p className="text-xs text-slate-500">@{driver.username}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-bold text-slate-900">{driver.totalOrders} đơn</p>
                          <p className="text-xs text-slate-500">{driver.confirmedOrders} đã xác nhận</p>
                        </div>
                      </div>
                      <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                        <div className="h-full rounded-full bg-gradient-to-r from-amber-500 to-rose-500" style={{ width }} />
                      </div>
                    </div>
                  );
                }) : (
                  <p className="text-sm text-slate-500">Chưa có dữ liệu tài xế.</p>
                )}
              </div>
            </div>
          </div>

        </main>
      </div>
    </div>
  );
}
