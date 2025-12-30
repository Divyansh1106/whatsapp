const sendOtpToemail = require('../services/email');
const twilio = require("../services/twilio");
const User = require("../models/User");
const generateToken = require('../utils/generateToken');
const otpGenerator = require('../utils/otpgenerator');
const response = require('../utils/responseHandler');
const { uploadFileToCloudinary } = require('../config/cloudinaryConfig');
const conversation=require("../models/Conversation")
const sendOTP = async (req, res) => {
    console.log('🎯 sendOTP route hit');
    console.log('📦 Request body:', req.body);
    
    const { phone, phoneSuffix, email } = req.body;
    const otp = otpGenerator();
    const expiry = Date.now() + 5 * 60 * 1000;
    let user;
    //frontend->email
    //backend->req.body->email->if(!email)return response(res,400,"email is required") else->hum apne existing data base se us email se registered user ko dhundung
    //2 cases possible 1st case->user mil gya 2n case user nhi mila agar user nhi mila toh humne database main us email se naya user bnayaenege jo ki initially sirf email field hi rkhenga fir us user ke emailOtp aur Emailexpiry field ko update kar denge otp aur expiry se fir us user ko save kar denge
    //otpGenerate function se otp generate krke usko sendOtpToemail function ko call krke email bhej denge agar email successfully bhej diya toh response me 200 status code ke sath message bhej denge ki otp sent to your email agr email bhejne me koi error aata hai toh catch block me aa jayega jaha pe hum error ko log krdenge aur 500 status code ke sath response bhej denge
    //sendOTPtoEmail function main mera error handling hoga us function ka
    //fir us response ko bhej denge
    try {
        
        if (email) {
            console.log('📧 Processing email OTP');
            user = await User.findOne({ email: email });
            if (!user) {
                user = new User({ email });
            }
            user.emailOtp = otp;
            user.Emailexpiry = expiry;
            await user.save();
            
            console.log('📤 Sending email...');
            await sendOtpToemail(email, otp);
            console.log('✅ Email sent successfully');

            return response(res, 200, "OTP sent to your email", { email });
        }

        // Phone flow
        if (!phone || !phoneSuffix) {
            return response(res, 400, "phone number and suffix are required");
        }
        
        console.log('📱 Processing phone OTP');
        const fullPhoneNumber = `${phoneSuffix}${phone}`;
                        // In development include the OTP in the response to ease testing
                        const respData = { email };
                        if (process.env.NODE_ENV !== 'production') respData.__dev_otp = otp;
                        return response(res, 200, "OTP sent to your email", respData);
        
        user = await User.findOne({ phone: phone });
        if (!user) {
            console.log('Creating new user');
            user = new User({ phone, phoneSuffix });
        }
        
        console.log('📤 Calling Twilio...');
        await twilio.sendOTPtoPhoneNumber(fullPhoneNumber);
        console.log('✅ Twilio call successful');
        
        await user.save();
        console.log('✅ User saved');
        
        return response(res, 200, "OTP sent to your phone", { phone });
        
    } catch (error) {
        console.error('❌ Error in sendOTP:');
        console.error('Message:', error.message);
        console.error('Stack:', error.stack);
        return response(res, 500, "something went wrong: " + error.message);
    }
};
//frontend->otp,aur useUserStore se us user ka mail lenge
//jese otp submit krega axios se post request jayega backend ke verify otp route pe
//backend-agar mail ke through ho rha hain toh bas hum check krenge user.emailotp aur jo enterd otp hain woh equal hain ya nhi hain warna 


