import { Request, Response } from "express";
import { Product } from "../models/Product";
import { asyncHandler } from "../utils/asyncHandler";
import { ApiError } from "../utils/ApiError";
import { ApiResponse } from "../utils/ApiResponse";
import mongoose from "mongoose";
import { uploadToCloudinary } from '../utils/cloudinary';

import { productSchema } from "../validators/productValidator";


// GET /api/products  GET /api/products?search=box&minPrice=500&maxPrice=1000&isGiftBox=true&tags=festival,diwali&featured=true&sortBy=price&order=asc&page=2&limit=10

export const getAllProducts = asyncHandler(async (req: Request, res: Response) => {
  const {
    search,
    category ,
    minPrice,
    maxPrice,
    hasDiscount,
    tags,
    isGiftBox,
    isReturnGift,
    isTrending,
    isBundle,
    featured,
    sortBy = "createdAt",
    order = "desc",
    page = "1",
    limit = "10"
  } = req.query;



  const filters: any = {};

  // Search by name or tags
  if (search) {
    const searchRegex = new RegExp(search as string, "i");
    filters.$or = [
      { name: searchRegex },
      { tags: searchRegex },
    ];
  }

  // Category filter
 if (category) {
    filters.categoryId = category; // ✅ Filter by categoryId field in database
  }

  // Price range
  if (minPrice || maxPrice) {
    filters.price = {};
    if (minPrice) filters.price.$gte = Number(minPrice);
    if (maxPrice) filters.price.$lte = Number(maxPrice);
  }

  // Discount filter
  if (hasDiscount === "true") {
    filters.$expr = { $lt: ["$discountPrice", "$price"] };
  }

  // Tags filter
  if (tags) {
    const tagsArray = (tags as string).split(",").map(tag => tag.trim());
    filters.tags = { $in: tagsArray };
  }

  // Boolean filters
  if (isGiftBox !== undefined) filters.isGiftBox = isGiftBox === "true";
  if (isReturnGift !== undefined) filters.isReturnGift = isReturnGift === "true";
  if (isTrending !== undefined) filters.isTrending = isTrending === "true";
  if (isBundle !== undefined) filters.isBundle = isBundle === "true";
  if (featured !== undefined) filters.featured = featured === "true";

  // Pagination
  const pageNum = parseInt(page as string, 10) || 1;
  const limitNum = parseInt(limit as string, 10) || 10;
  const skip = (pageNum - 1) * limitNum;

  // Sorting
  const allowedSortFields = ["createdAt", "price", "name"] as const;
  const rawSortBy = sortBy as string;
  const sortField: string = allowedSortFields.includes(rawSortBy as any) ? rawSortBy : "createdAt";
  const sortOrder = order === "asc" ? 1 : -1;

  const total = await Product.countDocuments(filters);

  const products = await Product.find(filters)
    .populate("categoryId", "name")
    .sort({ [sortField]: sortOrder })
    .skip(skip)
    .limit(limitNum);

  return res.status(200).json(
    new ApiResponse(200, {
      products,
      total,
      page: pageNum,
      totalPages: Math.ceil(total / limitNum)
    }, "Products fetched with filters")
  );
});

// GET /api/products/:id
export const getProductById = asyncHandler(async (req: Request, res: Response) => {
  const product = await Product.findById(req.params.id).populate("categoryId", "name");

  if (!product) {
    throw new ApiError(404, "Product not found");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, { product }, "Product fetched"));
});


// Get all products by category ID
export const getProductsByCategory = asyncHandler(async (req: Request, res: Response) => {
  const { categoryId } = req.params;

  if (!categoryId) {
    throw new ApiError(400, "Category ID is required");
  }

  const products = await Product.find({
    categoryId: new mongoose.Types.ObjectId(categoryId),
  });

  if (!products || products.length === 0) {
    throw new ApiResponse(200, "No products found for this category");
  }

  return res.status(200).json(
    new ApiResponse(200, { products }, "Products fetched successfully")
  );
});

//GEt all featured products 
export const getFeaturedProducts = asyncHandler(async (_req, res) => {
  const products = await Product.find({ featured: true });

  if (!products.length) {
    throw new ApiError(404, "No featured products found");
  }

  return res.status(200).json(
    new ApiResponse(200, { products }, "Featured products fetched")
  );
});

