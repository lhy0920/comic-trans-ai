const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: 'smtp.qq.com',
  port: 465,
  secure: true,
  auth: {
    user: '3534897365@qq.com',
    pass: 'zmhgixyiujwddbaa'
  },
  tls: {
    rejectUnauthorized: false
  },
  connectionTimeout: 10000,
  socketTimeout: 10000
});

async function test() {
  try {
    console.log('Testing connection...');
    const verify = await transporter.verify();
    console.log('Server is ready to take our messages');
    
    const info = await transporter.sendMail({
      from: '"Test" <3534897365@qq.com>',
      to: '3534897365@qq.com',
      subject: 'Test Email',
      text: 'Hello world'
    });
    console.log('Message sent: %s', info.messageId);
  } catch (error) {
    console.error('Error:', error);
  }
}

test();