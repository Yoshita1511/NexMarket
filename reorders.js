document.addEventListener('DOMContentLoaded', async () => {
    const reordersContainer = document.getElementById('reordersContainer');

    const userId = localStorage.getItem('userId');

    const renderOrders = async () => {
        let orderHistory = [];

        if (userId) {
            try {
                const response = await fetch(`http://localhost:5000/api/users/${userId}/orders`);
                if (response.ok) {
                    orderHistory = await response.json();
                } else {
                    orderHistory = JSON.parse(localStorage.getItem('orderHistory')) || [];
                }
            } catch (error) {
                console.error("Failed to fetch order history:", error);
                orderHistory = JSON.parse(localStorage.getItem('orderHistory')) || [];
            }
        } else {
            orderHistory = JSON.parse(localStorage.getItem('orderHistory')) || [];
        }

        if (orderHistory.length === 0) {
            reordersContainer.innerHTML = `
                <div class="empty-history">
                    <div style="font-size: 3rem; margin-bottom: 1rem;">🛍️</div>
                    <p style="font-size: 1.2rem; color: white; margin-bottom: 0.5rem;">No past orders found.</p>
                    <p>When you place an order, it will appear here for easy reordering.</p>
                </div>
            `;
            return;
        }

        reordersContainer.innerHTML = '';

        orderHistory.forEach(order => {
            const orderEl = document.createElement('div');
            orderEl.className = 'order-card';

            const itemsHTML = (order.items || []).map(item => `
                <div class="order-item-row">
                    <div class="order-item-details">
                        <img src="${item.image || 'assets/default-product.png'}" alt="Item" class="order-item-img">
                        <div>
                            <div class="order-item-name">${item.name}</div>
                            <div class="order-item-qty">Qty: ${item.qty} • From ${item.store}</div>
                        </div>
                    </div>
                    <div style="font-weight: 600;">₹${(parseFloat(item.price) * item.qty).toFixed(2)}</div>
                </div>
            `).join('');

            // Serialize order items safely to pass to reorder function
            const safeItemsJson = JSON.stringify(order.items || []).replace(/"/g, '&quot;');

            orderEl.innerHTML = `
                <div class="order-header">
                    <div class="order-meta">
                        <div><strong>Order ID:</strong> ${order.id || 'N/A'}</div>
                        <div><strong>Placed On:</strong> ${order.date || 'N/A'}</div>
                        <div><strong>Paid Via:</strong> ${order.method || 'Credit Card'}</div>
                    </div>
                    <div class="order-actions">
                        <div class="order-total">₹${order.total || '0.00'}</div>
                        <button class="btn btn-customer" style="padding: 0.6rem 1.2rem; font-size: 0.9rem;" onclick="reorderItems('${safeItemsJson}')">Refresh Cart</button>
                    </div>
                </div>
                <!-- Items Box -->
                <div class="order-items" style="background: rgba(0,0,0,0.2); border-radius: 12px; padding: 1.5rem;">
                    ${itemsHTML}
                </div>
            `;

            reordersContainer.appendChild(orderEl);
        });
    };

    // Global reorder function to merge order into current cart
    window.reorderItems = (itemsJson) => {
        try {
            const itemsToAdd = JSON.parse(itemsJson);
            if (!itemsToAdd || itemsToAdd.length === 0) return;

            let currentCart = JSON.parse(localStorage.getItem('userCart')) || [];

            itemsToAdd.forEach(pastItem => {
                const existingIndex = currentCart.findIndex(item => item.name === pastItem.name && item.store === pastItem.store);
                if (existingIndex > -1) {
                    currentCart[existingIndex].qty += pastItem.qty;
                } else {
                    currentCart.push({ ...pastItem });
                }
            });

            localStorage.setItem('userCart', JSON.stringify(currentCart));

            // Redirect to cart
            window.location.href = 'cart.html';
        } catch (e) {
            console.error('Failed to parse reorder items', e);
        }
    };

    renderOrders();
});
