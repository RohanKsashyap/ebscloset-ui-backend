/**
 * Generates a unique SKU for a product variant
 * Format: PRODUCTNAME-COLOR-SIZE
 * @param {string} productName - The name of the product
 * @param {string} color - The color attribute
 * @param {string} size - The size attribute
 * @returns {string} - The generated SKU
 */
const generateSKU = (productName, color = '', size = '') => {
  const clean = (str) => {
    if (!str) return '';
    return str
      .toString()
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, '')
      .trim();
  };

  const namePart = clean(productName);
  const colorPart = clean(color);
  const sizePart = clean(size);

  let sku = namePart;
  if (colorPart) sku += `-${colorPart}`;
  if (sizePart) sku += `-${sizePart}`;

  return sku;
};

module.exports = { generateSKU };
