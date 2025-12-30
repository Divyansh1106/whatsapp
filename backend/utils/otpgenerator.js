const otpGenerator=function(){
otp=Math.floor(100000 + Math.random() * 900000);
return String(otp) }

  module.exports=otpGenerator