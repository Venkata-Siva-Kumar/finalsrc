const getPrintHtml = (order, productMap) => {
  // Helper to pad or trim text for columns
  const pad = (str, len) => (str + ' '.repeat(len)).slice(0, len);

  let html = `
<pre style="font-family: monospace; font-size: 13px;">
<b style="display:block; font-size: 25px; margin-left:40px;">Sambasiva GS</b>
----------------------------------------------

GSTIN: 37APAPC5371F1Z7

----------------------------------------------
BACK BIDE OF RTC BUSTAND
BADVEL, ANDHRA PRADESH 516227
Phone: +91-94409 47676
----------------------------------------------
        <b>Order Invoice</b>

<b>Order ID</b> : ${order.orderId}
<b>Date</b>     : ${order.orderDate ? new Date(order.orderDate).toLocaleString() : 'N/A'}
<b>User</b>     : ${order.userMobile}

----------------------------------------------
<b>${pad('Item', 18)}${pad('Qty', 8)}${pad('Rate', 10)}${pad('Value', 15)}</b>
----------------------------------------------
`;

  // Products
  if (order.items && order.items.length > 0) {
    order.items.forEach(prod => {
      const price = Number(prod.price); // Convert to number
      const name = pad(prod.name || productMap[prod.product_id || prod.productId || prod.id] || 'Unknown', 18);
      const qty = pad(prod.quantity.toString(), 8);
      const rate = pad('₹' + price.toFixed(2), 10);
      const value = pad('₹' + (price * prod.quantity).toFixed(2), 15);
      html += `${name}${qty}${rate}${value}\n`;
    });
  } else {
    html += 'No products in this order.\n';
  }

  html += `----------------------------------------------
<b>Items</b>: ${order.items ? order.items.length : 0}    <b>Qty</b>: ${order.items ? order.items.reduce((sum, item) => sum + Number(item.quantity), 0) : 0}       <b>Total</b>   : ₹${Number(order.totalAmount).toFixed(2)}
----------------------------------------------

<b>Address:</b>
${order.deliveryAddress && typeof order.deliveryAddress === 'object' && !Array.isArray(order.deliveryAddress)
    ? `
  <b>Name</b>    : ${order.deliveryAddress.name || ''}
  <b>Mobile</b>  : ${order.deliveryAddress.mobile || ''}
  <b>Flat No</b> : ${order.deliveryAddress.address || ''}
  <b>Locality</b>: ${order.deliveryAddress.locality || ''}
  <b>City</b>    : ${order.deliveryAddress.city || ''}
  <b>State</b>   : ${order.deliveryAddress.state || ''}
  <b>Pincode</b> : ${order.deliveryAddress.pincode || ''}
  <b>Landmark</b>: ${order.deliveryAddress.landmark || ''}
  
  `
    : 'No delivery address provided.'}
----------------------------------------
This is computer generated invoice.

----------------------------------------
<b>Thank you for shopping with us!</b>
</pre>
  `;

  return html;
};

export default getPrintHtml;