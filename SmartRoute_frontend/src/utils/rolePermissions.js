/**
 * Role-based permission mapper
 * Định nghĩa quyền truy cập cho từng vai trò
 */

export const ROLE_PERMISSIONS = {
  admin: {
    dashboard: true,
    orders: true,
    products: true,
    shipping: true,
    users: true,
    canManageUsers: true,
  },
  moderator: {
    dashboard: true,
    orders: true,
    products: true,
    shipping: true,
    users: false,
    canManageUsers: false,
  },
  user: {
    dashboard: false,
    orders: false,
    products: false,
    shipping: false,
    users: false,
    canManageUsers: false,
  },
};

/**
 * Kiểm tra user có quyền truy cập trang không
 */
export const hasPermission = (roleName, feature) => {
  const role = roleName?.toLowerCase();
  const permissions = ROLE_PERMISSIONS[role];
  
  if (!permissions) {
    return false;
  }

  return permissions[feature] === true;
};

/**
 * Kiểm tra user có quyền quản lý người dùng không
 */
export const canManageUsers = (roleName) => {
  const role = roleName?.toLowerCase();
  const permissions = ROLE_PERMISSIONS[role];
  
  if (!permissions) {
    return false;
  }

  return permissions.canManageUsers === true;
};

/**
 * Lấy danh sách menu items dựa trên role
 */
export const getMenuItems = (roleName) => {
  const role = roleName?.toLowerCase();
  const baseMenus = [
    {
      href: '/admin',
      label: 'Dashboard',
      icon: 'LayoutDashboard',
      feature: 'dashboard',
    },
    {
      href: '/admin/orders',
      label: 'Quản lý đơn hàng',
      icon: 'Package',
      feature: 'orders',
    },
    {
      href: '/admin/products',
      label: 'Quản lý sản phẩm',
      icon: 'Package',
      feature: 'products',
    },
    {
      href: '/admin/shipping',
      label: 'Điều phối giao hàng',
      icon: 'Route',
      feature: 'shipping',
    },
    {
      href: '/admin/users',
      label: 'Quản lý người dùng',
      icon: 'Users',
      feature: 'users',
    },
  ];

  const permissions = ROLE_PERMISSIONS[role];
  if (!permissions) {
    return [];
  }

  return baseMenus.filter(menu => permissions[menu.feature] === true);
};
