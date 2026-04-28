const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');

cloudinary.config({
  cloud_name: process.env.CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  folder: 'menu-items',              // Direct property, not inside 'params'
  allowedFormats: ['jpg', 'jpeg', 'png', 'webp'],  // camelCase: allowedFormats
  transformation: [{ width: 500, height: 500, crop: 'limit' }]
});

const upload = multer({ storage: storage });

module.exports = { cloudinary, upload };