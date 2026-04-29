document.addEventListener('DOMContentLoaded', () => {
    const mostlyShoppedContainer = document.getElementById('mostlyShoppedContainer');

    const renderMostlyShopped = () => {
        const orderHistory = JSON.parse(localStorage.getItem('orderHistory')) || [];

        if (orderHistory.length === 0) {
            mostlyShoppedContainer.innerHTML = `
                <div class="empty-history">
                    <div style="font-size: 3rem; margin-bottom: 1rem;">🏪</div>
                    <p style="font-size: 1.2rem; color: white; margin-bottom: 0.5rem;">No favorite stores yet.</p>
                    <p>Once you start placing orders, your most frequently visited stores will appear here.</p>
                </div>
            `;
            return;
        }

        // Aggregate data by store
        const storeStats = {};

        orderHistory.forEach(order => {
            // Track which stores were in this specific order to count "orders per store"
            const storesInThisOrder = new Set();

            (order.items || []).forEach(item => {
                const storeName = item.store || 'Unknown Store';
                storesInThisOrder.add(storeName);

                if (!storeStats[storeName]) {
                    storeStats[storeName] = {
                        name: storeName,
                        totalOrders: 0,
                        totalItemsBought: 0,
                        totalSpent: 0
                    };
                }

                // Aggregate items and spend
                storeStats[storeName].totalItemsBought += item.qty;
                storeStats[storeName].totalSpent += (parseFloat(item.price) * item.qty);
            });

            // Increment order count for each unique store in this order
            storesInThisOrder.forEach(storeName => {
                storeStats[storeName].totalOrders += 1;
            });
        });

        // Convert to array and sort by totalOrders (descending), then by totalSpent (descending)
        const sortedStores = Object.values(storeStats).sort((a, b) => {
            if (b.totalOrders !== a.totalOrders) {
                return b.totalOrders - a.totalOrders;
            }
            return b.totalSpent - a.totalSpent;
        });

        mostlyShoppedContainer.innerHTML = '';

        sortedStores.forEach(store => {
            const storeEl = document.createElement('div');
            storeEl.className = 'store-stat-card';

            storeEl.innerHTML = `
                <div class="store-icon">🏪</div>
                <div class="store-name">${store.name}</div>
                <div class="store-stats">
                    <div>Ordered <strong>${store.totalOrders}</strong> time${store.totalOrders !== 1 ? 's' : ''}</div>
                    <div><strong>${store.totalItemsBought}</strong> items purchased</div>
                    <div><strong>₹${store.totalSpent.toFixed(2)}</strong> spent in total</div>
                </div>
                <!-- Optional: A button to go back to shopping -> directs to customer dashboard where they can search -->
                <button class="btn btn-outline" style="width: 100%;" onclick="window.location.href='customer.html'">Visit Dashboard</button>
            `;

            mostlyShoppedContainer.appendChild(storeEl);
        });
    };

    renderMostlyShopped();
});
