import React, { useState, useMemo } from "react";
import useLayoutStore from "../../../store/layoutStore";
import useThemeStore from "../../../store/themeStore";
import useUserStore from "../../../store/useUserStore";
import { useChatStore } from "../../../store/chatStore";
import { FaPlus, FaSearch } from "react-icons/fa";
import { motion } from "framer-motion";

// Helper: format timestamp intelligently
const formatTimeStamp = (dateString) => {
  if (!dateString) return "";
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return "";

  const now = new Date();
  const diff = now - date;
  const daysDiff = Math.floor(diff / (1000 * 60 * 60 * 24));

  // Today: show time
  if (daysDiff === 0) {
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }
  // Yesterday
  if (daysDiff === 1) {
    return "Yesterday";
  }
  // This week: show day name
  if (daysDiff < 7) {
    return date.toLocaleDateString([], { weekday: "short" });
  }
  // Older: show date
  return date.toLocaleDateString([], { month: "short", day: "numeric" });
};

// Helper: get last message display text
const getLastMessageText = (lastMsg, currentUserId) => {
  if (!lastMsg) return "No messages yet";

  // Handle reactions
  if (Array.isArray(lastMsg.reactions) && lastMsg.reactions.length > 0) {
    const lastReaction = lastMsg.reactions[lastMsg.reactions.length - 1];
    const reactorName =
      lastReaction?.user?._id === currentUserId
        ? "You"
        : lastReaction?.user?.username || "Someone";
    return `${reactorName} reacted ${lastReaction?.emoji || ""}`;
  }

  // Handle media messages
  if (lastMsg.contentType === "image") {
    const prefix = lastMsg.sender?._id === currentUserId ? "You: " : "";
    return `${prefix}📷 Photo`;
  }
  if (lastMsg.contentType === "video") {
    const prefix = lastMsg.sender?._id === currentUserId ? "You: " : "";
    return `${prefix}🎥 Video`;
  }

  // Handle deleted messages
  if (lastMsg.isDeleted) {
    return "🚫 This message was deleted";
  }

  // Handle text messages
  const messageText = lastMsg.content || lastMsg.Content || lastMsg.message || "";
  if (messageText) {
    const prefix = lastMsg.sender?._id === currentUserId ? "You: " : "";
    return `${prefix}${messageText}`;
  }

  return "No messages yet";
};

// Helper: get message status icon
const getMessageStatusIcon = (message, currentUserId) => {
  // Only show status for messages sent by current user
  if (message?.sender?._id !== currentUserId) return null;

  switch (message?.messageStatus) {
    case "sending":
      return <span className="text-gray-400">🕐</span>;
    case "sent":
      return <span className="text-gray-400">✓</span>;
    case "delivered":
      return <span className="text-gray-400">✓✓</span>;
    case "read":
      return <span className="text-blue-500">✓✓</span>;
    case "failed":
      return <span className="text-red-500">❌</span>;
    default:
      return null;
  }
};

