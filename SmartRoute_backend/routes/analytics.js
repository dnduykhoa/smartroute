const express = require('express');
const router = express.Router();
const User = require('../schemas/users');
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

async function countUsersByFilter(range, extraFilter = {}) {
  return User.countDocuments({
    isDeleted: false,
    createdAt: { $gte: range.start, $lte: range.end },
    ...extraFilter
  });
}

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
