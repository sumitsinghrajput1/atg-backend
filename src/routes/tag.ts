import express from "express";
import {
  getAllTags,
  createTag,
  updateTag,
  deleteTag
} from "../controllers/tag";

const router = express.Router();

router.get("/", getAllTags);
router.post("/", createTag);
router.put("/:id", updateTag);
router.delete("/:id", deleteTag);

export default router;
