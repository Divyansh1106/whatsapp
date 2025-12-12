const express = require("express");
const statusController=require("../middleware/statusController");
const authMiddleware=require("../middleware/authMiddleware");
const {multerMiddleware}=require("../config/cloudinaryConfig");
const router=express.Router();

//protected Routes
router.post('/',authMiddleware,multerMiddleware,statusController.createStatus)
router.get('/',authMiddleware,statusController.getStatus)

router.put('/:statusId/view',authMiddleware,statusController.viewStatus)
router.delete('/:statusId',authMiddleware,statusController.deleteStatus) 
module.exports = router