import React from "react";
import { useNavigate } from "react-router-dom";
import useThemeStore from "../../../store/themeStore";
import useUserStore from "../../../store/useUserStore";
import { useChatStore } from "../../../store/chatStore";
import { logoutUsers } from "../../../services/user.service";
import { FaSun, FaMoon, FaSignOutAlt } from "react-icons/fa";
import { toast } from "react-toastify";

const SettingWindow = () => {
  const { theme, setTheme } = useThemeStore();
  const { clearUser } = useUserStore();
  const { cleanup } = useChatStore();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await logoutUsers();
      clearUser();
      cleanup();
      toast.success("Logged out successfully");
      navigate("/userLogin");
    } catch (error) {
      console.error("Logout error:", error);
      toast.error("Failed to logout");
    }
  };

  const options = [
    { value: "light", label: "Light", icon: <FaSun /> },
    { value: "dark", label: "Dark", icon: <FaMoon /> },
  ];

  return (
    <div
      className={`min-h-screen w-full flex items-center justify-center px-4 py-10 ${
        theme === "dark" ? "bg-[#111b21] text-white" : "bg-gray-100 text-gray-900"
      }`}
    >
      <div
        className={`w-full max-w-xl rounded-2xl shadow-lg p-6 md:p-8 ${
          theme === "dark" ? "bg-[#202c33]" : "bg-white"
        }`}
      >
        <h2 className="text-2xl font-semibold mb-2">Settings</h2>
        <p className="text-sm mb-6 opacity-80">Choose your theme</p>

        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {options.map((opt) => {
              const isActive = theme === opt.value;
              return (
                <button
                  key={opt.value}
                  onClick={() => setTheme(opt.value)}
                  className={`flex items-center gap-3 rounded-xl border px-4 py-3 text-left transition shadow-sm ${
                    isActive
                      ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                      : theme === "dark"
                      ? "border-gray-700 bg-[#111b21] text-white"
                      : "border-gray-200 bg-gray-50"
                  }`}
                >
                  <span className={`text-lg ${isActive ? "text-emerald-600" : ""}`}>{opt.icon}</span>
                  <div>
                    <div className="font-semibold">{opt.label}</div>
                    <div className="text-xs opacity-70">Apply {opt.label.toLowerCase()} mode to the app</div>
                  </div>
                </button>
              );
            })}
          </div>

          <div className="pt-4 border-t border-gray-300 dark:border-gray-700">
            <button
              onClick={handleLogout}
              className={`w-full flex items-center gap-3 rounded-xl border px-4 py-3 text-left transition shadow-sm ${
                theme === "dark"
                  ? "border-red-700 bg-red-900/20 text-red-400 hover:bg-red-900/30"
                  : "border-red-200 bg-red-50 text-red-600 hover:bg-red-100"
              }`}
            >
              <FaSignOutAlt className="text-lg" />
              <div>
                <div className="font-semibold">Logout</div>
                <div className="text-xs opacity-70">Sign out from your account</div>
              </div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingWindow;