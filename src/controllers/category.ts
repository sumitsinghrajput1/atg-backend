import { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { ApiError } from "../utils/ApiError";
import { ApiResponse } from "../utils/ApiResponse";
import { Category } from "../models/Category";
import { categoryCreateSchema, categoryUpdateSchema } from "../validators/categoryValidator";
import { uploadToCloudinary } from "../utils/cloudinary";
import { UploadedFile } from "express-fileupload";

// Utility to normalize uploaded file
const getUploadedFile = (
  file: UploadedFile | UploadedFile[] | undefined
): UploadedFile | undefined => {
  if (!file) return undefined;
  return Array.isArray(file) ? file[0] : file;
};

export const getAllCategoriesWithId = asyncHandler(async (_req: Request, res: Response) => {
  const categories = await Category.find().select("_id name");
  if (!categories.length) throw new ApiError(404, "No categories found");
  return res.status(200).json(new ApiResponse(200, { categories }, "All categories"));
})

// GET all
export const getAllCategories = asyncHandler(async (_req: Request, res: Response) => {
  const categories = await Category.find();
  if (!categories.length) throw new ApiError(404, "No categories found");

  return res.status(200).json(new ApiResponse(200, { categories }, "All categories"));
});

// GET by ID
export const getCategoryById = asyncHandler(async (req: Request, res: Response) => {
  const category = await Category.findById(req.params.id);
  if (!category) throw new ApiError(404, "Category not found");

  return res.status(200).json(new ApiResponse(200, { category }, "Category details"));
});

// POST
export const createCategory = asyncHandler(async (req: Request, res: Response) => {
  const parsed = categoryCreateSchema.safeParse(req.body);
  if (!parsed.success) {
    const errors = parsed.error.errors.map(e => ({
      field: e.path.join("."),
      message: e.message,
    }));
    throw new ApiError(400, "Validation Failed", errors);
  }

  const { name, description } = parsed.data;

  const exists = await Category.findOne({ name });
  if (exists) throw new ApiError(409, "Category with this name already exists");

  // FIND uploaded image file (Multer .any() puts files in req.files array)
  const imageFile = Array.isArray(req.files)
    ? req.files.find(file => file.fieldname === "image")
    : undefined;
  if (!imageFile || !imageFile.path) {
    throw new ApiError(400, "Image is required");
  }

  const imageUrl = await uploadToCloudinary(imageFile.path);

  const category = await Category.create({
    name,
    description,
    image: imageUrl,
  });

  return res.status(201).json(new ApiResponse(201, { category }, "Category created"));
});


//  UPDATE CATEGORY
export const updateCategory = asyncHandler(async (req: Request, res: Response) => {
  const parsed = categoryUpdateSchema.safeParse(req.body);
  if (!parsed.success) {
    const errors = parsed.error.errors.map(e => ({
      field: e.path.join("."),
      message: e.message,
    }));
    throw new ApiError(400, "Validation Failed", errors);
  }

  const categoryId = req.params.id;
  const existing = await Category.findById(categoryId);
  if (!existing) throw new ApiError(404, "Category not found");

  const updateData: Partial<typeof existing> = { ...parsed.data };

  // Optional image update (using multer)
  const imageFile = Array.isArray(req.files)
    ? req.files.find(file => file.fieldname === "image")
    : undefined;

  if (imageFile && imageFile.path) {
    updateData.image = await uploadToCloudinary(imageFile.path);
  }

  const updated = await Category.findByIdAndUpdate(categoryId, updateData, {
    new: true,
  });

  return res.status(200).json(new ApiResponse(200, { updated }, "Category updated"));
});


// DELETE
export const deleteCategory = asyncHandler(async (req: Request, res: Response) => {
  const deleted = await Category.findByIdAndDelete(req.params.id);
  if (!deleted) throw new ApiError(404, "Category not found");

  return res.status(200).json(new ApiResponse(200, {}, "Category deleted"));
});
