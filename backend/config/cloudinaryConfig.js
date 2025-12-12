const multer = require("multer");
const dotenv = require("dotenv");
const cloudinary = require("cloudinary").v2;
const fs = require("fs");

dotenv.config();

// Cloudinary config
cloudinary.config({
    cloud_name: process.env.CLOUD_NAME,
    api_key: process.env.API_KEY,
    api_secret: process.env.API_SECRET,
});

// Upload file to Cloudinary
const uploadFileToCloudinary = (file) => {
    return new Promise((resolve, reject) => {
        if (!file) return reject("No file provided");

        const isVideo = file.mimetype.startsWith("video");

        const options = {
            resource_type: isVideo ? "video" : "image",
            folder: "chat-media"
        };

        // choose correct uploader
        const uploader = isVideo
            ? cloudinary.uploader.upload_large
            : cloudinary.uploader.upload;

        uploader(file.path, options, (error, result) => {
            // delete local file after upload
            fs.unlink(file.path, () => {});

            if (error) {
                console.error("Cloudinary upload error:", error);
                return reject(error);
            }

            resolve(result);
        });
    });
};

// Multer middleware
const multerMiddleware = multer({ dest: "uploads/" }).single("media");

module.exports = {
    multerMiddleware,
    uploadFileToCloudinary,
};
