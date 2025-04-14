const calculateOrderTotals = (items, shippingCost = 0, taxRate = 0.1) => {
  // Calculate subtotal from items
  const subtotal = items.reduce((sum, item) => {
    return sum + (item.price * item.quantity);
  }, 0);

  // Calculate tax
  const tax = subtotal * taxRate;

  // Calculate total
  const total = subtotal + tax + shippingCost;

  return {
    subtotal: Number(subtotal.toFixed(2)),
    tax: Number(tax.toFixed(2)),
    shipping: Number(shippingCost.toFixed(2)),
    total: Number(total.toFixed(2))
  };
};

module.exports = {
  calculateOrderTotals
}; 