const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Order = require('../schemas/orders');
const { authenticateToken } = require('../utils/authHandler');

function isValidObjectId(id) {
  return mongoose.Types.ObjectId.isValid(id);
}

// Middleware to check admin/moderator role
const requireStaff = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Cần xác thực'
      });
    }

    const User = require('../schemas/users');
    const user = await User.findById(req.user.userId).populate('role');
    const roleName = user?.role?.name?.toLowerCase();

    if (!user || !['admin', 'moderator'].includes(roleName)) {
      return res.status(403).json({
        success: false,
        message: 'Chỉ admin hoặc moderator mới có quyền truy cập'
      });
    }

    next();
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Lỗi kiểm tra quyền'
    });
  }
};

/**
 * GET /orders
 * Lấy danh sách đơn hàng
 * Query: ?method=online&confirmed=true&city=...&page=1&limit=10
 */
router.get('/', authenticateToken, requireStaff, async (req, res) => {
  try {
    const { method, confirmed, city, page = 1, limit = 15 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const filter = { isDeleted: false };

    if (method && ['online', 'offline'].includes(method)) {
      filter.method = method;
    }

    if (confirmed !== undefined) {
      filter.confirmed = confirmed === 'true';
    }

    if (city) {
      filter.city = { $regex: city, $options: 'i' };
    }

    const orders = await Order.find(filter)
      .populate('createdBy', 'username fullName')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Order.countDocuments(filter);

    return res.status(200).json({
      success: true,
      orders,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Lỗi lấy danh sách đơn hàng:', error);
    return res.status(500).json({
      success: false,
      message: 'Lỗi lấy danh sách đơn hàng'
    });
  }
});

/**
 * GET /orders/:id
 * Lấy chi tiết đơn hàng
 */
router.get('/:id', authenticateToken, requireStaff, async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: 'ID đơn hàng không hợp lệ'
      });
    }

    const order = await Order.findById(req.params.id)
      .populate('createdBy', 'username fullName email');

    if (!order || order.isDeleted) {
      return res.status(404).json({
        success: false,
        message: 'Đơn hàng không tìm thấy'
      });
    }

    return res.status(200).json({
      success: true,
      order
    });
  } catch (error) {
    console.error('Lỗi lấy chi tiết đơn hàng:', error);
    return res.status(500).json({
      success: false,
      message: 'Lỗi lấy chi tiết đơn hàng'
    });
  }
});

/**
 * POST /orders
 * Tạo đơn hàng mới
 * Body: { orderCode, product, quantity, unit, address, ward, district, city, phone, method, notes }
 */
router.post('/', authenticateToken, requireStaff, async (req, res) => {
  try {
    const { orderCode, product, quantity, unit, address, ward, district, city, phone, method, notes } = req.body;

    // Validate required fields
    if (!orderCode || !product || !quantity || !unit || !address || !ward || !city || !phone) {
      return res.status(400).json({
        success: false,
        message: 'Các trường bắt buộc không được để trống'
      });
    }

    // Check if orderCode is unique
    const existingOrder = await Order.findOne({ orderCode });
    if (existingOrder) {
      return res.status(409).json({
        success: false,
        message: 'Mã đơn hàng đã tồn tại'
      });
    }

    const newOrder = new Order({
      orderCode,
      product,
      quantity: parseInt(quantity),
      unit,
      address,
      ward,
      district: district || '',
      city,
      phone,
      method: method || 'online',
      notes: notes || '',
      createdBy: req.user.userId
    });

    await newOrder.save();

    const populatedOrder = await newOrder.populate('createdBy', 'username fullName');

    return res.status(201).json({
      success: true,
      message: 'Tạo đơn hàng thành công',
      order: populatedOrder
    });
  } catch (error) {
    console.error('Lỗi tạo đơn hàng:', error);
    return res.status(500).json({
      success: false,
      message: 'Lỗi tạo đơn hàng'
    });
  }
});

/**
 * PATCH /orders/:id
 * Cập nhật đơn hàng
 * Body: { product, quantity, unit, address, ward, district, city, phone, method, confirmed, notes }
 */
