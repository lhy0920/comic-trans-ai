import nodemailer from 'nodemailer'

// 延迟创建邮件传输器
let transporter: nodemailer.Transporter | null = null

const getTransporter = () => {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: 'smtp.qq.com',
      port: 465,
      secure: true,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    })
  }
  return transporter
}

// 生成6位验证码
export const generateCode = () => {
  return Math.random().toString().slice(2, 8)
}

// 发送验证码邮件
export const sendVerifyCode = async (to: string, code: string) => {
  const mailOptions = {
    from: `"ComicFlow" <${process.env.EMAIL_USER}>`,
    to,
    subject: '【ComicFlow】邮箱验证码',
    html: `
      <div style="padding: 20px; background: linear-gradient(135deg, #fff0f3 0%, #e8f4f8 100%); border-radius: 12px;">
        <h2 style="color: #ff9eb5; margin-bottom: 16px;">ComicFlow 验证码</h2>
        <p style="color: #333; margin-bottom: 12px;">您好！您的验证码是：</p>
        <div style="font-size: 32px; font-weight: bold; color: #ff9eb5; letter-spacing: 4px; margin: 20px 0;">
          ${code}
        </div>
        <p style="color: #666; font-size: 14px;">验证码5分钟内有效，请勿泄露给他人。</p>
        <p style="color: #999; font-size: 12px; margin-top: 20px;">如非本人操作，请忽略此邮件。</p>
      </div>
    `
  }

  return getTransporter().sendMail(mailOptions)
}
