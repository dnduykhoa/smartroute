import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authService } from '../../services/api';
import {
  AlertTriangle,
  CheckCircle2,
  Download,
  FileSpreadsheet,
  LayoutDashboard,
  LogOut,
  Package,
  Route,
  Upload,
  Users,
  ChevronLeft,
  ChevronRight,
  Edit,
  Trash2,
  X,
  Plus,
} from 'lucide-react';
import * as XLSX from 'xlsx';

const STORAGE_KEY = 'admin_imported_orders';

const REQUIRED_COLUMNS = [
  'Mã đơn hàng',
  'Sản phẩm',
  'Số lượng',
  'Đơn vị',
  'Địa chỉ',
  'Phường',
  'Thành phố',
  'Số điện thoại',
  'Hình thức',
  'Trạng thái',
];

const OPTIONAL_COLUMNS = [
  'Quận/Huyện',
];

const TEMPLATE_SAMPLE_ROWS = [
  {
    'Mã đơn hàng': 'DH001',
    'Sản phẩm': 'Thùng carton 60x40',
    'Số lượng': 10,
    'Đơn vị': 'Thùng',
    'Địa chỉ': '123 Nguyễn Trãi',
    'Phường': 'Phường Bến Thành',
    'Quận/Huyện': 'Quận 1',
    'Thành phố': 'TP Hồ Chí Minh',
    'Số điện thoại': '0901234567',
    'Hình thức': 'online',
    'Trạng thái': 'Đã xác nhận',
  },
  {
    'Mã đơn hàng': 'DH002',
    'Sản phẩm': 'Nước suối 500ml',
    'Số lượng': 24,
    'Đơn vị': 'Lốc',
    'Địa chỉ': '45 Lê Lợi',
    'Phường': 'Phường Linh Xuân',
    'Quận/Huyện': 'TP Thủ Đức',
    'Thành phố': 'TP Hồ Chí Minh',
    'Số điện thoại': '0912345678',
    'Hình thức': 'offline',
    'Trạng thái': 'Chưa xác nhận',
  },
];

const GUIDE_ROWS = [
  { field: 'Mã đơn hàng', required: 'Bắt buộc', note: 'Mã duy nhất, ví dụ: DH001' },
  { field: 'Sản phẩm', required: 'Bắt buộc', note: 'Tên sản phẩm đầy đủ' },
  { field: 'Số lượng', required: 'Bắt buộc', note: 'Số > 0' },
  { field: 'Đơn vị', required: 'Bắt buộc', note: 'Ví dụ: Thùng, Cái, Lốc' },
  { field: 'Địa chỉ', required: 'Bắt buộc', note: 'Số nhà + tên đường' },
  { field: 'Phường', required: 'Bắt buộc', note: 'Tên phường/xã theo địa chỉ thực tế' },
  { field: 'Quận/Huyện', required: 'Khuyến nghị', note: 'Nên điền nếu có để tăng độ chính xác' },
  { field: 'Thành phố', required: 'Bắt buộc', note: 'Ví dụ: TP Hồ Chí Minh' },
  { field: 'Số điện thoại', required: 'Bắt buộc', note: 'SĐT người nhận' },
  { field: 'Hình thức', required: 'Bắt buộc', note: 'Chỉ nhận: online hoặc offline' },
  { field: 'Trạng thái', required: 'Bắt buộc', note: 'Đã xác nhận hoặc Chưa xác nhận' },
];

const COLUMN_ALIASES = {
  'Mã đơn hàng': ['Mã đơn hàng', 'Ma don hang', 'Mã đơn', 'Ma don'],
  'Sản phẩm': ['Sản phẩm', 'San pham', 'Tên sản phẩm', 'Ten san pham'],
  'Số lượng': ['Số lượng', 'So luong', 'SL'],
  'Đơn vị': ['Đơn vị', 'Don vi'],
  'Địa chỉ': ['Địa chỉ', 'Dia chi'],
  'Phường': ['Phường', 'Phuong'],
  'Quận/Huyện': ['Quận/Huyện', 'Quan/Huyen', 'Quận', 'Quan', 'Huyện', 'Huyen', 'District'],
  'Thành phố': ['Thành phố', 'Thanh pho', 'TP', 'Thành phố/Tỉnh', 'Tinh/Thanh pho', 'City'],
  'Số điện thoại': ['Số điện thoại', 'So dien thoai', 'Điện thoại', 'Dien thoai'],
  'Hình thức': ['Hình thức', 'Hinh thuc'],
  'Trạng thái': ['Trạng thái', 'Tinh trang', 'Đã xác nhận', 'Da xac nhan', 'Xác nhận', 'Xac nhan'],
};

