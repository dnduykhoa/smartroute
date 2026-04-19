import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { authService } from '../services/api';
import { AlertCircle, Lock, Mail, ArrowLeft, Check, Eye, EyeOff, Key } from 'lucide-react';

export default function ForgotPassword() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1); // Step 1: Email, Step 2: Reset
  const [email, setEmail] = useState('');
  const [resetData, setResetData] = useState({
    resetCode: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validateStrongPassword = (password) => {
    const errors = [];
    if (password.length < 8) errors.push('Tối thiểu 8 ký tự');
    if (!/[A-Z]/.test(password)) errors.push('Chứa chữ hoa (A-Z)');
    if (!/[a-z]/.test(password)) errors.push('Chứa chữ thường (a-z)');
    if (!/\d/.test(password)) errors.push('Chứa số (0-9)');
    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password))
      errors.push('Chứa ký tự đặc biệt (!@#$%^&* etc)');
    return { isValid: errors.length === 0, errors };
  };

  const handleRequestReset = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');

    if (!email.trim()) {
      setError('Vui lòng nhập email');
      return;
    }

    if (!validateEmail(email)) {
      setError('Email không hợp lệ');
      return;
    }

    setLoading(true);

    try {
      // Call API to send reset email
      const response = await authService.forgotPassword({ email });
      
      if (response.data.success) {
        setSuccessMessage('Email xác nhận đã được gửi. Vui lòng kiểm tra hộp thư của bạn.');
        setStep(2);
      } else {
        setError(response.data.message || 'Không thể gửi yêu cầu reset. Vui lòng thử lại.');
      }
    } catch (err) {
      setError(
        err.response?.data?.message ||
        'Không thể gửi yêu cầu reset. Vui lòng thử lại.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');

    if (!resetData.resetCode.trim()) {
      setError('Vui lòng nhập mã xác nhận');
      return;
    }

    if (!resetData.newPassword.trim()) {
      setError('Vui lòng nhập mật khẩu mới');
      return;
    }

    if (resetData.newPassword !== resetData.confirmPassword) {
      setError('Mật khẩu không trùng khớp');
      return;
    }

    const validation = validateStrongPassword(resetData.newPassword);
    if (!validation.isValid) {
      setError('Mật khẩu không đủ mạnh:\n' + validation.errors.join(', '));
      return;
    }

    setLoading(true);

    try {
      // Call API to reset password
      const response = await authService.resetPassword({
        token: resetData.resetCode,
        newPassword: resetData.newPassword
      });

      if (response.data.success) {
        setSuccessMessage('Mật khẩu đã được reset thành công!');
        
        setTimeout(() => {
          navigate('/login');
        }, 2000);
      } else {
        setError(response.data.message || 'Không thể reset mật khẩu.');
      }
    } catch (err) {
      setError(
        err.response?.data?.message ||
        'Không thể reset mật khẩu. Mã xác nhận có thể không đúng hoặc hết hạn.'
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
              <Key className="w-7 h-7" />
              <h1 className="text-3xl font-bold">Quên Mật Khẩu</h1>
            </div>
            <p className="text-indigo-100">
              {step === 1 ? 'Nhập email để reset mật khẩu' : 'Nhập mã xác nhận và mật khẩu mới'}
            </p>
          </div>

          {/* Form */}
          <div className="p-8">
            {error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex gap-3">
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
                <p className="text-sm text-red-700 whitespace-pre-line">{error}</p>
              </div>
            )}

            {successMessage && (
              <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg flex gap-3">
                <Check className="w-5 h-5 text-green-600 flex-shrink-0" />
                <p className="text-sm text-green-700">{successMessage}</p>
              </div>
            )}

            {/* Step 1: Email */}
            {step === 1 && (
              <form onSubmit={handleRequestReset} className="space-y-5">
                <div>
                  <label htmlFor="email" className="flex items-center gap-2 text-sm font-medium text-slate-700 mb-2">
                    <Mail className="w-4 h-4" />
                    Email
                  </label>
                  <input
                    type="email"
                    id="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Nhập email của bạn"
                    required
                    disabled={loading}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:border-transparent disabled:bg-slate-100 disabled:cursor-not-allowed"
                  />
                  <p className="text-xs text-slate-500 mt-2">
                    Chúng tôi sẽ gửi mã xác nhận đến email này
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 px-4 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 transition-colors disabled:bg-slate-400 disabled:cursor-not-allowed"
                >
                  {loading ? 'Đang xử lý...' : 'Gửi Yêu Cầu'}
                </button>
              </form>
            )}

            {/* Step 2: Reset Password */}
            {step === 2 && (
              <form onSubmit={handleResetPassword} className="space-y-5">
                <div>
                  <label htmlFor="resetCode" className="flex items-center gap-2 text-sm font-medium text-slate-700 mb-2">
                    Mã Xác Nhận
                  </label>
                  <input
                    type="text"
                    id="resetCode"
                    value={resetData.resetCode}
                    onChange={(e) => setResetData(prev => ({ ...prev, resetCode: e.target.value }))}
                    placeholder="Nhập mã từ email"
                    required
                    disabled={loading}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:border-transparent disabled:bg-slate-100 disabled:cursor-not-allowed"
                  />
                </div>

                <div>
                  <label htmlFor="newPassword" className="flex items-center gap-2 text-sm font-medium text-slate-700 mb-2">
                    <Lock className="w-4 h-4" />
                    Mật Khẩu Mới
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      id="newPassword"
                      value={resetData.newPassword}
                      onChange={(e) => setResetData(prev => ({ ...prev, newPassword: e.target.value }))}
                      placeholder="Nhập mật khẩu mới"
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

                <div>
                  <label htmlFor="confirmPassword" className="flex items-center gap-2 text-sm font-medium text-slate-700 mb-2">
                    Xác Nhận Mật Khẩu
                  </label>
                  <div className="relative">
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      id="confirmPassword"
                      value={resetData.confirmPassword}
                      onChange={(e) => setResetData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                      placeholder="Nhập lại mật khẩu mới"
                      required
                      disabled={loading}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:border-transparent disabled:bg-slate-100 disabled:cursor-not-allowed pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-500 hover:text-slate-700"
                      disabled={loading}
                    >
                      {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                  <p className="text-xs font-medium text-amber-900 mb-2">Yêu cầu mật khẩu mạnh:</p>
                  <ul className="text-xs text-amber-800 space-y-1">
                    <li>✓ Tối thiểu 8 ký tự</li>
                    <li>✓ Chứa chữ hoa (A-Z)</li>
                    <li>✓ Chứa chữ thường (a-z)</li>
                    <li>✓ Chứa số (0-9)</li>
                    <li>✓ Chứa ký tự đặc biệt (!@#$%^&* etc)</li>
                  </ul>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 px-4 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 transition-colors disabled:bg-slate-400 disabled:cursor-not-allowed"
                >
                  {loading ? 'Đang xử lý...' : 'Reset Mật Khẩu'}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setStep(1);
                    setResetData({ resetCode: '', newPassword: '', confirmPassword: '' });
                    setError('');
                    setSuccessMessage('');
                  }}
                  disabled={loading}
                  className="w-full py-2 px-4 border border-indigo-600 text-indigo-600 font-semibold rounded-lg hover:bg-indigo-50 transition-colors disabled:opacity-50"
                >
                  ← Quay lại
                </button>
              </form>
            )}

            {/* Footer */}
            <div className="mt-6 text-center">
              <Link to="/login" className="inline-flex items-center gap-2 text-indigo-600 hover:text-indigo-700 font-medium text-sm">
                <ArrowLeft className="w-4 h-4" />
                Quay lại Đăng Nhập
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
