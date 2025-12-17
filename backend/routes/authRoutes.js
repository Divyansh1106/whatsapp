const express=require("express");
const authController=require('../controllers/authController');
const authMiddleware = require("../middleware/authMiddleware");
const { multerMiddleware } = require("../config/cloudinaryConfig");
const router=express.Router();
router.post("/send-otp",authController.sendOTP );
router.post("/verify-otp",authController.verifyOTP);
router.put('/update-profile',authMiddleware,multerMiddleware,authController.updateProfile);
router.post("/logout",authController.logout);
router.get("/checkAuthenticated",authMiddleware,authController.checkAuthenticated)
router.get("/users",authMiddleware,authController.getAllusers);
module.exports = router;

