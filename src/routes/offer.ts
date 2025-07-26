import express from "express";
import {
  createOffer,
  updateOffer,
  deleteOffer,
  getAllOffers,
  getOfferById
} from "../controllers/offer";

const router = express.Router();

router.post("/", createOffer);
router.put("/:id", updateOffer);
router.delete("/:id", deleteOffer);
router.get("/", getAllOffers);
router.get("/:id", getOfferById);

export default router;
