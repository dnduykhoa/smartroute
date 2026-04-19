import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authService } from '../../services/api';
import {
  LayoutDashboard,
  LogOut,
  Package,
  Route,
  Users,
  Edit,
  Trash2,
  X,
  Plus,
  Search,
  AlertTriangle,
  CheckCircle2,
} from 'lucide-react';

const STORAGE_KEY = 'admin_products';

const DEFAULT_PRODUCTS = [
  {
    productCode: 'SP001',
    name: 'Thùng carton 60x40x40',
    category: 'Bao bì',
    unit: 'Thùng',
    price: 150000,
    quantity: 500,
    description: 'Thùng carton 3 lớp chất lượng cao đủ tiêu chuẩn',
    status: 'active',
  },
  {
    productCode: 'SP002',
    name: 'Túi nilon đen',
    category: 'Bao bì',
    unit: 'Gói',
    price: 25000,
    quantity: 1500,
    description: 'Túi nilon đen 30x40cm, 100 túi/gói',
    status: 'active',
  },
  {
    productCode: 'SP003',
    name: 'Băng keo trong',
    category: 'Bao bì',
    unit: 'Cuộn',
    price: 35000,
    quantity: 300,
    description: 'Băng keo trong 48mm x 100yard',
    status: 'active',
  },
  {
    productCode: 'SP004',
    name: 'Nhãn dán',
    category: 'Tiêu hóa',
    unit: 'Tấm',
    price: 50000,
    quantity: 200,
    description: 'Nhãn dán A4 100 tờ/ream',
    status: 'active',
  },
];

