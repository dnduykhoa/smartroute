import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authService, userService } from '../../services/api';
import {
  LayoutDashboard,
  LogOut,
  Package,
  Route,
  Search,
  Trash2,
  Users,
  Plus,
  Eye,
  Lock,
  Unlock,
  RotateCcw,
  X,
  AlertTriangle,
  CheckCircle2,
} from 'lucide-react';

export default function AdminUsers() {
  const navigate = useNavigate();
  const user = authService.getUser();
  const roleName = user?.role?.name?.toLowerCase();
  const isAdmin = roleName === 'admin';

  const [allUsers, setAllUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState(null);
  const [selectedUsers, setSelectedUsers] = useState(new Set());
  
  // Modal states
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [deleteConfirmInput, setDeleteConfirmInput] = useState('');
  
  // Form data
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    fullName: '',
    password: '',
    roleId: '',
  });

  useEffect(() => {
    if (!authService.isLoggedIn()) {
      navigate('/login');
      return;
    }

    if (!isAdmin) {
      navigate('/');
      return;
    }

    fetchData();
  }, [isAdmin, navigate]);

  const fetchData = async () => {
    setLoading(true);
    setError('');

    try {
      const [usersRes, rolesRes] = await Promise.all([
        userService.getUsers(),
        userService.getRoles(),
      ]);

      setAllUsers(usersRes.data?.users || []);
      setRoles(rolesRes.data?.roles || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Không thể tải dữ liệu người dùng');
    } finally {
      setLoading(false);
    }
  };

  const initials = (user?.fullName || user?.username || 'AD').slice(0, 2).toUpperCase();
  const currentUserId = String(user?.id || user?._id || '');

  const isCurrentAccount = (targetUser) => String(targetUser?._id || '') === currentUserId;

  const filteredUsers = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return allUsers;

    return allUsers.filter((u) => {
      const source = [u.username, u.email, u.fullName, u.role?.name]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return source.includes(q);
    });
  }, [allUsers, query]);

  const handleLogout = () => {
    authService.logout();
    navigate('/');
  };

  // Validate strong password
  const validateStrongPassword = (password) => {
    const errors = [];
    if (password.length < 8) {
      errors.push('Tối thiểu 8 ký tự');
    }
    if (!/[A-Z]/.test(password)) {
      errors.push('Chứa chữ hoa (A-Z)');
    }
    if (!/[a-z]/.test(password)) {
      errors.push('Chứa chữ thường (a-z)');
    }
    if (!/\d/.test(password)) {
      errors.push('Chứa số (0-9)');
    }
    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
      errors.push('Chứa ký tự đặc biệt (!@#$%^&* etc)');
    }
    return {
      isValid: errors.length === 0,
      errors,
    };
  };

  const resetFormData = () => {
    setFormData({
      username: '',
      email: '',
      fullName: '',
      password: '',
      roleId: roles[0]?._id || '',
    });
    setDeleteConfirmInput('');
  };

  const openAddModal = () => {
    resetFormData();
    setIsAddModalOpen(true);
  };

  const closeAddModal = () => {
    setIsAddModalOpen(false);
    resetFormData();
  };

  const openDetailModal = (targetUser) => {
    setSelectedUser(targetUser);
    setIsDetailModalOpen(true);
  };

  const closeDetailModal = () => {
    setIsDetailModalOpen(false);
    setSelectedUser(null);
  };

  const openDeleteModal = (targetUser) => {
    setSelectedUser(targetUser);
    setDeleteConfirmInput('');
    setIsDeleteModalOpen(true);
  };

  const closeDeleteModal = () => {
    setIsDeleteModalOpen(false);
    setSelectedUser(null);
    setDeleteConfirmInput('');
  };

  const handleAddUser = async () => {
    // Validation
    if (!formData.username.trim()) {
      setMessage({ type: 'error', text: 'Tên đang nhập không được để trống' });
      return;
    }
    if (!formData.email.trim()) {
      setMessage({ type: 'error', text: 'Email không được để trống' });
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      setMessage({ type: 'error', text: 'Email không hợp lệ' });
      return;
    }
    if (!formData.fullName.trim()) {
      setMessage({ type: 'error', text: 'Họ tên không được để trống' });
      return;
    }
    if (!formData.password.trim()) {
      setMessage({ type: 'error', text: 'Mật khẩu không được để trống' });
      return;
    }
    
    // Validate strong password
    const passwordValidation = validateStrongPassword(formData.password);
    if (!passwordValidation.isValid) {
      setMessage({ 
        type: 'error', 
        text: `Mật khẩu yếu. Thiếu: ${passwordValidation.errors.join(', ')}` 
      });
      return;
    }
    if (!formData.roleId) {
      setMessage({ type: 'error', text: 'Vui lòng chọn role' });
      return;
    }

    // Check duplicate username/email
    if (allUsers.some((u) => u.username === formData.username)) {
      setMessage({ type: 'error', text: 'Username này đã tồn tại' });
      return;
    }
    if (allUsers.some((u) => u.email === formData.email)) {
      setMessage({ type: 'error', text: 'Email này đã được sử dụng' });
      return;
    }

    try {
      const res = await userService.createUser(formData);
      const newUser = res.data?.user;
      setAllUsers((prev) => [...prev, newUser]);
      setMessage({ type: 'success', text: 'Tạo người dùng thành công!' });
      closeAddModal();
      setTimeout(() => setMessage(null), 3000);
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.message || 'Không thể tạo người dùng' });
    }
  };

  const handleToggleStatus = async (targetUser) => {
    if (isCurrentAccount(targetUser)) {
      setMessage({ type: 'error', text: 'Không thể khóa/mở chính tài khoản đang đăng nhập' });
      setTimeout(() => setMessage(null), 3000);
      return;
    }

    try {
      const newStatus = !targetUser.status;
      const res = await userService.updateUserStatus(targetUser._id, newStatus);
      const updated = res.data?.user;

      setAllUsers((prev) => prev.map((item) => (item._id === updated._id ? updated : item)));
      setMessage({
        type: 'success',
        text: `${newStatus ? 'Kích hoạt' : 'Tạm khóa'} người dùng thành công!`,
      });
      setTimeout(() => setMessage(null), 3000);
    } catch (err) {
      setMessage({ type: 'error', text: 'Không thể cập nhật trạng thái' });
    }
  };

  const handleRoleChange = async (targetUser, roleId) => {
    if (isCurrentAccount(targetUser)) {
      setMessage({ type: 'error', text: 'Không thể đổi role của chính tài khoản đang đăng nhập' });
      setTimeout(() => setMessage(null), 3000);
      return;
    }

    try {
      const res = await userService.updateUserRole(targetUser._id, roleId);
      const updated = res.data?.user;

      setAllUsers((prev) => prev.map((item) => (item._id === updated._id ? updated : item)));
      setMessage({ type: 'success', text: 'Cập nhật role thành công!' });
      setTimeout(() => setMessage(null), 3000);
    } catch (err) {
      setMessage({ type: 'error', text: 'Không thể cập nhật role' });
    }
  };

  const handleResetPassword = async (targetUser) => {
    if (isCurrentAccount(targetUser)) {
      setMessage({ type: 'error', text: 'Không thể reset mật khẩu của chính tài khoản đang đăng nhập ở màn hình này' });
      setTimeout(() => setMessage(null), 3000);
      return;
    }

    const newPassword = prompt(
      `Nhập mật khẩu mới cho ${targetUser.username}:\n(Yêu cầu: Tối thiểu 8 ký tự, chữ hoa, chữ thường, số, ký tự đặc biệt)`,
      ''
    );
    if (!newPassword) return;

    const passwordValidation = validateStrongPassword(newPassword);
    if (!passwordValidation.isValid) {
      setMessage({ 
        type: 'error', 
        text: `Mật khẩu yếu. Thiếu: ${passwordValidation.errors.join(', ')}` 
      });
      return;
    }

    try {
      const res = await userService.resetUserPassword(targetUser._id, newPassword);
      setMessage({ type: 'success', text: 'Reset mật khẩu thành công!' });
      setTimeout(() => setMessage(null), 3000);
    } catch (err) {
      setMessage({ type: 'error', text: 'Không thể reset mật khẩu' });
    }
  };

  const handleDeleteUser = async () => {
    if (!deleteConfirmInput || deleteConfirmInput !== selectedUser.username) {
      setMessage({ type: 'error', text: 'Vui lòng nhập đúng username để xác nhận xóa' });
      return;
    }

    if (isCurrentAccount(selectedUser)) {
      setMessage({ type: 'error', text: 'Không thể xóa chính tài khoản đang đăng nhập' });
      setTimeout(() => setMessage(null), 3000);
      return;
    }

    try {
      await userService.deleteUser(selectedUser._id);
      setAllUsers((prev) => prev.filter((item) => item._id !== selectedUser._id));
      setMessage({ type: 'success', text: 'Xóa người dùng thành công!' });
      closeDeleteModal();
      setTimeout(() => setMessage(null), 3000);
    } catch (err) {
      setMessage({ type: 'error', text: 'Không thể xóa người dùng' });
    }
  };

  const handleSelectUser = (userId) => {
    const newSelected = new Set(selectedUsers);
    if (newSelected.has(userId)) {
      newSelected.delete(userId);
    } else {
      newSelected.add(userId);
    }
    setSelectedUsers(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedUsers.size === filteredUsers.length) {
      setSelectedUsers(new Set());
    } else {
      setSelectedUsers(new Set(filteredUsers.map((u) => u._id)));
    }
  };

  if (!authService.isLoggedIn() || !isAdmin) {
    return null;
  }

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
              <p className="text-xs text-slate-400">Admin Panel</p>
            </div>
          </Link>
        </div>

        <nav className="px-3 py-4 space-y-1 flex-1">
          <Link
            to="/admin"
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-400 hover:bg-slate-800 hover:text-slate-100 transition-colors"
          >
            <LayoutDashboard className="w-4 h-4" />
            Dashboard
          </Link>
          <Link
            to="/admin/orders"
            className="w-full text-left flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-400 hover:bg-slate-800 hover:text-slate-100 transition-colors"
          >
            <Package className="w-4 h-4" />
            Quản lý đơn hàng
          </Link>
          <Link
            to="/admin/products"
            className="w-full text-left flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-400 hover:bg-slate-800 hover:text-slate-100 transition-colors"
          >
            <Package className="w-4 h-4" />
            Quản lý sản phẩm
          </Link>
          <Link
            to="/admin/shipping"
            className="w-full text-left flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-400 hover:bg-slate-800 hover:text-slate-100 transition-colors"
          >
            <Route className="w-4 h-4" />
            Điều phối giao hàng
          </Link>
          <Link
            to="/admin/users"
            className="w-full text-left flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium bg-indigo-600 text-white"
          >
            <Users className="w-4 h-4" />
            Quản lý người dùng
          </Link>
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
          <h1 className="text-slate-800 font-semibold">Quản lý người dùng</h1>
          <Link to="/" className="text-sm text-indigo-600 hover:text-indigo-700 font-medium">
            Về trang chủ
          </Link>
        </header>

        <main className="p-6 space-y-4">
          {/* Messages */}
          {message && (
            <div
              className={`flex items-center gap-3 px-4 py-3 rounded-lg border ${
                message.type === 'success'
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                  : 'bg-rose-50 border-rose-200 text-rose-800'
              }`}
            >
              {message.type === 'success' ? (
                <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
              ) : (
                <AlertTriangle className="w-5 h-5 flex-shrink-0" />
              )}
              <span className="text-sm font-medium">{message.text}</span>
            </div>
          )}

          {/* Search & Actions */}
          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
            <div className="flex flex-col md:flex-row md:items-center gap-3 md:justify-between">
              <div className="relative w-full md:max-w-sm">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Tìm theo username, email, họ tên, role..."
                  className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={fetchData}
                  className="px-4 py-2 text-sm rounded-lg border border-slate-300 hover:bg-slate-50 font-medium transition-colors"
                >
                  Làm mới
                </button>
                <button
                  onClick={openAddModal}
                  className="px-4 py-2 text-sm rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 font-medium transition-colors flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Thêm người dùng
                </button>
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
              <p className="text-slate-500 text-sm font-medium">Tổng người dùng</p>
              <p className="text-2xl font-bold text-slate-900 mt-1">{allUsers.length}</p>
            </div>
            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
              <p className="text-slate-500 text-sm font-medium">Đang hoạt động</p>
              <p className="text-2xl font-bold text-emerald-600 mt-1">
                {allUsers.filter((u) => u.status).length}
              </p>
            </div>
            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
              <p className="text-slate-500 text-sm font-medium">Đã chọn</p>
              <p className="text-2xl font-bold text-indigo-600 mt-1">{selectedUsers.size}</p>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
            {loading ? (
              <div className="p-8 text-center text-slate-500">Đang tải dữ liệu người dùng...</div>
            ) : error ? (
              <div className="p-8 text-center text-rose-600">{error}</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="bg-slate-50 text-slate-700">
                    <tr>
                      <th className="px-4 py-3 text-left font-semibold w-12">
                        <input
                          type="checkbox"
                          checked={selectedUsers.size === filteredUsers.length && filteredUsers.length > 0}
                          onChange={handleSelectAll}
                          className="rounded border-slate-300"
                        />
                      </th>
                      <th className="px-4 py-3 text-left font-semibold">Tên đăng nhập</th>
                      <th className="px-4 py-3 text-left font-semibold">Họ tên</th>
                      <th className="px-4 py-3 text-left font-semibold">Email</th>
                      <th className="px-4 py-3 text-left font-semibold">Role</th>
                      <th className="px-4 py-3 text-left font-semibold">Trạng thái</th>
                      <th className="px-4 py-3 text-left font-semibold">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-4 py-10 text-center text-slate-500">
                          Không tìm thấy người dùng phù hợp.
                        </td>
                      </tr>
                    ) : (
                      filteredUsers.map((item) => {
                        const isSelf = isCurrentAccount(item);

                        return (
                        <tr key={item._id} className="border-t border-slate-100 hover:bg-slate-50/70">
                          <td className="px-4 py-3">
                            <input
                              type="checkbox"
                              checked={selectedUsers.has(item._id)}
                              onChange={() => handleSelectUser(item._id)}
                              className="rounded border-slate-300"
                            />
                          </td>
                          <td className="px-4 py-3 font-medium text-slate-900">{item.username}</td>
                          <td className="px-4 py-3 text-slate-700">{item.fullName || '-'}</td>
                          <td className="px-4 py-3 text-slate-700 text-xs">{item.email}</td>
                          <td className="px-4 py-3">
                            <select
                              className="px-2 py-1.5 border border-slate-300 rounded-md text-sm disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed"
                              value={item.role?._id || ''}
                              onChange={(e) => handleRoleChange(item, e.target.value)}
                              disabled={isSelf}
                            >
                              {roles.map((role) => (
                                <option key={role._id} value={role._id}>
                                  {role.name}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td className="px-4 py-3">
                            <button
                              onClick={() => handleToggleStatus(item)}
                              disabled={isSelf}
                              title={isSelf ? 'Không thể thao tác trên chính tài khoản đang đăng nhập' : undefined}
                              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors disabled:opacity-60 disabled:cursor-not-allowed ${
                                item.status
                                  ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
                                  : 'bg-amber-100 text-amber-700 hover:bg-amber-200'
                              }`}
                            >
                              {item.status ? 'Đang hoạt động' : 'Tạm khóa'}
                            </button>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex gap-1.5">
                              <button
                                onClick={() => openDetailModal(item)}
                                className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                                title="Xem chi tiết"
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleResetPassword(item)}
                                disabled={isSelf}
                                className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent"
                                title={isSelf ? 'Không thể thao tác trên chính tài khoản đang đăng nhập' : 'Reset mật khẩu'}
                              >
                                <RotateCcw className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => openDeleteModal(item)}
                                disabled={isSelf}
                                className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent"
                                title={isSelf ? 'Không thể thao tác trên chính tài khoản đang đăng nhập' : 'Xóa người dùng'}
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      )})
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Add User Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 sticky top-0 bg-white">
              <h3 className="text-lg font-bold text-slate-900">Thêm người dùng mới</h3>
              <button
                onClick={closeAddModal}
                className="p-1 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-slate-600" />
              </button>
            </div>

            <div className="px-6 py-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-900 mb-1">Tên đang nhập <span className="text-rose-500">*</span></label>
                <input
                  type="text"
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  placeholder="john_doe"
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-900 mb-1">Email <span className="text-rose-500">*</span></label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="john@example.com"
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-900 mb-1">Họ tên <span className="text-rose-500">*</span></label>
                <input
                  type="text"
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  placeholder="John Doe"
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-900 mb-1">Mật khẩu <span className="text-rose-500">*</span></label>
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="••••••"
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <div className="mt-2 space-y-1 p-2 bg-slate-50 rounded-lg">
                  <p className="text-xs font-medium text-slate-700">Yêu cầu mật khẩu mạnh:</p>
                  <div className="space-y-1">
                    <div className={`text-xs flex items-center gap-1 ${formData.password.length >= 8 ? 'text-emerald-600 font-medium' : 'text-slate-500'}`}>
                      {formData.password.length >= 8 ? '✓' : '○'} Tối thiểu 8 ký tự
                    </div>
                    <div className={`text-xs flex items-center gap-1 ${/[A-Z]/.test(formData.password) ? 'text-emerald-600 font-medium' : 'text-slate-500'}`}>
                      {/[A-Z]/.test(formData.password) ? '✓' : '○'} Chứa chữ hoa (A-Z)
                    </div>
                    <div className={`text-xs flex items-center gap-1 ${/[a-z]/.test(formData.password) ? 'text-emerald-600 font-medium' : 'text-slate-500'}`}>
                      {/[a-z]/.test(formData.password) ? '✓' : '○'} Chứa chữ thường (a-z)
                    </div>
                    <div className={`text-xs flex items-center gap-1 ${/\d/.test(formData.password) ? 'text-emerald-600 font-medium' : 'text-slate-500'}`}>
                      {/\d/.test(formData.password) ? '✓' : '○'} Chứa số (0-9)
                    </div>
                    <div className={`text-xs flex items-center gap-1 ${/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(formData.password) ? 'text-emerald-600 font-medium' : 'text-slate-500'}`}>
                      {/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(formData.password) ? '✓' : '○'} Ký tự đặc biệt (!@#$%^&* etc)
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-900 mb-1">Role <span className="text-rose-500">*</span></label>
                <select
                  value={formData.roleId}
                  onChange={(e) => setFormData({ ...formData, roleId: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">-- Chọn role --</option>
                  {roles.map((role) => (
                    <option key={role._id} value={role._id}>
                      {role.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-200 bg-slate-50 sticky bottom-0">
              <button
                onClick={closeAddModal}
                className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 font-medium transition-colors"
              >
                Hủy
              </button>
              <button
                onClick={handleAddUser}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium transition-colors"
              >
                Thêm người dùng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Detail User Modal */}
      {isDetailModalOpen && selectedUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 sticky top-0 bg-white">
              <h3 className="text-lg font-bold text-slate-900">Chi tiết người dùng</h3>
              <button
                onClick={closeDetailModal}
                className="p-1 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-slate-600" />
              </button>
            </div>

            <div className="px-6 py-4 space-y-4">
              <div className="bg-indigo-50 rounded-lg p-4">
                <p className="text-xs text-slate-500 mb-1">Tên đăng nhập</p>
                <p className="text-lg font-semibold text-slate-900">{selectedUser.username}</p>
              </div>

              <div>
                <p className="text-xs text-slate-500 mb-1">Họ tên</p>
                <p className="text-sm text-slate-700">{selectedUser.fullName || '-'}</p>
              </div>

              <div>
                <p className="text-xs text-slate-500 mb-1">Email</p>
                <p className="text-sm text-slate-700">{selectedUser.email}</p>
              </div>

              <div>
                <p className="text-xs text-slate-500 mb-1">Role</p>
                <p className="text-sm font-medium text-slate-900">{selectedUser.role?.name}</p>
              </div>

              <div>
                <p className="text-xs text-slate-500 mb-1">Trạng thái</p>
                <span
                  className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${
                    selectedUser.status
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-amber-100 text-amber-800'
                  }`}
                >
                  {selectedUser.status ? 'Đang hoạt động' : 'Tạm khóa'}
                </span>
              </div>

              {selectedUser.createdAt && (
                <div>
                  <p className="text-xs text-slate-500 mb-1">Ngày tạo</p>
                  <p className="text-sm text-slate-700">
                    {new Date(selectedUser.createdAt).toLocaleString('vi-VN')}
                  </p>
                </div>
              )}

              {selectedUser.lastLogin && (
                <div>
                  <p className="text-xs text-slate-500 mb-1">Lần đăng nhập cuối</p>
                  <p className="text-sm text-slate-700">
                    {new Date(selectedUser.lastLogin).toLocaleString('vi-VN')}
                  </p>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-200 bg-slate-50 sticky bottom-0">
              <button
                onClick={closeDetailModal}
                className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 font-medium transition-colors"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {isDeleteModalOpen && selectedUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full">
            <div className="px-6 py-4 border-b border-slate-200 bg-rose-50 flex items-start gap-3">
              <AlertTriangle className="w-6 h-6 text-rose-600 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="text-lg font-bold text-rose-900">Xóa người dùng</h3>
                <p className="text-sm text-rose-700 mt-1">Hành động này không thể hoàn tác!</p>
              </div>
            </div>

            <div className="px-6 py-4 space-y-4">
              <p className="text-slate-700">
                Bạn chắc chắn muốn xóa người dùng <span className="font-semibold">{selectedUser.username}</span>?
              </p>
              <p className="text-sm text-slate-600">
                Nhập username "<span className="font-mono font-semibold">{selectedUser.username}</span>" để xác nhận:
              </p>
              <input
                type="text"
                value={deleteConfirmInput}
                onChange={(e) => setDeleteConfirmInput(e.target.value)}
                placeholder="Nhập username tại đây"
                className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500"
              />
            </div>

            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-200 bg-slate-50">
              <button
                onClick={closeDeleteModal}
                className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 font-medium transition-colors"
              >
                Hủy
              </button>
              <button
                onClick={handleDeleteUser}
                disabled={deleteConfirmInput !== selectedUser.username}
                className="px-4 py-2 bg-rose-600 text-white rounded-lg hover:bg-rose-700 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Xóa người dùng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
