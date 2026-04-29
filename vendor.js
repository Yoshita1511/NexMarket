/**
 * Vendor Dashboard interactions.
 * Handles the creation of digital storefronts, uploading item images (converted to Base64),
 * managing product inventories, and publishing updates to the Flask backend via /api/stores.
 */
document.addEventListener('DOMContentLoaded', () => {
    // Check if user is 'both' to show the switch link
    const userRole = localStorage.getItem('userRole');
    if (userRole === 'both') {
        const switchLink = document.getElementById('switchToCustomer');
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

    const storeForm = document.getElementById('storeForm');
    const itemsSection = document.getElementById('itemsSection');
    const storeStatus = document.getElementById('storeStatus');
    const storeImageInput = document.getElementById('storeImageInput');
    const storeUploadText = document.getElementById('storeUploadText');
    const btnGenAIStore = document.getElementById('btnGenAIStore');
    const itemSuggestions = document.getElementById('itemSuggestions');
    const storeCategorySelect = document.getElementById('storeCategory');

    let currentStoreImage = 'assets/default-product.png';

    const categorySuggestions = {
        'Food': [
            { name: 'Burger', price: 150 },
            { name: 'Pizza', price: 300 },
            { name: 'Pasta', price: 250 },
            { name: 'Sandwich', price: 120 }
        ],
        'Grocery': [
            { name: 'Milk 1L', price: 60 },
            { name: 'Bread', price: 40 },
            { name: 'Eggs (12)', price: 80 },
            { name: 'Rice 1kg', price: 70 }
        ],
        'Vegetables': [
            { name: 'Potato 1kg', price: 30 },
            { name: 'Onion 1kg', price: 40 },
            { name: 'Tomato 1kg', price: 50 },
            { name: 'Cabbage 1pc', price: 40 }
        ],
        'Fruits': [
            { name: 'Apple 1kg', price: 150 },
            { name: 'Banana 1 Dozen', price: 60 },
            { name: 'Orange 1kg', price: 120 },
            { name: 'Grapes 500g', price: 80 }
        ],
        'Electronics': [
            { name: 'Earphones', price: 500 },
            { name: 'Phone Case', price: 200 },
            { name: 'USB Cable', price: 150 },
            { name: 'Power Bank', price: 1000 }
        ],
        'Clothing': [
            { name: 'T-Shirt', price: 400 },
            { name: 'Jeans', price: 800 },
            { name: 'Socks', price: 100 },
            { name: 'Cap', price: 250 }
        ]
    };

    window.autofillSuggestion = (name, price) => {
        document.getElementById('itemName').value = name;
        document.getElementById('itemPrice').value = price;
    };

    const renderSuggestions = (category) => {
        if (!itemSuggestions) return;
        itemSuggestions.innerHTML = '';
        if (!category || !categorySuggestions[category]) return;

        categorySuggestions[category].forEach(sug => {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'btn btn-outline';
            btn.style.padding = '0.4rem 0.8rem';
            btn.style.fontSize = '0.85rem';
            btn.style.borderRadius = '20px';
            btn.innerText = `+ ${sug.name} (₹${sug.price})`;
            btn.onclick = () => window.autofillSuggestion(sug.name, sug.price);
            itemSuggestions.appendChild(btn);
        });
    };

    if (storeCategorySelect) {
        storeCategorySelect.addEventListener('change', (e) => {
            renderSuggestions(e.target.value);
        });
    }

    // Check if store already exists
    let storeData = JSON.parse(localStorage.getItem('myStore'));
    if (storeData) {
        document.getElementById('storeName').value = storeData.name;
        document.getElementById('storeCity').value = storeData.city;
        document.getElementById('storeDesc').value = storeData.desc;
        if (storeData.category) {
            document.getElementById('storeCategory').value = storeData.category;
            renderSuggestions(storeData.category); // Show suggestions immediately if store exists
        }
        if (storeData.image) currentStoreImage = storeData.image;

        // Unlock inventory section
        itemsSection.style.opacity = '1';
        itemsSection.style.pointerEvents = 'auto';

        // Populate View Container
        const viewStoreImage = document.getElementById('viewStoreImage');
        const viewStoreName = document.getElementById('viewStoreName');
        const viewStoreDetails = document.getElementById('viewStoreDetails');
        const viewStoreDesc = document.getElementById('viewStoreDesc');
        const storeViewContainer = document.getElementById('storeViewContainer');
        const storeEditContainer = document.getElementById('storeEditContainer');

        if (viewStoreImage && storeData.image) viewStoreImage.src = storeData.image;
        if (viewStoreName) viewStoreName.innerText = storeData.name;
        if (viewStoreDetails) viewStoreDetails.innerText = `${storeData.category || 'Vendor'} • ${storeData.city}`;
        if (viewStoreDesc) viewStoreDesc.innerText = storeData.desc;

        // Toggle visibility to show View mode first
        if (storeViewContainer && storeEditContainer) {
            storeViewContainer.style.display = 'block';
            storeEditContainer.style.display = 'none';
        }

        // Show Expand Business Banner
        const expandBanner = document.getElementById('createAnotherStoreBanner');
        if (expandBanner) expandBanner.style.display = 'block';

        // Update Button Text and Add Cancel Button
        const submitStoreBtn = document.getElementById('submitStoreBtn');
        const btnCancelEdit = document.getElementById('btnCancelEdit');
        if (submitStoreBtn) submitStoreBtn.innerText = 'Update Store Details';
        if (btnCancelEdit) btnCancelEdit.style.display = 'inline-block';

        // Hook up the Edit and Cancel buttons
        const btnEditStore = document.getElementById('btnEditStore');
        if (btnEditStore) {
            btnEditStore.addEventListener('click', () => {
                storeViewContainer.style.display = 'none';
                storeEditContainer.style.display = 'block';
            });
        }
        if (btnCancelEdit) {
            btnCancelEdit.addEventListener('click', () => {
                // Return to view mode without saving changes
                storeViewContainer.style.display = 'block';
                storeEditContainer.style.display = 'none';
            });
        }
    }

    // Global function to reset the form for a new store
    window.createNewStore = () => {
        // Clear local storage for the current active store build
        localStorage.removeItem('myStore');
        localStorage.removeItem('myItems');

        // Reload page to reset all states securely
        window.location.reload();
    };

    // Handle Store Image Upload
    if (storeImageInput) {
        storeImageInput.addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                storeUploadText.innerText = "✅ " + e.target.files[0].name;
                const reader = new FileReader();
                reader.onload = function (evt) {
                    currentStoreImage = evt.target.result;
                };
                reader.readAsDataURL(e.target.files[0]);
            }
        });
    }

    // Handle AI Image Generation
    if (btnGenAIStore) {
        btnGenAIStore.addEventListener('click', () => {
            btnGenAIStore.innerText = "Generating...";
            setTimeout(() => {
                // Mock AI generation by taking a nice gradient string (or an asset)
                currentStoreImage = 'assets/vendor-doodle.png';
                btnGenAIStore.innerText = "✨ AI Generated!";
                storeUploadText.innerText = "✅ Using AI Image";
            }, 1000);
        });
    }

    // Handle Store Setup
    if (storeForm) {
        storeForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const name = document.getElementById('storeName').value;
            const categorySelect = document.getElementById('storeCategory');
            const category = categorySelect.options[categorySelect.selectedIndex].value;
            const city = document.getElementById('storeCity').value;
            const desc = document.getElementById('storeDesc').value;

            const newStore = {
                id: 'localVendor',
                name,
                category,
                city: city.toLowerCase(),
                desc,
                image: currentStoreImage,
                isLocal: true
            };
            localStorage.setItem('myStore', JSON.stringify(newStore));

            // Also add to global
            let allVendors = JSON.parse(localStorage.getItem('globalVendors')) || [];
            allVendors = allVendors.filter(v => v.id !== 'localVendor');
            allVendors.push(newStore);
            localStorage.setItem('globalVendors', JSON.stringify(allVendors));

            storeStatus.innerText = document.getElementById('submitStoreBtn').innerText === 'Update Store Details' ? 'Store details updated!' : 'Store details saved successfully!';
            storeStatus.style.display = 'block';
            setTimeout(() => { storeStatus.style.display = 'none'; }, 3000);

            itemsSection.style.opacity = '1';
            itemsSection.style.pointerEvents = 'auto';

            const expandBanner = document.getElementById('createAnotherStoreBanner');
            if (expandBanner) expandBanner.style.display = 'block';

            // Switch button to Update mode after first save
            const submitStoreBtn = document.getElementById('submitStoreBtn');
            const btnCancelEdit = document.getElementById('btnCancelEdit');
            if (submitStoreBtn) submitStoreBtn.innerText = 'Update Store Details';
            if (btnCancelEdit) btnCancelEdit.style.display = 'inline-block';

            // Refresh the View UI and switch back to it
            const storeViewContainer = document.getElementById('storeViewContainer');
            const storeEditContainer = document.getElementById('storeEditContainer');
            if (storeViewContainer && storeEditContainer) {
                const viewStoreImage = document.getElementById('viewStoreImage');
                const viewStoreName = document.getElementById('viewStoreName');
                const viewStoreDetails = document.getElementById('viewStoreDetails');
                const viewStoreDesc = document.getElementById('viewStoreDesc');

                if (viewStoreImage) viewStoreImage.src = newStore.image;
                if (viewStoreName) viewStoreName.innerText = newStore.name;
                if (viewStoreDetails) viewStoreDetails.innerText = `${newStore.category} • ${newStore.city}`;
                if (viewStoreDesc) viewStoreDesc.innerText = newStore.desc;

                // Bind Edit/Cancel buttons if they weren't already
                const btnEditStore = document.getElementById('btnEditStore');
                if (btnEditStore && !btnEditStore.onclick) {
                    btnEditStore.onclick = () => {
                        storeViewContainer.style.display = 'none';
                        storeEditContainer.style.display = 'block';
                    };
                }
                if (btnCancelEdit && !btnCancelEdit.onclick) {
                    btnCancelEdit.onclick = () => {
                        storeViewContainer.style.display = 'block';
                        storeEditContainer.style.display = 'none';
                    };
                }

                storeViewContainer.style.display = 'block';
                storeEditContainer.style.display = 'none';
            }
        });
    }

    // Handle Adding Items
    const itemForm = document.getElementById('itemForm');
    const itemListElement = document.getElementById('itemList');
    const itemImageInput = document.getElementById('itemImage');
    const uploadText = document.getElementById('uploadText');

    let myItems = JSON.parse(localStorage.getItem('myItems')) || [];

    if (itemImageInput) {
        itemImageInput.addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                uploadText.innerText = "✅ " + e.target.files[0].name;
            } else {
                uploadText.innerText = "📷 Upload Product Picture (Optional)";
            }
        });
    }

    window.removeVendorItem = (index) => {
        myItems.splice(index, 1);
        localStorage.setItem('myItems', JSON.stringify(myItems));
        renderItems();
    };

    const renderItems = () => {
        if (!itemListElement) return;
        itemListElement.innerHTML = '';
        if (myItems.length === 0) {
            itemListElement.innerHTML = '<li class="empty-state">No items added yet. Customers will see an empty store.</li>';
            return;
        }

        myItems.forEach((item, index) => {
            const li = document.createElement('li');
            li.className = 'inventory-item';
            li.innerHTML = `
                <div class="inventory-item-group">
                    <img src="${item.image}" alt="Item" class="item-thumb">
                    <span class="item-name">${item.name}</span>
                </div>
                <div style="display: flex; align-items: center; gap: 1rem;">
                    <span class="item-price">₹${item.price}</span>
                    <button class="btn btn-outline" style="padding: 0.2rem 0.6rem; color: #ef4444; border-color: rgba(239, 68, 68, 0.2); background: rgba(239, 68, 68, 0.1);" onclick="removeVendorItem(${index})" title="Remove Item">🗑️</button>
                </div>
            `;
            itemListElement.appendChild(li);
        });
    };

    if (myItems.length > 0) renderItems();

    if (itemForm) {
        itemForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const nameStr = document.getElementById('itemName').value;
            const price = parseFloat(document.getElementById('itemPrice').value).toFixed(2);

            let imageUrl = 'assets/default-product.png';

            if (itemImageInput && itemImageInput.files.length > 0) {
                const reader = new FileReader();
                reader.onload = function (evt) {
                    imageUrl = evt.target.result;
                    myItems.push({ name: nameStr, price, image: imageUrl });
                    localStorage.setItem('myItems', JSON.stringify(myItems));
                    postAddReset();
                };
                reader.readAsDataURL(itemImageInput.files[0]);
            } else {
                myItems.push({ name: nameStr, price, image: imageUrl });
                localStorage.setItem('myItems', JSON.stringify(myItems));
                postAddReset();
            }

            function postAddReset() {
                itemForm.reset();
                if (uploadText) uploadText.innerText = "📷 Upload Product Picture (Optional)";
                renderItems();
            }
        });
    }

    // Handle Publish Store to Profile
    const btnPublishStore = document.getElementById('btnPublishStore');
    const publishStatus = document.getElementById('publishStatus');

    if (btnPublishStore) {
        btnPublishStore.addEventListener('click', async () => {
            const currentStore = JSON.parse(localStorage.getItem('myStore'));
            const currentItems = JSON.parse(localStorage.getItem('myItems')) || [];
            const vendorId = localStorage.getItem('userId');

            if (!currentStore) {
                alert("Please save your store details before publishing.");
                return;
            }

            if (!vendorId) {
                alert("You must be logged in to publish a store.");
                return;
            }

            if (!currentStore.id || currentStore.id === 'localVendor') {
                currentStore.id = 'store_' + Date.now();
                localStorage.setItem('myStore', JSON.stringify(currentStore));
            }

            const payload = {
                ...currentStore,
                vendor_id: vendorId,
                items: currentItems
            };

            try {
                const response = await fetch('http://localhost:5000/api/stores', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });

                if (response.ok) {
                    if (publishStatus) {
                        publishStatus.style.display = 'block';
                        setTimeout(() => {
                            publishStatus.style.display = 'none';
                            window.location.href = 'profile.html'; // Redirect to profile
                        }, 1500);
                    } else {
                        window.location.href = 'profile.html';
                    }
                } else {
                    const data = await response.json();
                    alert(data.message || 'Failed to publish store');
                }
            } catch (error) {
                console.error("Error publishing store:", error);
                alert("Failed to connect to backend server.");
            }
        });
    }

});
