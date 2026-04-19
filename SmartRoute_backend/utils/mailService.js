const nodemailer = require('nodemailer');

const MAIL_USER = process.env.MAIL_USER;
const MAIL_PASS = process.env.MAIL_PASS;

function isMailConfigured() {
  return Boolean(MAIL_USER && MAIL_PASS);
}

// Cấu hình Gmail
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: MAIL_USER,
    pass: MAIL_PASS
  }
});

// Kiểm tra kết nối
transporter.verify((err, success) => {
  if (!isMailConfigured()) {
    console.error('Mail service is not configured. Please set MAIL_USER and MAIL_PASS.');
    return;
  }

  if (err) {
    console.error('Mail service error:', err);
  } else {
    console.log('Mail service is ready');
  }
});

const sendResetPasswordEmail = async (email, resetToken, userName) => {
  try {
    if (!isMailConfigured()) {
      return { success: false, message: 'Dich vu email chua duoc cau hinh' };
    }

    const mailOptions = {
      from: MAIL_USER,
      to: email,
      subject: 'SmartRoute - Yêu cầu reset mật khẩu',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; color: white; border-radius: 10px 10px 0 0;">
            <h1 style="margin: 0; font-size: 28px;">SmartRoute</h1>
            <p style="margin: 10px 0 0 0; font-size: 16px;">Giải pháp quản lý giao hàng thông minh</p>
          </div>
          
          <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
            <h2 style="color: #333; margin-top: 0;">Xin chào ${userName || 'Người dùng'},</h2>
            
            <p style="color: #666; font-size: 16px; line-height: 1.6;">
              Chúng tôi nhận được yêu cầu reset mật khẩu cho tài khoản của bạn. 
              Nếu bạn không thực hiện yêu cầu này, vui lòng bỏ qua email này.
            </p>
            
            <div style="text-align: center; margin: 30px 0; background: #f0f0f0; padding: 20px; border-radius: 5px;">
              <p style="color: #666; margin: 0 0 10px 0; font-size: 14px;">Mã xác nhận của bạn:</p>
              <p style="color: #667eea; font-size: 32px; font-weight: bold; letter-spacing: 5px; margin: 0;">
                ${resetToken}
              </p>
              <p style="color: #999; font-size: 12px; margin: 10px 0 0 0;">Mã này sẽ hết hạn trong 30 phút</p>
            </div>

            <p style="color: #999; font-size: 12px; margin-top: 30px; text-align: center;">
              Vui lòng nhập mã xác nhận này vào ứng dụng để đặt lại mật khẩu.
              <br/>
              Nếu bạn không yêu cầu reset mật khẩu, vui lòng bỏ qua email này.
            </p>
          </div>
          
          <div style="background: #333; color: #999; padding: 20px; text-align: center; font-size: 12px; border-radius: 0 0 10px 10px;">
            <p style="margin: 0;">© 2026 SmartRoute. Tất cả quyền được bảo lưu.</p>
            <p style="margin: 5px 0 0 0;">Đây là email tự động, vui lòng không trả lời.</p>
          </div>
        </div>
      `
    };

    const result = await transporter.sendMail(mailOptions);
    console.log('Email sent:', result.response);
    return { success: true, message: 'Email đã được gửi thành công' };
  } catch (error) {
    console.error('Send email error:', error);
    return { success: false, message: 'Loi gui email' };
  }
};

const sendWelcomeEmail = async (email, userName) => {
  try {
    if (!isMailConfigured()) {
      return { success: false };
    }

    const mailOptions = {
      from: MAIL_USER,
      to: email,
      subject: 'Chào mừng đến dengan SmartRoute',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; color: white; border-radius: 10px 10px 0 0;">
            <h1 style="margin: 0; font-size: 28px;">SmartRoute</h1>
          </div>
          
          <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
            <h2 style="color: #333;">Chào mừng ${userName || 'Người dùng'},</h2>
            <p style="color: #666;">Tài khoản của bạn đã được tạo thành công!</p>
          </div>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);
    return { success: true };
  } catch (error) {
    console.error('Send welcome email error:', error);
    return { success: false };
  }
};

module.exports = {
  sendResetPasswordEmail,
  sendWelcomeEmail
};
