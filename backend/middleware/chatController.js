
const Conversation = require('../models/Conversation');
const response = require("../utils/responseHandler");
const Message = require("../models/Messages");
const { uploadFileToCloudinary } = require("../config/cloudinaryConfig");
 
exports.sendMessage=async(req,res)=>{
    console.log('=== BACKEND RECEIVED ===');
  console.log('Body:', req.body);
  console.log('File:', req.file);
  console.log('Headers:', req.headers['content-type']);
  console.log('=======================');

    try{
        
        const { senderId, recieverId, content, messageStatus } = req.body;
        const file = req.file;
        const participants = [senderId, recieverId].sort();
        let conversation = await Conversation.findOne({ participants: participants });
        if(!conversation){
            conversation = new Conversation({ participants, unreadCount: 0 });
        }
        await conversation.save()
        let imageorvideoURL = null;
        let contentType = null;
        let messageContent = content?.trim() || "";

        if (file) {
           const uploadFile = await uploadFileToCloudinary(file);
           if(!uploadFile?.secure_url){
             return response(res,404,"something went wrong")
           }
           imageorvideoURL = uploadFile?.secure_url;
           if(file.mimetype.startsWith('image')){
             contentType="image"
             if(!messageContent) messageContent = "[Photo]";
           }
           else if(file.mimetype.startsWith('video')){
             contentType="video"
             if(!messageContent) messageContent = "[Video]";
           }
           else{
            return response(res,400,"unsupported file")
           }
        }
        else if(messageContent){
            contentType="text"
        }
        else{
            return response(res,400,"no message enetered or message content is required")
        }
        const message=new Message({
            Message: conversation?._id,
            Sender:senderId,
            Reciever:recieverId,
            Content:messageContent,
            contentType,
            imageorvideoURL,
            messageStatus
        })
        await message.save();
        conversation.LastMessage = message?._id;
        conversation.unreadCount = (conversation.unreadCount || 0) + 1;
        await conversation.save();
const populatedMessage = await Message.findById(message._id)
  .populate("Sender", "username profilePicture")
  .populate("Reciever", "username profilePicture");
  if(req.io&&req.socketUserMap){
    const recieverSocketId=req.socketUserMap.get(recieverId)
    if(recieverSocketId){
        req.io.to(recieverSocketId).emit("recieve_message",populatedMessage);
        message.messageStatus="delivered"
        await message.save();
    }
  }
        return response(res,200,"Message send succesfully",populatedMessage)
    }

    catch(error){
        console.log(error)
         return response(res,400,"something went wrong",error)
    }
}
exports.getMessages=async(req,res)=>{
    const userId=req.user.id
    console.log(userId);
    try{
        let conversation=await Conversation.find({
            participants:userId
        }).populate("participants","username profilePicture lastSeen isOnline")
        .populate({
            path:"LastMessage",
            populate:{
                path:"Sender Reciever",
                select:"username profilePicture"
            }
        }).sort({updatedAt:-1})
        console.log("conversation:",conversation)
         return response(res,201,"everything succeeded messgaes are these",conversation)
    }
    catch(error){
       console.error(error);
       return response(res,404,"internal service error",error);
    }
}
//get Message sof a specific person
exports.getMessage=async(req,res) => {
     console.log("[getMessage] params:", req.params);
    const {conversationId}=req.params
    
    const userId=req.user.id
    console.log(req.user);
    
    try{
       const conversation=await Conversation.findById(conversationId)
       if(!conversation){
        return response(res,404,"Conversation not found")
       }
       if(!conversation.participants.includes(userId)){
        return response(res,404,"Not authorized to view this conversation")
       }
       const message=await Message.find({Message:conversationId}).populate("Sender","username profilePicture").populate("Reciever","username profilePicture").populate("reactions.user","username profilePicture").sort("createdAt")
       console.log(message)
       await Message.updateMany({
        Message:conversationId,
        Reciever:userId,
        messageStatus:{$in:("send","delivered")},
        
       },
       {$set:{messageStatus: "read"}}
    )
    conversation.unreadCount=0;
    await conversation.save();
    console.log('req.user =', req.user);
console.log('userId =', req.user?.id);
console.log('conversationId =', req.params.conversationId);
    return response(res,200,"message are here!",message)
    }
    catch(error){
        console.log(error)
        return response(res,400,"something went wrong",error)
    }
}
exports.markAsRead=async(req,res) => {
    const {messageIds}=req.body
        const userId=req.user.id
        try{
        let messages=await Message.find({
            _id:{$in:messageIds},
            reciever:userId,
        })
        await Message.updateMany({
            _id:{$in:messageIds},reciever:userId
        },{$set:{messageStatus:"read"}})
        if(req.io&&req.socketUserMap){
        for(const message of  messages){
            const senderSocketId=req.socketUserMap.get(message.Sender.toString());
            if(senderSocketId){
                const updatedMessage={
                    _id:message._id,
                    messageStatus:"read"
                };

                req.io.to(senderSocketId).emit("message read",updatedMessage);
                await message.save();
            }
        }
  }
        return response(res,200,"message markes as read")
        }
        catch(error){
        return response(res,400,"no message is to be read",error)
        }
}
exports.deleteMessage = async (req, res) => {
  const { messageId } = req.params;
  const userId = req.user.id;
  try {
    const msg = await Message.findById(messageId);
    if (!msg) {
      return response(res, 400, "no message found");
    }

    // only sender can delete for everyone
    if (msg.Sender.toString() !== userId.toString()) {
      return response(res, 404, "not authorized to delete this message");
    }

    await msg.deleteOne();

    if (req.io && req.socketUserMap) {
      const recieverSocketId = req.socketUserMap.get(msg.Reciever.toString());
      if (recieverSocketId) {
        req.io.to(recieverSocketId).emit("message_deleted", { deletedMessageId: messageId });
      }
    }
    return response(res, 200, "message deleted successfully");
  } catch (error) {
    return response(res, 404, "something went wrong", error);
  }
};