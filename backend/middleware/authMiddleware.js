const jwt=require('jsonwebtoken');
const response=require('../utils/responseHandler')
const dotenv = require("dotenv");

dotenv.config();
const authMiddleware=(req,res,next)=>{
    console.log('req.headers.cookie =', req.headers.cookie);
console.log('req.cookies =', req.cookies);
   const AuthToken=req.cookies?.auth_token;
   console.log(AuthToken)
   if(!AuthToken) return response(res,400,'aauthorised token missing')
   try{
   const decode=jwt.verify(AuthToken,process.env.JWT_SECRET)
   req.user=decode
   console.log(req.user)
   next();

}
catch(error){
  console.error(error)
  next(error)
  return response(res,400,"Invalid Or Expire Token")
  
}

}
module.exports = authMiddleware;