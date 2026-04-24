const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const User = require('../schemas/users');
const Role = require('../schemas/role');

const JWT_SECRET = process.env.JWT_SECRET || 'your_secret_key_here';
const JWT_EXPIRES_IN = '24h';

function isSecureJwtSecretConfigured() {
    return process.env.JWT_SECRET && process.env.JWT_SECRET !== 'your_secret_key_here';
}

function hashResetToken(token) {
    return crypto.createHash('sha256').update(String(token)).digest('hex');
}

// Validate strong password
function validateStrongPassword(password) {
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
}

/**
 * Đăng ký tài khoản mới
 */
async function register(req, res) {
    try {
        const { username, email, password, fullName } = req.body;

        // Kiểm tra input
        if (!username || !email || !password) {
            return res.status(400).json({
                success: false,
                message: 'Username, email, và password là bắt buộc'
            });
        }

        // Validate strong password
        const passwordValidation = validateStrongPassword(password);
        if (!passwordValidation.isValid) {
            return res.status(400).json({
                success: false,
                message: `Mật khẩu yếu. Thiếu: ${passwordValidation.errors.join(', ')}`
            });
        }

        // Luôn gán role mặc định là "user" từ server để tránh client tự nâng quyền
        const defaultUserRole = await Role.findOne({
            name: { $regex: /^user$/i },
            isDeleted: false
        });

        if (!defaultUserRole) {
            return res.status(500).json({
                success: false,
                message: 'Chưa cấu hình role mặc định user. Vui lòng seed role trước.'
            });
        }

        // Kiểm tra user đã tồn tại
        const existingUser = await User.findOne({
            $or: [{ username }, { email }]
        });

        if (existingUser) {
            return res.status(409).json({
                success: false,
                message: 'Username hoặc email đã tồn tại'
            });
        }

        // Tạo user mới
        const newUser = new User({
            username,
            email,
            password,
            fullName: fullName || username,
            role: defaultUserRole._id,
            status: true, // Kích hoạt ngay sau khi đăng ký
            loginCount: 0
        });

        await newUser.save();

        return res.status(201).json({
            success: true,
            message: 'Đăng ký thành công',
            user: {
                id: newUser._id,
                username: newUser.username,
                email: newUser.email,
                fullName: newUser.fullName
            }
        });

    } catch (error) {
        console.error('Lỗi đăng ký:', error);
        return res.status(500).json({
            success: false,
            message: 'Lỗi đăng ký tài khoản',
            error: error.message
        });
    }
}

/**
 * Đăng nhập
 */
async function login(req, res) {
    try {
        if (process.env.NODE_ENV === 'production' && !isSecureJwtSecretConfigured()) {
            return res.status(500).json({
                success: false,
                message: 'Loi cau hinh he thong xac thuc. Vui long lien he admin.'
            });
        }

        const { username, password } = req.body;

        // Kiểm tra input
        if (!username || !password) {
            return res.status(400).json({
                success: false,
                message: 'Username và password là bắt buộc'
            });
        }

        // Tìm user
        const user = await User.findOne({ username, isDeleted: false })
            .populate('role', 'name description');

        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'Username hoặc password không đúng'
            });
        }

        if (!user.status) {
            return res.status(403).json({
                success: false,
                message: 'Tài khoản đang tạm khóa. Vui lòng liên hệ admin.'
            });
        }

        // Kiểm tra password
        const isPasswordValid = bcrypt.compareSync(password, user.password);

        if (!isPasswordValid) {
            return res.status(401).json({
                success: false,
                message: 'Username hoặc password không đúng'
            });
        }

        // Tạo JWT token
        const token = jwt.sign(
            {
                userId: user._id,
                username: user.username,
                email: user.email,
                role: user.role?._id
            },
            JWT_SECRET,
            { expiresIn: JWT_EXPIRES_IN }
        );

        // Cập nhật login count
        user.loginCount += 1;
        await user.save();

        return res.status(200).json({
            success: true,
            message: 'Đăng nhập thành công',
            token,
            user: {
                id: user._id,
                username: user.username,
                email: user.email,
                fullName: user.fullName,
                role: user.role,
                avatarUrl: user.avatarUrl
            }
        });

    } catch (error) {
        console.error('Lỗi đăng nhập:', error);
        return res.status(500).json({
            success: false,
            message: 'Lỗi đăng nhập'
        });
    }
}

/**
 * Xác thực token (Middleware)
 */
async function authenticateToken(req, res, next) {
    try {
        const authHeader = req.headers['authorization'];
        const [scheme, token] = (authHeader || '').split(' '); // "Bearer TOKEN"

        if (scheme !== 'Bearer' || !token) {
            return res.status(401).json({
                success: false,
                message: 'Token không tìm thấy'
            });
        }

        const decoded = jwt.verify(token, JWT_SECRET);
        const user = await User.findById(decoded.userId).select('_id status isDeleted');

        if (!user || user.isDeleted || !user.status) {
            return res.status(401).json({
                success: false,
                message: 'Tai khoan khong hop le hoac da bi khoa'
            });
        }

        req.user = decoded;
        return next();

    } catch (error) {
        return res.status(403).json({
            success: false,
            message: 'Token không hợp lệ hoặc đã hết hạn'
        });
    }
}

/**
 * Lấy profile người dùng (cần token)
 */
async function getProfile(req, res) {
    try {
        const userId = req.user.userId;

        const user = await User.findById(userId)
            .select('-password')
            .populate('role', 'name description');

        if (!user || user.isDeleted) {
            return res.status(404).json({
                success: false,
                message: 'User không tìm thấy'
            });
        }

        return res.status(200).json({
            success: true,
            user
        });

    } catch (error) {
        console.error('Lỗi lấy profile:', error);
        return res.status(500).json({
            success: false,
            message: 'Lỗi lấy profile'
        });
    }
}

