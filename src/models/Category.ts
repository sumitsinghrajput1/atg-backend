import { Schema, model, Document } from "mongoose";

export interface ICategory extends Document {
  name: string;
  description?: string;
  image?: string;
}

const categorySchema = new Schema<ICategory>({
  name: { type: String, required: true },
  description: String,
  image: String
});

export const Category = model<ICategory>("Category", categorySchema);
