let cartData = { items: [] };

async function loadCart() {
  if (!currentUser) { cartData = { items: [] }; updateCartCount(); return; }
  try { cartData = await API.getCart(); updateCartCount(); } catch (e) { cartData = { items: [] }; }
}

function updateCartCount() {
  const count = (cartData.items || []).reduce((s, i) => s + i.quantity, 0);
  document.getElementById('cartCount').textContent = count;
}

async function addToCart(productId, qty = 1) {
  if (!currentUser) { showToast('Please sign in to add to cart'); toggleAuthModal(); return; }
  try {
    cartData = await API.addToCart(productId, qty);
    updateCartCount();
    showToast('Added to cart!', 'success');
  } catch (e) { showToast(e.message, 'error'); }
}

function renderCart() {
  const items = cartData.items || [];
  const cartItemsEl = document.getElementById('cartItems');
  const cartSummaryEl = document.getElementById('cartSummary');

  if (!currentUser) {
    cartItemsEl.innerHTML = `<div class="empty-cart"><div class="empty-icon">🛍</div><h3>Sign in to view your cart</h3><button class="btn-primary" onclick="toggleAuthModal()" style="margin-top:16px">Sign In</button></div>`;
    cartSummaryEl.innerHTML = '';
    return;
  }

  if (!items.length) {
    cartItemsEl.innerHTML = `<div class="empty-cart"><div class="empty-icon">🛒</div><h3>Your cart is empty</h3><p>Discover our amazing products</p><button class="btn-primary" onclick="navigate('home')" style="margin-top:16px">Shop Now</button></div>`;
    cartSummaryEl.innerHTML = '';
    return;
  }

  cartItemsEl.innerHTML = items.map(item => `
    <div class="cart-item">
      <img class="cart-item-img" src="${item.image}" alt="${item.name}" />
      <div class="cart-item-info">
        <div class="cart-item-name">${item.name}</div>
        <div class="cart-item-price">$${item.price.toFixed(2)}</div>
        <div class="cart-item-qty">
          <button class="qty-btn" onclick="changeCartQty('${item.productId}', ${item.quantity - 1})">−</button>
          <span class="qty-val">${item.quantity}</span>
          <button class="qty-btn" onclick="changeCartQty('${item.productId}', ${item.quantity + 1})">+</button>
        </div>
      </div>
      <div>
        <div class="cart-item-total">$${(item.price * item.quantity).toFixed(2)}</div>
        <button class="remove-btn" onclick="removeFromCart('${item.productId}')">🗑</button>
      </div>
    </div>`).join('');

  const subtotal = items.reduce((s, i) => s + i.price * i.quantity, 0);
  const shipping = subtotal > 200 ? 0 : 9.99;
  const tax = subtotal * 0.08;
  const total = subtotal + shipping + tax;

  cartSummaryEl.innerHTML = `
    <h3>Order Summary</h3>
    <div class="summary-row"><span>Subtotal</span><span>$${subtotal.toFixed(2)}</span></div>
    <div class="summary-row"><span>Shipping</span><span>${shipping === 0 ? '<span style="color:var(--green)">Free</span>' : '$' + shipping.toFixed(2)}</span></div>
    <div class="summary-row"><span>Tax (8%)</span><span>$${tax.toFixed(2)}</span></div>
    <div class="summary-row total"><span>Total</span><span>$${total.toFixed(2)}</span></div>
    <button class="btn-primary full" onclick="navigate('checkout')" style="margin-top:20px">Proceed to Checkout</button>
    <button class="btn-ghost full" onclick="navigate('home')" style="margin-top:10px">Continue Shopping</button>`;
}

async function changeCartQty(productId, qty) {
  if (qty <= 0) { removeFromCart(productId); return; }
  try { cartData = await API.updateCart(productId, qty); updateCartCount(); renderCart(); } catch (e) { showToast(e.message, 'error'); }
}
async function removeFromCart(productId) {
  try { cartData = await API.removeFromCart(productId); updateCartCount(); renderCart(); showToast('Item removed'); } catch (e) { showToast(e.message, 'error'); }
}

function renderCheckout() {
  const items = cartData.items || [];
  if (!items.length) { navigate('cart'); return; }
  const subtotal = items.reduce((s, i) => s + i.price * i.quantity, 0);
  const shipping = subtotal > 200 ? 0 : 9.99;
  const tax = subtotal * 0.08;
  const total = subtotal + shipping + tax;

  document.getElementById('checkoutSummary').innerHTML = `
    <h3>Order Summary</h3>
    ${items.map(i => `<div class="checkout-item">
      <img src="${i.image}" alt="${i.name}" />
      <div class="checkout-item-info"><div class="checkout-item-name">${i.name}</div><div class="checkout-item-price">Qty: ${i.quantity}</div></div>
      <div style="font-weight:700">$${(i.price * i.quantity).toFixed(2)}</div>
    </div>`).join('')}
    <hr style="border-color:var(--border);margin:16px 0"/>
    <div class="summary-row"><span>Subtotal</span><span>$${subtotal.toFixed(2)}</span></div>
    <div class="summary-row"><span>Shipping</span><span>${shipping === 0 ? 'Free' : '$' + shipping.toFixed(2)}</span></div>
    <div class="summary-row"><span>Tax</span><span>$${tax.toFixed(2)}</span></div>
    <div class="summary-row total"><span>Total</span><span>$${total.toFixed(2)}</span></div>
    <button class="btn-primary full" onclick="submitOrder()" style="margin-top:20px">Place Order</button>`;
}

async function submitOrder() {
  const firstName = document.getElementById('firstName').value;
  const lastName = document.getElementById('lastName').value;
  const address = document.getElementById('address').value;
  const city = document.getElementById('city').value;
  const zip = document.getElementById('zip').value;
  const country = document.getElementById('country').value;
  if (!firstName || !address || !city || !zip || !country) { showToast('Please fill in all shipping details', 'error'); return; }
  const payment = document.querySelector('input[name="payment"]:checked')?.value || 'card';
  const shippingAddress = `${firstName} ${lastName}, ${address}, ${city} ${zip}, ${country}`;
  try {
    const order = await API.placeOrder(shippingAddress, payment);
    cartData = { items: [] };
    updateCartCount();
    document.getElementById('successMsg').textContent = `Order #${order._id.slice(0, 8).toUpperCase()} confirmed! Estimated delivery: ${new Date(order.estimatedDelivery).toLocaleDateString()}`;
    document.getElementById('successTrack').textContent = `Tracking: ${order.trackingNumber}`;
    document.getElementById('successModal').style.display = 'flex';
  } catch (e) { showToast(e.message, 'error'); }
}

function closeSuccessModal() {
  document.getElementById('successModal').style.display = 'none';
  navigate('home');
}
