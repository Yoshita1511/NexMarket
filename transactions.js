document.addEventListener('DOMContentLoaded', async () => {
    const transactionsContainer = document.getElementById('transactionsContainer');

    const userId = localStorage.getItem('userId');

    const renderTransactions = async () => {
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
            transactionsContainer.innerHTML = `
                <div class="empty-history">
                    <div style="font-size: 3rem; margin-bottom: 1rem;">🧾</div>
                    <p style="font-size: 1.2rem; color: white; margin-bottom: 0.5rem;">No transactions found.</p>
                    <p>Your payment receipts will securely appear here once you place an order.</p>
                </div>
            `;
            return;
        }

        const transactions = [];

        // Break down orders into store-specific transactions
        orderHistory.forEach(order => {
            const storeTotals = {};

            (order.items || []).forEach(item => {
                const storeName = item.store || 'Unknown Store';
                if (!storeTotals[storeName]) {
                    storeTotals[storeName] = 0;
                }
                storeTotals[storeName] += (parseFloat(item.price) * item.qty);
            });

            // For each store in this order, generate a transaction record
            Object.keys(storeTotals).forEach((storeName, index) => {
                // If this order has multiple stores, append an index to the sub-transaction ID
                const subTxId = Object.keys(storeTotals).length > 1 ? `${order.id}-${index + 1}` : order.id;

                // Add a proportional cut of the delivery/platform fee to each store's transaction display to balance the total
                // For simplicity, we just divide the 2.50 fee evenly across the stores involved in the order
                const feeShare = 2.50 / Object.keys(storeTotals).length;
                const finalStoreTotal = storeTotals[storeName] + feeShare;

                transactions.push({
                    txId: subTxId,
                    store: storeName,
                    date: order.date,
                    method: order.method,
                    amount: finalStoreTotal
                });
            });
        });

        transactionsContainer.innerHTML = '';

        transactions.forEach(tx => {
            const txEl = document.createElement('div');
            txEl.className = 'transaction-card';

            txEl.innerHTML = `
                <div class="transaction-details">
                    <div class="transaction-store">
                        🏪 ${tx.store}
                    </div>
                    <div class="transaction-meta">
                        <div><strong>Transaction ID:</strong> ${tx.txId}</div>
                        <div><strong>Date:</strong> ${tx.date}</div>
                        <div><strong>Payment Method:</strong> ${tx.method}</div>
                    </div>
                </div>
                <div class="transaction-amount-wrap">
                    <div class="transaction-amount">₹${tx.amount.toFixed(2)}</div>
                    <div class="transaction-status">Completed</div>
                </div>
            `;

            transactionsContainer.appendChild(txEl);
        });
    };

    renderTransactions();
});
