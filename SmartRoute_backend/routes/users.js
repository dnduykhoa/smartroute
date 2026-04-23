const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const User = require('../schemas/users');
const Role = require('../schemas/role');
const { authenticateToken } = require('../utils/authHandler');

function isValidObjectId(id) {
  return mongoose.Types.ObjectId.isValid(id);
}

function isSelfTarget(req) {
  return String(req.params.id) === String(req.currentUser._id);
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

async function requireAdmin(req, res, next) {
  try {
    const currentUser = await User.findById(req.user.userId)
      .populate('role', 'name')
      .select('_id role isDeleted');

    const isAdmin = currentUser && !currentUser.isDeleted && currentUser.role && String(currentUser.role.name).toLowerCase() === 'admin';

    if (!isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Chỉ admin mới có quyền truy cập chức năng này'
      });
    }

    req.currentUser = currentUser;
    return next();
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Lỗi xác thực quyền admin'
    });
  }
}

router.use(authenticateToken, requireAdmin);

router.get('/roles', async (req, res) => {
  try {
    const roles = await Role.find({ isDeleted: false })
      .select('_id name description')
      .sort({ name: 1 });

    return res.status(200).json({
      success: true,
      roles
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Lỗi lấy danh sách role',
      error: error.message
    });
  }
});

router.get('/', async (req, res) => {
  try {
    const users = await User.find({ isDeleted: false })
      .select('-password')
      .populate('role', 'name description')
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      users
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Lỗi lấy danh sách người dùng',
      error: error.message
    });
  }
});

router.patch('/:id/status', async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: 'ID người dùng không hợp lệ'
      });
    }

    const { status } = req.body;

    if (typeof status !== 'boolean') {
      return res.status(400).json({
        success: false,
        message: 'status phải là kiểu boolean'
      });
    }

    if (isSelfTarget(req)) {
      return res.status(400).json({
        success: false,
        message: 'Không thể khóa/mở chính tài khoản admin đang đăng nhập'
      });
    }

    const updatedUser = await User.findOneAndUpdate(
      { _id: req.params.id, isDeleted: false },
      { $set: { status } },
      { new: true }
    )
      .select('-password')
      .populate('role', 'name description');

    if (!updatedUser) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy người dùng'
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Cập nhật trạng thái thành công',
      user: updatedUser
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Lỗi cập nhật trạng thái'
    });
  }
});

router.patch('/:id/role', async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: 'ID người dùng không hợp lệ'
      });
    }

    const { roleId } = req.body;

    if (!roleId) {
      return res.status(400).json({
        success: false,
        message: 'roleId là bắt buộc'
      });
    }

    if (!isValidObjectId(roleId)) {
      return res.status(400).json({
        success: false,
        message: 'roleId không hợp lệ'
      });
    }

    if (isSelfTarget(req)) {
      return res.status(400).json({
        success: false,
        message: 'Không thể đổi role của chính tài khoản admin đang đăng nhập'
      });
    }

    const role = await Role.findOne({ _id: roleId, isDeleted: false });
    if (!role) {
      return res.status(404).json({
        success: false,
        message: 'Role không tồn tại'
      });
    }

    const updatedUser = await User.findOneAndUpdate(
      { _id: req.params.id, isDeleted: false },
      { $set: { role: roleId } },
      { new: true }
    )
      .select('-password')
      .populate('role', 'name description');

    if (!updatedUser) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy người dùng'
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Cập nhật role thành công',
      user: updatedUser
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Lỗi cập nhật role'
    });
  }
});

router.post('/', async (req, res) => {
  try {
    const { username, email, password, fullName, roleId } = req.body;

    // Validation
    if (!username || !email || !password || !fullName || !roleId) {
      return res.status(400).json({
        success: false,
        message: 'Tất cả các trường (username, email, password, fullName, roleId) là bắt buộc'
      });
    }

    if (!isValidObjectId(roleId)) {
      return res.status(400).json({
        success: false,
        message: 'roleId không hợp lệ'
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

    // Check if role exists
    const role = await Role.findOne({ _id: roleId, isDeleted: false });
    if (!role) {
      return res.status(400).json({
        success: false,
        message: 'Role không tồn tại'
      });
    }

    // Check duplicate username/email
    const existingUser = await User.findOne({
      $or: [{ username }, { email }],
      isDeleted: false
    });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: existingUser.username === username 
          ? 'Username này đã tồn tại' 
          : 'Email này đã được sử dụng'
      });
    }

    // Create new user
    const newUser = new User({
      username,
      email,
      password,
      fullName,
      role: roleId,
      status: true,
      loginCount: 0
    });

    await newUser.save();

    const populatedUser = await User.findById(newUser._id)
      .select('-password')
      .populate('role', 'name description');

    return res.status(201).json({
      success: true,
      message: 'Tạo người dùng thành công',
      user: populatedUser
    });
  } catch (error) {
    console.error('Lỗi tạo người dùng:', error);
    return res.status(500).json({
      success: false,
      message: 'Lỗi tạo người dùng'
    });
  }
});

router.patch('/:id/password', async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: 'ID người dùng không hợp lệ'
      });
    }

    const { password } = req.body;

    if (!password) {
      return res.status(400).json({
        success: false,
        message: 'Mật khẩu mới là bắt buộc'
      });
    }

    if (isSelfTarget(req)) {
      return res.status(400).json({
        success: false,
        message: 'Không thể reset mật khẩu của chính tài khoản admin đang đăng nhập tại màn hình này'
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

    const targetUser = await User.findOne({ _id: req.params.id, isDeleted: false });
    if (!targetUser) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy người dùng'
      });
    }

    // Update password
    targetUser.password = password;
    await targetUser.save();

    return res.status(200).json({
      success: true,
      message: 'Reset mật khẩu thành công'
    });
  } catch (error) {
    console.error('Lỗi reset mật khẩu:', error);
    return res.status(500).json({
      success: false,
      message: 'Lỗi reset mật khẩu'
    });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: 'ID người dùng không hợp lệ'
      });
    }

    if (isSelfTarget(req)) {
      return res.status(400).json({
        success: false,
        message: 'Không thể xóa chính tài khoản admin đang đăng nhập'
      });
    }

    const deletedUser = await User.findOneAndUpdate(
      { _id: req.params.id, isDeleted: false },
      { $set: { isDeleted: true } },
      { new: true }
    );

    if (!deletedUser) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy người dùng'
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Xóa người dùng thành công'
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Lỗi xóa người dùng'
    });
  }
});

module.exports = router;