router.patch('/:id', authenticateToken, requireStaff, async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: 'ID đơn hàng không hợp lệ'
      });
    }

    const { product, quantity, unit, address, ward, district, city, phone, method, confirmed, notes } = req.body;

    const order = await Order.findById(req.params.id);

    if (!order || order.isDeleted) {
      return res.status(404).json({
        success: false,
        message: 'Đơn hàng không tìm thấy'
      });
    }

    // Update fields
    if (product !== undefined) order.product = product;
    if (quantity !== undefined) order.quantity = parseInt(quantity);
    if (unit !== undefined) order.unit = unit;
    if (address !== undefined) order.address = address;
    if (ward !== undefined) order.ward = ward;
    if (district !== undefined) order.district = district;
    if (city !== undefined) order.city = city;
    if (phone !== undefined) order.phone = phone;
    if (method !== undefined && ['online', 'offline'].includes(method)) {
      order.method = method;
    }
    if (confirmed !== undefined) order.confirmed = confirmed === true || confirmed === 'true';
    if (notes !== undefined) order.notes = notes;

    await order.save();

    const updatedOrder = await order.populate('createdBy', 'username fullName');

    return res.status(200).json({
      success: true,
      message: 'Cập nhật đơn hàng thành công',
      order: updatedOrder
    });
  } catch (error) {
    console.error('Lỗi cập nhật đơn hàng:', error);
    return res.status(500).json({
      success: false,
      message: 'Lỗi cập nhật đơn hàng'
    });
  }
});

/**
 * PATCH /orders/:id/status
 * Cập nhật trạng thái xác nhận đơn hàng
 * Body: { confirmed: true/false }
 */
router.patch('/:id/status', authenticateToken, requireStaff, async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: 'ID đơn hàng không hợp lệ'
      });
    }

    const { confirmed } = req.body;

    const order = await Order.findById(req.params.id);

    if (!order || order.isDeleted) {
      return res.status(404).json({
        success: false,
        message: 'Đơn hàng không tìm thấy'
      });
    }

    order.confirmed = confirmed === true || confirmed === 'true';
    await order.save();

    return res.status(200).json({
      success: true,
      message: 'Cập nhật trạng thái thành công',
      order
    });
  } catch (error) {
    console.error('Lỗi cập nhật trạng thái:', error);
    return res.status(500).json({
      success: false,
      message: 'Lỗi cập nhật trạng thái'
    });
  }
});

/**
 * DELETE /orders/:id
 * Xóa đơn hàng (soft delete)
 */
router.delete('/:id', authenticateToken, requireStaff, async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: 'ID đơn hàng không hợp lệ'
      });
    }

    const order = await Order.findById(req.params.id);

    if (!order || order.isDeleted) {
      return res.status(404).json({
        success: false,
        message: 'Đơn hàng không tìm thấy'
      });
    }

    order.isDeleted = true;
    await order.save();

    return res.status(200).json({
      success: true,
      message: 'Xóa đơn hàng thành công'
    });
  } catch (error) {
    console.error('Lỗi xóa đơn hàng:', error);
    return res.status(500).json({
      success: false,
      message: 'Lỗi xóa đơn hàng'
    });
  }
});

/**
 * POST /orders/bulk-import
 * Import nhiều đơn hàng từ file
 * Body: { orders: [{ orderCode, product, ... }] }
 */
router.post('/bulk-import', authenticateToken, requireStaff, async (req, res) => {
  try {
    const { orders: ordersList } = req.body;

    if (!Array.isArray(ordersList) || ordersList.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Danh sách đơn hàng không hợp lệ'
      });
    }

    const results = {
      created: 0,
      failed: 0,
      errors: []
    };

    for (const orderData of ordersList) {
      try {
        // Check if orderCode exists
        const existing = await Order.findOne({ orderCode: orderData.orderCode });
        if (existing) {
          results.failed++;
          results.errors.push({
            orderCode: orderData.orderCode,
            error: 'Mã đơn hàng đã tồn tại'
          });
          continue;
        }

        const newOrder = new Order({
          ...orderData,
          createdBy: req.user.userId,
          confirmed: orderData.confirmed || false
        });

        await newOrder.save();
        results.created++;
      } catch (error) {
        results.failed++;
        results.errors.push({
          orderCode: orderData.orderCode,
          error: error.message
        });
      }
    }

    return res.status(200).json({
      success: true,
      message: `Import hoàn tất: ${results.created} thành công, ${results.failed} thất bại`,
      results
    });
  } catch (error) {
    console.error('Lỗi import đơn hàng:', error);
    return res.status(500).json({
      success: false,
      message: 'Lỗi import đơn hàng'
    });
  }
});

module.exports = router;
