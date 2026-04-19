const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const userSchema = new mongoose.Schema(
    {
        username: {
            type: String,
            required: [true, "Username is required"],
            unique: true
        },

        password: {
            type: String,
            required: [true, "Password is required"]
        },

        email: {
            type: String,
            required: [true, "Email is required"],
            unique: true,
            lowercase: true,
            match: [/\S+@\S+\.\S+/, "Invalid email format"]
        },

        fullName: {
            type: String,
            default: ''
        },

        birthday: {
            type: Date,
             validate: {
                validator: function(value) {
                    return value < new Date();
                },
                message: "Birthday must be in the past"
            }
        },

        avatarUrl: {
            type: String,
            default: "https://i.sstatic.net/l60Hf.png"
        },

        // Kích hoạt tài khoản
        status: {
            type: Boolean,
            default: false
        },

        role: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "role",
            required: true
        },

        // Số lần đăng nhập thành công, dùng để kiểm soát đăng nhập lần đầu
        loginCount: {
            type: Number,
            default: 0,
            min: [0, "Login count cannot be negative"]
        },

        // Đánh dấu xóa mềm
        isDeleted: {
            type: Boolean,
            default: false
        },

        // Reset password fields
        resetToken: {
            type: String,
            default: null
        },

        resetTokenExpiry: {
            type: Date,
            default: null
        },

        resetTokenAttempts: {
            type: Number,
            default: 0,
            min: [0, 'Reset token attempts cannot be negative']
        },

        lastLogin: {
            type: Date,
            default: null
        }
    }, 
{
    timestamps: true
});

userSchema.index({ 
    username: 1, 
    email: 1 
});

// Hash password trước khi lưu
userSchema.pre('save', async function() {
    if (this.password && this.isModified('password')) {
        const salt = bcrypt.genSaltSync(10);
        this.password = bcrypt.hashSync(this.password, salt);
    }
});

module.exports = mongoose.model("user", userSchema);