// POST 
// export const addProduct = asyncHandler(async (req: Request, res: Response) => {
//   console.log("Body:", req.body);
//   console.log("Files:", req.files);

  
//   const parsed = productSchema.safeParse(req.body);
//   if (!parsed.success) {
//      const errorMessages = parsed.error.errors.map(e => ({
//     field: e.path.join("."),
//     message: e.message
//   }));

//   throw new ApiError(400, "Validation Failed", errorMessages);
//   }

//   const {
//     name,
//     description,
//     price,
//     discountPrice,
//     categoryId,
//     tags,
//     stock,
//     isGiftBox = false,
//     isReturnGift = false,
//     isTrending = false,
//     isBundle = false,
//     variants,
//     bundleItems,
//     isfeatured = false,
//   } = parsed.data;

//   if (!req.files) {
//     throw new ApiError(400, "No files were uploaded");
//   }

//   // Normalize req.files
//   const filesArray = Array.isArray(req.files)
//     ? req.files
//     : Object.values(req.files).flat();

//   const grouped: Record<string, Express.Multer.File[]> = {};
//   for (const file of filesArray) {
//     if (!grouped[file.fieldname]) grouped[file.fieldname] = [];
//     grouped[file.fieldname].push(file);
//   }

//   // ✅ Check banner file count
//   if (!grouped["banner"] || grouped["banner"].length !== 1) {
//     throw new ApiError(400, "Exactly one banner image is required");
//   }

//   // ✅ Check image files count
//   const imageFiles = grouped["images"] || [];
//   if (imageFiles.length > 4) {
//     throw new ApiError(400, "You can upload a maximum of 4 product images");
//   }

//   // Upload banner
//   const bannerUrl = await uploadToCloudinary(grouped["banner"][0].path);

//   // Upload images
//   const imageUrls: string[] = [];
//   for (const image of imageFiles) {
//     const url = await uploadToCloudinary(image.path);
//     imageUrls.push(url);
//   }

//   const newProduct = await Product.create({
//     name,
//     description,
//     price,
//     discountPrice,
//     banner: bannerUrl,
//     images: imageUrls,
//     categoryId,
//     tags,
//     stock,
//     isGiftBox,
//     isReturnGift,
//     isTrending,
//     isBundle,
//     variants,
//     bundleItems,
//     isfeatured,
//   });

//   return res
//     .status(201)
//     .json(new ApiResponse(201, { product: newProduct }, "Product created successfully"));
// });

// POST 
export const addProduct = asyncHandler(async (req: Request, res: Response) => {
  console.log("Body:", req.body);
  console.log("Files:", req.files);

  const parsed = productSchema.safeParse(req.body);
  if (!parsed.success) {
     const errorMessages = parsed.error.errors.map(e => ({
    field: e.path.join("."),
    message: e.message
  }));

  throw new ApiError(400, "Validation Failed", errorMessages);
  }

  const {
    name,
    description,
    price,
    discountPrice,
    categoryId,
    tags,
    stock,
    isGiftBox = false,
    isReturnGift = false,
    isTrending = false,
    isBundle = false,
    variants,
    bundleItems,
    isfeatured = false,
  } = parsed.data;

  // ✅ Make files optional
  let bannerUrl = "";
  let imageUrls: string[] = [];

  if (req.files) {
    // Normalize req.files
    const filesArray = Array.isArray(req.files)
      ? req.files
      : Object.values(req.files).flat();

    const grouped: Record<string, Express.Multer.File[]> = {};
    for (const file of filesArray) {
      if (!grouped[file.fieldname]) grouped[file.fieldname] = [];
      grouped[file.fieldname].push(file);
    }

    // ✅ Check banner file count (only if banner files exist)
    if (grouped["banner"]) {
      if (grouped["banner"].length !== 1) {
        throw new ApiError(400, "Exactly one banner image is required");
      }
      // Upload banner
      bannerUrl = await uploadToCloudinary(grouped["banner"][0].path);
    }

    // ✅ Check image files count (only if image files exist)
    const imageFiles = grouped["images"] || [];
    if (imageFiles.length > 4) {
      throw new ApiError(400, "You can upload a maximum of 4 product images");
    }

    // Upload images
    if (imageFiles.length > 0) {
      for (const image of imageFiles) {
        const url = await uploadToCloudinary(image.path);
        imageUrls.push(url);
      }
    }
  }

  const newProduct = await Product.create({
    name,
    description,
    price,
    discountPrice,
    banner: bannerUrl,
    images: imageUrls,
    categoryId,
    tags,
    stock,
    isGiftBox,
    isReturnGift,
    isTrending,
    isBundle,
    variants,
    bundleItems,
    isfeatured,
  });

  return res
    .status(201)
    .json(new ApiResponse(201, { product: newProduct }, "Product created successfully"));
});



