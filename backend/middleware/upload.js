const { promisify } = require('util');
const multer = require('multer');
const { GridFsStorage } = require('multer-gridfs-storage');

const mongoUri =
  process.env.MONGO_URI ||
  process.env.MONGODB_URI ||
  'mongodb://127.0.0.1:27017/Final-Project';

const storage = new GridFsStorage({
  url: mongoUri,
  options: { useNewUrlParser: true, useUnifiedTopology: true },
  file: (req, file) => {
    const allowed = ['image/png', 'image/jpeg', 'image/jpg'];
    if (!allowed.includes(file.mimetype)) {
      return {
        bucketName: 'photos',
        filename: `invalid-${Date.now()}`,
        metadata: { reason: 'unsupported-mime-type' },
      };
    }

    return {
      bucketName: 'photos',
      filename: `photo-${Date.now()}-${file.originalname}`,
    };
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
});

const uploadFilesMiddleware = promisify(upload.single('photo'));

module.exports = uploadFilesMiddleware;

