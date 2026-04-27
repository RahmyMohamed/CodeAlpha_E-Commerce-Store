const API_BASE = 'http://localhost:3001/api';

async function apiFetch(path, options = {}) {
  const token = localStorage.getItem('token');
  const headers = { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...options.headers };
  const res = await fetch(API_BASE + path, { ...options, headers });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

const API = {
  login: (email, password) => apiFetch('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
  register: (name, email, password) => apiFetch('/auth/register', { method: 'POST', body: JSON.stringify({ name, email, password }) }),
  me: () => apiFetch('/auth/me'),
  getProducts: (params = {}) => apiFetch('/products?' + new URLSearchParams(params)),
  getProduct: (id) => apiFetch('/products/' + id),
  getCart: () => apiFetch('/cart'),
  addToCart: (productId, quantity = 1) => apiFetch('/cart', { method: 'POST', body: JSON.stringify({ productId, quantity }) }),
  updateCart: (productId, quantity) => apiFetch('/cart/' + productId, { method: 'PUT', body: JSON.stringify({ quantity }) }),
  removeFromCart: (productId) => apiFetch('/cart/' + productId, { method: 'DELETE' }),
  placeOrder: (shippingAddress, paymentMethod) => apiFetch('/orders', { method: 'POST', body: JSON.stringify({ shippingAddress, paymentMethod }) }),
  getOrders: () => apiFetch('/orders'),
  getOrder: (id) => apiFetch('/orders/' + id),
};
