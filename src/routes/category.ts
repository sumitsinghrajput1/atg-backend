import express from "express";
import {
  getAllCategories,
  getCategoryById,
  createCategory,
  updateCategory,
  deleteCategory,
  getAllCategoriesWithId
} from "../controllers/category";
import { dynamicUpload } from '../middlewares/upload';

import { requireAdmin } from "../middlewares/adminAuth";

const router = express.Router();

router.get("/all-ids" , getAllCategoriesWithId)
router.get("/", getAllCategories);
router.get("/:id", getCategoryById);

//ADMIN
router.post("/", dynamicUpload , requireAdmin, createCategory);
router.put("/:id",dynamicUpload,requireAdmin,   updateCategory);
router.delete("/:id", requireAdmin , deleteCategory);

export default router;