const ChatSection = ({ contacts = [] }) => {
  const { setSelectedContact, selectedContact } = useLayoutStore();
  const { theme } = useThemeStore();
  const { user } = useUserStore();
  const { conversations, isUserOnline, isUserTyping } = useChatStore();
  
  const [searchTerms, setSearchTerms] = useState("");

  // Normalize search term
  const normalizedSearch = searchTerms.trim().toLowerCase();

  // Combine contacts with conversation data
  const enrichedContacts = useMemo(() => {
    if (!Array.isArray(contacts) || !conversations?.data) return contacts;

    return contacts.map((contact) => {
      // Find matching conversation
      const conversation = conversations.data.find((conv) =>
        conv.participants?.some((p) => p._id === contact._id)
      );

      return {
        ...contact,
        conversation,
        lastMessage: conversation?.LastMessage,
        unreadCount: conversation?.unreadCount || 0,
        lastMessageTime: conversation?.LastMessage?.createdAt,
      };
    });
  }, [contacts, conversations]);

  // Sort by last message time (most recent first)
  const sortedContacts = useMemo(() => {
    return [...enrichedContacts].sort((a, b) => {
      const timeA = a.lastMessageTime ? new Date(a.lastMessageTime) : new Date(0);
      const timeB = b.lastMessageTime ? new Date(b.lastMessageTime) : new Date(0);
      return timeB - timeA;
    });
  }, [enrichedContacts]);

  // Filter contacts by search
  const filteredContacts = useMemo(() => {
    if (normalizedSearch.length === 0) return sortedContacts;

    return sortedContacts.filter((contact) =>
      (contact?.username || "").toLowerCase().includes(normalizedSearch)
    );
  }, [sortedContacts, normalizedSearch]);

  return (
    <div
      className={`w-full h-screen border-r flex flex-col ${
        theme === "dark"
          ? "bg-[#111b21] border-gray-700 text-white"
          : "bg-white border-gray-200 text-gray-800"
      }`}
    >
      {/* HEADER */}
      <div
        className={`p-4 flex justify-between items-center border-b ${
          theme === "dark" ? "border-gray-700" : "border-gray-200"
        }`}
      >
        <h2 className="text-xl font-semibold">Chats</h2>

        <button
          aria-label="New chat"
          className="p-2 rounded-full bg-green-500 text-white hover:bg-green-600 active:scale-95 transition-all duration-150"
          onClick={() => {
            // Add your new chat handler here
            console.log("New chat clicked");
          }}
        >
          <FaPlus size={14} />
        </button>
      </div>

      {/* SEARCH BAR */}
      <div
        className={`px-3 py-2 border-b ${
          theme === "dark" ? "border-gray-700" : "border-gray-200"
        }`}
      >
        <div className="relative w-full">
          <FaSearch
            className={`absolute left-3 top-1/2 -translate-y-1/2 ${
              theme === "dark" ? "text-gray-400" : "text-gray-500"
            }`}
            size={13}
          />

          <input
            type="text"
            placeholder="Search or start new chat"
            className={`
              w-full pl-9 pr-3 py-2 rounded-lg text-sm
              focus:outline-none focus:ring-2 focus:ring-green-500/70
              transition-all
              ${
                theme === "dark"
                  ? "bg-[#202c33] text-white border border-gray-700 placeholder-gray-500"
                  : "bg-gray-100 text-black border border-gray-300 placeholder-gray-400"
              }
            `}
            value={searchTerms}
            onChange={(e) => setSearchTerms(e.target.value)}
          />
        </div>
      </div>

      {/* CONTACT LIST */}
      <div className="flex-1 overflow-y-auto">
        {!Array.isArray(filteredContacts) || filteredContacts.length === 0 ? (
          <div className="h-full flex items-center justify-center text-sm text-gray-500">
            {!Array.isArray(contacts) || contacts.length === 0
              ? "No contacts yet."
              : "No chats match your search."}
          </div>
        ) : (
          filteredContacts.map((contact) => {
            const lastMsg = contact.lastMessage;
            const unreadCount = Number(contact.unreadCount || 0);
            const isSelected = selectedContact?._id === contact._id;
            const isOnline = isUserOnline(contact._id);
            const isTypingNow = isUserTyping(contact._id);

            // Check if unread message is for current user
            const isUnreadForUser =
              unreadCount > 0 &&
              lastMsg &&
              (lastMsg.receiver?._id === user?._id ||
                lastMsg.receiverId === user?._id);

            // Get display text
            const lastMessageText = isTypingNow
              ? "typing..."
              : getLastMessageText(lastMsg, user?._id);

            const statusIcon = getMessageStatusIcon(lastMsg, user?._id);

            return (
              <motion.div
                key={contact._id}
                onClick={() => setSelectedContact(contact)}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                whileTap={{ scale: 0.98 }}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    setSelectedContact(contact);
                  }
                }}
                className={`
                  px-3 py-3 flex items-center cursor-pointer select-none
                  transition-colors duration-150
                  ${
                    theme === "dark"
                      ? isSelected
                        ? "bg-[#2a3942]"
                        : "hover:bg-[#202c33]"
                      : isSelected
                      ? "bg-gray-100"
                      : "hover:bg-gray-50"
                  }
                `}
              >
                {/* Avatar with online indicator */}
                <div className="relative flex-shrink-0">
                  <img
                    src={
                      contact?.profilePicture ||
                      `https://ui-avatars.com/api/?background=random&name=${encodeURIComponent(
                        contact?.username || "U"
                      )}`
                    }
                    alt={contact?.username || "Contact avatar"}
                    className="w-12 h-12 rounded-full object-cover"
                  />
                  {isOnline && (
                    <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-current rounded-full" />
                  )}
                </div>

                <div className="ml-3 flex-1 min-w-0">
                  {/* Top row: name + time */}
                  <div className="flex justify-between items-baseline gap-2">
                    <h2
                      className={`font-semibold text-[15px] truncate ${
                        isUnreadForUser
                          ? theme === "dark"
                            ? "text-white"
                            : "text-gray-900"
                          : theme === "dark"
                          ? "text-gray-200"
                          : "text-gray-700"
                      }`}
                    >
                      {contact?.username || "Unknown User"}
                    </h2>

                    {lastMsg?.createdAt && (
                      <span
                        className={`text-xs whitespace-nowrap ${
                          isUnreadForUser
                            ? "text-green-500 font-medium"
                            : theme === "dark"
                            ? "text-gray-400"
                            : "text-gray-500"
                        }`}
                      >
                        {formatTimeStamp(lastMsg.createdAt)}
                      </span>
                    )}
                  </div>

                  {/* Bottom row: last message + status/unread badge */}
                  <div className="mt-1 flex justify-between items-center gap-2">
                    <div className="flex items-center gap-1 min-w-0 flex-1">
                      {statusIcon && <span className="flex-shrink-0">{statusIcon}</span>}
                      <p
                        className={`text-[13px] truncate ${
                          isTypingNow
                            ? "text-green-500 italic"
                            : isUnreadForUser
                            ? theme === "dark"
                              ? "text-gray-200 font-medium"
                              : "text-gray-900 font-medium"
                            : theme === "dark"
                            ? "text-gray-400"
                            : "text-gray-500"
                        }`}
                      >
                        {lastMessageText}
                      </p>
                    </div>

                    {isUnreadForUser && (
                      <span className="text-[11px] font-semibold min-w-[20px] h-5 px-2 flex items-center justify-center rounded-full bg-green-500 text-white flex-shrink-0">
                        {unreadCount > 99 ? "99+" : unreadCount}
                      </span>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default ChatSection;
