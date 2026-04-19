const express = require('express');
const router = express.Router();
const { 
    register, 
    login, 
    authenticateToken, 
    getProfile, 
    changePassword,
    forgotPassword,
    resetPassword
} = require('../utils/authHandler');

const authRateStore = new Map();

function buildRateLimitKey(req, suffix = '') {
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';
    return `${ip}:${suffix}`;
}

function rateLimit({ limit, windowMs, keyFn, message }) {
    return (req, res, next) => {
        const key = keyFn(req);
        const now = Date.now();
        const current = authRateStore.get(key);

        if (!current || now > current.expiresAt) {
            authRateStore.set(key, {
                count: 1,
                expiresAt: now + windowMs
            });
            return next();
        }

        if (current.count >= limit) {
            return res.status(429).json({
                success: false,
                message
            });
        }

        current.count += 1;
        authRateStore.set(key, current);
        return next();
    };
}

const loginRateLimit = rateLimit({
    limit: 8,
    windowMs: 15 * 60 * 1000,
    keyFn: (req) => buildRateLimitKey(req, `login:${String(req.body?.username || '').toLowerCase()}`),
    message: 'Ban da thu dang nhap qua nhieu lan. Vui long thu lai sau 15 phut.'
});

const forgotPasswordRateLimit = rateLimit({
    limit: 5,
    windowMs: 60 * 60 * 1000,
    keyFn: (req) => buildRateLimitKey(req, `forgot:${String(req.body?.email || '').toLowerCase()}`),
    message: 'Ban da yeu cau reset qua nhieu lan. Vui long thu lai sau 1 gio.'
});

const resetPasswordRateLimit = rateLimit({
    limit: 10,
    windowMs: 60 * 60 * 1000,
    keyFn: (req) => buildRateLimitKey(req, `reset:${String(req.body?.token || '')}`),
    message: 'Ban da thu reset qua nhieu lan. Vui long yeu cau ma moi.'
});

/**
 * POST /auth/register
 * Đăng ký tài khoản mới
 * Body: { username, email, password, fullName, role }
 */
router.post('/register', register);

/**
 * POST /auth/login
 * Đăng nhập
 * Body: { username, password }
 */
router.post('/login', loginRateLimit, login);

/**
 * GET /auth/profile
 * Lấy thông tin profile của người dùng
 * Headers: { Authorization: Bearer <token> }
 */
router.get('/profile', authenticateToken, getProfile);

/**
 * POST /auth/change-password
 * Đổi mật khẩu
 * Headers: { Authorization: Bearer <token> }
 * Body: { oldPassword, newPassword }
 */
router.post('/change-password', authenticateToken, changePassword);

/**
 * POST /auth/forgot-password
 * Yêu cầu reset mật khẩu (gửi email)
 * Body: { email }
 */
router.post('/forgot-password', forgotPasswordRateLimit, forgotPassword);

/**
 * POST /auth/reset-password
 * Reset mật khẩu với token
 * Body: { token, newPassword }
 */
router.post('/reset-password', resetPasswordRateLimit, resetPassword);

module.exports = router;
