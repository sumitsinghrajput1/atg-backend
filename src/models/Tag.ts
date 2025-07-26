import { Schema, model, Document } from "mongoose";

export interface ITag extends Document {
  label: string; // Shown to users
  key: string;   // Used internally for search
}

const tagSchema = new Schema<ITag>({
  label: { type: String, required: true },
  key: { type: String, required: true, unique: true },
});

export const Tag = model<ITag>("Tag", tagSchema);
