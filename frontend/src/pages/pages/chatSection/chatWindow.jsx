import React, { useEffect, useRef, useState } from "react";
import useThemeStore from "../../../store/themeStore";
import useUserStore from "../../../store/useUserStore";
import { useChatStore } from "../../../store/chatStore";
import { format, isToday, isYesterday } from "date-fns";
import {
  FaArrowLeft,
  FaEllipsisV,
  FaTimes,
  FaVideo,
  FaPaperPlane,
  FaPaperclip,
  FaImage,
  FaSmile,
} from "react-icons/fa";
import MessageBubble from "./MessageBubble";
import EmojiPicker from "emoji-picker-react";
import SocketDebugger from "../../../components/socketDebugger";

const isValidDate = (date) => {
  return date instanceof Date && !isNaN(date.getTime());
};

const ChatWindow = ({ selectedContact, setSelectedContact, isMobile }) => {
  const [message, setMessage] = useState("");
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showFileMenu, setShowFileMenu] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [filePreview, setFilePreview] = useState(null);
  const [isSending, setIsSending] = useState(false);

  const typingTimeoutRef = useRef(null);
  const messageEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const emojiPickerRef = useRef(null);

  const { theme } = useThemeStore();
  const { user } = useUserStore();

  const {
    messages,
    sendMessage,
    addReactions,
    deleteMessage,
    removeLocalMessage,
    fetchConversation,
    conversations,
    isUserTyping,
    startTyping,
    stopTyping,
    getUserLastSeen,
    isUserOnline,
    fetchMessages,
    setCurrentUser,
    currentConversation,
  } = useChatStore();

  const online = isUserOnline(selectedContact?._id);
  const lastSeen = getUserLastSeen(selectedContact?._id);
  const isTyping = isUserTyping(selectedContact?._id);

  // Initialize socket when component mounts with current user
  useEffect(() => {
    if (user?._id) {
      console.log("Setting current user:", user._id);
      setCurrentUser(user);
    }
  }, [user?._id, setCurrentUser]);

  // Load conversations once
  

  // When selectedContact changes, load messages for that conversation
  useEffect(() => {
    if (selectedContact?._id && conversations?.data?.length > 0) {
      const conversation = conversations.data.find((conv) =>
        conv.participants?.some((p) => p._id === selectedContact._id) &&
        conv.participants?.some((p) => p._id === user?._id)
      );

      if (conversation?._id && conversation._id !== currentConversation) {
        fetchMessages(conversation._id);
      }
    }
  }, [selectedContact?._id, conversations?.data]);

  // Scroll to bottom helper
  const scrollToBottom = () => {
    messageEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Typing indicator logic
  useEffect(() => {
    if (message && selectedContact?._id) {
      startTyping(selectedContact._id);
      
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      
      typingTimeoutRef.current = setTimeout(() => {
        stopTyping(selectedContact._id);
      }, 2000);
    }

    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, [message, selectedContact?._id]);

  // Stop typing when unmounting or changing contact
  useEffect(() => {
    return () => {
      if (selectedContact?._id) {
        stopTyping(selectedContact._id);
      }
    };
  }, [selectedContact?._id]);

  // Clean up object URL when file changes/unmount
  useEffect(() => {
    return () => {
      if (filePreview && selectedFile?.type?.startsWith("image/")) {
        URL.revokeObjectURL(filePreview);
      }
    };
  }, [filePreview, selectedFile]);

  // Close emoji picker when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(event.target)) {
        setShowEmojiPicker(false);
      }
    };

    if (showEmojiPicker) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showEmojiPicker]);

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      if (file.type.startsWith("image/") || file.type.startsWith("video/")) {
        const url = URL.createObjectURL(file);
        setFilePreview(url);
      } else {
        setFilePreview(file.name);
      }
      setShowFileMenu(false);
    }
  };

  const handleSendMessage = async () => {
    if (!selectedContact?._id || !user?._id) {
      console.error("Missing contact or user ID");
      return;
    }

    // Don't send empty messages
    if (!message.trim() && !selectedFile) {
      return;
    }

    // Prevent double sending
    if (isSending) {
      return;
    }

    try {
      setIsSending(true);

      const formData = new FormData();
      formData.append("senderId", user._id);
      formData.append("recieverId", selectedContact._id); // Fixed spelling
      
      // Set initial status
      const msgStatus = online ? "delivered" : "sent";
      formData.append("messageStatus", msgStatus);

      if (message.trim()) {
        formData.append("content", message.trim());
      }

      if (selectedFile) {
        formData.append("media", selectedFile);
      }

      console.log("=== SENDING MESSAGE ===");
      console.log("SenderId:", user._id);
      console.log("RecieverId:", selectedContact._id);
      console.log("Content:", message.trim());
      console.log("File:", selectedFile?.name || "none");
      console.log("======================");

      await sendMessage(formData);

      // Reset inputs after successful send
      setMessage("");
      
      if (filePreview && selectedFile?.type?.startsWith("image/")) {
        URL.revokeObjectURL(filePreview);
      }
      
      setFilePreview(null);
      setSelectedFile(null);
      setShowFileMenu(false);

      // Stop typing indicator
      if (selectedContact?._id) {
        stopTyping(selectedContact._id);
      }

      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    } catch (error) {
      console.error("Failed to send message:", error);
      alert("Failed to send message. Please try again.");
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleEmojiClick = (emojiData) => {
    setMessage((prev) => prev + emojiData.emoji);
    setShowEmojiPicker(false);
  };

  const renderDateSeparator = (date) => {
    if (!isValidDate(date)) return null;

    let dateString;
    if (isToday(date)) {
      dateString = "Today";
    } else if (isYesterday(date)) {
      dateString = "Yesterday";
    } else {
      dateString = format(date, "EEEE, MMMM d");
    }

    return (
      <div className="flex justify-center my-4">
        <span
          className={`px-4 py-2 rounded-full text-sm ${
            theme === "dark"
              ? "bg-gray-700 text-gray-200"
              : "bg-gray-200 text-gray-600"
          }`}
        >
          {dateString}
        </span>
      </div>
    );
  };

  const handleReaction = (messageId, emoji) => {
    if (messageId && emoji) {
      addReactions(messageId, emoji);
    }
  };

  const handleRemoveFile = () => {
    if (filePreview && selectedFile?.type?.startsWith("image/")) {
      URL.revokeObjectURL(filePreview);
    }
    setSelectedFile(null);
    setFilePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // Determine conversation ID
  const conversationId = currentConversation;

  // Filter messages for current conversation
  const filteredMessages = Array.isArray(messages)
    ? messages.filter((msg) => msg?.conversation === conversationId)
    : [];

  // Group messages by date
  const groupedMessages = filteredMessages.reduce((acc, msg) => {
    if (!msg?.createdAt) return acc;
    
    const date = new Date(msg.createdAt);
    if (!isValidDate(date)) {
      console.error("Invalid date for message:", msg);
      return acc;
    }

    const dateString = format(date, "yyyy-MM-dd");
    if (!acc[dateString]) {
      acc[dateString] = [];
    }
    acc[dateString].push(msg);
    return acc;
  }, {});

  if (!selectedContact) {
    return (
      <div
        className={`flex-1 flex items-center justify-center ${
          theme === "dark" ? "bg-[#141414] text-white" : "bg-white text-gray-800"
        }`}
      >
        <div className="text-center">
          <p className="text-xl font-semibold mb-2">Select a Contact</p>
          <p className="text-sm text-gray-500">
            Choose a conversation to start messaging
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 h-screen w-full flex flex-col">
     
      {/* Debug panel (visible in non-production builds) */}
      {process.env.NODE_ENV !== "production" && (
        <div className="fixed bottom-4 right-4 z-50 p-2 text-xs bg-black/60 text-white rounded">
          <div className="whitespace-nowrap">conv: {String(conversationId || "none")}</div>
          <div className="whitespace-nowrap">messages total: {messages?.length ?? 0}</div>
          <div className="whitespace-nowrap">visible: {Array.isArray(messages) ? messages.filter(m => m?.conversation === conversationId).length : 0}</div>
          <div className="whitespace-nowrap">last msg id: {messages?.[messages.length - 1]?._id || 'none'}</div>
        </div>
      )}
      {/* HEADER */}
      <div
        className={`p-4 flex items-center gap-3 sticky top-0 z-20 shadow-sm ${
          theme === "dark"
            ? "bg-[#202c33] text-white"
            : "bg-[#f0f2f5] text-gray-700"
        }`}
      >
        {isMobile && (
          <button
            onClick={() => setSelectedContact(null)}
            className="p-1 rounded hover:bg-gray-200/50 transition-colors"
            aria-label="Go back"
          >
            <FaArrowLeft className="h-5 w-5" />
          </button>
        )}

        <div className="relative">
          <img
            src={
              selectedContact?.profilePicture ||
              `https://ui-avatars.com/api/?background=random&name=${encodeURIComponent(
                selectedContact?.username || "User"
              )}`
            }
            alt={selectedContact?.username}
            className="w-10 h-10 rounded-full object-cover"
          />
          {online && (
            <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-current rounded-full" />
          )}
        </div>

        <div className="flex-1 flex flex-col min-w-0">
          <h2 className="font-semibold truncate">
            {selectedContact?.username || "Unknown User"}
          </h2>

          {isTyping ? (
            <span className="text-sm text-green-500 italic">typing...</span>
          ) : (
            <span
              className={`text-sm truncate ${
                theme === "dark" ? "text-gray-400" : "text-gray-600"
              }`}
            >
              {online
                ? "online"
                : lastSeen
                ? `last seen ${format(new Date(lastSeen), "HH:mm, MMM d")}`
                : "offline"}
            </span>
          )}
        </div>

        <div className="flex items-center space-x-2">
          <button
            className="p-2 rounded-full hover:bg-gray-200/30 transition-colors"
            aria-label="Start video call"
          >
            <FaVideo className="h-5 w-5" />
          </button>

          <button
            className="p-2 rounded-full hover:bg-gray-200/30 transition-colors"
            aria-label="More options"
          >
            <FaEllipsisV className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* MESSAGES AREA */}
      <div
        className={`flex-1 overflow-y-auto px-4 py-3 ${
          theme === "dark" ? "bg-[#0b141a]" : "bg-[#efeae2]"
        }`}
        style={{
          backgroundImage:
            theme === "dark"
              ? "url('https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png')"
              : "url('https://web.whatsapp.com/img/bg-chat-tile-light_a4be512e7195b6b733d9110b408f075d.png')",
          backgroundRepeat: "repeat",
        }}
      >
        {Object.entries(groupedMessages).length === 0 ? (
          <div className="h-full flex items-center justify-center">
            <div
              className={`text-center px-6 py-4 rounded-lg ${
                theme === "dark"
                  ? "bg-gray-800/50 text-gray-300"
                  : "bg-white/50 text-gray-600"
              }`}
            >
              <p className="text-sm">No messages yet</p>
              <p className="text-xs mt-1">Say hi 👋</p>
            </div>
          </div>
        ) : (
          Object.entries(groupedMessages).map(([date, msgs]) => (
            <React.Fragment key={date}>
              {renderDateSeparator(new Date(date))}

              {msgs.map((msg) => (
                <MessageBubble
                  key={msg._id || msg.tempId || `${msg.createdAt}-${Math.random()}`}
                  message={msg}
                  theme={theme}
                  onReact={handleReaction}
                  deleteMessage={deleteMessage}
                  onDeleteLocal={removeLocalMessage}
                  currentUser={user}
                />
              ))}
            </React.Fragment>
          ))
        )}

        <div ref={messageEndRef} />
      </div>

      {/* INPUT AREA */}
      <div
        className={`border-t ${
          theme === "dark"
            ? "bg-[#202c33] border-gray-700"
            : "bg-[#f0f2f5] border-gray-200"
        }`}
      >
        {/* FILE PREVIEW */}
        {filePreview && (
          <div
            className={`p-3 border-b ${
              theme === "dark" ? "border-gray-700" : "border-gray-200"
            }`}
          >
            <div className="relative inline-block">
              {selectedFile?.type?.startsWith("image/") ? (
                <img
                  src={filePreview}
                  alt="Preview"
                  className="max-w-xs max-h-48 rounded-lg shadow-lg"
                />
              ) : selectedFile?.type?.startsWith("video/") ? (
                <video
                  src={filePreview}
                  controls
                  className="max-w-xs max-h-48 rounded-lg shadow-lg"
                />
              ) : (
                <div
                  className={`px-4 py-3 rounded-lg ${
                    theme === "dark"
                      ? "bg-gray-700 text-gray-100"
                      : "bg-gray-100 text-gray-800"
                  }`}
                >
                  📎 {filePreview}
                </div>
              )}
              <button
                onClick={handleRemoveFile}
                className="absolute -top-2 -right-2 bg-red-500 hover:bg-red-600 text-white rounded-full p-1.5 shadow-lg transition-colors"
                aria-label="Remove file"
              >
                <FaTimes className="h-3 w-3" />
              </button>
            </div>
          </div>
        )}

        {/* INPUT BAR */}
        <div className="p-3 flex items-center gap-2">
          {/* Emoji Picker */}
          <div className="relative">
            <button
              className={`p-2 rounded-full transition-colors ${
                theme === "dark"
                  ? "hover:bg-gray-700 text-gray-400"
                  : "hover:bg-gray-200 text-gray-600"
              }`}
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              aria-label="Open emoji picker"
            >
              <FaSmile className="h-6 w-6" />
            </button>

            {showEmojiPicker && (
              <div
                ref={emojiPickerRef}
                className="absolute left-0 bottom-full mb-2 z-50"
              >
                <EmojiPicker
                  onEmojiClick={handleEmojiClick}
                  theme={theme === "dark" ? "dark" : "light"}
                />
              </div>
            )}
          </div>

          {/* File Attachment */}
          <div className="relative">
            <button
              className={`p-2 rounded-full transition-colors ${
                theme === "dark"
                  ? "hover:bg-gray-700 text-gray-400"
                  : "hover:bg-gray-200 text-gray-600"
              }`}
              onClick={() => setShowFileMenu(!showFileMenu)}
              aria-label="Attach file"
            >
              <FaPaperclip className="h-6 w-6" />
            </button>

            {showFileMenu && (
              <div
                className={`absolute bottom-full left-0 mb-2 rounded-lg shadow-lg overflow-hidden z-50 ${
                  theme === "dark" ? "bg-gray-700" : "bg-white"
                }`}
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept="image/*,video/*"
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className={`flex items-center px-4 py-2 w-full transition-colors ${
                    theme === "dark"
                      ? "hover:bg-gray-600 text-white"
                      : "hover:bg-gray-100 text-gray-800"
                  }`}
                >
                  <FaImage className="mr-2" />
                  Image/Video
                </button>
              </div>
            )}
          </div>

          {/* Message Input */}
          <input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message"
            disabled={isSending}
            className={`flex-1 px-4 py-2 rounded-full focus:outline-none focus:ring-2 focus:ring-green-500 transition-all ${
              theme === "dark"
                ? "bg-[#2a3942] text-white border border-gray-600 placeholder-gray-400"
                : "bg-white text-black border border-gray-300 placeholder-gray-500"
            } ${isSending ? "opacity-50 cursor-not-allowed" : ""}`}
          />

          {/* Send Button */}
          <button
            onClick={handleSendMessage}
            disabled={isSending || (!message.trim() && !selectedFile)}
            className={`p-2 rounded-full transition-all ${
              isSending || (!message.trim() && !selectedFile)
                ? "opacity-50 cursor-not-allowed"
                : "hover:bg-green-100 active:scale-95"
            }`}
            aria-label="Send message"
          >
            <FaPaperPlane
              className={`h-6 w-6 ${
                isSending ? "text-gray-400" : "text-green-500"
              }`}
            />
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChatWindow;