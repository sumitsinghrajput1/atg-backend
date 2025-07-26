import { z } from "zod";

// Category creation schema (image required separately)
export const categoryCreateSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
});

// Category update schema (all optional)
export const categoryUpdateSchema = z.object({
  name: z.string().optional(),
  description: z.string().optional(),
});
