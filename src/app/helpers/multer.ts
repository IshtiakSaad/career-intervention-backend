import { Request } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";

// Ensure upload folder exists
const uploadDir = path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Set up storage logic
const storage = multer.diskStorage({
  destination: function (req: Request, file: any, cb: any) {
    cb(null, uploadDir);
  },

  filename: function (req: Request, file: any, cb: any) {
    // Unique filename: timestamp-originalname
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + "-" + file.originalname);
  },
});


export const upload = multer({ storage: storage });

