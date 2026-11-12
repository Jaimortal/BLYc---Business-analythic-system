import multer from 'multer';
import path from 'path';
import { Request } from 'express';

// In-memory storage for MVP dataset processing (no permanent raw storage on disk)
const storage = multer.memoryStorage();

const ALLOWED_EXTENSIONS = ['.xlsx', '.xls', '.csv'];
const ALLOWED_MIME_TYPES = [
  'text/csv',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/octet-stream' // fallback for raw csv/excel streams
];

export const datasetUpload = multer({
  storage,
  limits: {
    fileSize: 25 * 1024 * 1024, // 25 MB max limit
    files: 1
  },
  fileFilter: (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      return cb(new Error('Invalid file type. Only .xlsx, .xls, and .csv files are supported.'));
    }

    if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      return cb(new Error('Invalid MIME type for spreadsheet file.'));
    }

    cb(null, true);
  }
});
