const Status=require('../models/Status')
const response=require("../utils/responseHandler")
const Message=require("../models/Messages");
 
exports.createStatus = async (req, res) => {
    try {
        // 🔍 DEBUG - Check what's actually in req.body
        console.log("=== RAW REQUEST DATA ===");
        console.log("req.body:", JSON.stringify(req.body, null, 2));
        console.log("req.body.content:", req.body.content);
        console.log("typeof content:", typeof req.body.content);
        console.log("content is null?", req.body.content === null);
        console.log("content is undefined?", req.body.content === undefined);
        console.log("content is empty string?", req.body.content === "");
        
        const { content, content_type } = req.body;
        const userId = req.user.id;
        const file = req.file;
        
        console.log("=== AFTER DESTRUCTURING ===");
        console.log("content:", content);
        console.log("content?.trim():", content?.trim());
        console.log("Boolean(content?.trim()):", Boolean(content?.trim()));
        
        let mediaUrl = null;
        let finalContentType = content_type || "text";
        
        // Handle file upload (image/video)
        if (file) {
            console.log("📁 Entering FILE branch");
            const uploadFile = await uploadFileToCloudinary(file);
            
            if (!uploadFile?.secure_url) {
                return response(res, 400, "Failed to upload file");
            }
            
            mediaUrl = uploadFile.secure_url;
            
            if (file.mimetype.startsWith('image')) {
                finalContentType = "image";
            } else if (file.mimetype.startsWith('video')) {
                finalContentType = "video";
            } else {
                return response(res, 400, "Unsupported file type");
            }
        }
        // Handle text content
        else if (content?.trim()) {
            console.log("📝 Entering TEXT branch");
            mediaUrl = content.trim();
            finalContentType = "text";
            console.log("mediaUrl set to:", mediaUrl);
        }
        // No content provided
        else {
            console.log("❌ Entering NO CONTENT branch");
            console.log("Why? file:", !!file, "content?.trim():", content?.trim());
            return response(res, 400, "No content entered or file uploaded");
        }
        
        console.log("Final mediaUrl:", mediaUrl);
        console.log("Final finalContentType:", finalContentType);
        
        if (!mediaUrl) {
            return response(res, 400, "Content is required");
        }
        
        const expiresAt = new Date();
        expiresAt.setHours(expiresAt.getHours() + 24);
        
        const status = new Status({
            user: userId,
            content: mediaUrl,
            content_type: finalContentType,
            expireAt: expiresAt,
        });
        
        await status.save();
        
        const populatedStatus = await Status.findById(status._id)
            .populate("user", "username profilePicture")
            .populate("viewers", "username profilePicture");
         if(req.io&&req.socketUserMap){
            for(cons[connectedUserId,socketId] of req.socketUserMap){
                if(connectedUserId!==socketId){
                    io.to(socketId).emit("new_status",populatedStatus)
                }
                
            }
         }
        return response(res, 201, "Status shared successfully", populatedStatus);
    }
    catch (error) {
        console.error("❌ Error creating status:", error);
        return response(res, 500, "Something went wrong", error.message);
    }
};
exports.getStatus = async (req, res) => {
    try {
        const statuses = await Status.find({
            expireAt: { $gt: new Date() } // ✅ FIXED: expireAt (not expiresAt)
        })
        .populate("user", "username profilePicture")
        .populate("viewers", "username profilePicture")
        .sort({ createdAt: -1 });
        
        return response(res, 200, "Statuses fetched successfully", statuses); // ✅ FIXED: 200 (not 500)
    }
    catch (error) {
        console.error(error);
        return response(res, 500, "Internal server error", error.message);
    }
};

exports.viewStatus = async (req, res) => {
    const { statusId } = req.params;
    const userId = req.user.id;
    
    try {
        const status = await Status.findById(statusId);
        
        if (!status) {
            return response(res, 404, "Status not found");
        }
        
        // Check if status has expired
        if (status.expireAt < new Date()) {
            return response(res, 410, "Status has expired");
        }
        
        let updatedStatus; // ✅ FIXED: Declare variable outside if/else
        
        if (!status.viewers.includes(userId)) {
            status.viewers.push(userId);
            await status.save();
            
            updatedStatus = await Status.findById(statusId)
                .populate("user", "username profilePicture")
                .populate("viewers", "username profilePicture");
                 if(req.io&&req.socketUserMap){
                      const statusOwnerSocketId=req.socketUserMap.get(status.user._id.toString())
                      if(statusOwnerSocketId){
                        const viewData={
                            statusId,
                            viewerId: userId,
                            totalViewers:updatedStatus.viewers.length,
                            viewers:updatedStatus.viewers
                        }
                        res.io.to(statusOwnerSocketId).emit("status_viewed",viewData)
                      }
                      else{
                        console.log("status owner not connected")
                      }
         }
        } else {
            console.log("User already viewed status");
            // ✅ FIXED: Must fetch status even if already viewed
            updatedStatus = await Status.findById(statusId)
                .populate("user", "username profilePicture")
                .populate("viewers", "username profilePicture");
        }
        
        return response(res, 200, "Viewed successfully", updatedStatus);
    }
    catch (error) {
        // ✅ FIXED: Added error handling
        console.error("Error viewing status:", error);
        return response(res, 500, "Something went wrong", error.message);
    }
};
exports.deleteStatus =async(req,res)=>{
    const userId=req.user.id
    const {statusId}=req.params
    
    try{
    const status=await Status.findById(statusId);
    if(!status){
        return response(res,404,"statsus not found");
    }
    if(status.user.toString()!==userId){
        return response(res,404,"Not authorized to delelte this status")
    }
    await status.deleteOne();
    if(req.io&&req.socketUserMap){
        for(const [connectedUserId,socketId] of req.io){
            if(connectedUserId===socketId){
                req.io.to(socketId).emit("status deleted",statusId);
            }
        }
    }
    return response(res,200,"status deleted succesfully");
    }
    catch(error){
     console.log(error)
     return response(res,404,"somethinf went erong",error);
    }
}