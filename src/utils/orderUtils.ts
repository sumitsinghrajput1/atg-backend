// import { Product } from '../models/Product';
// import { Coupon } from '../models/Coupon';
// import { ApiError } from "../utils/ApiError";

// import { ValidatedOrderItem, ValidationResult } from '../types/order';

// // Helper function to find variant in product
// export const findVariant = (product: any, variantInfo: { color?: string; size?: string }) => {
//   if (!product.variants || !product.variants.length || !variantInfo) {
//     return null;
//   }
  
//   return product.variants.find((variant: any) => {
//     const colorMatch = !variantInfo.color || variant.color === variantInfo.color;
//     const sizeMatch = !variantInfo.size || variant.size === variantInfo.size;
//     return colorMatch && sizeMatch;
//   });
// };

// // Generate next order ID
// export const getNextOrderId = async (): Promise<string> => {
//   const timestamp = Date.now();
//   const random = Math.floor(Math.random() * 1000);
//   return `ORDER_${timestamp}_${random}`;
// };

// // Validate order items - extracted from your logic
// export const validateOrderItems = async (
//   items: any[], 
//   couponCode?: string
// ): Promise<ValidationResult> => {
//   let totalAmount = 0;
//   const validatedItems: ValidatedOrderItem[] = [];

//   for (const item of items) {
//     const qty = Number(item.quantity);
//     if (!Number.isFinite(qty) || qty <= 0) {
//       throw new ApiError(400, `Invalid quantity for product ${item.productId}`);
//     }

//     const product = await Product.findById(item.productId);

//     if (!product || !product.isAvailable || product.price == null || product.price <= 0) {
//       throw new ApiError(400, `Product unavailable: ${item.productId}`);
//     }

//     // ✅ Check variant stock if variant is provided
//     if (item.variant) {
//       const selectedVariant = findVariant(product, item.variant);
      
//       if (!selectedVariant) {
//         throw new ApiError(400, `Variant not found for product: ${product.name}`);
//       }
      
//       if (selectedVariant.stock == null || selectedVariant.stock <= 0) {
//         throw new ApiError(400, `Variant out of stock for ${product.name}`);
//       }
      
//       if (selectedVariant.stock < qty) {
//         throw new ApiError(400, `Insufficient variant stock for ${product.name}`);
//       }
//     } else {
//       // ✅ Check main product stock if no variant
//       if (product.stock == null || product.stock <= 0) {
//         throw new ApiError(400, `Out of stock: ${product.name}`);
//       }
      
//       if (product.stock < qty) {
//         throw new ApiError(400, `Insufficient stock for ${product.name}`);
//       }
//     }

//     // ✅ Bundle validation logic (same as your original)
//     if (product.isBundle && product.bundleItems?.length) {
//       for (const bundleItem of product.bundleItems) {
//         const subProduct = await Product.findById(bundleItem.productId);
//         const requiredQty = bundleItem.quantity * qty;

//         if (!subProduct) {
//           throw new ApiError(400, `Bundle item not found`);
//         }

//         if (item.bundleItems) {
//           const bundleItemData = item.bundleItems.find(
//             (bi: any) => bi.productId.toString() === bundleItem.productId.toString()
//           );
          
//           if (bundleItemData?.variant) {
//             const selectedVariant = findVariant(subProduct, bundleItemData.variant);
            
//             if (!selectedVariant) {
//               throw new ApiError(400, `Bundle item variant not found: ${subProduct.name}`);
//             }
            
//             if (selectedVariant.stock < requiredQty) {
//               throw new ApiError(400, `Insufficient variant stock for bundle item: ${subProduct.name}`);
//             }
//           } else {
//             if (subProduct.stock == null || subProduct.stock < requiredQty) {
//               throw new ApiError(400, `Insufficient stock for bundle item: ${subProduct.name}`);
//             }
//           }
//         } else {
//           if (subProduct.stock == null || subProduct.stock < requiredQty) {
//             throw new ApiError(400, `Insufficient stock for bundle item: ${subProduct.name}`);
//           }
//         }
//       }
//     }