/**
 * Đổi mật khẩu (cần token)
 */
async function changePassword(req, res) {
    try {
        const userId = req.user.userId;
        const { oldPassword, newPassword } = req.body;

        if (!oldPassword || !newPassword) {
            return res.status(400).json({
                success: false,
                message: 'Mật khẩu cũ và mới là bắt buộc'
            });
        }

        if (oldPassword === newPassword) {
            return res.status(400).json({
                success: false,
                message: 'Mật khẩu mới phải khác mật khẩu cũ'
            });
        }

        // Validate strong password for new password
        const passwordValidation = validateStrongPassword(newPassword);
        if (!passwordValidation.isValid) {
            return res.status(400).json({
                success: false,
                message: `Mật khẩu yếu. Thiếu: ${passwordValidation.errors.join(', ')}`
            });
        }

        const user = await User.findById(userId);

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User không tìm thấy'
            });
        }

        // Kiểm tra mật khẩu cũ
        const isOldPasswordValid = bcrypt.compareSync(oldPassword, user.password);

        if (!isOldPasswordValid) {
            return res.status(401).json({
                success: false,
                message: 'Mật khẩu cũ không đúng'
            });
        }

        // Cập nhật mật khẩu mới
        user.password = newPassword;
        await user.save();

        return res.status(200).json({
            success: true,
            message: 'Đổi mật khẩu thành công'
        });

    } catch (error) {
        console.error('Lỗi đổi mật khẩu:', error);
        return res.status(500).json({
            success: false,
            message: 'Lỗi đổi mật khẩu'
        });
    }
}

/**
 * Forgot password - gửi email reset
 */
async function forgotPassword(req, res) {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({
                success: false,
                message: 'Email là bắt buộc'
            });
        }

        const user = await User.findOne({ email: email.toLowerCase(), isDeleted: false, status: true });

        if (!user) {
            // Không tiết lộ email có tồn tại hay không (bảo mật)
            return res.status(200).json({
                success: true,
                message: 'Nếu email tồn tại, link reset sẽ được gửi'
            });
        }

        // OTP 6 chữ số cho UX, nhưng lưu hash trong DB để tránh lộ token khi DB bị đọc
        const resetToken = crypto.randomInt(100000, 1000000).toString();
        const resetTokenExpiry = new Date(Date.now() + 30 * 60 * 1000); // 30 phút

        user.resetToken = hashResetToken(resetToken);
        user.resetTokenExpiry = resetTokenExpiry;
        user.resetTokenAttempts = 0;
        await user.save();

        // Gửi email
        const { sendResetPasswordEmail } = require('./mailService');
        const result = await sendResetPasswordEmail(email, resetToken, user.fullName || user.username);

        if (result.success) {
            return res.status(200).json({
                success: true,
                message: 'Email reset mật khẩu đã được gửi'
            });
        } else {
            return res.status(500).json({
                success: false,
                message: result.message
            });
        }

    } catch (error) {
        console.error('Lỗi forgot password:', error);
        return res.status(500).json({
            success: false,
            message: 'Lỗi yêu cầu reset mật khẩu'
        });
    }
}

/**
 * Reset password - đặt mật khẩu mới
 */
async function resetPassword(req, res) {
    let token;
    let newPassword;
    try {
        ({ token, newPassword } = req.body);

        if (!token || !newPassword) {
            return res.status(400).json({
                success: false,
                message: 'Token và mật khẩu mới là bắt buộc'
            });
        }

        // Validate strong password
        const passwordValidation = validateStrongPassword(newPassword);
        if (!passwordValidation.isValid) {
            return res.status(400).json({
                success: false,
                message: `Mật khẩu yếu. Thiếu: ${passwordValidation.errors.join(', ')}`
            });
        }

        const user = await User.findOne({
            resetToken: hashResetToken(token),
            resetTokenExpiry: { $gt: new Date() }
        });

        if (!user) {
            return res.status(400).json({
                success: false,
                message: 'Token không hợp lệ hoặc đã hết hạn'
            });
        }

        if (user.resetTokenAttempts >= 5) {
            user.resetToken = null;
            user.resetTokenExpiry = null;
            user.resetTokenAttempts = 0;
            await user.save();
            return res.status(429).json({
                success: false,
                message: 'Token đã bị khóa do nhập sai quá nhiều lần. Vui lòng yêu cầu mã mới.'
            });
        }

        user.password = newPassword;
        user.resetToken = null;
        user.resetTokenExpiry = null;
        user.resetTokenAttempts = 0;
        await user.save();

        return res.status(200).json({
            success: true,
            message: 'Mật khẩu đã được reset thành công'
        });

    } catch (error) {
        console.error('Lỗi reset password:', error);

        if (token && newPassword) {
            try {
                const user = await User.findOne({
                    resetToken: hashResetToken(token),
                    resetTokenExpiry: { $gt: new Date() }
                });

                if (user) {
                    user.resetTokenAttempts = (user.resetTokenAttempts || 0) + 1;
                    await user.save();
                }
            } catch (internalError) {
                console.error('Loi cap nhat resetTokenAttempts:', internalError);
            }
        }

        return res.status(500).json({
            success: false,
            message: 'Lỗi reset mật khẩu'
        });
    }
}

module.exports = {
    register,
    login,
    authenticateToken,
    getProfile,
    changePassword,
    forgotPassword,
    resetPassword,
    validateStrongPassword
};
