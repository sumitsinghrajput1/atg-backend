import multer from 'multer';
import path from 'path';
import fs from 'fs';

const tempDir = path.join(__dirname, '../../public/temp');
if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_, __, cb) => cb(null, tempDir),
  filename: (_, file, cb) => cb(null, Date.now() + '-' + file.originalname),
});
console.log("file in mulfert" )

// Accept any fields: single or multiple
export const dynamicUpload = multer({ storage }).any();