// PUT /api/products/:id
export const updateProduct = asyncHandler(async (req: Request, res: Response) => {
  console.log("Body:", req.body);
  console.log("Files:", req.files);

  const productId = req.params.id;

  // Find the existing product
  const existingProduct = await Product.findById(productId);
  if (!existingProduct) {
    throw new ApiError(404, "Product not found");
  }

 const updateData: Partial<Record<string, any>> = {};

  // Manually assign fields if they exist in body
  const fieldsToCheck = [
    "name", "description", "price", "discountPrice",
    "categoryId", "tags", "stock",
    "isGiftBox", "isReturnGift", "isTrending", "isBundle",
    "variants", "bundleItems", "isFeatured"
  ];

  for (const field of fieldsToCheck) {
    if (req.body[field] !== undefined) {
      if (["price", "discountPrice", "stock"].includes(field)) {
        updateData[field] = Number(req.body[field]);
      } else if (
        ["isGiftBox", "isReturnGift", "isTrending", "isBundle", "isfeatured"].includes(field)
      ) {
        updateData[field] = req.body[field] === "true";
      } else if (field === "tags") {
        updateData.tags = req.body.tags.split(",").map((t: string) => t.trim());
      } else if (["variants", "bundleItems"].includes(field)) {
        try {
          updateData[field] = JSON.parse(req.body[field]);
        } catch {
          throw new ApiError(400, `${field} must be valid JSON`);
        }
      } else {
        updateData[field] = req.body[field];
      }
    }
  }

  // Handle files (if any)
  if (req.files) {
    const filesArray = Array.isArray(req.files)
      ? req.files
      : Object.values(req.files).flat();

    const grouped: Record<string, Express.Multer.File[]> = {};
    for (const file of filesArray) {
      if (!grouped[file.fieldname]) grouped[file.fieldname] = [];
      grouped[file.fieldname].push(file);
    }

    // Replace banner if new one is provided
    if (grouped["banner"]?.[0]) {
      const bannerUrl = await uploadToCloudinary(grouped["banner"][0].path);
      updateData.banner = bannerUrl;
    }

    // Replace images if new ones are provided
    if (grouped["images"]) {
      const newImageUrls: string[] = [];
      for (const image of grouped["images"]) {
        const url = await uploadToCloudinary(image.path);
        newImageUrls.push(url);
      }

      // Option 1: Replace all images (cleanest):
      updateData.images = newImageUrls;

      // Option 2: Merge new images with existing (if preferred):
      // updateData.images = [...(existingProduct.images || []), ...newImageUrls];
    }
  }

  // Perform the update
  const updatedProduct = await Product.findByIdAndUpdate(productId, updateData, {
    new: true,
  });

  return res.status(200).json(
    new ApiResponse(200, { updatedProduct }, "Product updated successfully")
  );
});

// make featuired product
export const toggleFeatured = asyncHandler(async (req: Request, res: Response) => {
  const productId = req.params.id;
  const { isfeatured } = req.body; // expects true/false

  const product = await Product.findById(productId);
  if (!product) throw new ApiError(404, "Product not found");

  product.isFeatured = isfeatured;
  await product.save();

  return res.status(200).json(
    new ApiResponse(200, { product }, `Product ${isfeatured ? "marked" : "removed"} as featured`)
  );
});

// DELETE /api/products/:id
export const deleteProduct = asyncHandler(async (req: Request, res: Response) => {
  const deletedProduct = await Product.findByIdAndDelete(req.params.id);

  if (!deletedProduct) {
    throw new ApiError(404, "Product not found");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Product deleted successfully"));
});


