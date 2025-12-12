const nodemailer=require('nodemailer');
const dotenv=require("dotenv");

dotenv.config({})
console.log(process.env.username)
  console.log(process.env.password)
const transporter=nodemailer.createTransport({
    service:"gmail",
    auth:{
        user:"divyanshkhandelwal9b@gmail.com",
        pass:process.env.password
    

    }



})
 
transporter.verify((error,success) => {
    if(error){
        console.log("there is a error",error);
    }
    else{
        console.log("email configured properly",success);
    }
})
const sendOtpToemail=async (email,otp) => {
    const html=`
    <div style="font-family: Arial, sans-serif; color: #333; line-height: 1.6;">
      <h2 style="color: #075e54;">🔐 WhatsApp Web Verification</h2>
      
      <p>Hi there,</p>
      
      <p>Your one-time password (OTP) to verify your WhatsApp Web account is:</p>
      
      <h1 style="background: #e0f7fa; color: #000; padding: 10px 20px; display: inline-block; border-radius: 5px; letter-spacing: 2px;">
        ${otp}
      </h1>

      <p><strong>This OTP is valid for the next 5 minutes.</strong> Please do not share this code with anyone.</p>

      <p>If you didn’t request this OTP, please ignore this email.</p>

      <p style="margin-top: 20px;">Thanks & Regards,<br/>WhatsApp Web Security Team</p>

      <hr style="margin: 30px 0;" />

      <small style="color: #777;">This is an automated message. Please do not reply.</small>
    </div>
  `;
  await transporter.sendMail({
    from:`nishant pagal <"divyanshkhandelwal9b@gmail.com">`,
    to:email,
    subject:"Your Whatsapp verification code",
    html
  });
}
module.exports=sendOtpToemail  ;