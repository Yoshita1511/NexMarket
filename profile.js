document.addEventListener('DOMContentLoaded', async () => {
    // DOM Elements
    const profileName = document.getElementById('profileName');
    const profileRoleBadge = document.getElementById('profileRoleBadge');
    const profileAvatar = document.getElementById('profileAvatar');

    const detailName = document.getElementById('detailName');
    const detailContact = document.getElementById('detailContact');
    const detailAddress = document.getElementById('detailAddress');

    const vendorStatsSection = document.getElementById('vendorStatsSection');
    const statStores = document.getElementById('statStores');
    const statProducts = document.getElementById('statProducts');
    const manageStoresList = document.getElementById('manageStoresList');

    // Retrieve local storage values
    const userId = localStorage.getItem('userId') || 'guest';
    const userName = localStorage.getItem('userName') || 'Guest User';
    const userRole = localStorage.getItem('userRole') || 'customer';
    const userContact = localStorage.getItem('userContact') || 'Not provided';

    // Populate header details
    profileName.innerText = userName;
    profileAvatar.innerText = userName.charAt(0).toUpperCase();

    // Populate data fields
    detailName.innerText = userName;
    detailContact.innerText = userContact;

    // Badging and Role Specifics
    let roleDisplay = '';
    let roleClass = '';

    if (userRole === 'vendor') {
        roleDisplay = 'Vendor Account';
        roleClass = 'role-vendor';
    } else if (userRole === 'both') {
        roleDisplay = 'Dual Account (Shopper & Seller)';
        roleClass = 'role-both';
    } else {
        roleDisplay = 'Customer Account';
        roleClass = 'role-customer';
    }

    profileRoleBadge.innerText = roleDisplay;
    profileRoleBadge.className = `role-badge ${roleClass}`;

    // Conditional Vendor Blocks
    if (userRole === 'vendor' || userRole === 'both') {
        vendorStatsSection.style.display = 'block';

        // Fetch saved stores from API
        let vendorStores = [];
        try {
            const response = await fetch(`http://localhost:5000/api/vendor/${userId}/stores`);
            if (response.ok) {
                vendorStores = await response.json();
                localStorage.setItem('vendorStores', JSON.stringify(vendorStores)); // Cache for edit flows
            } else {
                vendorStores = JSON.parse(localStorage.getItem('vendorStores')) || [];
            }
        } catch (error) {
            console.error('Failed to fetch vendor stores:', error);
            vendorStores = JSON.parse(localStorage.getItem('vendorStores')) || [];
        }

        let totalItems = 0;
        vendorStores.forEach(store => {
            if (store.items) totalItems += store.items.length;
        });

        statStores.innerText = vendorStores.length;
        statProducts.innerText = totalItems;

        // Render Manage Stores List
        if (manageStoresList) {
            manageStoresList.innerHTML = '';
            if (vendorStores.length === 0) {
                manageStoresList.innerHTML = '<div class="detail-card" style="text-align: center; color: var(--text-secondary);">No stores created yet.</div>';
            } else {
                vendorStores.forEach((store, index) => {
                    const card = document.createElement('div');
                    card.className = 'detail-card';
                    card.style.display = 'flex';
                    card.style.justifyContent = 'space-between';
                    card.style.alignItems = 'center';

                    // Parse the date if it exists
                    let dateString = 'Recently added';
                    if (store.lastUpdated) {
                        const d = new Date(store.lastUpdated);
                        dateString = d.toLocaleDateString() + ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                    }

                    const itemCount = store.items ? store.items.length : 0;

                    card.innerHTML = `
                        <div style="display: flex; gap: 1rem; align-items: center;">
                            <img src="${store.image || 'assets/default-product.png'}" alt="Store" style="width: 50px; height: 50px; border-radius: 8px; object-fit: cover;">
                            <div>
                                <h4 style="margin: 0 0 0.2rem 0; color: white;">${store.name}</h4>
                                <div style="font-size: 0.8rem; color: var(--text-secondary);">${store.category} • ${itemCount} items • ${dateString}</div>
                            </div>
                        </div>
                        <button class="btn btn-outline" style="padding: 0.4rem 0.8rem; font-size: 0.85rem;" onclick="editStoreDetails('${store.id}')">Edit</button>
                    `;
                    manageStoresList.appendChild(card);
                });
            }
        }
    }

    // Global Functions for Edit/Create Store Flow
    window.editStoreDetails = (storeId) => {
        const vendorStores = JSON.parse(localStorage.getItem('vendorStores')) || [];
        const storeToEdit = vendorStores.find(s => s.id === storeId);

        if (storeToEdit) {
            // Load this specific store into the editing workspace context
            localStorage.setItem('myStore', JSON.stringify(storeToEdit));
            localStorage.setItem('myItems', JSON.stringify(storeToEdit.items || []));
            window.location.href = 'vendor.html';
        }
    };

    window.createNewStoreFlow = () => {
        // Clear active workspace
        localStorage.removeItem('myStore');
        localStorage.removeItem('myItems');
        window.location.href = 'vendor.html';
    };

    // Attempt to parse out an address if they recently checked out
    const lastAddress = localStorage.getItem('lastSavedAddress');
    if (lastAddress) {
        detailAddress.innerText = lastAddress;
    }

    // Implement logout wrapper
    window.logout = () => {
        // Clear session and store tracking completely
        localStorage.removeItem('userId');
        localStorage.removeItem('userRole');
        localStorage.removeItem('userName');
        localStorage.removeItem('userContact');
        localStorage.removeItem('myStore');
        localStorage.removeItem('myItems');
        localStorage.removeItem('vendorStores');

        window.location.href = 'index.html';
    };
});
