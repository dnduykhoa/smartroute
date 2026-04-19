import { Navigate } from 'react-router-dom';
import { authService } from '../services/api';
import { canManageUsers } from '../utils/rolePermissions';

/**
 * Component bảo vệ các trang admin yêu cầu quyền
 */
export function ProtectedAdminRoute({ children, requiredPermission }) {
  const user = authService.getUser();
  const roleName = user?.role?.name?.toLowerCase();

  // Kiểm tra đã đăng nhập và có role admin hoặc moderator
  if (!authService.isLoggedIn() || !['admin', 'moderator'].includes(roleName)) {
    return <Navigate to="/login" replace />;
  }

  // Kiểm tra quyền đặc biệt nếu cần
  if (requiredPermission === 'canManageUsers' && !canManageUsers(roleName)) {
    return <Navigate to="/admin" replace />;
  }

  return children;
}

export default ProtectedAdminRoute;