const verifyOTP = async (req, res) => {
    console.log('🎯 verifyOTP route hit');
    console.log('📦 Request body:', req.body);
    
    const { phone, phoneSuffix, email, otp } = req.body;
    
    try {
        let user;
        
        // Email verification
        if (email) {
            console.log('📧 Verifying email OTP');
            user = await User.findOne({ email }); // Fixed: added object syntax
            
            if (!user) {
                return response(res, 400, "User not found");
            }
            
            const now = Date.now();
            if (!user.emailOtp || String(user.emailOtp) !== String(otp) || now > user.Emailexpiry) {
                
                return response(res, 400, "Invalid or expired OTP");
            }
            
            user.isVerified = true;
            user.emailOtp = null;
            user.Emailexpiry = null;
            await user.save();
            
        } else {
            // Phone verification - Fixed variable names
            if (!phone || !phoneSuffix) {
                return response(res, 400, "phone number and suffix are required");
            }
            
            console.log('📱 Verifying phone OTP');
            const fullPhoneNumber = `${phoneSuffix}${phone}`; // Fixed: was phoneNumber
            
            user = await User.findOne({ phone }); // Fixed: proper query syntax
            if (!user) {
                return response(res, 404, "User not found");
            }
            
            console.log('📤 Calling Twilio verification...');
            const result = await twilio.verification(fullPhoneNumber, otp);
            console.log('Twilio result:', result.status);
            
            if (result.status !== 'approved') {
                return response(res, 400, "Invalid OTP");
            }
            
            user.isVerified = true;
            await user.save(); // Fixed: added ()
        }
        
       const token = generateToken({ id: user._id,email:user.email,phone:`${phoneSuffix}${phone}`});;
        
        // Set cookie for local development; SameSite 'lax' helps cross-port dev flows
        res.cookie("auth_token", token, {
            httpOnly: true,
            maxAge: 1000 * 60 * 60 * 24 * 365,
            sameSite: 'lax',
        });
        
        return response(res, 200, "OTP verified successfully", { token, user });
        
    } catch (error) {
        console.error('❌ Error in verifyOTP:');
        console.error('Message:', error.message);
        console.error('Stack:', error.stack);
        return response(res, 500, "something went wrong: " + error.message); // Added return
    }
};
const updateProfile=async(req,res)=>{
    const {username,agreed,profilePicture}=req.body;
    console.log("req user object",req.user)
     const userId = req.user.id || req.user.id;
    try{
      const user = await User.findById(userId );
      const file=req.file;
      if(file){
        const uploadResult=await uploadFileToCloudinary(file)
        console.log(uploadResult);
        user.profilePicture=uploadResult?.secure_url
        
      }else if(req.body.profilePicture){
        user.profilePicture=req.body.profilePicture;
      }
      if(username)user.username=username;
      if(agreed)user.agreed=agreed;
      
      console.log()   
      await user.save();
      return response(res, 200, "user profile updated successfully",user)
    }
    catch(error){
        console.log(error);
        return response(res, 400, "there is a error",error);
    }
}
const logout=async(req,res)=>{
    try{
        res.cookie("auth_token","",{expires:new Date(0), sameSite: 'lax'});
        return response(res, 200, "logout succesfully")
    }
    catch(error){
        console.error(error)
        return response(res, 404,"there is an error",error.message)
    }
}
const checkAuthenticated=async(req,res)=>{
    try{
        const userId=req.user.id;
        if(!userId){
            return response(res,400, "not Authenticated");
        }
        const user=await User.findById(userId).select("-emailOtp -Emailexpiry -password");
        if(!user){
            return response(res,400,"user not found for jwt key");
        }
        return response(res,200,"user allowed to use",user);
    } catch(error){
        console.log(error)
       return response(res,400,"something went wrong",error.message)
    }
}
const getAllusers = async (req, res) => {
    
    const loggedInUser = req.user.id;
    
    try {
        console.log('👥 Getting all users for:', loggedInUser);
        
        // Get all users except the logged-in user
        const users = await User.find({ _id: { $ne: loggedInUser } })
            .select("username isOnline lastSeen profilePicture about phone phoneSuffix")
            .lean();
        
        console.log(`Found ${users.length} users`);
        
        // Add conversation info for each user
        const usersWithConversation = await Promise.all(
            users.map(async (user) => {
                // Fixed: added await, changed user.id to user._id, fixed || operator
                const existingConversation = await conversation.findOne({
                    participants: { $all: [loggedInUser, user._id] } // ✅ Fixed: user.id → user._id
                })
                .populate({
                    path: "LastMessage",
                    select: "Content createdAt Sender Reciever" // Fixed typo: contentCreatedAt → content createdAt
                })
                .lean();
                
                return {
                    ...user,
                    existingConversation: existingConversation || null // ✅ Fixed: | → ||
                };
            })
        );
        
        console.log('✅ Users with conversations retrieved');
        return response(res, 200, "Users retrieved successfully", usersWithConversation);
        
    } catch (error) { // ✅ Fixed: added error parameter
        console.error('❌ Error in getAllusers:', error);
        return response(res, 500, "Cannot get all users", error.message);
    }
};
module.exports = { sendOTP, verifyOTP ,updateProfile,logout,checkAuthenticated,getAllusers};