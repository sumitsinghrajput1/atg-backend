import { Request, Response } from "express";
import { Offer } from "../models/Offer";
import { asyncHandler } from "../utils/asyncHandler";
import { ApiResponse } from "../utils/ApiResponse";
import { ApiError } from "../utils/ApiError";

// Create Offer
export const createOffer = asyncHandler(async (req: Request, res: Response) => {
  const offer = await Offer.create(req.body);
  return res.status(201).json(new ApiResponse(201, { offer }, "Offer created"));
});

// Update Offer
export const updateOffer = asyncHandler(async (req: Request, res: Response) => {
  const offer = await Offer.findByIdAndUpdate(req.params.id, req.body, { new: true });
  if (!offer) throw new ApiError(404, "Offer not found");
  return res.status(200).json(new ApiResponse(200, { offer }, "Offer updated"));
});

// Delete Offer
export const deleteOffer = asyncHandler(async (req: Request, res: Response) => {
  const deleted = await Offer.findByIdAndDelete(req.params.id);
  if (!deleted) throw new ApiError(404, "Offer not found");
  return res.status(200).json(new ApiResponse(200, {}, "Offer deleted"));
});

// Get All Offers
export const getAllOffers = asyncHandler(async (_req, res) => {
  const offers = await Offer.find();
  return res.status(200).json(new ApiResponse(200, { offers }));
});

// Get Offer By ID
export const getOfferById = asyncHandler(async (req: Request, res: Response) => {
  const offer = await Offer.findById(req.params.id);
  if (!offer) throw new ApiError(404, "Offer not found");
  return res.status(200).json(new ApiResponse(200, { offer }));
});
