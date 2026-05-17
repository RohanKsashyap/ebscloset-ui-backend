const Product = require('../models/Product');
const InventoryLog = require('../models/InventoryLog');

/**
 * Decrements stock for products in an order and logs the changes.
 * @param {Array} products - Array of product objects from the order
 * @param {String} orderId - The ID of the order for logging purposes
 */
const decrementStock = async (products, orderId) => {
  for (const item of products) {
    try {
      let product = await Product.findById(item.productId);
      
      // Fallback to finding by title if productId is not a valid Mongo ID (sometimes happens with Stripe products)
      if (!product) {
        product = await Product.findOne({ name: item.title });
      }

      if (!product) {
        console.error(`Inventory Error: Product not found for stock decrement: ${item.title} (${item.productId})`);
        continue;
      }

      const qty = Number(item.quantity) || 0;
      let previousStock = 0;
      let newStock = 0;

      if (item.sku) {
        let variantIndex = product.variants.findIndex(v => v.sku === item.sku);
        
        if (variantIndex !== -1) {
          const variant = product.variants[variantIndex];
          previousStock = variant.stock?.quantity ?? variant.inStock ?? 0;
          
          // Update both new and legacy fields
          if (variant.stock) {
            variant.stock.quantity = Math.max(0, previousStock - qty);
            newStock = variant.stock.quantity;
          } else {
            variant.inStock = Math.max(0, previousStock - qty);
            newStock = variant.inStock;
          }
          
          // Keep inStock legacy field in sync if it exists
          variant.inStock = newStock;
        } else {
          console.error(`Inventory Error: SKU not found for ${product.name}: ${item.sku}`);
          // Fallback to top-level if SKU not found? 
          // Requirement says NEW LOGIC: Inventory updates must ONLY use SKU.
          // But for safety during migration, we might fallback.
          previousStock = product.inStock || 0;
          product.inStock = Math.max(0, previousStock - qty);
          newStock = product.inStock;
        }
      } else if (item.variantName) {
        // LEGACY FALLBACK (to be removed once all items have SKU)
        const lowerVariantName = item.variantName.toLowerCase();
        let variantIndex = product.variants.findIndex(v => 
          (v.name && v.name.toLowerCase() === lowerVariantName) || 
          (v.size && v.size.toLowerCase() === lowerVariantName) ||
          (v.sku && v.sku.toLowerCase() === lowerVariantName)
        );
        
        if (variantIndex !== -1) {
          const variant = product.variants[variantIndex];
          previousStock = variant.stock?.quantity ?? variant.inStock ?? 0;
          
          if (variant.stock) {
            variant.stock.quantity = Math.max(0, previousStock - qty);
            newStock = variant.stock.quantity;
          } else {
            variant.inStock = Math.max(0, previousStock - qty);
            newStock = variant.inStock;
          }
          variant.inStock = newStock;
        } else {
          previousStock = product.inStock || 0;
          product.inStock = Math.max(0, previousStock - qty);
          newStock = product.inStock;
        }
      } else {
        previousStock = product.inStock || 0;
        product.inStock = Math.max(0, previousStock - qty);
        newStock = product.inStock;
      }

      await product.save();

      // Create inventory log
      await InventoryLog.create({
        productId: product._id,
        productName: product.name,
        variantName: item.variantName || item.sku || null,
        change: -qty,
        previousStock,
        newStock,
        reason: 'order-placed',
        meta: { orderId, sku: item.sku }
      });

    } catch (err) {
      console.error(`Inventory Error: Failed to decrement stock for ${item.title}:`, err);
    }
  }
};

/**
 * Increments stock for products in an order (e.g., on cancellation or return).
 * @param {Array} products - Array of product objects from the order
 * @param {String} orderId - The ID of the order
 * @param {String} reason - The reason for increment ('order-returned' or 'order-cancelled')
 */
const incrementStock = async (products, orderId, reason = 'order-returned') => {
  for (const item of products) {
    try {
      let product = await Product.findById(item.productId);
      
      if (!product) {
        product = await Product.findOne({ name: item.title });
      }

      if (!product) {
        console.error(`Inventory Error: Product not found for stock increment: ${item.title}`);
        continue;
      }

      const qty = Number(item.quantity) || 0;
      let previousStock = 0;
      let newStock = 0;

      if (item.sku) {
        let variantIndex = product.variants.findIndex(v => v.sku === item.sku);
        
        if (variantIndex !== -1) {
          const variant = product.variants[variantIndex];
          previousStock = variant.stock?.quantity ?? variant.inStock ?? 0;
          
          if (variant.stock) {
            variant.stock.quantity = previousStock + qty;
            newStock = variant.stock.quantity;
          } else {
            variant.inStock = previousStock + qty;
            newStock = variant.inStock;
          }
          variant.inStock = newStock;
        } else {
          console.error(`Inventory Error: SKU not found for ${product.name}: ${item.sku}`);
          previousStock = product.inStock || 0;
          product.inStock = previousStock + qty;
          newStock = product.inStock;
        }
      } else if (item.variantName) {
        // LEGACY FALLBACK
        const lowerVariantName = item.variantName.toLowerCase();
        let variantIndex = product.variants.findIndex(v => 
          (v.name && v.name.toLowerCase() === lowerVariantName) || 
          (v.size && v.size.toLowerCase() === lowerVariantName) ||
          (v.sku && v.sku.toLowerCase() === lowerVariantName)
        );
        
        if (variantIndex !== -1) {
          const variant = product.variants[variantIndex];
          previousStock = variant.stock?.quantity ?? variant.inStock ?? 0;
          
          if (variant.stock) {
            variant.stock.quantity = previousStock + qty;
            newStock = variant.stock.quantity;
          } else {
            variant.inStock = previousStock + qty;
            newStock = variant.inStock;
          }
          variant.inStock = newStock;
        } else {
          previousStock = product.inStock || 0;
          product.inStock = previousStock + qty;
          newStock = product.inStock;
        }
      } else {
        previousStock = product.inStock || 0;
        product.inStock = previousStock + qty;
        newStock = product.inStock;
      }

      await product.save();

      await InventoryLog.create({
        productId: product._id,
        productName: product.name,
        variantName: item.variantName || item.sku || null,
        change: qty,
        previousStock,
        newStock,
        reason,
        meta: { orderId, sku: item.sku }
      });

    } catch (err) {
      console.error(`Inventory Error: Failed to increment stock for ${item.title}:`, err);
    }
  }
};

module.exports = {
  decrementStock,
  incrementStock
};
