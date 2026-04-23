const mongoose = require('mongoose');
const Role = require('../schemas/role');
const User = require('../schemas/users');

// Kết nối MongoDB
const MONGODB_URL = process.env.MONGODB_URL || 'mongodb://localhost/smartroute_db';

mongoose.connect(MONGODB_URL, {
    useNewUrlParser: true,
    useUnifiedTopology: true
})
.then(() => console.log('✓ MongoDB connected'))
.catch(err => console.error('✗ MongoDB connection error:', err));

// Định nghĩa các role mặc định
const roles = [
    {
        name: 'admin',
        description: 'Quản trị viên hệ thống'
    },
    {
        name: 'user',
        description: 'Người dùng bình thường'
    },
    {
        name: 'driver',
        description: 'Tài xế giao hàng'
    },
    {
        name: 'moderator',
        description: 'Người kiểm duyệt'
    }
];

const DEFAULT_ADMIN = {
    username: process.env.DEFAULT_ADMIN_USERNAME,
    email: process.env.DEFAULT_ADMIN_EMAIL,
    password: process.env.DEFAULT_ADMIN_PASSWORD,
    fullName: process.env.DEFAULT_ADMIN_FULLNAME
};

async function seedRoles() {
    try {
        if (!DEFAULT_ADMIN.password) {
            throw new Error('Thiếu DEFAULT_ADMIN_PASSWORD trong file .env hoặc environment variables');
        }

        // Upsert role để chạy nhiều lần không bị trùng và không bị mất dữ liệu cũ
        const createdRoles = [];
        for (const roleData of roles) {
            const role = await Role.findOneAndUpdate(
                { name: roleData.name },
                { $set: { description: roleData.description, isDeleted: false } },
                { new: true, upsert: true, setDefaultsOnInsert: true }
            );
            createdRoles.push(role);
        }

        console.log('✓ Đã đảm bảo role mặc định tồn tại:');
        createdRoles.forEach((role) => {
            console.log(`  - ${role.name} (${role.description})`);
        });

        const adminRole = createdRoles.find((role) => role.name === 'admin');
        if (!adminRole) {
            throw new Error('Không tìm thấy role admin sau khi seed');
        }

        let adminUser = await User.findOne({
            $or: [
                { username: DEFAULT_ADMIN.username },
                { email: DEFAULT_ADMIN.email }
            ]
        });

        if (!adminUser) {
            adminUser = new User({
                username: DEFAULT_ADMIN.username,
                email: DEFAULT_ADMIN.email,
                password: DEFAULT_ADMIN.password,
                fullName: DEFAULT_ADMIN.fullName,
                role: adminRole._id,
                status: true,
                isDeleted: false,
                loginCount: 0
            });
            await adminUser.save();
            console.log('✓ Đã tạo tài khoản admin mặc định');
        } else {
            adminUser.role = adminRole._id;
            adminUser.status = true;
            adminUser.isDeleted = false;
            adminUser.fullName = adminUser.fullName || DEFAULT_ADMIN.fullName;
            await adminUser.save();
            console.log('✓ Tài khoản admin đã tồn tại, đã cập nhật role/status');
        }

        console.log('\nDanh sách ID role:');
        createdRoles.forEach((role) => {
            console.log(`${role.name}: ${role._id}`);
        });

    } catch (error) {
        console.error('✗ Lỗi seed role:', error);
    } finally {
        await mongoose.connection.close();
        console.log('\n✓ Kết nối MongoDB đã đóng');
    }
}

seedRoles();