function normalizeHeader(value) {
  return String(value || '').trim().toLowerCase();
}

function parseConfirmedValue(value) {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value === 1;

  const normalized = String(value || '').trim().toLowerCase();
  const truthy = ['1', 'true', 'yes', 'y', 'đã', 'da', 'x', 'xac nhan', 'đã xác nhận'];
  return truthy.includes(normalized);
}

function toNumber(value) {
  const parsed = Number(String(value || '').trim());
  return Number.isFinite(parsed) ? parsed : NaN;
}

function normalizeMethodValue(value) {
  const normalized = String(value || '').trim().toLowerCase();
  if (normalized === 'online' || normalized === 'offline') {
    return normalized;
  }
  return '';
}

function resolveHeaderMap(headers) {
  const normalizedHeaders = headers.map((h) => normalizeHeader(h));
  const result = {};
  const columnsToResolve = [...REQUIRED_COLUMNS, ...OPTIONAL_COLUMNS];

  for (const column of columnsToResolve) {
    const aliases = COLUMN_ALIASES[column] || [column];
    const foundIndex = aliases
      .map((a) => normalizeHeader(a))
      .map((alias) => normalizedHeaders.findIndex((h) => h === alias))
      .find((index) => index >= 0);

    if (typeof foundIndex === 'number' && foundIndex >= 0) {
      result[column] = headers[foundIndex];
    }
  }

  return result;
}

function downloadTemplateFile() {
  const sheet = XLSX.utils.json_to_sheet(TEMPLATE_SAMPLE_ROWS, {
    header: [...REQUIRED_COLUMNS, ...OPTIONAL_COLUMNS],
  });

  const guideSheet = XLSX.utils.json_to_sheet(
    GUIDE_ROWS.map((row) => ({
      'Tên cột': row.field,
      'Bắt buộc': row.required,
      'Quy tắc nhập': row.note,
    }))
  );

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheet, 'Mau_Nhap_Don_Hang');
  XLSX.utils.book_append_sheet(workbook, guideSheet, 'Huong_Dan');
  XLSX.writeFile(workbook, 'mau_import_don_hang.xlsx');
}

function buildOrders(rows, headerMap) {
  const parsedOrders = [];
  const parseErrors = [];

  const pushError = (rowNumber, column, message, value) => {
    parseErrors.push({
      row: rowNumber,
      column,
      message,
      value,
    });
  };

  rows.forEach((row, idx) => {
    const rowNumber = idx + 2;

    const orderCode = String(row[headerMap['Mã đơn hàng']] || '').trim();
    const product = String(row[headerMap['Sản phẩm']] || '').trim();
    const quantityRaw = row[headerMap['Số lượng']];
    const unit = String(row[headerMap['Đơn vị']] || '').trim();
    const address = String(row[headerMap['Địa chỉ']] || '').trim();
    const ward = String(row[headerMap['Phường']] || '').trim();
    const district = String(row[headerMap['Quận/Huyện']] || '').trim();
    const city = String(row[headerMap['Thành phố']] || '').trim();
    const phone = String(row[headerMap['Số điện thoại']] || '').trim();
    const method = normalizeMethodValue(row[headerMap['Hình thức']]);
    const confirmedRaw = row[headerMap['Trạng thái']];

    if (!orderCode && !product && !quantityRaw && !unit && !address && !ward && !district && !city && !phone && !method && !confirmedRaw) {
      return;
    }

    const quantity = toNumber(quantityRaw);

    if (!orderCode) pushError(rowNumber, 'Mã đơn hàng', 'Thiếu dữ liệu', row[headerMap['Mã đơn hàng']]);
    if (!product) pushError(rowNumber, 'Sản phẩm', 'Thiếu dữ liệu', row[headerMap['Sản phẩm']]);
    if (!Number.isFinite(quantity) || quantity <= 0) {
      pushError(rowNumber, 'Số lượng', 'Số lượng không hợp lệ (phải là số > 0)', quantityRaw);
    }
    if (!unit) pushError(rowNumber, 'Đơn vị', 'Thiếu dữ liệu', row[headerMap['Đơn vị']]);
    if (!address) pushError(rowNumber, 'Địa chỉ', 'Thiếu dữ liệu', row[headerMap['Địa chỉ']]);
    if (!ward) pushError(rowNumber, 'Phường', 'Thiếu dữ liệu', row[headerMap['Phường']]);
    if (!city) pushError(rowNumber, 'Thành phố', 'Thiếu dữ liệu', row[headerMap['Thành phố']]);
    if (!phone) pushError(rowNumber, 'Số điện thoại', 'Thiếu dữ liệu', row[headerMap['Số điện thoại']]);
    if (!method) {
      pushError(rowNumber, 'Hình thức', 'Chỉ chấp nhận online hoặc offline', row[headerMap['Hình thức']]);
    }

    parsedOrders.push({
      orderCode,
      product,
      quantity,
      unit,
      address,
      ward,
      district,
      city,
      phone,
      method,
      confirmed: parseConfirmedValue(confirmedRaw),
      importedAt: new Date().toISOString(),
    });
  });

  const uniqueByOrderCode = new Map();
  parsedOrders.forEach((order) => {
    uniqueByOrderCode.set(order.orderCode, order);
  });

  return {
    orders: Array.from(uniqueByOrderCode.values()),
    parseErrors,
  };
}

