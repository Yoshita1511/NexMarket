/**
 * Customer Discovery mechanics.
 * Dynamically fetches vendors by city, powers Swiggy-like horizontal scrolling category filters,
 * tracks wishlist state against the backend /api/users/<id>/wishlist, and 
 * manages the global shopping cart state using LocalStorage.
 */
document.addEventListener('DOMContentLoaded', () => {
    // Check if user is 'both'
    const userRole = localStorage.getItem('userRole');
    if (userRole === 'both') {
        const switchLink = document.getElementById('switchToVendor');
        if (switchLink) switchLink.style.display = 'inline-block';
    }

    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            ['userId', 'userRole', 'userName', 'userContact', 'myStore', 'myItems', 'vendorStores'].forEach(k => localStorage.removeItem(k));
            window.location.href = 'index.html';
        });
    }

    const searchForm = document.getElementById('searchForm');
    const searchCity = document.getElementById('searchCity');
    const vendorResults = document.getElementById('vendorResults');
    const resultsTitle = document.getElementById('resultsTitle');
    const topBrandsResults = document.getElementById('topBrandsResults');
    const topBrandsSection = document.getElementById('topBrandsSection');

    // Category elements
    const categoryCircles = document.querySelectorAll('.category-circle');
    let currentCategory = 'all';
    let lastSearchedCity = 'delhi';

    // Modal elements
    const storeModal = document.getElementById('storeModal');
    const closeStoreModal = document.getElementById('closeStoreModal');
    const modalStoreName = document.getElementById('modalStoreName');
    const modalStoreDesc = document.getElementById('modalStoreDesc');
    const modalProductsGrid = document.getElementById('modalProductsGrid');

    // Location Header Update
    const locationTitle = document.querySelector('.location-title');
    const locationDesc = document.querySelector('.location-desc');
    const locationHeader = document.querySelector('.location-header');

    // Profile Dropdown
    const profileDropdownWrapper = document.getElementById('profileDropdownWrapper');
    const profileBtn = document.getElementById('profileBtn');

    if (profileBtn && profileDropdownWrapper) {
        profileBtn.addEventListener('click', (e) => {
            e.preventDefault();
            profileDropdownWrapper.classList.toggle('show');
        });
    }

    // Location Modal
    const locationModal = document.getElementById('locationModal');
    const closeLocationModal = document.getElementById('closeLocationModal');
    const locationSearchForm = document.getElementById('locationSearchForm');
    const locationInput = document.getElementById('locationInput');

    if (locationHeader && locationModal) {
        locationHeader.addEventListener('click', () => {
            locationModal.style.display = 'flex';
            setTimeout(() => locationModal.classList.add('show'), 10);
        });
    }

    if (closeLocationModal) {
        closeLocationModal.addEventListener('click', () => {
            locationModal.classList.remove('show');
            setTimeout(() => locationModal.style.display = 'none', 300);
        });
    }

    if (locationSearchForm) {
        locationSearchForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const val = locationInput.value.toLowerCase().trim();
            if (val) {
                lastSearchedCity = val;

                // Update Location Header visually
                if (locationTitle) locationTitle.innerText = val.charAt(0).toUpperCase() + val.slice(1);
                if (locationDesc) locationDesc.innerHTML = `${val.charAt(0).toUpperCase() + val.slice(1)}, India <span class="dropdown-arrow">▼</span>`;

                // Reset category UI to all
                categoryCircles.forEach(c => c.classList.remove('active'));
                const allCircle = document.querySelector('.category-circle[data-category="all"]');
                if (allCircle) allCircle.classList.add('active');
                currentCategory = 'all';

                resultsTitle.innerText = `Stores to explore`;
                window.fetchCityVendors(val);

                // Close Modal
                locationModal.classList.remove('show');
                setTimeout(() => locationModal.style.display = 'none', 300);
            }
        });
    }

    // Mock Database for Delhi
    const demoVendors = [
        {
            id: 'v1', name: "Joe's Burgers", category: "food", city: "delhi", desc: "Best artisanal burgers in town.", image: "assets/vendor-doodle.png", isPremium: true, products: [
                { name: "Classic Cheeseburger", price: "4.50", image: "assets/default-product.png" },
                { name: "Fries", price: "2.20", image: "assets/default-product.png" }
            ]
        },
        {
            id: 'v2', name: "Spice Route", category: "grocery", city: "delhi", desc: "Authentic Indian spices and herbs.", image: "assets/vendor-doodle.png", isPremium: false, products: [
                { name: "Turmeric Powder", price: "2.50", image: "assets/default-product.png" },
                { name: "Red Chili Powder", price: "3.50", image: "assets/default-product.png" }
            ]
        },
        {
            id: 'v3', name: "Green Valley Farms", category: "vegetables", city: "delhi", desc: "Fresh organic vegetables.", image: "assets/vendor-doodle.png", isPremium: true, products: [
                { name: "Organic Spinach", price: "4.00", image: "assets/default-product.png" },
                { name: "Tomatoes", price: "2.50", image: "assets/default-product.png" }
            ]
        },
        { id: 'v4', name: "Tech Haven", category: "electronics", city: "delhi", desc: "Latest gadgets.", image: "assets/vendor-doodle.png", isPremium: true, products: [] },
        { id: 'v5', name: "Delhi Bookhouse", category: "other", city: "delhi", desc: "Rare editions and modern classics.", image: "assets/vendor-doodle.png", isPremium: false, products: [] },
        { id: 'v6', name: "Fruit Oasis", category: "fruits", city: "delhi", desc: "Fresh seasonal fruits.", image: "assets/vendor-doodle.png", isPremium: false, products: [] },
        { id: 'v7', name: "Urban Fashion", category: "clothing", city: "delhi", desc: "Trendy apparel.", image: "assets/vendor-doodle.png", isPremium: true, products: [] },
        { id: 'v8', name: "Mama's Kitchen", category: "food", city: "delhi", desc: "Home cooked meals.", image: "assets/vendor-doodle.png", isPremium: false, products: [] },
    ];

    let currentCityVendors = [...demoVendors];
    let currentStoreContext = null;

    window.fetchCityVendors = async (city) => {
        try {
            const response = await fetch(`http://localhost:5000/api/stores?city=${city}`);
            const data = await response.json();

            // Map the API data structure back to what the frontend expects
            const apiStores = data.map(store => ({
                id: store.id,
                name: store.name,
                category: store.category,
                city: store.city,
                desc: store.desc,
                image: store.image,
                isPremium: store.is_premium === 1,
                products: store.items || []
            }));

            // Merge demo stores for this city with live API stores
            const demoForCity = demoVendors.filter(v => v.city.toLowerCase() === city.toLowerCase());
            currentCityVendors = [...demoForCity, ...apiStores];

            // Fetch User's Wishlist to keep UI Hearts in sync
            const userId = localStorage.getItem('userId');
            if (userId) {
                try {
                    const wRes = await fetch(`http://localhost:5000/api/users/${userId}/wishlist`);
                    if (wRes.ok) {
                        const wData = await wRes.json();
                        // store as {name, store} array locally to sync heart colors instantly
                        const mappedWishlist = wData.map(w => ({ name: w.product_name, store: w.store_name }));
                        localStorage.setItem('userWishlist', JSON.stringify(mappedWishlist));
                    }
                } catch (e) { console.error("Wishlist sync failed", e); }
            }

            filterAndRender();
        } catch (e) {
            console.error("Failed to fetch stores from backend:", e);
            // Fallback to just demo data if backend fails
            currentCityVendors = demoVendors.filter(v => v.city.toLowerCase() === city.toLowerCase());
            filterAndRender();
        }
    };

    const renderStoreProducts = () => {
        if (!currentStoreContext) return;
        const { vendor, products } = currentStoreContext;

        modalProductsGrid.innerHTML = '';

        if (products.length === 0) {
            modalProductsGrid.innerHTML = '<div class="empty-products">Store currently has no products listed.</div>';
            return;
        }

        let cart = JSON.parse(localStorage.getItem('userCart')) || [];

        products.forEach(p => {
            const cartItem = cart.find(item => item.name === p.name && item.store === vendor.name);
            const qty = cartItem ? cartItem.qty : 0;

            let actionHTML = '';
            const safeVendorName = vendor.name.replace(/'/g, "\\'");
            const safeProductName = p.name.replace(/'/g, "\\'");
            const safeImage = p.image || 'assets/default-product.png';

            if (qty > 0) {
                actionHTML = `
                    <div class="qty-control" style="background: rgba(59, 130, 246, 0.1); border: 1px solid var(--accent-customer); margin: 0 1rem 1rem 1rem; width: calc(100% - 2rem); justify-content: space-between; display: flex; align-items: center; border-radius: 8px; overflow: hidden;">
                        <button class="qty-btn" style="background: var(--accent-customer); color: white; border: none; font-weight: bold; cursor: pointer; padding: 0.5rem 1rem; flex: 1;" onmouseover="this.style.opacity='0.8'" onmouseout="this.style.opacity='1'" onclick="updateCartItem('${safeProductName}', '${p.price}', '${safeImage}', '${safeVendorName}', -1)">-</button>
                        <span style="font-weight: bold; color: var(--accent-customer); padding: 0 0.5rem;">${qty}</span>
                        <button class="qty-btn" style="background: var(--accent-customer); color: white; border: none; font-weight: bold; cursor: pointer; padding: 0.5rem 1rem; flex: 1;" onmouseover="this.style.opacity='0.8'" onmouseout="this.style.opacity='1'" onclick="updateCartItem('${safeProductName}', '${p.price}', '${safeImage}', '${safeVendorName}', 1)">+</button>
                    </div>
                `;
            } else {
                actionHTML = `<button class="btn btn-both" style="width: calc(100% - 2rem); margin: 0 1rem 1rem 1rem;" onclick="updateCartItem('${safeProductName}', '${p.price}', '${safeImage}', '${safeVendorName}', 1)">Add to Cart</button>`;
            }

            let wishlist = JSON.parse(localStorage.getItem('userWishlist')) || [];
            const isWishlisted = wishlist.some(item => item.name === p.name && item.store === vendor.name);
            const heartColor = isWishlisted ? '#10b981' : '#cbd5e1'; // Green if selected, gray if not
            const heartIcon = `
                <div style="position: absolute; top: 10px; right: 10px; background: white; border-radius: 50%; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; cursor: pointer; box-shadow: 0 2px 5px rgba(0,0,0,0.2); z-index: 10;" 
                     onclick="toggleWishlist('${safeProductName}', '${p.price}', '${safeImage}', '${safeVendorName}', this)">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="${isWishlisted ? '#10b981' : 'none'}" stroke="${heartColor}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
                    </svg>
                </div>
            `;

            const card = document.createElement('div');
            card.className = 'product-card';
            card.style.position = 'relative'; // Required for absolute positioning of the heart
            card.innerHTML = `
                ${heartIcon}
                <img src="${p.image || 'assets/default-product.png'}" class="product-img" alt="Product">
                <div class="product-info">
                    <h5>${p.name}</h5>
                    <div class="product-price">₹${p.price}</div>
                </div>
                ${actionHTML}
            `;
            modalProductsGrid.appendChild(card);
        });
    };

    // Global Wishlist Toggle Function
    window.toggleWishlist = async (productName, productPrice, productImage, storeName, el) => {
        const userId = localStorage.getItem('userId');
        if (!userId) {
            alert("Please log in to use the wishlist.");
            return;
        }

        let wishlist = JSON.parse(localStorage.getItem('userWishlist')) || [];
        const existingIndex = wishlist.findIndex(item => item.name === productName && item.store === storeName);

        const svg = el.querySelector('svg');

        if (existingIndex > -1) {
            // Remove from wishlist locally
            wishlist.splice(existingIndex, 1);
            svg.setAttribute('fill', 'none');
            svg.setAttribute('stroke', '#cbd5e1');

            // API DELETE
            try {
                fetch(`http://localhost:5000/api/users/${userId}/wishlist?name=${encodeURIComponent(productName)}&store=${encodeURIComponent(storeName)}`, {
                    method: 'DELETE'
                });
            } catch (e) { }
        } else {
            // Add to wishlist locally
            wishlist.push({
                name: productName,
                price: productPrice,
                image: productImage,
                store: storeName
            });
            svg.setAttribute('fill', '#10b981');
            svg.setAttribute('stroke', '#10b981');

            // API POST
            try {
                fetch(`http://localhost:5000/api/users/${userId}/wishlist`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        name: productName,
                        price: productPrice,
                        image: productImage,
                        store: storeName
                    })
                });
            } catch (e) { }

            // Optional animation
            el.style.transform = 'scale(1.2)';
            setTimeout(() => el.style.transform = 'scale(1)', 200);
        }

        localStorage.setItem('userWishlist', JSON.stringify(wishlist));
    };

    const openStoreModal = (vendor) => {
        modalStoreName.innerText = vendor.name;
        modalStoreDesc.innerText = vendor.desc;

        let products = [];
        if (vendor.id === 'localVendor') {
            products = JSON.parse(localStorage.getItem('myItems')) || [];
        } else {
            // Support both old 'products' and new 'items' field
            products = vendor.items || vendor.products || [];
        }

        currentStoreContext = { vendor, products };
        renderStoreProducts();

        storeModal.style.display = 'flex';
        setTimeout(() => storeModal.classList.add('show'), 10);
    };

    if (closeStoreModal) {
        closeStoreModal.addEventListener('click', () => {
            storeModal.classList.remove('show');
            setTimeout(() => storeModal.style.display = 'none', 300);
        });
    }

    // Global Add to Cart / Update Quantity Function
    window.updateCartItem = (productName, productPrice, productImage, storeName, delta) => {
        let cart = JSON.parse(localStorage.getItem('userCart')) || [];
        const existingIndex = cart.findIndex(item => item.name === productName && item.store === storeName);

        if (existingIndex > -1) {
            cart[existingIndex].qty += delta;
            if (cart[existingIndex].qty <= 0) {
                cart.splice(existingIndex, 1);
            }
        } else if (delta > 0) {
            cart.push({
                name: productName,
                price: productPrice,
                image: productImage,
                store: storeName,
                qty: Math.max(1, delta)
            });

            // Optional visual feedback on first add
            const cartBtn = document.getElementById('cartBtn');
            if (cartBtn) {
                cartBtn.style.transform = 'scale(1.3)';
                setTimeout(() => cartBtn.style.transform = 'scale(1)', 200);
            }
        }

        localStorage.setItem('userCart', JSON.stringify(cart));
        renderStoreProducts(); // re-render buttons inline
    };

    const getAllCombinedVendors = () => {
        return currentCityVendors;
    };

    const renderVendors = (vendorsToRender) => {
        if (!vendorResults) return;
        vendorResults.innerHTML = '';

        if (vendorsToRender.length === 0) {
            vendorResults.innerHTML = `<div class="card-glass" style="grid-column: 1 / -1; text-align: center;">No stores found matching your criteria.</div>`;
            return;
        }

        vendorsToRender.forEach((vendor, index) => {
            const colors = [
                ['#3b82f6', '#8b5cf6'],
                ['#10b981', '#3b82f6'],
                ['#f59e0b', '#ef4444'],
                ['#8b5cf6', '#ec4899']
            ];
            const colorPair = colors[index % colors.length];
            const fallbackBg = `linear-gradient(135deg, ${colorPair[0]}, ${colorPair[1]})`;
            const bannerBg = vendor.image ? `url('${vendor.image}'), ${fallbackBg}` : fallbackBg;

            const card = document.createElement('div');
            card.className = 'vendor-card card-glass';
            card.innerHTML = `
                <div class="vendor-banner" style="background: ${bannerBg}; background-size: cover; background-position: center;"></div>
                <div class="vendor-info">
                    <h4>${vendor.name}</h4>
                    <p class="tag" style="color: ${colorPair[0]}; background: ${colorPair[0]}20;">📍 ${vendor.city.charAt(0).toUpperCase() + vendor.city.slice(1)}</p>
                    <p class="tag" style="color: var(--text-secondary); background: transparent; border: 1px solid var(--glass-border); margin-left: 5px;">${vendor.category ? vendor.category.charAt(0).toUpperCase() + vendor.category.slice(1) : 'Store'}</p>
                    <p class="desc" style="margin-top: 0.5rem;">${vendor.desc}</p>
                    <button class="btn btn-outline view-store-btn" style="border-color: ${colorPair[0]};">View Store & Products</button>
                </div>
            `;

            // Add click listener
            const btn = card.querySelector('.view-store-btn');
            btn.addEventListener('click', () => openStoreModal(vendor));

            vendorResults.appendChild(card);
        });
    };

    const renderTopBrands = (vendorsToRender) => {
        if (!topBrandsResults || !topBrandsSection) return;

        const premiumVendors = vendorsToRender.filter(v => v.isPremium);

        if (premiumVendors.length === 0) {
            topBrandsSection.style.display = 'none';
            return;
        }

        topBrandsSection.style.display = 'block';
        topBrandsResults.innerHTML = '';

        premiumVendors.forEach((vendor, index) => {
            const colors = [
                '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6'
            ];
            const color = colors[index % colors.length];

            const card = document.createElement('div');
            card.className = 'top-brand-card';
            card.innerHTML = `
                <img src="${vendor.image || 'assets/vendor-doodle.png'}" alt="${vendor.name}" class="top-brand-img" style="border-color: ${color}50;">
                <div class="top-brand-name">${vendor.name}</div>
                <div class="top-brand-time">25-30 mins</div>
            `;

            card.addEventListener('click', () => openStoreModal(vendor));
            topBrandsResults.appendChild(card);
        });
    };

    let currentSearchTerm = '';

    const filterAndRender = () => {
        let cityFiltered = getAllCombinedVendors();

        // Render Top Brands for this city, but only if viewing 'all' and no active search term
        if (currentCategory === 'all' && !currentSearchTerm) {
            renderTopBrands(cityFiltered);
        } else {
            if (topBrandsSection) topBrandsSection.style.display = 'none';
        }

        // 2. Filter by category for main results
        let finalResults = cityFiltered;
        if (currentCategory !== 'all') {
            finalResults = cityFiltered.filter(v => (v.category || '').toLowerCase() === currentCategory);
        }

        // 3. Filter by search term (store name or product) if present
        if (currentSearchTerm) {
            finalResults = finalResults.filter(v => {
                const nameMatch = v.name.toLowerCase().includes(currentSearchTerm);
                const descMatch = (v.desc || '').toLowerCase().includes(currentSearchTerm);
                return nameMatch || descMatch;
            });
        }

        renderVendors(finalResults);
    };

    // Category circles click
    categoryCircles.forEach(circle => {
        circle.addEventListener('click', () => {
            categoryCircles.forEach(c => c.classList.remove('active'));
            circle.classList.add('active');
            currentCategory = circle.getAttribute('data-category');

            const readableCat = circle.querySelector('span').innerText;

            if (currentCategory === 'all') {
                resultsTitle.innerText = `Stores to explore`;
            } else {
                resultsTitle.innerText = `${readableCat} delivery restaurants in ${lastSearchedCity.charAt(0).toUpperCase() + lastSearchedCity.slice(1)}`;
            }

            filterAndRender();
        });
    });

    // Form search submit (secondary search box now) - Searches for items/stores
    if (searchForm) {
        searchForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const val = searchCity.value.toLowerCase().trim();
            currentSearchTerm = val;

            if (val) {
                resultsTitle.innerText = `Search results for "${val}"`;
            } else {
                if (currentCategory === 'all') {
                    resultsTitle.innerText = `Stores to explore`;
                } else {
                    const activeCircle = document.querySelector('.category-circle.active span');
                    const readableCat = activeCircle ? activeCircle.innerText : currentCategory;
                    resultsTitle.innerText = `${readableCat} delivery restaurants in ${lastSearchedCity.charAt(0).toUpperCase() + lastSearchedCity.slice(1)}`;
                }
            }
            filterAndRender();
        });

        // Also fire on typing clears
        searchCity.addEventListener('input', (e) => {
            if (e.target.value === '') {
                currentSearchTerm = '';
                if (currentCategory === 'all') {
                    resultsTitle.innerText = `Stores to explore`;
                } else {
                    const activeCircle = document.querySelector('.category-circle.active span');
                    const readableCat = activeCircle ? activeCircle.innerText : currentCategory;
                    resultsTitle.innerText = `${readableCat} delivery restaurants in ${lastSearchedCity.charAt(0).toUpperCase() + lastSearchedCity.slice(1)}`;
                }
                filterAndRender();
            }
        });
    }

    // Default Render On Load for Delhi
    window.fetchCityVendors('delhi');

    // Modal close on outside click
    window.addEventListener('click', (e) => {
        if (e.target === storeModal) {
            storeModal.classList.remove('show');
            setTimeout(() => storeModal.style.display = 'none', 300);
        }
        if (locationModal && e.target === locationModal) {
            locationModal.classList.remove('show');
            setTimeout(() => locationModal.style.display = 'none', 300);
        }
        if (profileDropdownWrapper && !profileDropdownWrapper.contains(e.target)) {
            profileDropdownWrapper.classList.remove('show');
        }
    });
});

