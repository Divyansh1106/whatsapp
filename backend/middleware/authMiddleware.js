const jwt=require('jsonwebtoken');
const response=require('../utils/responseHandler')
const dotenv = require("dotenv");

dotenv.config();
const authMiddleware=(req,res,next)=>{
    console.log('req.headers.cookie =', req.headers.cookie);
console.log('req.cookies =', req.cookies);
   // Accept token from cookie or Authorization header (Bearer) as a fallback
   let AuthToken = req.cookies?.auth_token;
   if (!AuthToken && req.headers && req.headers.authorization) {
     const parts = String(req.headers.authorization).split(' ');
     if (parts.length === 2 && parts[0].toLowerCase() === 'bearer') {
       AuthToken = parts[1];
     }
   }

   console.log('AuthToken present:', !!AuthToken);
   if(!AuthToken) return response(res,401,'unauthorized: token missing');
   try{
     const decode = jwt.verify(AuthToken, process.env.JWT_SECRET);
     req.user = decode;
     console.log('Decoded user from token:', req.user);
     return next();
   } catch(error) {
     console.error('JWT verify error:', error.message);
     return response(res,401,"Invalid or expired token");
   }

}
module.exports = authMiddleware;