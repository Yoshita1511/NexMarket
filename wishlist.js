document.addEventListener('DOMContentLoaded', async () => {
    const wishlistGrid = document.getElementById('wishlistGrid');
    const emptyState = document.getElementById('emptyWishlistState');

    const userId = localStorage.getItem('userId');

    const renderWishlist = async () => {
        if (!userId) {
            wishlistGrid.style.display = 'none';
            emptyState.style.display = 'block';
            return;
        }

        try {
            const response = await fetch(`http://localhost:5000/api/users/${userId}/wishlist`);
            const wishlist = await response.json();

            if (wishlist.length === 0) {
                wishlistGrid.style.display = 'none';
                emptyState.style.display = 'block';
                return;
            }

            wishlistGrid.style.display = 'grid';
            emptyState.style.display = 'none';
            wishlistGrid.innerHTML = '';

            wishlist.forEach((item, index) => {
                const safeVendorName = item.store_name.replace(/'/g, "\\'");
                const safeProductName = item.product_name.replace(/'/g, "\\'");
                const safeImage = item.image || 'assets/default-product.png';

                const card = document.createElement('div');
                card.className = 'wishlist-item-card';
                card.innerHTML = `
                    <button class="remove-wishlist-btn" onclick="removeFromWishlist('${safeProductName}', '${safeVendorName}')" title="Remove from wishlist">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <line x1="18" y1="6" x2="6" y2="18"></line>
                            <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                    </button>
                    <img src="${safeImage}" alt="${safeProductName}" class="wishlist-item-img">
                    <div class="wishlist-item-info">
                        <h4 class="wishlist-item-name">${item.product_name}</h4>
                        <div class="wishlist-store-name">from ${item.store_name}</div>
                        <div style="flex: 1;"></div>
                        <div class="wishlist-item-price">₹${item.price}</div>
                        <button class="btn btn-both" style="width: 100%;" onclick="moveToCart('${safeProductName}', '${item.price}', '${safeImage}', '${safeVendorName}', ${index})">Add to Cart</button>
                    </div>
                `;
                wishlistGrid.appendChild(card);
            });
        } catch (error) {
            console.error("Failed to load wishlist:", error);
        }
    };

    window.removeFromWishlist = async (productName, storeName) => {
        if (!userId) return;
        try {
            await fetch(`http://localhost:5000/api/users/${userId}/wishlist?name=${encodeURIComponent(productName)}&store=${encodeURIComponent(storeName)}`, {
                method: 'DELETE'
            });
            renderWishlist();
        } catch (error) {
            console.error("Failed to remove from wishlist:", error);
        }
    };

    window.moveToCart = (productName, productPrice, productImage, storeName, index) => {
        let cart = JSON.parse(localStorage.getItem('userCart')) || [];
        const existingIndex = cart.findIndex(item => item.name === productName && item.store === storeName);

        if (existingIndex > -1) {
            cart[existingIndex].qty += 1;
        } else {
            cart.push({
                name: productName,
                price: productPrice,
                image: productImage,
                store: storeName,
                qty: 1
            });
        }
        localStorage.setItem('userCart', JSON.stringify(cart));

        // Optional: remove from wishlist once added to cart OR keep it there. Most wishlists keep it until manually removed.
        // We will keep it in the wishlist but show an alert/toast
        alert(`${productName} added to your cart!`);
    };

    // Initial render
    renderWishlist();
});
