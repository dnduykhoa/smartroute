import { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authService } from '../../services/api';
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
} from 'lucide-react';

const iconMap = {
  LayoutDashboard,
  Package,
  Users,
  Route,
  Truck,
};

const stats = [
  {
    label: 'Đơn giao hôm nay',
    value: '124',
    icon: Route,
    color: 'text-indigo-600',
    bg: 'bg-indigo-50',
  },
  {
    label: 'Tài xế hoạt động',
    value: '38',
    icon: Truck,
    color: 'text-emerald-600',
    bg: 'bg-emerald-50',
  },
  {
    label: 'Đơn lỗi cần xử lý',
    value: '6',
    icon: ShieldCheck,
    color: 'text-rose-600',
    bg: 'bg-rose-50',
  },
  {
    label: 'Tăng trưởng tuần',
    value: '+14%',
    icon: ChartNoAxesCombined,
    color: 'text-amber-600',
    bg: 'bg-amber-50',
  },
];

export default function AdminDashboard() {
  const navigate = useNavigate();
  const user = authService.getUser();
  const roleName = user?.role?.name?.toLowerCase();
  const isAdminOrModerator = ['admin', 'moderator'].includes(roleName);

  useEffect(() => {
    if (!authService.isLoggedIn()) {
      navigate('/login');
      return;
    }

    if (!isAdminOrModerator) {
      navigate('/');
    }
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

          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
            <h3 className="font-semibold text-slate-900 mb-3">Gợi ý bước tiếp theo</h3>
            <ul className="space-y-2 text-sm text-slate-600">
              <li>- Kết nối trang quản lý đơn hàng vào API thực tế.</li>
              <li>- Thêm biểu đồ theo ngày/tuần cho hiệu suất tài xế.</li>
              <li>- Bật phân quyền chi tiết cho từng menu quản trị.</li>
            </ul>
          </div>
        </main>
      </div>
    </div>
  );
}
