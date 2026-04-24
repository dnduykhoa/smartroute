import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { authService } from '../services/api';

function getTokenExpiryMs() {
  const value = Number(localStorage.getItem('token_expires_at'));
  return Number.isFinite(value) ? value : null;
}

export default function SessionExpiryWatcher() {
  const navigate = useNavigate();
  const location = useLocation();
  const [showExpiredNotice, setShowExpiredNotice] = useState(false);

  useEffect(() => {
    let timeoutId;
    let redirectId;

    const scheduleLogout = () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }

      if (redirectId) {
        clearTimeout(redirectId);
      }

      setShowExpiredNotice(false);

      const token = localStorage.getItem('token');
      const expiryMs = getTokenExpiryMs();

      if (!token || !expiryMs) {
        return;
      }

      const remainingMs = expiryMs - Date.now();

      if (remainingMs <= 0) {
        setShowExpiredNotice(true);
        authService.logout();
        redirectId = window.setTimeout(() => {
          navigate('/login', { replace: true });
        }, 1500);
        return;
      }

      timeoutId = window.setTimeout(() => {
        setShowExpiredNotice(true);
        authService.logout();
        redirectId = window.setTimeout(() => {
          navigate('/login', { replace: true });
        }, 1500);
      }, remainingMs);
    };

    const handleAuthChange = () => {
      scheduleLogout();
    };

    scheduleLogout();

    window.addEventListener('auth-change', handleAuthChange);

    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      if (redirectId) {
        clearTimeout(redirectId);
      }
      window.removeEventListener('auth-change', handleAuthChange);
    };
  }, [navigate, location.pathname]);

  if (!showExpiredNotice) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/60 px-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl ring-1 ring-black/5">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-amber-100 text-amber-600">
            <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6" aria-hidden="true">
              <path d="M12 8v5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              <path d="M12 17h.01" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
              <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" stroke="currentColor" strokeWidth="2" />
            </svg>
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900">Phiên đăng nhập đã hết hạn</h2>
            <p className="text-sm text-slate-600">Vui lòng đăng nhập lại để tiếp tục sử dụng hệ thống.</p>
          </div>
        </div>

        <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
          <div className="h-full w-full origin-left animate-[shrink_1.5s_linear_forwards] rounded-full bg-indigo-600" />
        </div>
      </div>
    </div>
  );
}