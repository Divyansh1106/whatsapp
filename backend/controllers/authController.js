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
    
    try {
        // Email flow
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
        console.log('Full phone number:', fullPhoneNumber);
        
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
        
        res.cookie("auth_token", token, { // Fixed: syntax error
            httpOnly: true,
            maxAge: 1000 * 60 * 60 * 24 * 365
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
        res.cookie("auth_token","",{expires:new Date(0)});
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