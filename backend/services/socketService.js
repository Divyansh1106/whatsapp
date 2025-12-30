const { Server } = require("socket.io");
const User = require("../models/User");
const Message = require("../models/Messages");

const onlineUsers = new Map();
const typingUsers = new Map();
//again specified cors for websocket servers 
const initializeSocket = function(server) {
  const io = new Server(server, {
    cors: {
      origin: process.env.FRONTEND_URL || "*",
      credentials: true,
      methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    },
    transports: ["websocket", "polling"],
    pingTimeout: 60000,
  });

  io.on("connection",function (socket) {
    console.log(`User Connected :${socket.id}`);
    let userId = null;
    socket.on("user_connected", async (connectingUserId) => {
      try {
        userId = connectingUserId;
        onlineUsers.set(userId, socket.id);
        socket.join(userId);
        await User.findByIdAndUpdate(userId, {
          isOnline: true,
          lastSeen: new Date(),
        });
        io.emit("user_status", { userId, isOnline: true });
      } catch (error) {
        console.error("Error handling user connection");
      }
    });
    socket.on("get_user_status", (requestedUserId, callback) => {
      const isOnline = onlineUsers.has(requestedUserId);
      callback({
        userId: requestedUserId,
        isOnline: isOnline,
        lastSeen: isOnline ? new Date() : null,
      });
    });
    //forward message to reciever
    socket.on("send_message", async (message) => {
      try {
        const recieverSocketId = onlineUsers.get(
          message?.Reciever?._id?.toString?.() ||
          message?.reciever?._id?.toString?.() ||
          message?.reciever?.toString?.()
        );
        if (recieverSocketId) {
          io.to(recieverSocketId).emit("recieve_message", message);
        }
      } catch (error) {
        console.error("Error sending message", error);
        socket.emit("message_error", { error: "Failed to send message" });
      }
    });
    //update messages as read and notify users
    socket.on("message_read", async ({ messageIds, senderIds }) => {
      try {
        await Message.updateMany(
          { _id: { $in: messageIds } },
          { $set: { messageStatus: "read" } }
        );

        const senderSocketId = onlineUsers.get(senderIds);
        if (senderSocketId) {
          messageIds.forEach((message) => {
            io.to(senderSocketId).emit("message_status_update", {
              message,
              messageStatus: "read",
            });
          });
        }
      } catch (error) {
        console.error("Error updating message read status", error);
      }
    });
    //handle typing start event and auto stop after 3 seconds
    socket.on("typing_start", ({ conversationId, recieverId }) => {
      try {
        if (!userId || !conversationId || !recieverId) return;
        if (!typingUsers.has(userId)) typingUsers.set(userId, {});
        const userTyping = typingUsers.get(userId);
        userTyping[conversationId] = true;
        if (userTyping[`${conversationId}_timeout`]) {
          clearTimeout(userTyping[`${conversationId}_timeout`]);
        }
        //auto-stop after 3 seconds
        userTyping[`${conversationId}_timeout`] = setTimeout(() => {
          userTyping[conversationId] = false;
          socket.to(recieverId).emit("user_Typing", {
            userId,
            conversationId,
            isTyping: false,
          });
        }, 3000);
        //notify users
        socket.to(recieverId).emit("user_typing", {
          userId,
          conversationId,
          isTyping: true,
        });
      } catch (error) {}
    });
    socket.on("typing_stop", ({ conversationId, recieverId }) => {
      if (!userId || !conversationId || !recieverId) return;
      if (!typingUsers.has(userId)) {
        typingUsers.set(userId, {});
        
      }
      const userTyping = typingUsers.get(userId);
      userTyping[conversationId] = false;

      if (userTyping[`${conversationId}_timeout`]) {
        clearTimeout(userTyping[`${conversationId}_timeout`]);
        delete userTyping[`${conversationId}_timeout`];
      }
      socket.to(recieverId).emit("user_typing", {
        userId,
        conversationId,
        isTyping: false,
      });
    });
    //Add or update reaction
    socket.on(
      "add_reaction",
      async ({ messageId, emoji, userId: reactionUserId }) => {
        try {
          const message = await Message.findById(messageId);
          if (!message) {
            return;
          }
          const existingIndex = message.reactions.findIndex(
            (r) => r.user.toString() === reactionUserId
          );
          if (existingIndex > -1) {
            const existing = message.reactions[existingIndex];
            if (existing.emoji === emoji) {
              ///remove same reaction
              message.reactions.splice(existingIndex, 1);
            } else {
              //change emoji
              message.reactions[existingIndex].emoji = emoji;
            }
          } else {
            message.reactions.push({ user: reactionUserId, emoji: emoji });
          }
          await message.save();
          const populatedMessage = await Message.findById(message._id)
            .populate("Sender", "username profilePicture")
            .populate("Reciever", "username profilePicture")
            .populate("reactions.user", "username");
          const reactionUpdated = {
            messageId,
            reactions: populatedMessage.reactions,
          };
          const senderSocket = onlineUsers.get(
            populatedMessage.Sender._id.toString()
          );
          const recieverSocket = onlineUsers.get(
            populatedMessage.Reciever._id.toString()
          );
          if (senderSocket)
            io.to(senderSocket).emit("reaction_update", reactionUpdated);
          if (recieverSocket)
            io.to(recieverSocket).emit("reaction_update", reactionUpdated);
        } catch (error) {
          console.log("there is an error", error);
        }
      }
    );
    const handleDisconnection = async () => {
      if (!userId) return;
      try {
        onlineUsers.delete(userId);
        //clear all typing timeouts
        if (typingUsers.has(userId)) {
          const userTyping = typingUsers.get(userId);
          Object.keys(userTyping).forEach((key) => {
            if (key.endsWith("_timeout")) clearTimeout(userTyping[key]);
          });

          typingUsers.delete(userId);
        }
        await User.findByIdAndUpdate(userId, {
          isOnline: false,
          lastSeen: new Date(),
        });
        io.emit("user_status", {
          userId,
          isOnline: false,
          lastSeen: new Date(),
        });
        socket.leave(userId);
        console.log("user disconnected");
      } catch (error) {
        console.error("error in disconnection", error);
      }
    };
    socket.on("disconnect", handleDisconnection);
  });
  //attach the online usermap for external users
  io.socketUserMap = onlineUsers;
 return io
};
 module.exports = initializeSocket;
