// ─── MONKEY MOG — FIREBASE DATABASE LAYER ─────────────────────────────────────
// All pages include this file. It handles all reads/writes to Firebase.
// Firebase URL
var FB = 'https://shesfit-default-rtdb.firebaseio.com';

// ── GENERIC HELPERS ──
function fbGet(path, cb) {
  fetch(FB + path + '.json')
    .then(function(r){ return r.json(); })
    .then(function(d){ cb(null, d); })
    .catch(function(e){ cb(e, null); });
}
function fbSet(path, data, cb) {
  fetch(FB + path + '.json', {
    method: 'PUT',
    headers: {'Content-Type':'application/json'},
    body: JSON.stringify(data)
  }).then(function(r){ return r.json(); })
    .then(function(d){ if(cb) cb(null,d); })
    .catch(function(e){ if(cb) cb(e,null); });
}
function fbPatch(path, data, cb) {
  fetch(FB + path + '.json', {
    method: 'PATCH',
    headers: {'Content-Type':'application/json'},
    body: JSON.stringify(data)
  }).then(function(r){ return r.json(); })
    .then(function(d){ if(cb) cb(null,d); })
    .catch(function(e){ if(cb) cb(e,null); });
}
function fbPush(path, data, cb) {
  fetch(FB + path + '.json', {
    method: 'POST',
    headers: {'Content-Type':'application/json'},
    body: JSON.stringify(data)
  }).then(function(r){ return r.json(); })
    .then(function(d){ if(cb) cb(null,d); })
    .catch(function(e){ if(cb) cb(e,null); });
}
function fbDelete(path, cb) {
  fetch(FB + path + '.json', { method: 'DELETE' })
    .then(function(){ if(cb) cb(null); })
    .catch(function(e){ if(cb) cb(e); });
}

// ── PRODUCTS ──
function getProducts(cb) {
  fbGet('/products', function(err, data) {
    if (err || !data) { cb([]); return; }
    var arr = Object.keys(data).map(function(k){ return data[k]; });
    arr = arr.filter(function(p){ return p !== null && p !== undefined && p.id; });
    arr.sort(function(a,b){ return a.id - b.id; });
    cb(arr);
  });
}
function saveProduct(product, cb) {
  fbSet('/products/' + product.id, product, cb);
}
function deleteProduct(id, cb) {
  fbDelete('/products/' + id, cb);
}
function depleteStock(cartItems, cb) {
  // Read current products, subtract qty, write back
  getProducts(function(products) {
    var updates = {};
    cartItems.forEach(function(item) {
      var p = products.find(function(x){ return x.id === item.id; });
      if (p) {
        var newStock = Math.max(0, (p.stock || 0) - item.qty);
        updates[item.id + '/stock'] = newStock;
      }
    });
    if (Object.keys(updates).length) {
      fbPatch('/products', updates, cb);
    } else {
      if (cb) cb(null);
    }
  });
}

// ── ORDERS ──
function saveOrder(order, cb) {
  fbPush('/orders', order, cb);
}
function getOrders(cb) {
  fbGet('/orders', function(err, data) {
    if (err || !data) { cb([]); return; }
    var arr = Object.keys(data).map(function(k){
      return Object.assign({}, data[k], {_key: k});
    });
    arr.sort(function(a,b){ return new Date(b.date) - new Date(a.date); });
    cb(arr);
  });
}

// ── CART (stays in localStorage — it's per-user by design) ──
function getCart() { return JSON.parse(localStorage.getItem('sf_cart') || '[]'); }
function saveCart(c) {
  localStorage.setItem('sf_cart', JSON.stringify(c));
  updateCartCount();
}
function updateCartCount() {
  var el = document.getElementById('cart-count');
  if (!el) return;
  var total = getCart().reduce(function(s,i){ return s + i.qty; }, 0);
  el.textContent = total;
}
function addToCart(id, name, price, emoji, image, stock) {
  if (stock <= 0) { showToast('Sorry — out of stock.'); return; }
  var cart = getCart();
  var ex = cart.find(function(i){ return i.id === id; });
  if (ex) {
    if (ex.qty >= stock) { showToast('Only ' + stock + ' in stock!'); return; }
    ex.qty++;
  } else {
    cart.push({ id:id, name:name, price:price, emoji:emoji, image:image||'', qty:1 });
  }
  saveCart(cart);
  showToast(name + ' added to cart!');
}

