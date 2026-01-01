import { create } from "zustand";
import axiosInstance from "../services/url.servics";
import io from "socket.io-client";

// Socket instance stored outside the store
let socketInstance = null;

// Initialize socket
const initializeSocket = (userId) => {
  const backendUrl =
    process.env.REACT_APP_API_URL ||
    process.env.REACT_APP_URL ||
    "http://localhost:8000";
  
  if (!socketInstance && userId) {
    socketInstance = io(backendUrl, {
      query: { userId },
      transports: ["websocket"],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });
    
    console.log("Socket initialized:", socketInstance);

    socketInstance.on("connect", () => {
      console.log("Socket connected:", socketInstance.id);
    });

    socketInstance.on("disconnect", () => {
      console.log("Socket disconnected");
    });

    socketInstance.on("connect_error", (error) => {
      console.error("Socket connection error:", error);
    });
  }
  return socketInstance;
};

// Get socket instance
const getSocket = () => socketInstance;

// Disconnect socket
const disconnectSocket = () => {
  if (socketInstance) {
    socketInstance.disconnect();
    socketInstance = null;
  }
};
//zustand store body
export const useChatStore = create((set, get) => ({
  // State
  conversations: { data: [] },
  currentConversation: null,
  messages: [],
  loading: false,
  error: null,
  onlineUsers: new Map(),
  typingUsers: new Map(),
  currentUser: null,
//humne do function bnaye setCurrentUser or _normalizeMessage
//humne kuch states define kri conversations,messages,currentConversation,loading,error,onlineUsers,typingUsers,currentUser
//setCurrentUser functtion main humnne currentUser set kiya or Socket humne uske id se initialize kiya
  // Set current user and initialize socket
  setCurrentUser: (user) => {
    set({ currentUser: user });
    if (user?._id) {
      initializeSocket(user._id);
      setTimeout(() => get().initSocketListeners(), 100);
    }
  },

  // Normalize server-side message shape to frontend expectations
  //fir humne normalize message bnaya jisme humne ek object return kra usme us msg ki id hogi sender ki details hogi reciever ki details hogi conversation id hogi imageOrVideoUrl hogi content hogi contentType hogi createdAt hogi messageStatus hogi reactions hogi
  _normalizeMessage: (msg) => {
    if (!msg) return msg;
 //getUserObj matra isliye bnaya hain taki shi format main normalizeMessage return krske
    const getUserObj = (u) => {
      if (!u) return null;
      if (typeof u === 'string') return { _id: u };
      // Mongoose populated object may have _id or id
      return { _id: u._id || u.id, username: u.username, profilePicture: u.profilePicture };
    };

    return {
      _id: msg._id || msg._id,
      sender: msg.Sender ? getUserObj(msg.Sender) : (msg.sender || null),
      reciever: msg.Reciever ? getUserObj(msg.Reciever) : (msg.reciever || null),
      conversation: msg.Message || (msg.conversation && (typeof msg.conversation === 'string' ? msg.conversation : msg.conversation._id)) || msg.conversation || null,
      imageOrVideoUrl: msg.imageorvideoURL || msg.imageOrVideoUrl || msg.mediaUrl || null,
      content: msg.Content || msg.content || msg.message || "",
      contentType: msg.contentType || null,
      createdAt: msg.createdAt || msg.createdAt || new Date().toISOString(),
      messageStatus: msg.messageStatus || msg.MessageStatus || null,
      reactions: msg.reactions || [],
    };
  },

  // Initialize socket listeners
  // getSocket se humne us user ki socketInstance return kiya 
  initSocketListeners: () => {
    const socket = getSocket();
    if (!socket) {
      console.log("Socket not initialized yet");
      return;
    }

    // Remove old listeners
    socket.off("receive_message");
    socket.off("user_typing");
    socket.off("user_status");
    socket.off("message_error");
    socket.off("message_deleted");
    socket.off("reaction_update");
    socket.off("message_send");
    socket.off("message_status_update");

    // Receive messages from server
    //recieve message event ko listen kr rhe hain jo ki backend se emit kiya jata hain 
    socket.on("receive_message", (message) => {
      get().receiveMessage(message);
    });

      // Backend emits a misspelled event 'recieve_message' in some places — listen to it too
      socket.on("recieve_message", (message) => {
        get().receiveMessage(message);
      });

    // Message sent confirmation
    socket.on("message_send", (message) => {
      const normalized = get()._normalizeMessage(message);
      set((state) => ({
        messages: state.messages.map((msg) =>
          msg._id === message._id ? { ...normalized } : msg
        ),
      }));
    });

    // Update message status (delivered/read)
    socket.on("message_status_update", ({ messageId, messageStatus }) => {
      set((state) => ({
        messages: state.messages.map((msg) =>
          msg._id === messageId ? { ...msg, messageStatus } : msg
        ),
      }));
    });

    // Reaction updates
    socket.on("reaction_update", ({ messageId, reactions }) => {
      set((state) => {
        const updatedMessages = state.messages.map((msg) =>
          msg._id === messageId ? { ...msg, reactions } : msg
        );

        // Update LastMessage in conversations if needed
        const updatedConversations = state.conversations?.data?.map((conv) => {
          if (conv?.LastMessage?._id === messageId) {
            return {
              ...conv,
              LastMessage: { ...conv.LastMessage, reactions },
            };
          }
          return conv;
        });

        return {
          messages: updatedMessages,
          conversations: updatedConversations
            ? { ...state.conversations, data: updatedConversations }
            : state.conversations,
        };
      });
    });

    // Message deleted
    socket.on("message_deleted", ({ deletedMessageId }) => {
      set((state) => ({
        messages: state.messages.filter((msg) => msg._id !== deletedMessageId),
      }));
      
      // Update conversations if deleted message was LastMessage
      set((state) => {
        const updatedConversations = state.conversations?.data?.map((conv) => {
          if (conv?.LastMessage?._id === deletedMessageId) {
            return { ...conv, LastMessage: null };
          }
          return conv;
        });
        
        return updatedConversations
          ? { conversations: { ...state.conversations, data: updatedConversations } }
          : {};
      });
    });

    // Message error
    socket.on("message_error", (error) => {
      console.error("Message error:", error);
      set({ error: error.message || "Failed to send message" });
    });

    // Typing indicator
    socket.on("user_typing", ({ userId, conversationId, isTyping }) => {
      set((state) => {
        const newTypingUsers = new Map(state.typingUsers);
        if (!newTypingUsers.has(conversationId)) {
          newTypingUsers.set(conversationId, new Set());
        }
        const typingSet = newTypingUsers.get(conversationId);
        if (isTyping) {
          typingSet.add(userId);
        } else {
          typingSet.delete(userId);
        }
        return { typingUsers: newTypingUsers };
      });
    });

    // User online/offline status
    socket.on("user_status", ({ userId, isOnline, lastSeen }) => {
      set((state) => {
        const newOnlineUsers = new Map(state.onlineUsers);
        newOnlineUsers.set(userId, { isOnline, lastSeen });
        return { onlineUsers: newOnlineUsers };
      });
    });

    // Request status for all conversation participants
    const { conversations, currentUser } = get();
    if (conversations?.data?.length > 0 && currentUser) {
      conversations.data.forEach((conv) => {
        const otherUser = conv.participants?.find((p) => p._id !== currentUser._id);
        if (otherUser?._id) {
          socket.emit("get_user_status", otherUser._id, (status) => {
            set((state) => {
              const newOnlineUsers = new Map(state.onlineUsers);
              newOnlineUsers.set(otherUser._id, status || { isOnline: false, lastSeen: null });
              return { onlineUsers: newOnlineUsers };
            });
          });
        }
      });
    }
  },

  // Fetch conversations
  fetchConversation: async () => {
    set({ loading: true, error: null });
    try {
      const { data } = await axiosInstance.get("/chat/conversation");
      // Normalize conversations to always have a { data: [...] } shape
      const normalized = Array.isArray(data)
        ? { data }
        : data && data.data
        ? data
        : { data: [] };
      // Normalize conversation LastMessage and participant ids
      const normConversations = {
        ...normalized,
        data: (normalized.data || []).map((c) => {
          const conv = { ...c };
          // Normalize LastMessage if present
          if (conv.LastMessage) {
            conv.LastMessage = get()._normalizeMessage(conv.LastMessage);
          }
          // Ensure participants are objects with _id
          conv.participants = (conv.participants || []).map((p) => (typeof p === 'string' ? { _id: p } : p));
          return conv;
        }),
      };

      set({ conversations: normConversations, loading: false });
      get().initSocketListeners();
      return data;
    } catch (error) {
      set({ 
        error: error?.response?.data?.message || error?.message, 
        loading: false 
      });
      throw error;
    }
  },

  // Fetch messages for a conversation
  fetchMessages: async (conversationId) => {
    if (!conversationId) return;
    
    set({ 
      loading: true, 
      error: null, 
      currentConversation: conversationId, 
      messages: [] 
    });

    try {
      const { data } = await axiosInstance.get(
        `/chat/conversations/${conversationId}/messages`
      );
      
      const messageArray = data.data || data || [];
      // Normalize messages from server
      const normalizedMessages = (Array.isArray(messageArray) ? messageArray : []).map((m) => get()._normalizeMessage(m));
      set({
        messages: normalizedMessages,
        currentConversation: conversationId,
        loading: false,
      });
      
      // Mark messages as read
      get().markMessagesAsRead();
      
      // Reset unread count for this conversation
      get().resetUnreadCount(conversationId);
      
      return messageArray;
    } catch (error) {
      console.error("Error fetching messages:", error);
      set({ 
        error: error?.response?.data?.message || error?.message, 
        loading: false 
      });
      throw error;
    }
  },

  // Send message with optimistic update
  sendMessage: async (formData) => {
    const senderId = formData.get("senderId");
    // accept common misspellings for receiver key
    const recieverId = formData.get("recieverId") || formData.get("receiverId");
    const media = formData.get("media");
    const content = formData.get("content");
    const messageStatus = formData.get("messageStatus") || "sending";
    const { conversations } = get();
    let conversationId = null;

    // Find existing conversation
    if (conversations?.data?.length > 0) {
      const conversation = conversations.data.find((conv) =>
        conv.participants.some((p) => p._id === senderId) &&
        conv.participants.some((p) => p._id === recieverId)
      );
      if (conversation) {
        conversationId = conversation._id;
        set({ currentConversation: conversationId });
      }
    }

    const tempId = `temp-${Date.now()}-${Math.random()}`;

    // Use a temp conversation id when no existing conversation found
    const tempConversationId = conversationId || `temp-conv-${Date.now()}-${Math.random()}`;

    // Create optimistic message
    const optimisticMessage = {
      _id: tempId,
      sender: { _id: senderId },
      reciever: { _id: recieverId },
      conversation: tempConversationId,
      imageOrVideoUrl: media && typeof media !== "string"
        ? URL.createObjectURL(media)
        : (typeof media === "string" ? media : null),
      content: content || "",
      contentType: media
        ? (media.type?.startsWith("image") ? "image" : "video")
        : "text",
      createdAt: new Date().toISOString(),
      messageStatus,
      reactions: [],
    };

    // Ensure currentConversation is set so the optimistic message is visible
    set({ currentConversation: tempConversationId });

    // If there was no existing conversation, create a temporary conversation entry
    if (!conversationId) {
      set((state) => {
        const exists = state.conversations?.data?.some((c) => c._id === tempConversationId);
        if (exists) return {};
        const tempConv = {
          _id: tempConversationId,
          participants: [
            { _id: senderId },
            { _id: recieverId },
          ],
          LastMessage: optimisticMessage,
          unreadCount: 0,
        };
        return {
          conversations: {
            ...state.conversations,
            data: [tempConv, ...(state.conversations?.data || [])],
          },
        };
      });
    }

    // Add optimistic message
    set((state) => {
      const newMessages = [...state.messages, optimisticMessage];
      console.log("[chatStore] Added optimistic message", tempId, "conv", tempConversationId, "messagesCount", newMessages.length);
      return { messages: newMessages };
    });

    // Update chat list instantly (only works for convs with id)
    get().updateLastMessage(optimisticMessage);

    try {
      // Let the browser set Content-Type (including boundary) for multipart form data
      // Setting it manually can break file uploads.
      // Debug: list FormData keys to ensure file is present
      try {
        const keys = [];
        for (const pair of formData.entries()) keys.push(pair[0]);
        console.log('[chatStore] Sending FormData keys:', keys);
      } catch (e) {
        console.log('[chatStore] Could not inspect FormData');
      }

      const { data } = await axiosInstance.post("/chat/send-message", formData);
      
      const messageData = data.data || data;
      const normalized = get()._normalizeMessage(messageData);

      // Determine real conversation id from normalized message
      const realConversationId = normalized.conversation || null;

      // Replace optimistic message with normalized real message
      set((state) => {
        const updated = state.messages.map((msg) => (msg._id === tempId ? normalized : msg));
        console.log("[chatStore] Replaced optimistic message", tempId, "with", normalized._id, "conv", realConversationId || tempConversationId);
        return { messages: updated };
      });

      // If the server provided a real conversation id, update currentConversation
      if (realConversationId) {
        set({ currentConversation: realConversationId });
      }

      // Update LastMessage with real message and sync conversation entry
      get().updateLastMessage(normalized);

      // Ensure conversations list reflects the real conversation id
      set((state) => {
        const data = state.conversations?.data || [];

        // If an entry already exists for realConversationId, update its LastMessage
        let found = false;
        const newData = data.map((conv) => {
          if (conv._id === realConversationId) {
            found = true;
            return { ...conv, LastMessage: normalized };
          }
          // Replace temp conversation entry with real one
          if (conv._id === tempConversationId) {
            found = true;
            return { ...conv, _id: realConversationId, LastMessage: normalized };
          }
          return conv;
        });

        // If no conversation existed, prepend a new conversation entry
        if (!found && realConversationId) {
          const newConv = {
            _id: realConversationId,
            participants: [{ _id: senderId }, { _id: recieverId }],
            LastMessage: normalized,
            unreadCount: 0,
          };
          return { conversations: { ...state.conversations, data: [newConv, ...newData] } };
        }

        return { conversations: { ...state.conversations, data: newData } };
      });

      return normalized;
    } catch (error) {
      console.error("Error sending message:", error);
      
      // Mark message as failed
      set((state) => ({
        messages: state.messages.map((msg) =>
          msg._id === tempId ? { ...msg, messageStatus: "failed" } : msg
        ),
        error: error?.response?.data?.message || error?.message,
      }));
      
      throw error;
    }
  },

  // Receive message from socket
  receiveMessage: async (message) => {
    if (!message) return;
    
    const { currentConversation, currentUser, messages } = get();

    // Handle array of messages
    if (Array.isArray(message)) {
      const normalizedArr = message.map((m) => get()._normalizeMessage(m));
      const newMessages = normalizedArr.filter(
        (msg) => !messages.some((m) => m._id === msg._id)
      );
      if (newMessages.length > 0) {
        set((state) => ({ 
          messages: [...state.messages, ...newMessages] 
        }));
      }
      return;
    }

    const normalizedMsg = get()._normalizeMessage(message);
    // Skip if message already exists
    if (messages.some((m) => m._id === normalizedMsg._id)) {
      return;
    }

    // Add message if it's for current conversation
    if (normalizedMsg.conversation === currentConversation) {
      set((state) => ({ 
        messages: [...state.messages, normalizedMsg] 
      }));
      
      // Mark as read if current user is reciever
      if (normalizedMsg.reciever?._id === currentUser?._id) {
        get().markMessagesAsRead();
      }
    }

    // Update conversations list
    set((state) => {
      const updatedConversations = state.conversations?.data?.map((conversation) => {
        if (conversation?._id === normalizedMsg.conversation) {
          const isReceiver = normalizedMsg?.reciever?._id === currentUser?._id;
          const isCurrentConv = normalizedMsg.conversation === currentConversation;

          return {
            ...conversation,
            LastMessage: normalizedMsg,
            unreadCount: isReceiver && !isCurrentConv
              ? (conversation.unreadCount || 0) + 1
              : conversation.unreadCount || 0,
          };
        }
        return conversation;
      });

      return {
        conversations: {
          ...state.conversations,
          data: updatedConversations,
        },
      };
    });
  },

  // Mark messages as read
  markMessagesAsRead: async () => {
    const { messages, currentUser, currentConversation } = get();
    if (!messages.length || !currentUser || !currentConversation) return;

    const unreadIds = messages
      .filter(
        (msg) =>
          msg.messageStatus !== "read" &&
          msg.reciever?._id === currentUser._id
      )
      .map((msg) => msg._id)
      .filter((id) => id && !id.startsWith("temp-"));

    if (unreadIds.length === 0) return;

    try {
      await axiosInstance.put("/chat/messages/read", { 
        messageIds: unreadIds 
      });
      
      // Update local messages to "read"
      set((state) => ({
        messages: state.messages.map((msg) =>
          unreadIds.includes(msg._id) 
            ? { ...msg, messageStatus: "read" } 
            : msg
        ),
      }));

      // Emit to socket
      const socket = getSocket();
      if (socket) {
        socket.emit("message_read", {
          messageIds: unreadIds,
          conversationId: currentConversation,
        });
      }
    } catch (error) {
      console.error("Error marking messages as read:", error);
    }
  },

  // Reset unread count for a conversation
  resetUnreadCount: (conversationId) => {
    set((state) => {
      const updatedConversations = state.conversations?.data?.map((conv) =>
        conv._id === conversationId ? { ...conv, unreadCount: 0 } : conv
      );

      return updatedConversations
        ? { conversations: { ...state.conversations, data: updatedConversations } }
        : {};
    });
  },

  // Delete message
  deleteMessage: async (messageId) => {
    try {
      await axiosInstance.delete(`/chat/messages/${messageId}`);
      
      set((state) => ({
        messages: state.messages.filter((msg) => msg._id !== messageId),
      }));
      
      // Emit to socket
      const socket = getSocket();
      if (socket) {
        socket.emit("delete_message", { messageId });
      }
      
      return true;
    } catch (error) {
      console.error("Error deleting message:", error);
      set({ 
        error: error?.response?.data?.message || error?.message 
      });
      return false;
    }
  },

  // Remove message locally
  removeLocalMessage: (messageId) => {
    if (!messageId) return;
    set((state) => ({
      messages: state.messages.filter((msg) => msg._id !== messageId),
    }));
  },

  // Add reaction
  addReactions: async (messageId, emoji) => {
    const socket = getSocket();
    const { currentUser } = get();

    if (!messageId || !emoji || !currentUser) return;

    // Skip for temporary messages
    if (String(messageId).startsWith("temp-")) return;

    // Optimistic update
    set((state) => ({
      messages: state.messages.map((msg) =>
        msg._id === messageId
          ? {
              ...msg,
              reactions: [
                ...(Array.isArray(msg.reactions) ? msg.reactions : []),
                { emoji, user: currentUser._id },
              ],
            }
          : msg
      ),
    }));

    // Emit to socket
    if (socket) {
      socket.emit("add_reaction", {
        messageId,
        emoji,
        userId: currentUser._id,
      });
    }
  },

  // Remove reaction
  removeReaction: async (messageId, emoji) => {
    const socket = getSocket();
    const { currentUser } = get();

    if (!messageId || !emoji || !currentUser) return;

    // Optimistic update
    set((state) => ({
      messages: state.messages.map((msg) =>
        msg._id === messageId
          ? {
              ...msg,
              reactions: (msg.reactions || []).filter(
                (r) => !(r.emoji === emoji && r.user === currentUser._id)
              ),
            }
          : msg
      ),
    }));

    // Emit to socket
    if (socket) {
      socket.emit("remove_reaction", {
        messageId,
        emoji,
        userId: currentUser._id,
      });
    }
  },

  // Typing controls
  startTyping: (recieverId) => {
    const { currentConversation } = get();
    const socket = getSocket();
    
    if (socket && currentConversation && recieverId) {
      socket.emit("typing_start", {
        conversationId: currentConversation,
        recieverId,
      });
    }
  },

  stopTyping: (recieverId) => {
    const { currentConversation } = get();
    const socket = getSocket();
    
    if (socket && currentConversation && recieverId) {
      socket.emit("typing_stop", {
        conversationId: currentConversation,
        recieverId,
      });
    }
  },

  // Update last message in conversation
  updateLastMessage: (message) => {
    if (!message?.conversation) return;

    const normalized = get()._normalizeMessage(message);

    set((state) => {
      if (!state.conversations?.data) return {};

      const updated = state.conversations.data.map((conv) =>
        conv._id === message.conversation
          ? { ...conv, LastMessage: normalized }
          : conv
      );

      return {
        conversations: {
          ...state.conversations,
          data: updated,
        },
      };
    });
  },

  // Check if user is typing
  isUserTyping: (userId) => {
    const { typingUsers, currentConversation } = get();
    if (!currentConversation || !typingUsers.has(currentConversation) || !userId) {
      return false;
    }
    return typingUsers.get(currentConversation).has(userId);
  },

  // Check if user is online
  isUserOnline: (userId) => {
    if (!userId) return false;
    const { onlineUsers } = get();
    return onlineUsers.get(userId)?.isOnline || false;
  },

  // Get user's last seen
  getUserLastSeen: (userId) => {
    if (!userId) return null;
    const { onlineUsers } = get();
    return onlineUsers.get(userId)?.lastSeen || null;
  },

  // Cleanup store
  cleanup: () => {
    disconnectSocket();
    set({
      conversations: { data: [] },
      messages: [],
      onlineUsers: new Map(),
      typingUsers: new Map(),
      currentConversation: null,
      currentUser: null,
      loading: false,
      error: null,
    });
  },
}));

// Export socket utilities
export { getSocket, disconnectSocket };