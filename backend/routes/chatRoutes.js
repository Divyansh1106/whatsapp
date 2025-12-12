const express = require("express");
const chatController = require("../middleware/chatController");
const authMiddleware = require("../middleware/authMiddleware");
const { multerMiddleware } = require("../config/cloudinaryConfig");
const router = express.Router();

// protected Routes
router.post('/send-message', authMiddleware, multerMiddleware, chatController.sendMessage);
router.get('/conversation', authMiddleware, chatController.getMessages);
router.get('/conversations/:conversationId/messages', authMiddleware, chatController.getMessage);
router.put('/messages/read', authMiddleware, chatController.markAsRead);
router.delete('/messages/:messageId', authMiddleware, chatController.deleteMessage);
module.exports = router