import { Link } from 'react-router-dom';
import { Truck, Mail, Phone, MapPin } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="bg-slate-900 text-slate-300 mt-16">
      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
          {/* Brand */}
          <div>
            <div className="flex items-center gap-2 text-white font-bold text-lg mb-3">
              <div className="w-7 h-7 bg-indigo-600 rounded-lg flex items-center justify-center">
                <Truck className="w-4 h-4 text-white" />
              </div>
              SmartRoute
            </div>
            <p className="text-sm text-slate-400 leading-relaxed">
              Giải pháp quản lý giao hàng thông minh — tối ưu lộ trình, 
              giảm chi phí vận chuyển, tăng hiệu suất giao hàng.
            </p>
            <div className="mt-4 space-y-2 text-xs text-slate-500">
              <div className="flex items-center gap-2">
                <Mail className="w-3.5 h-3.5 flex-shrink-0" />
                <span>support@smartroute.vn</span>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="w-3.5 h-3.5 flex-shrink-0" />
                <span>1800 123 456</span>
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
                <span>Hà Nội, Việt Nam</span>
              </div>
            </div>
          </div>

          {/* Links */}
          <div>
            <h4 className="text-white font-semibold mb-4 text-sm uppercase tracking-wide">Dịch Vụ</h4>
            <ul className="space-y-2.5 text-sm">
              <li>
                <Link to="/" className="hover:text-indigo-300 transition-colors">Trang chủ</Link>
              </li>
              <li>
                <Link to="/" className="hover:text-indigo-300 transition-colors">Các tính năng</Link>
              </li>
              <li>
                <a href="#pricing" className="hover:text-indigo-300 transition-colors">Bảng giá</a>
              </li>
              <li>
                <a href="#" className="hover:text-indigo-300 transition-colors">Về chúng tôi</a>
              </li>
            </ul>
          </div>

          {/* Account */}
          <div>
            <h4 className="text-white font-semibold mb-4 text-sm uppercase tracking-wide">Tài Khoản</h4>
            <ul className="space-y-2.5 text-sm">
              <li>
                <Link to="/login" className="hover:text-indigo-300 transition-colors">Đăng nhập</Link>
              </li>
              <li>
                <Link to="/register" className="hover:text-indigo-300 transition-colors">Đăng ký tài khoản</Link>
              </li>
              <li>
                <a href="#" className="hover:text-indigo-300 transition-colors">Hỗ trợ khách hàng</a>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-slate-800 pt-6 flex flex-col md:flex-row items-center justify-between gap-2 text-xs text-slate-500">
          <p>&copy; {new Date().getFullYear()} SmartRoute. Tất cả quyền được bảo lưu.</p>
          <p>Được xây dựng bởi SmartRoute Team</p>
        </div>
      </div>
    </footer>
  );
}
