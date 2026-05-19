const Product = require('../models/Product');
const InventoryLog = require('../models/InventoryLog');

/**
 * Finds the index of a variant in a product's variants array based on order item details.
 * @param {Object} product - The product document
 * @param {Object} item - The order item object
 * @returns {number} - The index of the matching variant or -1
 */
const findVariantIndex = (product, item) => {
  if (!product.variants || !Array.isArray(product.variants) || product.variants.length === 0) {
    return -1;
  }

  // 1. Match by variantId
  if (item.variantId) {
    const idx = product.variants.findIndex(v => v._id.toString() === item.variantId.toString());
    if (idx !== -1) return idx;
  }

  // 2. Match by SKU
  if (item.sku) {
    const idx = product.variants.findIndex(v => v.sku === item.sku);
    if (idx !== -1) return idx;
  }

  const lowerVariantName = (item.variantName || '').toLowerCase();
  const lowerColor = (item.color || '').toLowerCase();

  // 3. Match by color AND size/variantName
  if (lowerColor && lowerVariantName) {
    const idx = product.variants.findIndex(v => {
      const vColor = (v.attributes?.color || v.color || '').toLowerCase();
      const vSize = (v.attributes?.size || v.size || '').toLowerCase();
      return vColor === lowerColor && vSize === lowerVariantName;
    });
    if (idx !== -1) return idx;
  }

  // 4. Match by name/size/color fallback
  return product.variants.findIndex(v => {
    const vColor = (v.attributes?.color || v.color || '').toLowerCase();
    const vSize = (v.attributes?.size || v.size || '').toLowerCase();
    const vName = (v.name || '').toLowerCase();

    // Check if lowerVariantName matches name, size, or color
    if (lowerVariantName && (vName === lowerVariantName || vSize === lowerVariantName || vColor === lowerVariantName)) {
      return true;
    }

    // Check if lowerColor matches color or name
    if (lowerColor && (vColor === lowerColor || vName === lowerColor)) {
      return true;
    }

    return false;
  });
};

/**
 * Decrements stock for products in an order and logs the changes.
 * @param {Array} products - Array of product objects from the order
 * @param {String} orderId - The ID of the order for logging purposes
 */
const decrementStock = async (products, orderId) => {
  console.log(`Inventory: Starting stock decrement for order ${orderId}`);
  
  for (const item of products) {
    try {
      let product = await Product.findById(item.productId);
      
      // Fallback to finding by title if productId is not a valid Mongo ID
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
      let variantNameForLog = item.variantName || item.sku || 'Default';

      const variantIndex = findVariantIndex(product, item);

      if (variantIndex !== -1) {
        const variant = product.variants[variantIndex];
        previousStock = variant.stock?.quantity ?? variant.inStock ?? 0;
        newStock = Math.max(0, previousStock - qty);
        
        variantNameForLog = variant.name || variant.sku || `${variant.attributes?.color || ''} ${variant.attributes?.size || ''}`.trim() || variantNameForLog;

        // Update both new and legacy fields
        if (variant.stock) {
          variant.stock.quantity = newStock;
        }
        variant.inStock = newStock;
        
        console.log(`Inventory: Decrementing variant "${variantNameForLog}" of "${product.name}" from ${previousStock} to ${newStock}`);
      } else {
        // Fallback for non-variant products OR if no variant match found
        // IMPORTANT: If variants exist but none matched, we still update top-level 
        // but it will be overwritten by pre-save hook. We log a warning in this case.
        if (product.variants && product.variants.length > 0) {
          console.warn(`Inventory Warning: No variant match found for "${item.title}" (${item.variantName}/${item.color}) in order ${orderId}. Stock may not decrease correctly.`);
        }

        previousStock = product.inStock || 0;
        newStock = Math.max(0, previousStock - qty);
        product.inStock = newStock;
        
        console.log(`Inventory: Decrementing top-level stock of "${product.name}" from ${previousStock} to ${newStock}`);
      }

      // Mark as modified if it's a deep update that Mongoose might miss
      if (variantIndex !== -1) {
        product.markModified('variants');
      }

      await product.save();

      // Create inventory log
      await InventoryLog.create({
        productId: product._id,
        productName: product.name,
        variantName: variantNameForLog,
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
  console.log(`Inventory: Starting stock increment for order ${orderId} (Reason: ${reason})`);
  
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
      let variantNameForLog = item.variantName || item.sku || 'Default';

      const variantIndex = findVariantIndex(product, item);

      if (variantIndex !== -1) {
        const variant = product.variants[variantIndex];
        previousStock = variant.stock?.quantity ?? variant.inStock ?? 0;
        newStock = previousStock + qty;
        
        variantNameForLog = variant.name || variant.sku || `${variant.attributes?.color || ''} ${variant.attributes?.size || ''}`.trim() || variantNameForLog;

        if (variant.stock) {
          variant.stock.quantity = newStock;
        }
        variant.inStock = newStock;
        
        console.log(`Inventory: Incrementing variant "${variantNameForLog}" of "${product.name}" from ${previousStock} to ${newStock}`);
      } else {
        if (product.variants && product.variants.length > 0) {
          console.warn(`Inventory Warning: No variant match found for "${item.title}" (${item.variantName}/${item.color}) in order ${orderId}. Stock may not increase correctly.`);
        }
        
        previousStock = product.inStock || 0;
        newStock = previousStock + qty;
        product.inStock = newStock;
        
        console.log(`Inventory: Incrementing top-level stock of "${product.name}" from ${previousStock} to ${newStock}`);
      }

      if (variantIndex !== -1) {
        product.markModified('variants');
      }

      await product.save();

      await InventoryLog.create({
        productId: product._id,
        productName: product.name,
        variantName: variantNameForLog,
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
