import { useEffect, useRef } from 'react';
import { authService } from '../services/api';

function isUserRole(roleName) {
  return roleName?.toLowerCase() === 'user';
}

function isLikelyDevToolsOpen() {
  const widthGap = window.outerWidth - window.innerWidth;
  const heightGap = window.outerHeight - window.innerHeight;

  return widthGap > 160 || heightGap > 160;
}

export default function DevToolsGuard() {
  const lockRef = useRef(false);

  useEffect(() => {
    const user = authService.getUser();
    const roleName = user?.role?.name;

    if (!authService.isLoggedIn() || !isUserRole(roleName)) {
      return undefined;
    }

    const lockSession = () => {
      if (lockRef.current) {
        return;
      }

      lockRef.current = true;
      authService.logout();
      window.location.replace('/login');
    };

    const handleKeyDown = (event) => {
      const key = event.key?.toLowerCase();

      if (
        event.key === 'F12' ||
        (event.ctrlKey && event.shiftKey && ['i', 'j', 'c'].includes(key)) ||
        (event.ctrlKey && key === 'u')
      ) {
        event.preventDefault();
        event.stopPropagation();
        lockSession();
      }
    };

    const handleContextMenu = (event) => {
      event.preventDefault();
    };

    const intervalId = window.setInterval(() => {
      if (isLikelyDevToolsOpen()) {
        lockSession();
      }
    }, 1000);

    window.addEventListener('keydown', handleKeyDown, true);
    window.addEventListener('contextmenu', handleContextMenu, true);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener('keydown', handleKeyDown, true);
      window.removeEventListener('contextmenu', handleContextMenu, true);
    };
  }, []);

  return null;
}