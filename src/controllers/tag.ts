import { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { ApiError } from "../utils/ApiError";
import { ApiResponse } from "../utils/ApiResponse";
import { Tag } from "../models/Tag";
import { tagCreateSchema, tagUpdateSchema } from "../validators/tagValidator";

// GET all tags
export const getAllTags = asyncHandler(async (_req: Request, res: Response) => {
  const tags = await Tag.find();
  if (!tags.length) throw new ApiError(404, "No tags found");

  return res.status(200).json(new ApiResponse(200, { tags }, "All tags"));
});

// CREATE tag
export const createTag = asyncHandler(async (req: Request, res: Response) => {
  const parsed = tagCreateSchema.safeParse(req.body);
  if (!parsed.success) {
    const errors = parsed.error.errors.map(e => ({
      field: e.path.join("."),
      message: e.message,
    }));
    throw new ApiError(400, "Validation Failed", errors);
  }

  const { label, key } = parsed.data;
  const exists = await Tag.findOne({ key });
  if (exists) throw new ApiError(409, "Tag with this key already exists");

  const tag = await Tag.create({ label, key });

  return res.status(201).json(new ApiResponse(201, { tag }, "Tag created"));
});

// UPDATE tag
export const updateTag = asyncHandler(async (req: Request, res: Response) => {
  const parsed = tagUpdateSchema.safeParse(req.body);
  if (!parsed.success) {
    const errors = parsed.error.errors.map(e => ({
      field: e.path.join("."),
      message: e.message,
    }));
    throw new ApiError(400, "Validation Failed", errors);
  }

  const tagId = req.params.id;
  const existing = await Tag.findById(tagId);
  if (!existing) throw new ApiError(404, "Tag not found");

  const updated = await Tag.findByIdAndUpdate(tagId, parsed.data, { new: true });

  return res.status(200).json(new ApiResponse(200, { updated }, "Tag updated"));
});

// DELETE tag
export const deleteTag = asyncHandler(async (req: Request, res: Response) => {
  const deleted = await Tag.findByIdAndDelete(req.params.id);
  if (!deleted) throw new ApiError(404, "Tag not found");

  return res.status(200).json(new ApiResponse(200, {}, "Tag deleted"));
});
