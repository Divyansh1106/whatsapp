import React, { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import useUserStore from "../store/useUserStore";
import useThemeStore from "../store/themeStore";
import { updateUserOtp, checkAuthUsers } from "../services/user.service";
import Spinner from "../utils/spinner";
import { FaUser, FaPlusCircle } from "react-icons/fa";
import { toast } from "react-toastify";

const avatars = [
  "https://api.dicebear.com/6.x/avataaars/svg?seed=Felix",
  "https://api.dicebear.com/6.x/avataaars/svg?seed=Aneka",
  "https://api.dicebear.com/6.x/avataaars/svg?seed=Mimi",
  "https://api.dicebear.com/6.x/avataaars/svg?seed=Jasper",
  "https://api.dicebear.com/6.x/avataaars/svg?seed=Luna",
  "https://api.dicebear.com/6.x/avataaars/svg?seed=Zoe",
];

const profileSchema = yup.object().shape({
  username: yup.string().required("Username is required"),
});

const UserDetails = () => {
  const { user, setUser } = useUserStore();
  const { theme } = useThemeStore();
  const [selectedAvatar, setSelectedAvatar] = useState(user?.profilePicture || avatars[0]);
  const [profilePicture, setProfilePicture] = useState(user?.profilePicture || avatars[0]);
  const [profilePictureFile, setProfilePictureFile] = useState(null);
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
  } = useForm({
    resolver: yupResolver(profileSchema),
    defaultValues: {
      username: user?.username || "",
    },
  });

  const previewSrc = useMemo(() => profilePicture || selectedAvatar, [profilePicture, selectedAvatar]);

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setProfilePictureFile(file);
    setProfilePicture(URL.createObjectURL(file));
  };

  const onSubmit = async (data) => {
    try {
      setLoading(true);
      const formData = new FormData();
      formData.append("username", data.username);
      formData.append("agreed", "true");

      if (profilePictureFile) {
        formData.append("media", profilePictureFile);
      } else if (selectedAvatar) {
        formData.append("profilePicture", selectedAvatar);
      }

      const response = await updateUserOtp(formData);
      if (response.status === "success") {
        const auth = await checkAuthUsers();
        if (auth.isAuthenticated && auth.user) {
          setUser(auth.user);
          toast.success("Profile updated");
        } else {
          toast.error("Failed to refresh user");
        }
      } else {
        toast.error(response.message || "Update failed");
      }
    } catch (err) {
      console.error(err);
      toast.error(err?.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className={`min-h-screen w-full flex items-center justify-center px-4 py-10 ${
        theme === "dark" ? "bg-[#111b21] text-white" : "bg-gray-100 text-gray-900"
      }`}
    >
      <div
        className={`w-full max-w-lg rounded-2xl shadow-lg p-6 md:p-8 ${
          theme === "dark" ? "bg-[#202c33]" : "bg-white"
        }`}
      >
        <h2 className="text-2xl font-semibold mb-2">Profile</h2>
        <p className="text-sm mb-6 opacity-80">Update your photo and username.</p>

        <form className="space-y-6" onSubmit={handleSubmit(onSubmit)}>
          {/* Avatar / photo picker */}
          <div className="flex flex-col items-center gap-3">
            <div className="relative w-28 h-28">
              <img
                src={previewSrc}
                alt="profile"
                className="w-full h-full rounded-full object-cover border-4 border-emerald-500/80 shadow"
              />
              <label
                htmlFor="profile-upload"
                className="absolute bottom-0 right-0 bg-emerald-500 text-white p-2 rounded-full shadow cursor-pointer hover:bg-emerald-600 transition"
              >
                <FaPlusCircle className="h-4 w-4" />
              </label>
              <input id="profile-upload" type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
            </div>
            <div className="text-xs opacity-80">Choose an avatar or upload a photo</div>
            <div className="flex flex-wrap justify-center gap-3">
              {avatars.map((avatar) => (
                <img
                  key={avatar}
                  src={avatar}
                  alt="avatar"
                  className={`w-12 h-12 rounded-full cursor-pointer transition ring-2 ${
                    selectedAvatar === avatar ? "ring-emerald-500 ring-offset-2" : "ring-transparent"
                  }`}
                  onClick={() => {
                    setSelectedAvatar(avatar);
                    setProfilePicture(null);
                    setProfilePictureFile(null);
                  }}
                />
              ))}
            </div>
          </div>

          {/* Username */}
          <div className="space-y-2">
            <label className="text-sm font-medium flex items-center gap-2">
              <FaUser className="text-emerald-500" /> Username
            </label>
            <input
              {...register("username")}
              type="text"
              onChange={(e) => setValue("username", e.target.value)}
              className={`w-full rounded-lg px-3 py-2 border focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
                theme === "dark" ? "bg-[#111b21] border-gray-700 text-white" : "bg-white border-gray-300"
              } ${errors.username ? "border-red-500" : ""}`}
              placeholder="Enter username"
              defaultValue={user?.username || ""}
            />
            {errors.username && <p className="text-red-500 text-sm">{errors.username.message}</p>}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-semibold py-3 rounded-lg transition flex items-center justify-center gap-2"
          >
            {loading ? <Spinner /> : "Save changes"}
          </button>
        </form>
      </div>
    </div>
  );
};

export default UserDetails;