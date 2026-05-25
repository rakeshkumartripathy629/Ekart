const nodemailer = require('nodemailer');
const transporter = nodemailer.createTransport({host:process.env.EMAIL_HOST,port:+process.env.EMAIL_PORT||587,secure:false,auth:{user:process.env.EMAIL_USER,pass:process.env.EMAIL_PASS}});
exports.sendEmail = async({to,subject,html,text}) => {
  try {
    await transporter.sendMail({from:process.env.EMAIL_FROM||'ShopKart <noreply@shopkart.com>',to,subject,html,text});
  } catch(err){ console.error('[Email] Send failed:',err.message); }
};
