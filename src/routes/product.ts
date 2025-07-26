import express from "express";
import {
  getAllProducts,
  getProductById,
  updateProduct,
  deleteProduct,
  addProduct,
  getProductsByCategory,
  getFeaturedProducts,
  toggleFeatured
} from "../controllers/product";

import { dynamicUpload } from '../middlewares/upload';

import { requireAdmin } from "../middlewares/adminAuth";

const router = express.Router();

router.get("/", getAllProducts);
router.get("/:id", getProductById);
router.get("/category/:categoryId", getProductsByCategory);
router.get("/featured", getFeaturedProducts);

//ADMIN ONLY
router.post("/",dynamicUpload,requireAdmin, addProduct); 
router.put("/:id",dynamicUpload,requireAdmin,  updateProduct);   
router.delete("/:id", requireAdmin,  deleteProduct); 
router.put("/admin/:id/featured",requireAdmin, toggleFeatured);



export default router;