export default function AdminOrders() {
  const navigate = useNavigate();
  const user = authService.getUser();
  const roleName = user?.role?.name?.toLowerCase();
  const isAdminOrModerator = ['admin', 'moderator'].includes(roleName);

  const [orders, setOrders] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return [];

    try {
      return JSON.parse(saved);
    } catch {
      return [];
    }
  });
  const [errors, setErrors] = useState([]);
  const [successMessage, setSuccessMessage] = useState('');
  const [filterMethod, setFilterMethod] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 15;
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState(null);
  const [formData, setFormData] = useState({
    orderCode: '',
    product: '',
    quantity: '',
    unit: '',
    address: '',
    ward: '',
    district: '',
    city: '',
    phone: '',
    method: 'online',
    confirmed: false,
  });

  if (!authService.isLoggedIn()) {
    navigate('/login');
    return null;
  }

  if (!isAdminOrModerator) {
    navigate('/');
    return null;
  }

  const handleLogout = () => {
    authService.logout();
    navigate('/');
  };

  const initials = (user?.fullName || user?.username || 'AD').slice(0, 2).toUpperCase();

  const confirmedCount = useMemo(
    () => orders.filter((o) => o.confirmed).length,
    [orders]
  );

  const onlineOrders = useMemo(
    () => orders.filter((o) => o.method === 'online'),
    [orders]
  );

  const offlineOrders = useMemo(
    () => orders.filter((o) => o.method === 'offline'),
    [orders]
  );

  const onlineConfirmedCount = useMemo(
    () => onlineOrders.filter((o) => o.confirmed).length,
    [onlineOrders]
  );

  const offlineConfirmedCount = useMemo(
    () => offlineOrders.filter((o) => o.confirmed).length,
    [offlineOrders]
  );

  const filteredOrders = useMemo(() => {
    if (filterMethod === 'all') return orders;
    if (filterMethod === 'online') return onlineOrders;
    if (filterMethod === 'offline') return offlineOrders;
    return orders;
  }, [orders, onlineOrders, offlineOrders, filterMethod]);

  const totalPages = Math.ceil(filteredOrders.length / ITEMS_PER_PAGE);
  const paginatedOrders = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    return filteredOrders.slice(startIndex, endIndex);
  }, [filteredOrders, currentPage]);

  const handleFilterChange = (method) => {
    setFilterMethod(method);
    setCurrentPage(1);
  };

  const resetFormData = () => {
    setFormData({
      orderCode: '',
      product: '',
      quantity: '',
      unit: '',
      address: '',
      ward: '',
      district: '',
      city: '',
      phone: '',
      method: 'online',
      confirmed: false,
    });
  };

  const openAddModal = () => {
    resetFormData();
    setEditingOrder(null);
    setIsAddModalOpen(true);
  };

  const openEditModal = (order) => {
    setFormData(order);
    setEditingOrder(order);
    setIsEditModalOpen(true);
  };

  const handleAddOrder = () => {
    if (!formData.orderCode.trim() || !formData.product.trim() || !formData.quantity || !formData.unit.trim() || !formData.address.trim() || !formData.ward.trim() || !formData.city.trim() || !formData.phone.trim()) {
      setErrors([{ message: 'Vui lòng điền đầy đủ thông tin bắt buộc' }]);
      return;
    }

    if (orders.some(o => o.orderCode.toLowerCase() === formData.orderCode.toLowerCase())) {
      setErrors([{ message: 'Mã đơn hàng này đã tồn tại' }]);
      return;
    }

    const newOrder = {
      ...formData,
      quantity: toNumber(formData.quantity),
      importedAt: new Date().toISOString(),
    };

    const updatedOrders = [...orders, newOrder];
    setOrders(updatedOrders);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedOrders));
    setIsAddModalOpen(false);
    resetFormData();
    setErrors([]);
    setSuccessMessage('Đã thêm đơn hàng mới');
  };

  const handleUpdateOrder = () => {
    if (!formData.orderCode.trim() || !formData.product.trim() || !formData.quantity || !formData.unit.trim() || !formData.address.trim() || !formData.ward.trim() || !formData.city.trim() || !formData.phone.trim()) {
      setErrors([{ message: 'Vui lòng điền đầy đủ thông tin bắt buộc' }]);
      return;
    }

    if (formData.orderCode !== editingOrder.orderCode && orders.some(o => o.orderCode.toLowerCase() === formData.orderCode.toLowerCase())) {
      setErrors([{ message: 'Mã đơn hàng này đã tồn tại' }]);
      return;
    }

    const updatedOrders = orders.map(o =>
      o.orderCode === editingOrder.orderCode
        ? { ...formData, quantity: toNumber(formData.quantity) }
        : o
    );

    setOrders(updatedOrders);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedOrders));
    setIsEditModalOpen(false);
    setEditingOrder(null);
    resetFormData();
    setErrors([]);
    setSuccessMessage('Đã cập nhật đơn hàng');
  };

  const handleDeleteOrder = (orderCode) => {
    if (confirm(`Bạn có chắc chắn muốn xóa đơn hàng ${orderCode}?`)) {
      const updatedOrders = orders.filter(o => o.orderCode !== orderCode);
      setOrders(updatedOrders);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedOrders));
      setSuccessMessage(`Đã xóa đơn hàng ${orderCode}`);
    }
  };

  const formatError = (error) => {
    if (typeof error === 'string') {
      return error;
    }

    const hasValue = error.value !== undefined && String(error.value).trim() !== '';
    return `Dòng ${error.row}, cột ${error.column}: ${error.message}${hasValue ? ` (giá trị: ${error.value})` : ''}`;
  };

  const handleImportExcel = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setSuccessMessage('');
    setErrors([]);

    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: 'array' });

      if (!workbook.SheetNames.length) {
        setErrors([{ message: 'File Excel không có sheet nào' }]);
        return;
      }

      const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonRows = XLSX.utils.sheet_to_json(firstSheet, { defval: '' });

      if (!jsonRows.length) {
        setErrors([{ message: 'File Excel không có dữ liệu' }]);
        return;
      }

      const headers = Object.keys(jsonRows[0]);
      const headerMap = resolveHeaderMap(headers);
      const missingColumns = REQUIRED_COLUMNS.filter((col) => !headerMap[col]);

      if (missingColumns.length) {
        setErrors([
          { message: `Thiếu cột bắt buộc: ${missingColumns.join(', ')}` },
          { message: 'Hãy dùng đúng tên cột hoặc tên tương đương trong template.' },
        ]);
        return;
      }

      const { orders: importedOrders, parseErrors } = buildOrders(jsonRows, headerMap);

      if (parseErrors.length) {
        setErrors(parseErrors.slice(0, 12));
        return;
      }

      setOrders(importedOrders);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(importedOrders));
      setSuccessMessage(`Import thành công ${importedOrders.length} đơn hàng.`);
    } catch (error) {
      setErrors([{ message: `Không thể đọc file Excel: ${error.message}` }]);
    }
  };

  const handleClearOrders = () => {
    setOrders([]);
    setErrors([]);
    setSuccessMessage('Đã xóa toàn bộ dữ liệu đơn hàng đã import.');
    localStorage.removeItem(STORAGE_KEY);
  };

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
          <Link
            to="/admin"
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-400 hover:bg-slate-800 hover:text-slate-100 transition-colors"
          >
            <LayoutDashboard className="w-4 h-4" />
            Dashboard
          </Link>
          <Link
            to="/admin/orders"
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium bg-indigo-600 text-white"
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
          {roleName === 'admin' && (
            <Link
              to="/admin/users"
              className="w-full text-left flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-400 hover:bg-slate-800 hover:text-slate-100 transition-colors"
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

      <div className="flex-1 min-w-0 flex flex-col">
        <header className="h-14 bg-white border-b border-slate-200 px-6 flex items-center justify-between">
          <h1 className="text-slate-800 font-semibold">Quản lý đơn hàng</h1>
          <Link to="/" className="text-sm text-indigo-600 hover:text-indigo-700 font-medium">
            Về trang chủ
          </Link>
        </header>

        <main className="p-6 space-y-6">
          {/* Section 1: Excel Import Card */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-3">
                <FileSpreadsheet className="w-6 h-6 text-emerald-600" />
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">Import file Excel đơn hàng</h2>
                  <p className="text-sm text-slate-500">
                    Cột bắt buộc: Mã đơn hàng, Sản phẩm, Số lượng, Đơn vị, Địa chỉ, Phường, Thành phố, Số điện thoại, Hình thức, Trạng thái
                  </p>
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <label className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 text-white rounded-lg cursor-pointer hover:bg-indigo-700 transition-colors">
                <Upload className="w-4 h-4" />
                Chọn file Excel (.xlsx, .xls)
                <input
                  type="file"
                  accept=".xlsx,.xls"
                  className="hidden"
                  onChange={handleImportExcel}
                />
              </label>
              <button
                type="button"
                onClick={downloadTemplateFile}
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
              >
                <Download className="w-4 h-4" />
                Tải file mẫu
              </button>
            </div>

            <p className="text-xs text-slate-500">
              Hướng dẫn nhập liệu nằm trong file mẫu (sheet Huong_Dan).
            </p>

            {successMessage && (
              <div className="p-3 rounded-lg bg-green-50 border border-green-200 flex items-start gap-2 text-green-700 text-sm">
                <CheckCircle2 className="w-4 h-4 mt-0.5" />
                <span>{successMessage}</span>
              </div>
            )}

            {errors.length > 0 && (
              <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-sm">
                <div className="flex items-center gap-2 font-medium mb-2">
                  <AlertTriangle className="w-4 h-4" />
                  Có lỗi trong file import
                </div>
                <ul className="list-disc ml-5 space-y-1">
                  {errors.map((error, idx) => (
                    <li key={`${error.row || 'general'}-${error.column || 'msg'}-${idx}`}>
                      {formatError(error)}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Section 2: Data Management - Filters & Manual Add */}
          <div className="space-y-4">
            {/* Filter Tabs + Add Button Row */}
            <div className="flex items-center justify-between gap-4 border-b border-slate-200">
              <div className="flex gap-2">
                <button
                  onClick={() => handleFilterChange('all')}
                  className={`px-4 py-3 font-medium text-sm transition-colors border-b-2 ${
                    filterMethod === 'all'
                      ? 'border-indigo-600 text-indigo-600'
                      : 'border-transparent text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Tất cả ({orders.length})
                </button>
                <button
                  onClick={() => handleFilterChange('online')}
                  className={`px-4 py-3 font-medium text-sm transition-colors border-b-2 ${
                    filterMethod === 'online'
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Online ({onlineOrders.length})
                </button>
                <button
                  onClick={() => handleFilterChange('offline')}
                  className={`px-4 py-3 font-medium text-sm transition-colors border-b-2 ${
                    filterMethod === 'offline'
                      ? 'border-purple-600 text-purple-600'
                      : 'border-transparent text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Offline ({offlineOrders.length})
                </button>
              </div>
              <button
                type="button"
                onClick={openAddModal}
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors whitespace-nowrap"
              >
                <Plus className="w-4 h-4" />
                <span className="text-sm font-medium">Thêm thủ công</span>
              </button>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
                <p className="text-sm text-slate-500">Tổng đơn</p>
                <p className="text-2xl font-bold text-slate-900">{filteredOrders.length}</p>
              </div>
              <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
                <p className="text-sm text-slate-500">Đã xác nhận</p>
                <p className="text-2xl font-bold text-emerald-600">
                  {filterMethod === 'all' ? confirmedCount : filterMethod === 'online' ? onlineConfirmedCount : offlineConfirmedCount}
                </p>
              </div>
              <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
                <p className="text-sm text-slate-500">Chưa xác nhận</p>
                <p className="text-2xl font-bold text-amber-600">
                  {filterMethod === 'all' ? orders.length - confirmedCount : filterMethod === 'online' ? onlineOrders.length - onlineConfirmedCount : offlineOrders.length - offlineConfirmedCount}
                </p>
              </div>
            </div>
          </div>

          {/* Section 3: Data Table with Pagination */}
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-50 text-slate-700">
                  <tr>
                    <th className="text-left px-4 py-3 font-semibold">Mã đơn hàng</th>
                    <th className="text-left px-4 py-3 font-semibold">Sản phẩm</th>
                    <th className="text-left px-4 py-3 font-semibold">Số lượng</th>
                    <th className="text-left px-4 py-3 font-semibold">Đơn vị</th>
                    <th className="text-left px-4 py-3 font-semibold">Địa chỉ</th>
                    <th className="text-left px-4 py-3 font-semibold">Phường</th>
                    <th className="text-left px-4 py-3 font-semibold">Quận/Huyện</th>
                    <th className="text-left px-4 py-3 font-semibold">Thành phố</th>
                    <th className="text-left px-4 py-3 font-semibold">Số điện thoại</th>
                    <th className="text-left px-4 py-3 font-semibold">Hình thức</th>
                    <th className="text-left px-4 py-3 font-semibold">Trạng thái</th>
                    <th className="text-left px-4 py-3 font-semibold">Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredOrders.length === 0 ? (
                    <tr>
                      <td colSpan={11} className="px-4 py-10 text-center text-slate-500">
                        Chưa có dữ liệu. Hãy import file Excel để bắt đầu.
                      </td>
                    </tr>
                  ) : (
                    paginatedOrders.map((order) => (
                      <tr key={order.orderCode} className="border-t border-slate-100 hover:bg-slate-50/80">
                        <td className="px-4 py-3 font-medium text-slate-800">{order.orderCode}</td>
                        <td className="px-4 py-3 text-slate-700">{order.product}</td>
                        <td className="px-4 py-3 text-slate-700">{order.quantity}</td>
                        <td className="px-4 py-3 text-slate-700">{order.unit}</td>
                        <td className="px-4 py-3 text-slate-700">{order.address}</td>
                        <td className="px-4 py-3 text-slate-700">{order.ward}</td>
                        <td className="px-4 py-3 text-slate-700">{order.district || '-'}</td>
                        <td className="px-4 py-3 text-slate-700">{order.city}</td>
                        <td className="px-4 py-3 text-slate-700">{order.phone}</td>
                        <td className="px-4 py-3 text-slate-700">{order.method}</td>
                        <td className="px-4 py-3">
                          {order.confirmed ? (
                            <span className="inline-flex px-2 py-1 rounded-full text-xs bg-emerald-100 text-emerald-700">
                              Đã xác nhận
                            </span>
                          ) : (
                            <span className="inline-flex px-2 py-1 rounded-full text-xs bg-amber-100 text-amber-700">
                              Chưa xác nhận
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 flex gap-2">
                          <button
                            onClick={() => openEditModal(order)}
                            className="p-2 rounded-lg border border-slate-300 text-slate-700 hover:bg-blue-50 hover:border-blue-300 hover:text-blue-600 transition-colors"
                            title="Sửa đơn hàng"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteOrder(order.orderCode)}
                            className="p-2 rounded-lg border border-slate-300 text-slate-700 hover:bg-rose-50 hover:border-rose-300 hover:text-rose-600 transition-colors"
                            title="Xóa đơn hàng"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            {filteredOrders.length > 0 && (
              <div className="flex items-center justify-between px-4 py-4 border-t border-slate-200 bg-slate-50">
                <div className="text-sm text-slate-600">
                  Hiển thị {(currentPage - 1) * ITEMS_PER_PAGE + 1} đến {Math.min(currentPage * ITEMS_PER_PAGE, filteredOrders.length)} trong tổng {filteredOrders.length} đơn
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                    className="p-2 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <div className="flex gap-1">
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                      <button
                        key={page}
                        onClick={() => setCurrentPage(page)}
                        className={`w-8 h-8 rounded-lg text-sm font-medium transition-colors ${
                          page === currentPage
                            ? 'bg-indigo-600 text-white'
                            : 'border border-slate-300 text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        {page}
                      </button>
                    ))}
                  </div>
                  <button
                    onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage === totalPages}
                    className="p-2 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Add/Edit Modal */}
      {(isAddModalOpen || isEditModalOpen) && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 sticky top-0 bg-white">
              <h3 className="text-lg font-semibold text-slate-900">
                {isAddModalOpen ? 'Thêm đơn hàng mới' : 'Sửa đơn hàng'}
              </h3>
              <button
                onClick={() => {
                  setIsAddModalOpen(false);
                  setIsEditModalOpen(false);
                  resetFormData();
                  setErrors([]);
                }}
                className="p-2 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5 text-slate-600" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-900 mb-2">
                    Mã đơn hàng *
                  </label>
                  <input
                    type="text"
                    value={formData.orderCode}
                    onChange={(e) => setFormData({ ...formData, orderCode: e.target.value })}
                    disabled={isEditModalOpen}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600 disabled:bg-slate-100 disabled:text-slate-500"
                    placeholder="DH001"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-900 mb-2">
                    Sản phẩm *
                  </label>
                  <input
                    type="text"
                    value={formData.product}
                    onChange={(e) => setFormData({ ...formData, product: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600"
                    placeholder="Thùng carton"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-900 mb-2">
                    Số lượng *
                  </label>
                  <input
                    type="number"
                    value={formData.quantity}
                    onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600"
                    placeholder="10"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-900 mb-2">
                    Đơn vị *
                  </label>
                  <input
                    type="text"
                    value={formData.unit}
                    onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600"
                    placeholder="Thùng"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-semibold text-slate-900 mb-2">
                    Địa chỉ *
                  </label>
                  <input
                    type="text"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600"
                    placeholder="123 Nguyễn Trãi"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-900 mb-2">
                    Phường *
                  </label>
                  <input
                    type="text"
                    value={formData.ward}
                    onChange={(e) => setFormData({ ...formData, ward: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600"
                    placeholder="Phường Bến Thành"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-900 mb-2">
                    Quận/Huyện
                  </label>
                  <input
                    type="text"
                    value={formData.district}
                    onChange={(e) => setFormData({ ...formData, district: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600"
                    placeholder="Quận 1"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-900 mb-2">
                    Thành phố *
                  </label>
                  <input
                    type="text"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600"
                    placeholder="TP Hồ Chí Minh"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-900 mb-2">
                    Số điện thoại *
                  </label>
                  <input
                    type="text"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600"
                    placeholder="0901234567"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-900 mb-2">
                    Hình thức *
                  </label>
                  <select
                    value={formData.method}
                    onChange={(e) => setFormData({ ...formData, method: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600"
                  >
                    <option value="online">Online</option>
                    <option value="offline">Offline</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-900 mb-2">
                    Trạng thái
                  </label>
                  <select
                    value={formData.confirmed ? 'confirmed' : 'unconfirmed'}
                    onChange={(e) => setFormData({ ...formData, confirmed: e.target.value === 'confirmed' })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600"
                  >
                    <option value="unconfirmed">Chưa xác nhận</option>
                    <option value="confirmed">Đã xác nhận</option>
                  </select>
                </div>
              </div>

              {errors.length > 0 && (
                <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-sm">
                  <div className="flex items-center gap-2 font-medium mb-2">
                    <AlertTriangle className="w-4 h-4" />
                    Có lỗi
                  </div>
                  <ul className="list-disc ml-5 space-y-1">
                    {errors.map((error, idx) => (
                      <li key={idx}>{error.message}</li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="flex gap-3 pt-4 border-t border-slate-200">
                <button
                  onClick={() => {
                    setIsAddModalOpen(false);
                    setIsEditModalOpen(false);
                    resetFormData();
                    setErrors([]);
                  }}
                  className="flex-1 px-4 py-2.5 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors font-medium"
                >
                  Hủy
                </button>
                <button
                  onClick={isAddModalOpen ? handleAddOrder : handleUpdateOrder}
                  className="flex-1 px-4 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium"
                >
                  {isAddModalOpen ? 'Thêm đơn hàng' : 'Cập nhật'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