export default function AdminProducts() {
  const navigate = useNavigate();
  const user = authService.getUser();
  const roleName = user?.role?.name?.toLowerCase();
  const isAdminOrModerator = ['admin', 'moderator'].includes(roleName);

  const [products, setProducts] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [formData, setFormData] = useState({
    productCode: '',
    name: '',
    category: 'Bao bì',
    unit: '',
    price: '',
    quantity: '',
    description: '',
    status: 'active',
  });
  const [message, setMessage] = useState(null);

  // Initialize products from localStorage
  useEffect(() => {
    if (!authService.isLoggedIn()) {
      navigate('/login');
      return;
    }

    if (!isAdminOrModerator) {
      navigate('/');
      return;
    }

    const storedProducts = localStorage.getItem(STORAGE_KEY);
    if (storedProducts) {
      setProducts(JSON.parse(storedProducts));
    } else {
      setProducts(DEFAULT_PRODUCTS);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_PRODUCTS));
    }
  }, [isAdminOrModerator, navigate]);

  if (!authService.isLoggedIn() || !isAdminOrModerator) {
    return null;
  }

  // Filter products
  const filteredProducts = products.filter((product) => {
    const matchesSearch =
      product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.productCode.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = filterCategory === 'all' || product.category === filterCategory;
    const matchesStatus = filterStatus === 'all' || product.status === filterStatus;
    return matchesSearch && matchesCategory && matchesStatus;
  });

  // Get unique categories
  const categories = ['all', ...new Set(products.map((p) => p.category))];

  const resetFormData = () => {
    setFormData({
      productCode: '',
      name: '',
      category: 'Bao bì',
      unit: '',
      price: '',
      quantity: '',
      description: '',
      status: 'active',
    });
  };

  const openAddModal = () => {
    resetFormData();
    setIsAddModalOpen(true);
  };

  const openEditModal = (product) => {
    setEditingProduct(product);
    setFormData(product);
    setIsEditModalOpen(true);
  };

  const closeModals = () => {
    setIsAddModalOpen(false);
    setIsEditModalOpen(false);
    setEditingProduct(null);
    resetFormData();
  };

  const handleAddProduct = () => {
    // Validation
    if (!formData.productCode.trim()) {
      setMessage({ type: 'error', text: 'Mã sản phẩm không được để trống' });
      return;
    }
    if (!formData.name.trim()) {
      setMessage({ type: 'error', text: 'Tên sản phẩm không được để trống' });
      return;
    }
    if (!formData.unit.trim()) {
      setMessage({ type: 'error', text: 'Đơn vị không được để trống' });
      return;
    }
    if (!formData.price || formData.price <= 0) {
      setMessage({ type: 'error', text: 'Giá phải lớn hơn 0' });
      return;
    }
    if (formData.quantity === '' || formData.quantity < 0) {
      setMessage({ type: 'error', text: 'Số lượng không được âm' });
      return;
    }

    // Check duplicate
    if (products.some((p) => p.productCode === formData.productCode)) {
      setMessage({ type: 'error', text: 'Mã sản phẩm này đã tồn tại' });
      return;
    }

    const newProduct = {
      ...formData,
      price: parseFloat(formData.price),
      quantity: parseInt(formData.quantity),
    };

    const updatedProducts = [...products, newProduct];
    setProducts(updatedProducts);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedProducts));
    setMessage({ type: 'success', text: 'Thêm sản phẩm thành công!' });
    closeModals();
    setTimeout(() => setMessage(null), 3000);
  };

  const handleUpdateProduct = () => {
    // Validation
    if (!formData.name.trim()) {
      setMessage({ type: 'error', text: 'Tên sản phẩm không được để trống' });
      return;
    }
    if (!formData.unit.trim()) {
      setMessage({ type: 'error', text: 'Đơn vị không được để trống' });
      return;
    }
    if (!formData.price || formData.price <= 0) {
      setMessage({ type: 'error', text: 'Giá phải lớn hơn 0' });
      return;
    }
    if (formData.quantity === '' || formData.quantity < 0) {
      setMessage({ type: 'error', text: 'Số lượng không được âm' });
      return;
    }

    const updatedProducts = products.map((p) =>
      p.productCode === editingProduct.productCode
        ? { ...formData, price: parseFloat(formData.price), quantity: parseInt(formData.quantity) }
        : p
    );

    setProducts(updatedProducts);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedProducts));
    setMessage({ type: 'success', text: 'Cập nhật sản phẩm thành công!' });
    closeModals();
    setTimeout(() => setMessage(null), 3000);
  };

  const handleDeleteProduct = (productCode) => {
    if (confirm(`Bạn chắc chắn muốn xóa sản phẩm "${productCode}" không?`)) {
      const updatedProducts = products.filter((p) => p.productCode !== productCode);
      setProducts(updatedProducts);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedProducts));
      setMessage({ type: 'success', text: 'Xóa sản phẩm thành công!' });
      setTimeout(() => setMessage(null), 3000);
    }
  };

  const handleLogout = () => {
    authService.logout();
    navigate('/');
  };

  const initials = (user?.fullName || user?.username || 'AD').slice(0, 2).toUpperCase();

  return (
    <div className="min-h-screen flex bg-slate-100">
      {/* Sidebar */}
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
          <Link
            to="/admin"
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-400 hover:bg-slate-800 hover:text-slate-100 transition-colors"
          >
            <LayoutDashboard className="w-4 h-4" />
            Dashboard
          </Link>
          <Link
            to="/admin/orders"
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-400 hover:bg-slate-800 hover:text-slate-100 transition-colors"
          >
            <Package className="w-4 h-4" />
            Quản lý đơn hàng
          </Link>
          <Link
            to="/admin/products"
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium bg-indigo-600 text-white"
          >
            <Package className="w-4 h-4" />
            Quản lý sản phẩm
          </Link>
          <Link
            to="/admin/shipping"
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-400 hover:bg-slate-800 hover:text-slate-100 transition-colors"
          >
            <Route className="w-4 h-4" />
            Điều phối giao hàng
          </Link>
          {roleName === 'admin' && (
            <Link
              to="/admin/users"
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-400 hover:bg-slate-800 hover:text-slate-100 transition-colors"
            >
              <Users className="w-4 h-4" />
              Quản lý người dùng
            </Link>
          )}
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

      {/* Main Content */}
      <div className="flex-1 min-w-0 flex flex-col">
        <header className="h-14 bg-white border-b border-slate-200 px-6 flex items-center justify-between">
          <h1 className="text-slate-800 font-semibold">Quản lý sản phẩm</h1>
          <Link to="/" className="text-sm text-indigo-600 hover:text-indigo-700 font-medium">
            Về trang chủ
          </Link>
        </header>

        <main className="p-6 space-y-6">
          {/* Page Title */}
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Quản lý Sản phẩm</h2>
            <p className="text-sm text-slate-500 mt-1">Quản lý danh sách sản phẩm, giá cả và tồn kho</p>
          </div>

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

          {/* Search and Filters */}
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-4 space-y-4">
            <div className="flex flex-col sm:flex-row gap-3">
              {/* Search */}
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Tìm kiếm sản phẩm..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Add Button */}
              <button
                onClick={openAddModal}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium transition-colors"
              >
                <Plus className="w-4 h-4" />
                Thêm sản phẩm
              </button>
            </div>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1">
                <select
                  value={filterCategory}
                  onChange={(e) => setFilterCategory(e.target.value)}
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                >
                  <option value="all">Tất cả danh mục</option>
                  {categories.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat === 'all' ? 'Tất cả' : cat}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex-1">
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                >
                  <option value="all">Tất cả trạng thái</option>
                  <option value="active">Đang kinh doanh</option>
                  <option value="inactive">Ngừng kinh doanh</option>
                </select>
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
              <p className="text-slate-500 text-sm font-medium">Tổng sản phẩm</p>
              <p className="text-2xl font-bold text-slate-900 mt-1">{products.length}</p>
            </div>
            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
              <p className="text-slate-500 text-sm font-medium">Đang kinh doanh</p>
              <p className="text-2xl font-bold text-emerald-600 mt-1">
                {products.filter((p) => p.status === 'active').length}
              </p>
            </div>
            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
              <p className="text-slate-500 text-sm font-medium">Tổng tồn kho</p>
              <p className="text-2xl font-bold text-amber-600 mt-1">
                {products.reduce((sum, p) => sum + p.quantity, 0)}
              </p>
            </div>
          </div>

          {/* Products Table */}
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50">
                    <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900">Mã SP</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900">Tên sản phẩm</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900">Danh mục</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900">Đơn vị</th>
                    <th className="px-6 py-3 text-right text-sm font-semibold text-slate-900">Giá</th>
                    <th className="px-6 py-3 text-right text-sm font-semibold text-slate-900">Tồn kho</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900">Trạng thái</th>
                    <th className="px-6 py-3 text-center text-sm font-semibold text-slate-900">Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredProducts.length > 0 ? (
                    filteredProducts.map((product) => (
                      <tr key={product.productCode} className="border-b border-slate-200 hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-4 text-sm font-medium text-slate-900">{product.productCode}</td>
                        <td className="px-6 py-4 text-sm text-slate-600">{product.name}</td>
                        <td className="px-6 py-4 text-sm text-slate-600">{product.category}</td>
                        <td className="px-6 py-4 text-sm text-slate-600">{product.unit}</td>
                        <td className="px-6 py-4 text-sm text-right text-slate-900 font-medium">
                          {product.price.toLocaleString('vi-VN')}đ
                        </td>
                        <td className="px-6 py-4 text-sm text-right text-slate-900 font-medium">{product.quantity}</td>
                        <td className="px-6 py-4 text-sm">
                          <span
                            className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${
                              product.status === 'active'
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-slate-100 text-slate-800'
                            }`}
                          >
                            {product.status === 'active' ? 'Đang kinh doanh' : 'Ngừng kinh doanh'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center flex items-center justify-center gap-2">
                          <button
                            onClick={() => openEditModal(product)}
                            className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                            title="Sửa sản phẩm"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteProduct(product.productCode)}
                            className="p-2 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                            title="Xóa sản phẩm"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="8" className="px-6 py-8 text-center text-slate-500">
                        Không tìm thấy sản phẩm phù hợp
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </main>
      </div>

      {/* Add/Edit Modal */}
      {(isAddModalOpen || isEditModalOpen) && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 sticky top-0 bg-white">
              <h3 className="text-lg font-bold text-slate-900">
                {isAddModalOpen ? 'Thêm sản phẩm mới' : 'Chỉnh sửa sản phẩm'}
              </h3>
              <button
                onClick={closeModals}
                className="p-1 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-slate-600" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="px-6 py-4 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Mã sản phẩm */}
                <div>
                  <label className="block text-sm font-medium text-slate-900 mb-1">Mã sản phẩm *</label>
                  <input
                    type="text"
                    value={formData.productCode}
                    onChange={(e) => setFormData({ ...formData, productCode: e.target.value })}
                    disabled={isEditModalOpen}
                    placeholder="VD: SP001"
                    className={`w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                      isEditModalOpen ? 'bg-slate-100 cursor-not-allowed' : ''
                    }`}
                  />
                </div>

                {/* Tên sản phẩm */}
                <div>
                  <label className="block text-sm font-medium text-slate-900 mb-1">Tên sản phẩm *</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="VD: Thùng carton"
                    className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                {/* Danh mục */}
                <div>
                  <label className="block text-sm font-medium text-slate-900 mb-1">Danh mục *</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="Bao bì">Bao bì</option>
                    <option value="Tiêu hóa">Tiêu hóa</option>
                    <option value="Nước">Nước</option>
                    <option value="Khác">Khác</option>
                  </select>
                </div>

                {/* Đơn vị */}
                <div>
                  <label className="block text-sm font-medium text-slate-900 mb-1">Đơn vị *</label>
                  <input
                    type="text"
                    value={formData.unit}
                    onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                    placeholder="VD: Thùng, Gói, Cuộn"
                    className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                {/* Giá */}
                <div>
                  <label className="block text-sm font-medium text-slate-900 mb-1">Giá (đ) *</label>
                  <input
                    type="number"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    placeholder="0"
                    min="0"
                    className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                {/* Số lượng */}
                <div>
                  <label className="block text-sm font-medium text-slate-900 mb-1">Tồn kho *</label>
                  <input
                    type="number"
                    value={formData.quantity}
                    onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                    placeholder="0"
                    min="0"
                    className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                {/* Trạng thái */}
                <div>
                  <label className="block text-sm font-medium text-slate-900 mb-1">Trạng thái *</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="active">Đang kinh doanh</option>
                    <option value="inactive">Ngừng kinh doanh</option>
                  </select>
                </div>
              </div>

              {/* Mô tả */}
              <div>
                <label className="block text-sm font-medium text-slate-900 mb-1">Mô tả</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Nhập mô tả sản phẩm..."
                  rows="3"
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                />
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-200 bg-slate-50 sticky bottom-0">
              <button
                onClick={closeModals}
                className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 font-medium transition-colors"
              >
                Hủy
              </button>
              <button
                onClick={isAddModalOpen ? handleAddProduct : handleUpdateProduct}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium transition-colors"
              >
                {isAddModalOpen ? 'Thêm sản phẩm' : 'Cập nhật'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
