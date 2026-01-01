import React, { useEffect, useState } from 'react';
import layoutStore from '../store/layoutStore';
import { useLocation } from 'react-router-dom';
import useThemeStore from '../store/themeStore';
import { motion, AnimatePresence } from 'framer-motion';
import ChatWindow from '../pages/pages/chatSection/chatWindow';
import SideBar from '../components/sideBar';

const Layout = ({
  children,
  isThemeDialogOpen,
  toggleThemeDialog,
  isStatusPreviewOpen,
  StatusPreviewContent,
}) => {
  const selectedContact = layoutStore((state) => state.selectedContact);
  const setSelectedContact = layoutStore((state) => state.setSelectedContact);
  const location = useLocation();

  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const { theme, setTheme } = useThemeStore();

  useEffect(() => {
    const handleSize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    window.addEventListener('resize', handleSize);
    return () => {
      window.removeEventListener('resize', handleSize);
    };
  }, []);

  return (
    <div
      className={`min-h-screen ${
        theme === 'dark'
          ? 'bg-[#111b21] text-white'
          : 'bg-gray-100 text-black'
      } flex relative`}
    >
        {!isMobile && (<SideBar/>)}
      <div className={`flex-1 flex overflow-hidden ${isMobile ? 'flex-col' : ''}`}>
        <AnimatePresence initial={false}>
          {/* LEFT: Chat list / Chat section */}
          {(!selectedContact || !isMobile) && (
            <motion.div
              key="chatList"
              initial={{ x: isMobile ? '-100%' : 0 }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'tween' }}
              className={`w-full md:w-2/5 h-full ${isMobile ? 'pb-16' : ''}`}
            >
              {children}
            </motion.div>
          )}

          {/* RIGHT: Chat window */}
          {(selectedContact || !isMobile) && (
            <motion.div
              key="chatWindow"
              initial={{ x: isMobile ? '100%' : 0 }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'tween' }}
              className={`w-full h-full ${isMobile ? 'pb-16' : ''}`}
            >
              <ChatWindow
                selectedContact={selectedContact}
                setSelectedContact={setSelectedContact}
                isMobile={isMobile}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Sidebar on mobile (if you want it as a bottom or overlay menu) */}
     
      {/* Theme dialog */}
      {isThemeDialogOpen && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50 ">
          <div
            className={`${
              theme === 'dark'
                ? 'bg-[#202c33] text-white'
                : 'bg-white text-black'
            } p-6 rounded-lg max-w-sm w-full `}
          >
            <h2 className="text-2xl font-semibold mb-4">Choose a theme</h2>
            <div className="space-y-4">
              <label
                className="flex items-center space-x-3 cursor-pointer"
                htmlFor="theme-light"
              >
                <input
                  id="theme-light"
                  type="radio"
                  value="light"
                  checked={theme === 'light'}
                  onChange={() => {
                    setTheme('light');
                  }}
                  className="form-radio text-blue-600"
                />
                <span>Light</span>
              </label>

              <label
                className="flex items-center space-x-3 cursor-pointer"
                htmlFor="theme-dark"
              >
                <input
                  id="theme-dark"
                  type="radio"
                  value="dark"
                  checked={theme === 'dark'}
                  onChange={() => {
                    setTheme('dark');
                  }}
                  className="form-radio text-blue-600"
                />
                <span>Dark</span>
              </label>
            </div>
            <button
              onClick={toggleThemeDialog}
              className="mt-6 w-full bg-blue-500 text-white py-2 rounded hover:bg-blue-600"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Status preview */}
      {isStatusPreviewOpen && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
          {StatusPreviewContent}
        </div>
      )}
    </div>
  );
};

export default Layout;