//     const itemTotal = product.price * qty;
//     totalAmount += itemTotal;

//     validatedItems.push({
//       productId: product.id,
//       quantity: qty,
//       price: product.price,
//       variant: item.variant || undefined,
//       isBundle: product.isBundle,
//       bundleItems: product.isBundle ? (item.bundleItems || product.bundleItems) : undefined,
//     });
//   }

//   // 🧾 Coupon logic
//   let discount = 0;
//   let appliedCoupon = null;

//   if (couponCode) {
//     const coupon = await Coupon.findOne({ code: couponCode, isActive: true });
//     const now = new Date();

//     if (
//       !coupon ||
//       coupon.validTill < now ||
//       (coupon.usageLimit && coupon.usedCount >= coupon.usageLimit) ||
//       totalAmount < coupon.minPurchase
//     ) {
//       throw new ApiError(400, "Invalid, expired, or inapplicable coupon");
//     }

//     if (coupon.discountPercent) {
//       discount = (totalAmount * coupon.discountPercent) / 100;
//       if (coupon.maxDiscount) {
//         discount = Math.min(discount, coupon.maxDiscount);
//       }
//     } else if (coupon.discountValue) {
//       discount = coupon.discountValue;
//     }

//     appliedCoupon = coupon;
//   }

//   const finalAmount = Math.max(totalAmount - discount, 0);

//   return { validatedItems, totalAmount, discount, finalAmount, appliedCoupon };
// };


import { Product } from '../models/Product';
import { Coupon } from '../models/Coupon';
import { ApiError } from "../utils/ApiError";
import { ValidatedOrderItem, ValidationResult } from '../types/order';



const getItemTotal = (product:any, qty:number) => {
  // Use discountPrice if it exists and is valid, otherwise use regular price
  const effectivePrice = product.discountPrice && product.discountPrice > 0 
    ? product.discountPrice 
    : product.price;
    
  return effectivePrice * qty;
};


// Helper function to find variant in product
export const findVariant = (product: any, variantInfo: { color?: string; size?: string }) => {
  if (!product?.variants || !product.variants.length || !variantInfo) {
    return null;
  }
  
  return product.variants.find((variant: any) => {
    const colorMatch = !variantInfo.color || variant.color === variantInfo.color;
    const sizeMatch = !variantInfo.size || variant.size === variantInfo.size;
    return colorMatch && sizeMatch;
  });
};

// Generate next order ID
export const getNextOrderId = async (): Promise<string> => {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 1000);
  return `ORDER_${timestamp}_${random}`;
};

