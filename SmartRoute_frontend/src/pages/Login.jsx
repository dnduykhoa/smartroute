import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { authService } from '../services/api';
import { Eye, EyeOff, LogIn, AlertCircle, Lock, User, Key, Clock, Check } from 'lucide-react';

export default function Login() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    username: '',
    password: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await authService.login(formData);

      if (response.data.success) {
        localStorage.setItem('token', response.data.token);
        localStorage.setItem('user', JSON.stringify(response.data.user));

        const tokenParts = response.data.token.split('.');
        if (tokenParts[1]) {
          try {
            const payload = JSON.parse(atob(tokenParts[1]));
            if (payload?.exp) {
              localStorage.setItem('token_expires_at', String(payload.exp * 1000));
            }
          } catch {
            localStorage.removeItem('token_expires_at');
          }
        }

        window.dispatchEvent(new Event('auth-change'));

        setFormData({ username: '', password: '' });
        const roleName = response.data.user?.role?.name?.toLowerCase();
        navigate(roleName === 'admin' ? '/admin' : '/');
      }
    } catch (err) {
      setError(
        err.response?.data?.message ||
        'Lỗi đăng nhập. Vui lòng kiểm tra thông tin.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-500 to-indigo-700 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-lg shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-indigo-600 to-indigo-700 p-8 text-center text-white">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Lock className="w-7 h-7" />
              <h1 className="text-3xl font-bold">Đăng Nhập</h1>
            </div>
            <p className="text-indigo-100">Vào hệ thống SmartRoute</p>
          </div>

          {/* Form */}
          <div className="p-8">
            {error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex gap-3">
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label htmlFor="username" className="flex items-center gap-2 text-sm font-medium text-slate-700 mb-2">
                  <User className="w-4 h-4" />
                  Tên Đăng Nhập
                </label>
                <input
                  type="text"
                  id="username"
                  name="username"
                  value={formData.username}
                  onChange={handleChange}
                  placeholder="Nhập tên đăng nhập"
                  required
                  disabled={loading}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:border-transparent disabled:bg-slate-100 disabled:cursor-not-allowed"
                />
              </div>

              <div>
                <label htmlFor="password" className="flex items-center gap-2 text-sm font-medium text-slate-700 mb-2">
                  <Key className="w-4 h-4" />
                  Mật Khẩu
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    id="password"
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    placeholder="Nhập mật khẩu"
                    required
                    disabled={loading}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:border-transparent disabled:bg-slate-100 disabled:cursor-not-allowed pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-500 hover:text-slate-700"
                    disabled={loading}
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 px-4 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 transition-colors disabled:bg-slate-400 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <LogIn className="w-5 h-5" />
                {loading ? 'Đang đăng nhập...' : 'Đăng Nhập'}
              </button>
            </form>

            {/* Footer */}
            <div className="mt-6 space-y-4 text-center text-sm">
              <p className="text-slate-600">
                Chưa có tài khoản?{' '}
                <Link to="/register" className="text-indigo-600 font-semibold hover:text-indigo-700">
                  Đăng ký ngay
                </Link>
              </p>
              <p className="text-slate-600">
                <Link to="/forgot-password" className="text-indigo-600 font-semibold hover:text-indigo-700">
                  Quên mật khẩu?
                </Link>
              </p>
              <Link to="/" className="inline-block text-indigo-600 hover:text-indigo-700 font-medium">
                ← Quay lại trang chủ
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
