import { UploadedFile } from "express-fileupload";

declare module "express-fileupload" {
  interface UploadedFile {
    tempFilePath: string;
  }
}

declare global {
  namespace Express {
    interface Request {
      files?: {
        [fieldname: string]: UploadedFile | UploadedFile[];
      };
    }
  }
}