// Enhanced validate order items with better error handling
export const validateOrderItems = async (
  items: any[], 
  couponCode?: string
): Promise<ValidationResult> => {
  let totalAmount = 0;
  const validatedItems: ValidatedOrderItem[] = [];

  for (const item of items) {
    const qty = Number(item.quantity);
    if (!Number.isFinite(qty) || qty <= 0) {
      throw new ApiError(400, `Invalid quantity for product ${item.productId}`);
    }

    const product = await Product.findById(item.productId);
   
    if (!product || !product.isAvailable || product.price == null || product.price <= 0) {
      throw new ApiError(400, `Product unavailable: ${item.productId}`);
    }

    // Check variant stock if variant is provided
    if (item.variant) {
      const selectedVariant = findVariant(product, item.variant);
      
      if (!selectedVariant) {
        throw new ApiError(400, `Variant not found for product: ${product.name}`);
      }
      
      if (selectedVariant.stock == null || selectedVariant.stock <= 0) {
        throw new ApiError(400, `Variant out of stock for ${product.name}`);
      }
      
      if (selectedVariant.stock < qty) {
        throw new ApiError(400, `Insufficient variant stock for ${product.name}`);
      }
    } else {
      // Check main product stock if no variant
      if (product.stock == null || product.stock <= 0) {
        throw new ApiError(400, `Out of stock: ${product.name}`);
      }
      
      if (product.stock < qty) {
        throw new ApiError(400, `Insufficient stock for ${product.name}`);
      }
    }

    // ✅ Enhanced Bundle validation logic with better error handling
    if (product.isBundle && product.bundleItems?.length) {
      console.log(`Validating bundle product: ${product.name} (${product._id})`);
      console.log(`Bundle items to validate:`, product.bundleItems);

      for (let i = 0; i < product.bundleItems.length; i++) {
        const bundleItem = product.bundleItems[i];
        const requiredQty = bundleItem.quantity * qty;

        console.log(`Checking bundle item ${i + 1}:`, {
          productId: bundleItem.productId,
          requiredQuantity: requiredQty
        });

        // ✅ Enhanced error handling with specific product ID
        const subProduct = await Product.findById(bundleItem.productId);
        
        if (!subProduct) {
          throw new ApiError(400, 
            `Bundle item not found: Product ID "${bundleItem.productId}" does not exist in database. ` +
            `This is bundle item ${i + 1} of ${product.bundleItems.length} in product "${product.name}"`
          );
        }

        console.log(`Found bundle sub-product: ${subProduct.name} (${subProduct._id})`);

        // Check if the bundle item is available
        if (!subProduct.isAvailable) {
          throw new ApiError(400, `Bundle item unavailable: ${subProduct.name}`);
        }

        // Handle bundle item variants
        if (item.bundleItems) {
          const bundleItemData = item.bundleItems.find(
            (bi: any) => bi.productId.toString() === bundleItem.productId.toString()
          );
          
          if (bundleItemData?.variant) {
            const selectedVariant = findVariant(subProduct, bundleItemData.variant);
            
            if (!selectedVariant) {
              throw new ApiError(400, `Bundle item variant not found: ${subProduct.name}`);
            }
            
            if (selectedVariant.stock < requiredQty) {
              throw new ApiError(400, `Insufficient variant stock for bundle item: ${subProduct.name}`);
            }
          } else {
            if (subProduct.stock == null || subProduct.stock < requiredQty) {
              throw new ApiError(400, `Insufficient stock for bundle item: ${subProduct.name} (required: ${requiredQty}, available: ${subProduct.stock})`);
            }
          }
        } else {
          if (subProduct.stock == null || subProduct.stock < requiredQty) {
            throw new ApiError(400, `Insufficient stock for bundle item: ${subProduct.name} (required: ${requiredQty}, available: ${subProduct.stock})`);
          }
        }
      }

      console.log(`✅ All bundle items validated successfully for ${product.name}`);
    }
    
    // const itemTotal = product.price * qty;
    // totalAmount += itemTotal;
    const itemTotal = getItemTotal(product, qty);
    totalAmount += itemTotal;


    validatedItems.push({
      productId: product.id,
      quantity: qty,
      price: product.price,
      variant: item.variant || undefined,
      isBundle: product.isBundle,
      bundleItems: product.isBundle ? (item.bundleItems || product.bundleItems) : undefined,
    });
  }

  // Coupon logic (unchanged)
  let discount = 0;
  let appliedCoupon = null;

  if (couponCode) {
    const coupon = await Coupon.findOne({ code: couponCode, isActive: true });
    const now = new Date();

    if (
      !coupon ||
      coupon.validTill < now ||
      (coupon.usageLimit && coupon.usedCount >= coupon.usageLimit) ||
      totalAmount < coupon.minPurchase
    ) {
      throw new ApiError(400, "Invalid, expired, or inapplicable coupon");
    }

    if (coupon.discountPercent) {
      discount = (totalAmount * coupon.discountPercent) / 100;
      if (coupon.maxDiscount) {
        discount = Math.min(discount, coupon.maxDiscount);
      }
    } else if (coupon.discountValue) {
      discount = coupon.discountValue;
    }

    appliedCoupon = coupon;
  }

  const finalAmount = Math.max(totalAmount - discount, 0);

  return { validatedItems, totalAmount, discount, finalAmount, appliedCoupon };
};
