/**
 * Checkout and Cart logic.
 * Aggregates selected items from LocalStorage and computes total costs including taxes and fees.
 * Captures user delivery details and finalizes the transaction securely by submitting to the 
 * backend /api/orders endpoint before redirecting to the delivery tracking page.
 */
document.addEventListener('DOMContentLoaded', () => {
    const cartItemsList = document.getElementById('cartItemsList');
    const emptyCartMessage = document.getElementById('emptyCartMessage');
    const itemTotalEl = document.getElementById('itemTotal');
    const grandTotalEl = document.getElementById('grandTotal');
    const placeOrderBtn = document.getElementById('placeOrderBtn');
    const paymentOptions = document.querySelectorAll('.payment-option');

    let cart = JSON.parse(localStorage.getItem('userCart')) || [];
    let selectedPayment = 'credit';

    const creditCardForm = document.getElementById('creditCardForm');
    const upiQRCodeForm = document.getElementById('upiQRCodeForm');
    const upiTotalAmount = document.getElementById('upiTotalAmount');

    // Pre-fill user data
    const savedName = localStorage.getItem('userName');
    const savedContact = localStorage.getItem('userContact');

    if (savedName) {
        const delName = document.getElementById('delName');
        if (delName) delName.value = savedName;
    }

    if (savedContact) {
        const delPhone = document.getElementById('delPhone');
        if (delPhone) delPhone.value = savedContact;
    }

    // Pre-fill address data
    const savedAddress = localStorage.getItem('userAddress');
    const savedArea = localStorage.getItem('userArea');
    const savedCity = localStorage.getItem('userCity');
    const savedPin = localStorage.getItem('userPin');

    if (savedAddress) {
        const delAddress = document.getElementById('delAddress');
        if (delAddress) delAddress.value = savedAddress;
    }
    if (savedArea) {
        const delArea = document.getElementById('delArea');
        if (delArea) delArea.value = savedArea;
    }
    if (savedCity) {
        const delCity = document.getElementById('delCity');
        if (delCity) delCity.value = savedCity;
    }
    if (savedPin) {
        const delPin = document.getElementById('delPin');
        if (delPin) delPin.value = savedPin;
    }

    // Payment Selection Logic
    paymentOptions.forEach(option => {
        option.addEventListener('click', () => {
            paymentOptions.forEach(opt => opt.classList.remove('selected'));
            option.classList.add('selected');
            selectedPayment = option.getAttribute('data-method');

            // Toggle forms
            if (creditCardForm) creditCardForm.style.display = selectedPayment === 'credit' ? 'block' : 'none';
            if (upiQRCodeForm) upiQRCodeForm.style.display = selectedPayment === 'upi' ? 'block' : 'none';
        });
    });

    const updateBill = () => {
        if (cart.length === 0) {
            itemTotalEl.innerText = '₹0.00';
            grandTotalEl.innerText = '₹0.00';
            return;
        }

        const total = cart.reduce((sum, item) => sum + (parseFloat(item.price) * item.qty), 0);
        itemTotalEl.innerText = `₹${total.toFixed(2)}`;

        // Delivery (2.00) + Platform (0.50)
        const grandTotal = total + 2.50;
        grandTotalEl.innerText = `₹${grandTotal.toFixed(2)}`;
        if (upiTotalAmount) upiTotalAmount.innerText = `₹${grandTotal.toFixed(2)}`;
    };

    const saveCart = () => {
        localStorage.setItem('userCart', JSON.stringify(cart));
        renderCart();
    };

    window.updateQty = (index, delta) => {
        if (cart[index]) {
            cart[index].qty += delta;
            if (cart[index].qty <= 0) {
                cart.splice(index, 1);
            }
            saveCart();
        }
    };

    const renderCart = () => {
        if (!cartItemsList) return;

        cartItemsList.innerHTML = '';
        if (cart.length === 0) {
            cartItemsList.style.display = 'none';
            emptyCartMessage.style.display = 'block';
            placeOrderBtn.disabled = true;
            placeOrderBtn.style.opacity = '0.5';
            placeOrderBtn.style.cursor = 'not-allowed';
            updateBill();
            return;
        }

        cartItemsList.style.display = 'block';
        emptyCartMessage.style.display = 'none';
        placeOrderBtn.disabled = false;
        placeOrderBtn.style.opacity = '1';
        placeOrderBtn.style.cursor = 'pointer';

        cart.forEach((item, index) => {
            const itemEl = document.createElement('div');
            itemEl.className = 'cart-item';

            itemEl.innerHTML = `
                <div class="cart-item-details">
                    <img src="${item.image || 'assets/default-product.png'}" class="cart-item-img" alt="${item.name}">
                    <div>
                        <div class="cart-item-name">${item.name}</div>
                        <div class="cart-item-store">From ${item.store}</div>
                        <div style="color: var(--accent-both); font-weight: bold; margin-top: 0.2rem;">₹${parseFloat(item.price).toFixed(2)}</div>
                    </div>
                </div>
                <div class="cart-item-actions">
                    <div class="qty-control">
                        <button class="qty-btn" onclick="updateQty(${index}, -1)">-</button>
                        <span style="padding: 0 0.8rem; font-weight: bold;">${item.qty}</span>
                        <button class="qty-btn" onclick="updateQty(${index}, 1)">+</button>
                    </div>
                    <div style="font-weight: bold; min-width: 60px; text-align: right;">₹${(parseFloat(item.price) * item.qty).toFixed(2)}</div>
                </div>
            `;
            cartItemsList.appendChild(itemEl);
        });

        updateBill();
    };

    if (placeOrderBtn) {
        placeOrderBtn.addEventListener('click', async () => {
            if (cart.length === 0) return;

            const userId = localStorage.getItem('userId');
            if (!userId) {
                alert("Please log in to place an order.");
                window.location.href = 'index.html';
                return;
            }

            // Address Validation
            const deliveryForm = document.getElementById('deliveryForm');
            if (deliveryForm && !deliveryForm.checkValidity()) {
                deliveryForm.reportValidity();
                return;
            }

            // Save address details for future autofill
            const delAddress = document.getElementById('delAddress');
            const delArea = document.getElementById('delArea');
            const delCity = document.getElementById('delCity');
            const delPin = document.getElementById('delPin');

            if (delAddress) localStorage.setItem('userAddress', delAddress.value);
            if (delArea) localStorage.setItem('userArea', delArea.value);
            if (delCity) localStorage.setItem('userCity', delCity.value);
            if (delPin) localStorage.setItem('userPin', delPin.value);

            // Store a combined summary for the profile page
            if (delAddress && delArea && delCity) {
                localStorage.setItem('lastSavedAddress', `${delAddress.value}, ${delArea.value}, ${delCity.value}`);
            }

            // Create success overlay
            const overlay = document.createElement('div');
            overlay.style.cssText = `
                position: fixed; top: 0; left: 0; width: 100%; height: 100%;
                background: rgba(0,0,0,0.8); backdrop-filter: blur(5px);
                z-index: 9999; display: flex; flex-direction: column;
                justify-content: center; align-items: center; color: white;
            `;

            const methodText = {
                'credit': 'Credit/Debit Card',
                'upi': 'UPI/Digital Wallet',
                'cod': 'Cash on Delivery'
            }[selectedPayment];

            overlay.innerHTML = `
                <div style="font-size: 4rem; margin-bottom: 1rem;">✅</div>
                <h2 style="margin-bottom: 0.5rem;">Order Placed Successfully!</h2>
                <p style="color: var(--text-secondary); margin-bottom: 2rem;">Paid via ${methodText}</p>
                <div class="spinner" style="width: 40px; height: 40px; border: 4px solid rgba(255,255,255,0.1); border-top-color: var(--accent-both); border-radius: 50%; animation: spin 1s linear infinite;"></div>
            `;

            document.head.insertAdjacentHTML('beforeend', '<style>@keyframes spin { 100% { transform: rotate(360deg); } }</style>');
            document.body.appendChild(overlay);

            // Save to Order History via API
            const total = cart.reduce((sum, item) => sum + (parseFloat(item.price) * item.qty), 0);
            const grandTotal = total + 2.50; // Add delivery + platform base fee

            // Prepare payload for backend
            const payload = {
                user_id: userId,
                total: grandTotal.toFixed(2),
                method: methodText,
                items: cart
            };

            try {
                const response = await fetch('http://localhost:5000/api/orders', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });

                if (response.ok) {
                    const data = await response.json();

                    // Keep a copy in localStorage for immediate frontend use without re-fetching
                    let history = JSON.parse(localStorage.getItem('orderHistory')) || [];
                    history.unshift({
                        id: data.order_id,
                        date: new Date().toLocaleDateString(),
                        items: cart,
                        total: grandTotal.toFixed(2),
                        method: methodText
                    });
                    localStorage.setItem('orderHistory', JSON.stringify(history));

                    // Clear cart and redirect
                    localStorage.setItem('userCart', JSON.stringify([]));

                    setTimeout(() => {
                        window.location.href = 'delivery.html';
                    }, 2500);
                } else {
                    alert('Order could not be processed right now. Please try again.');
                    overlay.remove();
                }
            } catch (error) {
                console.error("Order processing error:", error);
                alert("Failed to connect to backend server.");
                overlay.remove();
            }
        });
    }

    renderCart();
});
