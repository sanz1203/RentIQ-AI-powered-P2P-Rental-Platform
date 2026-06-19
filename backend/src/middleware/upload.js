const multer = require('multer');
const path = require('path');
const fs = require('fs');

const uploadDirs = [
  path.join(__dirname, '../../uploads'),
  path.join(__dirname, '../../uploads/listings'),
  path.join(__dirname, '../../uploads/verifications'),
  path.join(__dirname, '../../uploads/damage')
];

uploadDirs.forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    console.log(`Created uploads directory: ${dir}`);
  }
});

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    let dest = path.join(__dirname, '../../uploads');
    
    if (file.fieldname === 'verification_doc') {
      dest = path.join(__dirname, '../../uploads/verifications');
    } else if (file.fieldname === 'listing_images') {
      dest = path.join(__dirname, '../../uploads/listings');
    } else if (file.fieldname === 'damage_images') {
      dest = path.join(__dirname, '../../uploads/damage');
    }
    
    cb(null, dest);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, file.fieldname + '-' + uniqueSuffix + ext);
  }
});

const fileFilter = (req, file, cb) => {
  const allowedExtensions = ['.png', '.jpg', '.jpeg', '.pdf', '.webp'];
  const ext = path.extname(file.originalname).toLowerCase();
  
  if (allowedExtensions.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only PNG, JPG, JPEG, WEBP, and PDF are allowed.'), false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024 
  }
});

module.exports = upload;
