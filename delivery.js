document.addEventListener('DOMContentLoaded', () => {
    // 1. Determine City and Coordinates
    const cityCoordinates = {
        'delhi': [28.6139, 77.2090],
        'mumbai': [19.0760, 72.8777],
        'bangalore': [12.9716, 77.5946],
        'bhubaneswar': [20.2961, 85.8245],
        'kolkata': [22.5726, 88.3639],
        'chennai': [13.0827, 80.2707],
        'hyderabad': [17.3850, 78.4867],
        'pune': [18.5204, 73.8567]
    };

    let mapCenter = cityCoordinates['delhi']; // Fallback default
    let targetCityName = 'Delhi';

    // Get latest order to determine store and city
    const orderHistory = JSON.parse(localStorage.getItem('orderHistory')) || [];
    if (orderHistory.length > 0) {
        document.getElementById('orderIdDisplay').innerText = '#' + orderHistory[0].id;

        // Find store city and populate summary
        const latestOrder = orderHistory[0];

        // Populate Summary
        const summaryContent = document.getElementById('orderSummaryContent');
        if (latestOrder.items && latestOrder.items.length > 0) {
            let summaryHTML = '';
            latestOrder.items.forEach(item => {
                summaryHTML += `
                    <div class="summary-item">
                        <div class="summary-item-name">${item.name} <span class="summary-item-qty">x${item.qty}</span></div>
                        <div class="summary-item-price">₹${(parseFloat(item.price) * item.qty).toFixed(2)}</div>
                    </div>
                `;
            });

            // Add Total row
            summaryHTML += `
                <div class="summary-item" style="border-top: 1px solid rgba(255,255,255,0.2); padding-top: 0.8rem; margin-top: 0.5rem;">
                    <div class="summary-item-name" style="font-weight: bold;">Grand Total (inc. fees)</div>
                    <div class="summary-item-price" style="font-size: 1.1rem;">₹${latestOrder.total}</div>
                </div>
            `;
            summaryContent.innerHTML = summaryHTML;

            // Map location logic
            const storeName = latestOrder.items[0].store;
            const globalVendors = JSON.parse(localStorage.getItem('globalVendors')) || [];
            const vendor = globalVendors.find(v => v.name === storeName);

            if (vendor && vendor.city) {
                targetCityName = vendor.city.toLowerCase();
                if (cityCoordinates[targetCityName]) {
                    mapCenter = cityCoordinates[targetCityName];
                }
            }
        }
    }

    // Toggle Summary Visibility
    const toggleBtn = document.getElementById('summaryToggleBtn');
    const summaryArrow = document.getElementById('summaryArrow');
    const summaryContainer = document.getElementById('orderSummaryContent');

    if (toggleBtn) {
        toggleBtn.addEventListener('click', () => {
            if (summaryContainer.style.display === 'block') {
                summaryContainer.style.display = 'none';
                summaryArrow.style.transform = 'rotate(0deg)';
                toggleBtn.style.color = 'white';
            } else {
                summaryContainer.style.display = 'block';
                summaryArrow.style.transform = 'rotate(180deg)';
                toggleBtn.style.color = 'var(--text-secondary)';
            }
        });
    }

    // 2. Initialize Map
    const map = L.map('deliveryMap', {
        zoomControl: false // Move it or hide it for a cleaner UI
    }).setView(mapCenter, 14);

    // Add Tile Layer (OpenStreetMap)
    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
        subdomains: 'abcd',
        maxZoom: 20
    }).addTo(map);

    // Re-add zoom control to top right
    L.control.zoom({ position: 'topright' }).addTo(map);

    // 3. Define Custom Icons
    const customerIcon = L.divIcon({
        html: `<div style="background: var(--accent-customer); border: 2px solid white; border-radius: 50%; width: 24px; height: 24px; box-shadow: 0 2px 5px rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center;"><span style="color: white; font-size: 12px;">📍</span></div>`,
        className: 'custom-leaflet-icon',
        iconSize: [24, 24],
        iconAnchor: [12, 12]
    });

    const driverIcon = L.divIcon({
        html: `<div style="background: white; border: 2px solid var(--accent-vendor); border-radius: 50%; width: 32px; height: 32px; box-shadow: 0 4px 10px rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center;"><span style="font-size: 16px;">🛵</span></div>`,
        className: 'custom-leaflet-icon',
        iconSize: [32, 32],
        iconAnchor: [16, 16] // Center the icon over the coordinate
    });

    // 4. Setup Locations (Randomized slightly around center)
    // Customer location
    const customerLat = mapCenter[0] + (Math.random() - 0.5) * 0.02;
    const customerLng = mapCenter[1] + (Math.random() - 0.5) * 0.02;
    const customerLocation = [customerLat, customerLng];

    // Driver starting location (further away)
    let currentDriverLat = mapCenter[0] + (Math.random() > 0.5 ? 1 : -1) * (0.03 + Math.random() * 0.02);
    let currentDriverLng = mapCenter[1] + (Math.random() > 0.5 ? 1 : -1) * (0.03 + Math.random() * 0.02);

    // Place Markers
    L.marker(customerLocation, { icon: customerIcon }).addTo(map).bindPopup(`<b>Delivery Address (${targetCityName.charAt(0).toUpperCase() + targetCityName.slice(1)})</b>`).openPopup();
    const driverMarker = L.marker([currentDriverLat, currentDriverLng], { icon: driverIcon }).addTo(map);

    // Fit bounds to see both
    const group = new L.featureGroup([L.marker(customerLocation), driverMarker]);
    map.fitBounds(group.getBounds().pad(0.3));

    // 5. Update UI Elements
    const driverNames = ["Rajesh K.", "Amit S.", "Priya D.", "Vikram M.", "Suresh T."];
    const assignedDriver = driverNames[Math.floor(Math.random() * driverNames.length)];

    setTimeout(() => {
        document.getElementById('driverName').innerText = assignedDriver;
        document.getElementById('driverStatus').innerText = "On the way to you";
        document.getElementById('callBtn').disabled = false;

        // Calculate dynamic ETA (e.g., 20 mins from now)
        const etaDate = new Date(Date.now() + 20 * 60000);
        document.getElementById('etaDisplay').innerText = etaDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        startDrivingSimulation();
    }, 2000); // 2 second mock assignment delay

    // 5. Driver Movement Simulation
    let progress = 0;
    const totalSteps = 100; // Drive in 100 increments
    const progressBar = document.getElementById('deliveryProgress');

    function startDrivingSimulation() {
        // Calculate step sizes
        const dLat = (customerLat - currentDriverLat) / totalSteps;
        const dLng = (customerLng - currentDriverLng) / totalSteps;

        const interval = setInterval(() => {
            progress++;

            // Move driver
            currentDriverLat += dLat;
            currentDriverLng += dLng;

            const newLatLng = new L.LatLng(currentDriverLat, currentDriverLng);
            driverMarker.setLatLng(newLatLng);

            // Update progress bar UI (starting from 5% min width to 100%)
            const progressPercent = 5 + (progress / totalSteps) * 95;
            progressBar.style.width = `${progressPercent}%`;

            // Slowly pan map towards driver if they get too close to edge (or just follow them)
            // map.panTo(newLatLng, {animate: true, duration: 1});

            if (progress >= totalSteps) {
                clearInterval(interval);
                document.getElementById('driverStatus').innerText = "Arrived!";
                document.getElementById('driverStatus').style.color = "var(--accent-customer)";
                document.getElementById('driverStatus').style.fontWeight = "bold";
                progressBar.style.width = `100%`;
                progressBar.style.background = "#10b981"; // Turn green

                setTimeout(() => {
                    alert("Your order has been delivered! Enjoy your items.");
                }, 1000);
            }
        }, 1000); // Update every 1 second
    }

    // Call Button handler
    document.getElementById('callBtn').addEventListener('click', () => {
        alert("Calling " + assignedDriver + "...");
    });
});
