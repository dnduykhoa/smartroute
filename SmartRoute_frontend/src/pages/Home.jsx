import { Link } from 'react-router-dom';
import { authService } from '../services/api';
import { MapPin, Users, TrendingUp, Activity, DollarSign, Shield, ArrowRight, Truck, Sparkles, Waves, CreditCard } from 'lucide-react';

export default function Home() {
  const isLoggedIn = authService.isLoggedIn();
  const user = authService.getUser();
  const roleName = user?.role?.name?.toLowerCase();
  const hasAdminAccess = ['admin', 'moderator'].includes(roleName);

  const features = [
    {
      icon: <MapPin className="w-8 h-8" />,
      title: 'Tối Ưu Con Đường',
      description: 'Sử dụng AI để tìm con đường ngắn nhất và tiết kiệm chi phí nhất'
    },
    {
      icon: <TrendingUp className="w-8 h-8" />,
      title: 'Thống Kê Chi Tiết',
      description: 'Xem báo cáo chi tiết về hiệu suất giao hàng, chi phí, và khách hàng'
    },
    {
      icon: <Users className="w-8 h-8" />,
      title: 'Quản Lý Tài Xế',
      description: 'Theo dõi tài xế, giao công việc, kiểm tra hiệu suất làm việc'
    },
    {
      icon: <Activity className="w-8 h-8" />,
      title: 'Theo Dõi Real-time',
      description: 'Theo dõi vị trí giao hàng real-time, thông báo tự động'
    },
    {
      icon: <DollarSign className="w-8 h-8" />,
      title: 'Giảm Chi Phí',
      description: 'Tối ưu hóa lộ trình giúp giảm 30% chi phí vận chuyển'
    },
    {
      icon: <Shield className="w-8 h-8" />,
      title: 'An Toàn & Bảo Mật',
      description: 'Xác thực hai lớp, mã hóa dữ liệu, bảo vệ thông tin'
    }
  ];

  const pricing = [
    {
      name: 'Basic',
      price: 'Miễn Phí',
      features: [
        'Quản lý tối đa 100 đơn hàng/tháng',
        '5 tài xế',
        'Báo cáo cơ bản'
      ]
    },
    {
      name: 'Professional',
      price: '$99/tháng',
      popular: true,
      features: [
        'Quản lý không giới hạn',
        '50 tài xế',
        'Báo cáo chi tiết & AI',
        'Hỗ trợ 24/7'
      ]
    },
    {
      name: 'Enterprise',
      price: 'Liên Hệ',
      features: [
        'Toàn bộ tính năng',
        'Tài xế không giới hạn',
        'API tích hợp',
        'Dedicated support'
      ]
    }
  ];

  return (
    <div className="flex flex-col min-h-screen">
      {/* Hero Section */}
      <section className="bg-gradient-to-r from-indigo-600 to-indigo-700 text-white py-16 md:py-24">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center">
            <div className="flex items-center justify-center gap-3 mb-4">
              <Truck className="w-10 h-10" />
              <h1 className="text-4xl md:text-5xl font-bold">
                SmartRoute
              </h1>
            </div>
            <p className="text-xl md:text-2xl text-indigo-100 mb-2">
              Giải Pháp Giao Hàng Thông Minh
            </p>
            <p className="text-lg text-indigo-200 mb-8">
              Quản lý giao hàng hiệu quả, tối ưu con đường, giảm chi phí vận chuyển
            </p>

            {isLoggedIn && hasAdminAccess ? (
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link
                  to="/admin"
                  className="px-6 py-3 bg-white text-indigo-600 font-semibold rounded-lg hover:bg-indigo-50 transition-colors flex items-center justify-center gap-2"
                >
                  Vào Dashboard
                  <ArrowRight className="w-5 h-5" />
                </Link>
                <Link
                  to="/admin/orders"
                  className="px-6 py-3 bg-indigo-800 text-white font-semibold rounded-lg hover:bg-indigo-900 transition-colors border border-indigo-500"
                >
                  Quản Lý Đơn Hàng
                </Link>
              </div>
            ) : isLoggedIn ? (
              <div className="flex flex-col items-center gap-3">
                <p className="text-lg text-indigo-100">
                  Xin chào, <span className="font-semibold text-white">{user?.fullName || user?.username}</span>
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Link
                    to="/"
                    onClick={() => authService.logout()}
                    className="px-6 py-3 bg-white text-indigo-600 font-semibold rounded-lg hover:bg-indigo-50 transition-colors flex items-center justify-center gap-2"
                  >
                    Đăng Xuất
                    <ArrowRight className="w-5 h-5" />
                  </Link>
                </div>
              </div>
            ) : (
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link
                  to="/login"
                  className="px-6 py-3 bg-white text-indigo-600 font-semibold rounded-lg hover:bg-indigo-50 transition-colors flex items-center justify-center gap-2"
                >
                  Đăng Nhập
                  <ArrowRight className="w-5 h-5" />
                </Link>
                <Link
                  to="/register"
                  className="px-6 py-3 bg-indigo-800 text-white font-semibold rounded-lg hover:bg-indigo-900 transition-colors border border-indigo-500"
                >
                  Đăng Ký Ngay
                </Link>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 md:py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-12">
            <div className="flex items-center justify-center gap-2 mb-4">
              <Sparkles className="w-8 h-8 text-indigo-600" />
              <h2 className="text-3xl md:text-4xl font-bold text-slate-900">
                Các Tính Năng Chính
              </h2>
            </div>
            <p className="text-lg text-slate-600">
              Tất cả những gì bạn cần để quản lý giao hàng hiệu quả
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, idx) => (
              <div
                key={idx}
                className="p-6 bg-gradient-to-br from-slate-50 to-slate-100 rounded-lg border border-slate-200 hover:shadow-lg transition-shadow"
              >
                <div className="text-indigo-600 mb-4">{feature.icon}</div>
                <h3 className="text-lg font-semibold text-slate-900 mb-2">
                  {feature.title}
                </h3>
                <p className="text-slate-600 text-sm">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Welcome Section (for logged in users) */}
      {isLoggedIn && (
        <section className="bg-indigo-50 py-12">
          <div className="max-w-7xl mx-auto px-4 text-center">
            <div className="flex items-center justify-center gap-2 mb-3">
              <Waves className="w-8 h-8 text-indigo-600" />
              <h2 className="text-2xl md:text-3xl font-bold text-slate-900">
                Chào Mừng, {user?.fullName || user?.username}!
              </h2>
            </div>
            <p className="text-slate-600 mb-2">
              Bạn đã đăng nhập thành công vào hệ thống SmartRoute
            </p>
            <p className="text-slate-600">
              Vai trò: <span className="font-semibold">{user?.role?.name || 'User'}</span>
            </p>
          </div>
        </section>
      )}

      {/* Pricing Section */}
      <section className="py-16 md:py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-12">
            <div className="flex items-center justify-center gap-2 mb-4">
              <CreditCard className="w-8 h-8 text-indigo-600" />
              <h2 className="text-3xl md:text-4xl font-bold text-slate-900">
                Gói Dịch Vụ
              </h2>
            </div>
            <p className="text-lg text-slate-600">
              Chọn gói phù hợp với nhu cầu của bạn
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
            {pricing.map((plan, idx) => (
              <div
                key={idx}
                className={`rounded-lg border-2 overflow-hidden transition-all ${
                  plan.popular
                    ? 'border-indigo-600 shadow-lg md:scale-105'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className={`p-6 ${plan.popular ? 'bg-indigo-600 text-white' : 'bg-slate-50'}`}>
                  <h3 className="text-xl font-bold mb-2">{plan.name}</h3>
                  <div className="text-3xl font-bold mb-1">{plan.price}</div>
                  {plan.popular && (
                    <div className="text-sm text-indigo-100">Được ưa chuộng nhất</div>
                  )}
                </div>

                <div className="p-6">
                  <ul className="space-y-3 mb-6">
                    {plan.features.map((feature, i) => (
                      <li key={i} className="flex items-start gap-3">
                        <span className={`font-bold text-lg flex-shrink-0 ${
                          plan.popular ? 'text-indigo-600' : 'text-green-600'
                        }`}>
                          ✓
                        </span>
                        <span className="text-slate-600 text-sm">{feature}</span>
                      </li>
                    ))}
                  </ul>

                  <button
                    className={`w-full py-2 px-4 rounded-lg font-semibold transition-colors ${
                      plan.popular
                        ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    Chọn Gói
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
