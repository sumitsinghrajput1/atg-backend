// utils/getNextOrderId.ts
import Counter from "../models/Counter";

export const getNextOrderId = async () => {
  const counter = await Counter.findOneAndUpdate(
    { name: "order" },
    { $inc: { value: 1 } },
    { new: true, upsert: true }
  );

  const padded = String(counter.value).padStart(4, "0"); // ORD0001
  return `ORD${padded}`;
};