// ── REVIEWS ──
function getReviews(cb) {
  fbGet('/reviews', function(err, data) {
    if (err || !data) { cb([]); return; }
    var arr = Object.keys(data).map(function(k){
      return Object.assign({}, data[k], {_key: k});
    });
    arr.sort(function(a,b){ return new Date(b.date||0) - new Date(a.date||0); });
    cb(arr);
  });
}
function getPendingReviews(cb) {
  fbGet('/reviews_pending', function(err, data) {
    if (err || !data) { cb([]); return; }
    var arr = Object.keys(data).map(function(k){
      return Object.assign({}, data[k], {_key: k});
    });
    cb(arr);
  });
}
function submitReviewPending(review, cb) {
  review.date = new Date().toISOString();
  fbPush('/reviews_pending', review, cb);
}
function approveReview(key, review, cb) {
  fbDelete('/reviews_pending/' + key, function() {
    review.approved = true;
    review.date = review.date || new Date().toISOString();
    fbPush('/reviews', review, cb);
  });
}
function deletePendingReview(key, cb) {
  fbDelete('/reviews_pending/' + key, cb);
}
function deleteApprovedReview(key, cb) {
  fbDelete('/reviews/' + key, cb);
}

// ── SETTINGS (custom message, carousel) ──
function getSettings(cb) {
  fbGet('/settings', function(err, data) {
    cb(data || {});
  });
}
function saveSetting(key, value, cb) {
  var update = {};
  update[key] = value;
  fbPatch('/settings', update, cb);
}
function getCarouselIds(cb) {
  fbGet('/settings/carousel_ids', function(err, data) {
    cb(data || null);
  });
}
function saveCarouselIds(ids, cb) {
  fbSet('/settings/carousel_ids', ids, cb);
}

// ── COAs ──
function getCOAs(cb) {
  fbGet('/coas', function(err, data) {
    if (err || !data) { cb([]); return; }
    var arr = Object.keys(data).map(function(k){
      return Object.assign({}, data[k], {_key: k});
    });
    arr.sort(function(a,b){ return new Date(b.date||0) - new Date(a.date||0); });
    cb(arr);
  });
}
function saveCOA(coa, cb) { fbPush('/coas', coa, cb); }
function updateCOA(key, data, cb) { fbPatch('/coas/' + key, data, cb); }
function deleteCOA(key, cb) { fbDelete('/coas/' + key, cb); }

// ── ORDER NUMBER ──
function generateOrderNumber() {
  var chars = '0123456789abcdefghijklmnopqrstuvwxyz';
  var r = '#';
  for (var i = 0; i < 4; i++) r += chars[Math.floor(Math.random() * chars.length)];
  return r;
}

// ── AGE GATE ──
function initAgeGate() {
  if (sessionStorage.getItem('sf_age_verified') === '1') {
    var g = document.getElementById('age-gate');
    if (g) g.style.display = 'none';
  }
}
function ageGateConfirm() {
  sessionStorage.setItem('sf_age_verified','1');
  var g = document.getElementById('age-gate');
  g.classList.add('hidden');
  setTimeout(function(){ g.style.display='none'; }, 400);
}
function ageGateDeny() { window.location.href = 'https://www.google.com'; }

// ── TOAST ──
function showToast(msg) {
  var t = document.getElementById('toast');
  if (!t) return;
  t.textContent = msg; t.classList.add('show');
  setTimeout(function(){ t.classList.remove('show'); }, 2800);
}

// ── PRODUCT THUMB ──
function productThumb(p, h) {
  if (p.image && p.image.trim()) {
    return '<img src="'+p.image+'" alt="'+p.name+'" style="width:100%;height:'+h+';object-fit:cover;" onerror="this.style.display=\'none\';this.nextSibling.style.display=\'flex\';">'
      + '<div style="display:none;width:100%;height:'+h+';align-items:center;justify-content:center;font-size:4rem;">'+p.emoji+'</div>';
  }
  return p.emoji;
}
