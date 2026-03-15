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

      if (item.variantName) {
        const variantIndex = product.variants.findIndex(v => v.name === item.variantName);
        if (variantIndex !== -1) {
          previousStock = product.variants[variantIndex].inStock || 0;
          product.variants[variantIndex].inStock = Math.max(0, previousStock - qty);
          newStock = product.variants[variantIndex].inStock;
        } else {
          console.error(`Inventory Error: Variant not found for ${product.name}: ${item.variantName}`);
          continue;
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
        variantName: item.variantName || null,
        change: -qty,
        previousStock,
        newStock,
        reason: 'order-placed',
        meta: { orderId }
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

      if (item.variantName) {
        const variantIndex = product.variants.findIndex(v => v.name === item.variantName);
        if (variantIndex !== -1) {
          previousStock = product.variants[variantIndex].inStock || 0;
          product.variants[variantIndex].inStock = previousStock + qty;
          newStock = product.variants[variantIndex].inStock;
        } else {
          console.error(`Inventory Error: Variant not found for ${product.name}: ${item.variantName}`);
          continue;
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
        variantName: item.variantName || null,
        change: qty,
        previousStock,
        newStock,
        reason,
        meta: { orderId }
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
