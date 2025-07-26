import { z } from "zod";

export const productSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  price: z.coerce.number().min(0, "Price must be a number"),
  discountPrice: z.coerce.number().optional(),
  categoryId: z.string().min(1, "CategoryId is required"),

  tags: z
    .string()
    .min(0, "Tags is required")
    .transform(str => str.split(",").map(tag => tag.trim()).filter(Boolean)),

  stock: z.preprocess(
    (val) => Number(val),
    z.number({ required_error: "Stock is required" }).min(0, "Stock must be a number")
  ),

  isGiftBox: z.coerce.boolean().optional(),
  isReturnGift: z.coerce.boolean().optional(),
  isTrending: z.coerce.boolean().optional(),
  isBundle: z.coerce.boolean().optional(),
  isfeatured: z.coerce.boolean().optional(),

  variants: z
  .preprocess((val) => {
    if (typeof val === "string") {
      try {
        return JSON.parse(val);
      } catch {
        return [];
      }
    }
    return val;
  }, z.array(
    z.object({
      color: z.string().optional(),
      size: z.string().optional(),
      stock: z.coerce.number(),
    })
  ).optional()),

bundleItems: z
  .preprocess((val) => {
    if (typeof val === "string") {
      try {
        return JSON.parse(val);
      } catch {
        return [];
      }
    }
    return val;
  }, z.array(
    z.object({
      productId: z.string(),
      quantity: z.coerce.number(),
    })
  ).optional()),

});
