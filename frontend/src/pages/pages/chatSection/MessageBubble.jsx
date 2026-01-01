import React, { useMemo, useState, useRef, useEffect } from "react";
import {
  FaCheck,
  FaCheckDouble,
  FaClock,
  FaExclamationTriangle,
  FaSmile,
  FaReply,
  FaTrash,
  FaCopy,
} from "react-icons/fa";
import { useChatStore } from "../../../store/chatStore";

const statusIcon = (status) => {
  switch ((status || "").toLowerCase()) {
    case "read":
      return <FaCheckDouble className="text-blue-500 h-3 w-3" />;
    case "delivered":
      return <FaCheckDouble className="text-gray-400 h-3 w-3" />;
    case "sent":
    case "send":
      return <FaCheck className="text-gray-400 h-3 w-3" />;
    case "sending":
      return <FaClock className="text-gray-400 h-3 w-3 animate-spin" />;
    case "failed":
      return <FaExclamationTriangle className="text-red-500 h-3 w-3" />;
    default:
      return <FaClock className="text-gray-400 h-3 w-3" />;
  }
};

const formatTime = (dateString) => {
  if (!dateString) return "";
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
};

const MessageBubble = ({
  message = {},
  theme,
  onReact,
  currentUser,
  deleteMessage,
  onDeleteLocal,
}) => {
  const { addReactions, removeReaction } = useChatStore();
  const [showReactions, setShowReactions] = useState(false);
  const [hovering, setHovering] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [copied, setCopied] = useState(false);

  const menuRef = useRef(null);
  const reactionRef = useRef(null);

  // Determine if message is sent by current user
  const isMine = useMemo(() => {
    const currentId = currentUser?._id;
    const senderId = message?.sender?._id || message?.sender;
    return currentId && senderId && String(senderId) === String(currentId);
  }, [currentUser, message]);

  // Check if message is text-only
  const isText = useMemo(() => {
    const contentType = message?.contentType;
    return !contentType || contentType.toLowerCase() === "text";
  }, [message]);

  // Styling based on sender and theme
  const bubbleStyle = isMine
    ? theme === "dark"
      ? "bg-[#005c4b] text-white"
      : "bg-[#d9fdd3] text-gray-900"
    : theme === "dark"
    ? "bg-[#202c33] text-white"
    : "bg-white text-gray-900";

  const textStyle =
    theme === "dark"
      ? "text-gray-100"
      : isMine
      ? "text-gray-900"
      : "text-gray-900";

  // Extract message content
  const content = message?.content || message?.Content || message?.message || "";
  const mediaUrl =
    message?.imageOrVideoUrl || message?.imageorvideoURL || message?.mediaUrl;
  
  // Determine content type
  const contentType = message?.contentType || (mediaUrl ? "image" : "text");
  
  // Get reactions
  const reactions = Array.isArray(message?.reactions) ? message.reactions : [];

  // Group reactions by emoji and count
  const groupedReactions = useMemo(() => {
    const grouped = {};
    reactions.forEach((r) => {
      const emoji = r?.emoji;
      if (!emoji) return;
      if (!grouped[emoji]) {
        grouped[emoji] = { emoji, count: 0, users: [] };
      }
      grouped[emoji].count++;
      grouped[emoji].users.push(r?.user);
    });
    return Object.values(grouped);
  }, [reactions]);

  // Check if current user has reacted
  const currentUserReaction = useMemo(() => {
    return reactions.find(
      (r) => String(r?.user?._id || r?.user) === String(currentUser?._id)
    );
  }, [reactions, currentUser]);

  // Fallback avatar
  const fallbackAvatar = (userObj) => {
    const username = userObj?.username || userObj?.name || "User";
    return `https://ui-avatars.com/api/?background=random&name=${encodeURIComponent(
      username
    )}`;
  };

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setShowMenu(false);
      }
      if (reactionRef.current && !reactionRef.current.contains(event.target)) {
        setShowReactions(false);
      }
    };

    if (showMenu || showReactions) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showMenu, showReactions]);

  // Handle reaction
  const handleReact = (emoji) => {
    const id = message?._id;
    
    // Don't react to temporary messages
    if (!id || String(id).startsWith("temp-")) {
      setShowReactions(false);
      return;
    }

    // If user already reacted with this emoji, remove it
    if (currentUserReaction?.emoji === emoji) {
      if (typeof removeReaction === "function") {
        removeReaction(id, emoji);
      }
    } else {
      // Add new reaction
      if (typeof onReact === "function") {
        onReact(id, emoji);
      }
    }
    
    setShowReactions(false);
    setShowMenu(false);
  };

  // Copy message text
  const handleCopy = async () => {
    const copyText = content;
    if (!copyText) {
      setShowMenu(false);
      return;
    }
    
    try {
      await navigator.clipboard.writeText(copyText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Copy failed:", err);
    }
    
    setShowMenu(false);
  };

  // Delete message for everyone
  const handleDeleteEveryone = async () => {
    if (!message?._id || String(message._id).startsWith("temp-")) {
      setShowMenu(false);
      return;
    }

    if (typeof deleteMessage === "function") {
      const confirmed = window.confirm(
        "Delete this message for everyone? This cannot be undone."
      );
      if (confirmed) {
        await deleteMessage(message._id);
      }
    }
    
    setShowMenu(false);
  };

  // Delete message for current user only
  const handleDeleteMe = () => {
    if (!message?._id) {
      setShowMenu(false);
      return;
    }

    if (typeof onDeleteLocal === "function") {
      onDeleteLocal(message._id);
    }
    
    setShowMenu(false);
  };

  // Available reaction emojis
  const reactionEmojis = ["👍", "❤️", "😂", "😮", "😢", "🙏"];

  // Check if message is temporary or failed
  const isTemporary = String(message?._id || "").startsWith("temp-");
  const isFailed = message?.messageStatus === "failed";

  return (
    <div
      className={`w-full flex ${
        isMine ? "justify-end" : "justify-start"
      } mb-2 group`}
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => {
        setHovering(false);
        if (!showMenu && !showReactions) {
          setShowReactions(false);
        }
      }}
    >
      <div className="relative flex items-end gap-2 max-w-[75%] sm:max-w-[65%]">
        {/* Sender avatar (for received messages) */}
        {!isMine && (
          <img
            src={
              message?.sender?.profilePicture ||
              fallbackAvatar(message?.sender)
            }
            alt="avatar"
            className="w-8 h-8 rounded-full object-cover flex-shrink-0 hidden sm:block"
          />
        )}

        {/* Message bubble */}
        <div
          className={`rounded-lg px-3 py-2 ${bubbleStyle} shadow-sm relative transition-all duration-150 ${
            hovering ? "shadow-md" : ""
          } ${isFailed ? "opacity-70" : ""}`}
          onContextMenu={(e) => {
            e.preventDefault();
            setShowMenu(true);
          }}
        >
          {/* Media content */}
          {mediaUrl && contentType === "image" && (
            <img
              src={mediaUrl}
              alt="attachment"
              className="rounded-lg max-h-72 mb-1 object-cover w-full"
              loading="lazy"
            />
          )}
          {mediaUrl && contentType === "video" && (
            <video
              src={mediaUrl}
              controls
              className="rounded-lg max-h-72 mb-1 w-full"
            />
          )}

          {/* Text content */}
          {content && (
            <p
              className={`whitespace-pre-wrap break-words text-[14.2px] leading-[19px] ${textStyle}`}
            >
              {content}
            </p>
          )}

          {/* Timestamp and status */}
          <div
            className={`mt-1 flex items-center gap-1 justify-end text-[11px] ${
              theme === "dark"
                ? "text-gray-400"
                : isMine
                ? "text-gray-600"
                : "text-gray-500"
            }`}
          >
            <span>{formatTime(message?.createdAt)}</span>
            {isMine && <span>{statusIcon(message?.messageStatus)}</span>}
          </div>

          {/* Reaction count badge */}
          {groupedReactions.length > 0 && (
            <div
              className={`absolute -bottom-2 ${
                isMine ? "left-0" : "right-0"
              } flex gap-0.5`}
            >
              {groupedReactions.map((reaction) => (
                <div
                  key={reaction.emoji}
                  className={`flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-xs ${
                    theme === "dark"
                      ? "bg-[#202c33] border border-gray-600"
                      : "bg-white border border-gray-300"
                  } shadow-sm cursor-pointer hover:scale-110 transition-transform`}
                  onClick={() => handleReact(reaction.emoji)}
                  title={`${reaction.count} reaction${
                    reaction.count > 1 ? "s" : ""
                  }`}
                >
                  <span>{reaction.emoji}</span>
                  {reaction.count > 1 && (
                    <span className="text-[10px] text-gray-500">
                      {reaction.count}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Quick reaction button (on hover) */}
        {hovering && !isTemporary && (
          <div
            ref={reactionRef}
            className={`absolute top-0 ${
              isMine ? "left-0 -translate-x-full -ml-2" : "right-0 translate-x-full mr-2"
            } flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity`}
          >
            <button
              onClick={() => setShowReactions(!showReactions)}
              className={`p-1.5 rounded-full transition-all ${
                theme === "dark"
                  ? "bg-[#202c33] hover:bg-[#2a3942]"
                  : "bg-white hover:bg-gray-50"
              } shadow-md border ${
                theme === "dark" ? "border-gray-600" : "border-gray-200"
              }`}
              aria-label="React to message"
            >
              <FaSmile className="h-4 w-4 text-gray-500" />
            </button>

            {/* Reaction picker */}
            {showReactions && (
              <div
                className={`flex items-center gap-1 px-2 py-1.5 rounded-full ${
                  theme === "dark"
                    ? "bg-[#202c33] border-gray-600"
                    : "bg-white border-gray-200"
                } shadow-lg border`}
              >
                {reactionEmojis.map((emoji) => (
                  <button
                    key={emoji}
                    onClick={() => handleReact(emoji)}
                    className={`text-lg hover:scale-125 transition-transform p-1 ${
                      currentUserReaction?.emoji === emoji
                        ? "bg-blue-100 rounded-full"
                        : ""
                    }`}
                    title={`React with ${emoji}`}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Context menu */}
        {showMenu && (
          <div
            ref={menuRef}
            className={`absolute ${
              isMine ? "right-0" : "left-0"
            } bottom-full mb-2 ${
              theme === "dark"
                ? "bg-[#2a3942] text-white border-gray-600"
                : "bg-white text-gray-900 border-gray-200"
            } shadow-xl rounded-lg border overflow-hidden z-50 min-w-[180px]`}
          >
            {/* Copy option (text messages only) */}
            {isText && content && (
              <button
                onClick={handleCopy}
                className={`w-full text-left px-4 py-2.5 text-sm flex items-center gap-2 transition-colors ${
                  theme === "dark"
                    ? "hover:bg-[#202c33]"
                    : "hover:bg-gray-100"
                }`}
              >
                <FaCopy className="h-3.5 w-3.5" />
                {copied ? "Copied!" : "Copy message"}
              </button>
            )}

            {/* Delete for everyone (only for sent messages) */}
            {isMine && !isTemporary && (
              <button
                onClick={handleDeleteEveryone}
                className={`w-full text-left px-4 py-2.5 text-sm flex items-center gap-2 text-red-600 transition-colors ${
                  theme === "dark"
                    ? "hover:bg-red-900/20"
                    : "hover:bg-red-50"
                }`}
              >
                <FaTrash className="h-3.5 w-3.5" />
                Delete for everyone
              </button>
            )}

            {/* Delete for me */}
            <button
              onClick={handleDeleteMe}
              className={`w-full text-left px-4 py-2.5 text-sm flex items-center gap-2 transition-colors ${
                theme === "dark"
                  ? "hover:bg-[#202c33]"
                  : "hover:bg-gray-100"
              }`}
            >
              <FaTrash className="h-3.5 w-3.5" />
              Delete for me
            </button>

            {/* Retry option for failed messages */}
            {isFailed && (
              <button
                onClick={() => {
                  // Add retry logic here
                  console.log("Retry sending message");
                  setShowMenu(false);
                }}
                className={`w-full text-left px-4 py-2.5 text-sm flex items-center gap-2 text-blue-600 transition-colors ${
                  theme === "dark"
                    ? "hover:bg-blue-900/20"
                    : "hover:bg-blue-50"
                }`}
              >
                <FaReply className="h-3.5 w-3.5" />
                Retry
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default MessageBubble;