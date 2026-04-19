const express = require('express');
const router = express.Router();
const User = require('../schemas/users');
const Order = require('../schemas/orders');
const Role = require('../schemas/role');
const { authenticateToken } = require('../utils/authHandler');

async function requireStaff(req, res, next) {
  try {
    const currentUser = await User.findById(req.user.userId)
      .populate('role', 'name')
      .select('_id role isDeleted');

    const roleName = currentUser?.role?.name?.toLowerCase();
    const isStaff = currentUser && !currentUser.isDeleted && ['admin', 'moderator'].includes(roleName);

    if (!isStaff) {
      return res.status(403).json({
        success: false,
        message: 'Chỉ admin hoặc moderator mới có quyền truy cập analytics'
      });
    }

    return next();
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Lỗi xác thực quyền analytics'
    });
  }
}

function toDateOrNull(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function normalizeRange(from, to, fallbackDays) {
  const now = new Date();
  const end = toDateOrNull(to) || now;

  const startFromInput = toDateOrNull(from);
  if (startFromInput) {
    return { start: startFromInput, end };
  }

  const days = Number.isFinite(fallbackDays) && fallbackDays > 0 ? fallbackDays : 7;
  const start = new Date(end.getTime() - days * 24 * 60 * 60 * 1000);
  return { start, end };
}

function safePercent(current, previous) {
  if (previous === 0) return current > 0 ? 100 : 0;
  return Number((((current - previous) / previous) * 100).toFixed(2));
}

function getDayRange(date = new Date()) {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);

  const end = new Date(date);
  end.setHours(23, 59, 59, 999);

  return { start, end };
}

function getRangeDaysAgo(days, endDate = new Date()) {
  const end = new Date(endDate);
  const start = new Date(end);
  start.setDate(start.getDate() - days);
  start.setHours(0, 0, 0, 0);
  return { start, end };
}

function getDayWindow(date) {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);

  const end = new Date(date);
  end.setHours(23, 59, 59, 999);

  return { start, end };
}

function formatDayLabel(date) {
  return new Intl.DateTimeFormat('vi-VN', {
    month: '2-digit',
    day: '2-digit'
  }).format(date);
}

async function countOrdersByFilter(range, extraFilter = {}) {
  return Order.countDocuments({
    isDeleted: false,
    createdAt: { $gte: range.start, $lte: range.end },
    ...extraFilter
  });
}

async function countUsersByRole(roleName, extraFilter = {}) {
  const role = await Role.findOne({
    name: { $regex: new RegExp(`^${roleName}$`, 'i') },
    isDeleted: false
  }).select('_id');

  if (!role) return 0;

  return User.countDocuments({
    isDeleted: false,
    role: role._id,
    ...extraFilter
  });
}

async function countUsersByFilter(range, extraFilter = {}) {
  return User.countDocuments({
    isDeleted: false,
    createdAt: { $gte: range.start, $lte: range.end },
    ...extraFilter
  });
}

async function getTopDrivers(limit = 5) {
  const driverRole = await Role.findOne({
    name: { $regex: /^driver$/i },
    isDeleted: false
  }).select('_id');

  if (!driverRole) {
    return [];
  }

  const drivers = await User.find({
    isDeleted: false,
    role: driverRole._id
  })
    .select('_id username fullName email avatarUrl status loginCount createdAt')
    .sort({ fullName: 1, username: 1 });

  const driverIds = drivers.map((driver) => driver._id);

  if (driverIds.length === 0) {
    return [];
  }

  const stats = await Order.aggregate([
    {
      $match: {
        isDeleted: false,
        createdBy: { $in: driverIds }
      }
    },
    {
      $group: {
        _id: '$createdBy',
        totalOrders: { $sum: 1 },
        confirmedOrders: {
          $sum: {
            $cond: [{ $eq: ['$confirmed', true] }, 1, 0]
          }
        },
        pendingOrders: {
          $sum: {
            $cond: [{ $eq: ['$confirmed', true] }, 0, 1]
          }
        }
      }
    }
  ]);

  const statMap = stats.reduce((map, item) => {
    map[String(item._id)] = item;
    return map;
  }, {});

  return drivers
    .map((driver) => {
      const driverStats = statMap[String(driver._id)] || {
        totalOrders: 0,
        confirmedOrders: 0,
        pendingOrders: 0
      };

      return {
        id: driver._id,
        username: driver.username,
        fullName: driver.fullName || driver.username,
        email: driver.email,
        avatarUrl: driver.avatarUrl,
        status: driver.status,
        loginCount: driver.loginCount,
        totalOrders: driverStats.totalOrders,
        confirmedOrders: driverStats.confirmedOrders,
        pendingOrders: driverStats.pendingOrders
      };
    })
    .sort((a, b) => b.totalOrders - a.totalOrders)
    .slice(0, Number.isFinite(limit) && limit > 0 ? limit : 5);
}

async function buildDailySeries(days = 7, endDate = new Date()) {
  const normalizedDays = Number.isFinite(days) && days > 0 ? days : 7;
  const windowDays = Array.from({ length: normalizedDays }, (_, index) => {
    const date = new Date(endDate);
    date.setDate(date.getDate() - (normalizedDays - 1 - index));
    return {
      date,
      range: getDayWindow(date)
    };
  });

  const [orders, users, confirmedOrders] = await Promise.all([
    Promise.all(windowDays.map(({ range }) => countOrdersByFilter(range))),
    Promise.all(windowDays.map(({ range }) => countUsersByFilter(range))),
    Promise.all(windowDays.map(({ range }) => countOrdersByFilter(range, { confirmed: true })))
  ]);

  return windowDays.map(({ date }, index) => ({
    label: formatDayLabel(date),
    orders: orders[index],
    newUsers: users[index],
    confirmedOrders: confirmedOrders[index]
  }));
}

router.get('/summary', authenticateToken, requireStaff, async (req, res) => {
  try {
    const now = new Date();
    const todayRange = getDayRange(now);
    const currentWeekRange = getRangeDaysAgo(7, now);
    const previousWeekEnd = new Date(currentWeekRange.start.getTime() - 1);
    const previousWeekRange = getRangeDaysAgo(7, previousWeekEnd);

    const [
      todayOrders,
      activeDrivers,
      pendingOrders,
      currentWeekOrders,
      previousWeekOrders,
      currentWeekUsers,
      previousWeekUsers,
      totalOrders,
      totalUsers,
      confirmedOrders
    ] = await Promise.all([
      countOrdersByFilter(todayRange),
      countUsersByRole('driver', { status: true }),
      Order.countDocuments({ isDeleted: false, confirmed: false }),
      countOrdersByFilter(currentWeekRange),
      countOrdersByFilter(previousWeekRange),
      countUsersByFilter(currentWeekRange),
      countUsersByFilter(previousWeekRange),
      Order.countDocuments({ isDeleted: false }),
      User.countDocuments({ isDeleted: false }),
      Order.countDocuments({ isDeleted: false, confirmed: true })
    ]);

    const orderGrowthPercent = safePercent(currentWeekOrders, previousWeekOrders);
    const userGrowthPercent = safePercent(currentWeekUsers, previousWeekUsers);

    return res.status(200).json({
      success: true,
      summary: {
        todayOrders,
        activeDrivers,
        pendingOrders,
        totalOrders,
        totalUsers,
        confirmedOrders,
        currentWeekOrders,
        previousWeekOrders,
        currentWeekUsers,
        previousWeekUsers,
        orderGrowthPercent,
        userGrowthPercent,
        generatedAt: now.toISOString()
      }
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Khong the lay tong quan dashboard'
    });
  }
});

router.get('/trends', authenticateToken, requireStaff, async (req, res) => {
  try {
    const days = Number(req.query.days || 7);
    const series = await buildDailySeries(days, new Date());

    return res.status(200).json({
      success: true,
      days: Number.isFinite(days) && days > 0 ? days : 7,
      series,
      generatedAt: new Date().toISOString()
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Khong the lay du lieu xu huong'
    });
  }
});

router.get('/insights', authenticateToken, requireStaff, async (req, res) => {
  try {
    const [onlineOrders, offlineOrders, topDrivers] = await Promise.all([
      Order.countDocuments({ isDeleted: false, method: 'online' }),
      Order.countDocuments({ isDeleted: false, method: 'offline' }),
      getTopDrivers(Number(req.query.limit || 5))
    ]);

    return res.status(200).json({
      success: true,
      insights: {
        orderMethods: [
          { label: 'Online', value: onlineOrders },
          { label: 'Offline', value: offlineOrders }
        ],
        topDrivers
      },
      generatedAt: new Date().toISOString()
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Khong the lay thong ke chi tiet'
    });
  }
});

router.get('/compare', authenticateToken, requireStaff, async (req, res) => {
  try {
    const requestedDays = Number(req.query.days || 7);

    const currentRange = normalizeRange(req.query.currentFrom, req.query.currentTo, requestedDays);

    const currentDurationMs = currentRange.end.getTime() - currentRange.start.getTime();
    const previousEnd = new Date(currentRange.start.getTime() - 1);
    const previousStart = new Date(previousEnd.getTime() - currentDurationMs);

    const previousRange = {
      start: toDateOrNull(req.query.previousFrom) || previousStart,
      end: toDateOrNull(req.query.previousTo) || previousEnd
    };

    const [
      currentNewUsers,
      previousNewUsers,
      currentActiveUsers,
      previousActiveUsers,
      totalUsers
    ] = await Promise.all([
      countUsersByFilter(currentRange),
      countUsersByFilter(previousRange),
      countUsersByFilter(currentRange, { status: true }),
      countUsersByFilter(previousRange, { status: true }),
      User.countDocuments({ isDeleted: false })
    ]);

    return res.status(200).json({
      success: true,
      comparedAt: new Date().toISOString(),
      currentRange: {
        from: currentRange.start.toISOString(),
        to: currentRange.end.toISOString()
      },
      previousRange: {
        from: previousRange.start.toISOString(),
        to: previousRange.end.toISOString()
      },
      metrics: {
        newUsers: {
          current: currentNewUsers,
          previous: previousNewUsers,
          delta: currentNewUsers - previousNewUsers,
          deltaPercent: safePercent(currentNewUsers, previousNewUsers)
        },
        activeUsers: {
          current: currentActiveUsers,
          previous: previousActiveUsers,
          delta: currentActiveUsers - previousActiveUsers,
          deltaPercent: safePercent(currentActiveUsers, previousActiveUsers)
        },
        totalUsers: {
          current: totalUsers,
          previous: null,
          delta: null,
          deltaPercent: null
        }
      }
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Khong the lay du lieu so sanh analytics'
    });
  }
});

module.exports = router;
