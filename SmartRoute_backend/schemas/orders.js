const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema(
  {
    orderCode: {
      type: String,
      required: [true, 'Mã đơn hàng là bắt buộc'],
      unique: true,
      trim: true
    },

    product: {
      type: String,
      required: [true, 'Sản phẩm là bắt buộc']
    },

    quantity: {
      type: Number,
      required: [true, 'Số lượng là bắt buộc'],
      min: [1, 'Số lượng phải lớn hơn 0']
    },

    unit: {
      type: String,
      required: [true, 'Đơn vị là bắt buộc']
    },

    address: {
      type: String,
      required: [true, 'Địa chỉ là bắt buộc']
    },

    ward: {
      type: String,
      required: [true, 'Phường là bắt buộc']
    },

    district: {
      type: String,
      default: ''
    },

    city: {
      type: String,
      required: [true, 'Thành phố là bắt buộc']
    },

    phone: {
      type: String,
      required: [true, 'Số điện thoại là bắt buộc'],
      match: [/^\d{10,11}$/, 'Số điện thoại không hợp lệ (10-11 chữ số)']
    },

    method: {
      type: String,
      enum: ['online', 'offline'],
      default: 'online'
    },

    confirmed: {
      type: Boolean,
      default: false
    },

    // Người tạo đơn hàng
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'user',
      default: null
    },

    // Ghi chú
    notes: {
      type: String,
      default: ''
    },

    // Đánh dấu xóa mềm
    isDeleted: {
      type: Boolean,
      default: false
    }
  },
  {
    timestamps: true
  }
);

// Index để tìm kiếm nhanh
orderSchema.index({
  orderCode: 1,
  city: 1,
  method: 1,
  confirmed: 1
});

module.exports = mongoose.model('order', orderSchema);
