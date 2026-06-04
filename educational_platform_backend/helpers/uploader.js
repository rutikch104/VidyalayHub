const multer = require('multer');
const path = require('path');

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, './file');
  },
  filename: function (req, file, cb) {
    // cb(null, file.fieldname + "_" + Date.now() + path.extname(file.originalname));
     cb(null, file.fieldname + path.extname(file.originalname));
  }
});

const fileFilter = (req, file, cb) => {
  if (
    file.mimetype === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" || // For .xlsx files
    file.mimetype === "application/vnd.ms-excel" || // For .xls files
    file.mimetype === "text/csv" // For .csv files
  ) {
    cb(null, true);
  } else {
    cb(new Error("Unsupported file format"), false);
  }
};

const upload = multer({
  storage: storage,
 fileFilter: fileFilter
});

module.exports = {upload: upload}