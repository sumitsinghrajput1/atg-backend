import { z } from "zod";

export const tagCreateSchema = z.object({
  label: z.string().min(1, "Label is required"),
  key: z.string().min(1, "Key is required"),
});

export const tagUpdateSchema = z.object({
  label: z.string().optional(),
  key: z.string().optional(),
});
