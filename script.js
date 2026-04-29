/**
 * Main application logic for the NexMarket authentication and landing page.
 * Handles the display of the combined Customer/Vendor signup & login modal,
 * manages authorization state, and communicates with the backend /api/auth endpoints.
 */
document.addEventListener('DOMContentLoaded', () => {
    const modal = document.getElementById('signupModal');
    const closeBtn = document.getElementById('closeModal');
    const loginBtn = document.getElementById('loginBtn');

    const btnCustomer = document.getElementById('btnCustomer');
    const btnVendor = document.getElementById('btnVendor');
    const linkBoth = document.getElementById('linkBoth');

    const radioCustomer = document.getElementById('radioCustomer');
    const radioVendor = document.getElementById('radioVendor');
    const radioBoth = document.getElementById('radioBoth');

    const modalTitle = document.getElementById('modalTitle');

    const nameInput = document.getElementById('nameInput');
    const roleSelectorGroup = document.getElementById('roleSelectorGroup');
    const submitBtn = document.getElementById('submitBtn');
    const authToggleText = document.getElementById('authToggleText');

    let currentMode = 'signup';

    const setAuthMode = (mode) => {
        currentMode = mode;
        if (mode === 'login') {
            modalTitle.innerText = "Welcome Back";
            if (nameInput) {
                nameInput.style.display = 'none';
                nameInput.required = false;
            }
            if (roleSelectorGroup) roleSelectorGroup.style.display = 'none';
            if (submitBtn) submitBtn.innerText = "Log In";
            if (authToggleText) {
                authToggleText.innerHTML = `New to it? <a href="#" id="toggleAuthMode" style="color: var(--accent-customer); text-decoration: none; font-weight: 600;">Create account</a>`;
            }
        } else {
            if (nameInput) {
                nameInput.style.display = 'block';
                nameInput.required = true;
            }
            if (roleSelectorGroup) roleSelectorGroup.style.display = 'flex';
            if (submitBtn) submitBtn.innerText = "Create Account";
            if (authToggleText) {
                authToggleText.innerHTML = `Already have an account? <a href="#" id="toggleAuthMode" style="color: var(--accent-customer); text-decoration: none; font-weight: 600;">Log In</a>`;
            }
        }

        const newToggle = document.getElementById('toggleAuthMode');
        if (newToggle) {
            newToggle.addEventListener('click', (e) => {
                e.preventDefault();
                setAuthMode(currentMode === 'login' ? 'signup' : 'login');
            });
        }
    };

    // Make sure we have the required elements
    if (!modal) return;

    // Open Modal Function
    const openModal = (role) => {
        modal.style.display = 'flex';

        // Trigger reflow for animation
        setTimeout(() => {
            modal.classList.add('show');
        }, 10);

        if (role === 'customer') {
            radioCustomer.checked = true;
            setAuthMode('signup');
            modalTitle.innerText = "Join as Customer";
        } else if (role === 'vendor') {
            radioVendor.checked = true;
            setAuthMode('signup');
            modalTitle.innerText = "Join as Vendor";
        } else if (role === 'both') {
            radioBoth.checked = true;
            setAuthMode('signup');
            modalTitle.innerText = "Join NexMarket";
        } else {
            setAuthMode('login');
        }
    };

    const closeModalFunc = () => {
        modal.classList.remove('show');
        setTimeout(() => {
            modal.style.display = 'none';
        }, 300); // Matches CSS transition duration
    };

    // Event Listeners for opening modal
    if (btnCustomer) btnCustomer.addEventListener('click', () => openModal('customer'));
    if (btnVendor) btnVendor.addEventListener('click', () => openModal('vendor'));

    if (linkBoth) {
        linkBoth.addEventListener('click', (e) => {
            e.preventDefault();
            openModal('both');
        });
    }

    if (loginBtn) {
        loginBtn.addEventListener('click', (e) => {
            e.preventDefault();
            openModal('login');
        });
    }

    if (closeBtn) closeBtn.addEventListener('click', closeModalFunc);

    // Close modal when clicking outside
    window.addEventListener('click', (e) => {
        if (e.target === modal) {
            closeModalFunc();
        }
    });

    // Form Submission
    const form = document.getElementById('signupForm');
    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const roleInput = document.querySelector('input[name="role"]:checked');
            const role = roleInput ? roleInput.value : 'customer';

            // User Info
            const nameInput = document.getElementById('nameInput');
            const contactInput = document.getElementById('contactInput');
            const passwordInput = document.getElementById('passwordInput');

            const isLogin = currentMode === 'login';
            const endpoint = isLogin ? 'http://localhost:5000/api/auth/login' : 'http://localhost:5000/api/auth/register';

            const payload = {
                email: contactInput.value,
                password: passwordInput.value
            };

            if (!isLogin) {
                payload.name = nameInput.value;
                payload.role = role;
            }

            try {
                const response = await fetch(endpoint, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });

                const data = await response.json();

                if (response.ok) {
                    // Success
                    // Clear previous session data safely
                    ['myStore', 'myItems', 'vendorStores', 'userId', 'userRole', 'userName', 'userContact'].forEach(k => localStorage.removeItem(k));

                    localStorage.setItem('userId', data.userId);
                    localStorage.setItem('userRole', data.role);

                    if (data.name) {
                        localStorage.setItem('userName', data.name);
                    } else if (nameInput) {
                        localStorage.setItem('userName', nameInput.value);
                    }
                    localStorage.setItem('userContact', contactInput.value);

                    // Redirect based on role
                    if (data.role === 'vendor') {
                        window.location.href = 'vendor.html';
                    } else {
                        window.location.href = 'customer.html';
                    }
                } else {
                    // Failed
                    alert(data.message || 'Authentication failed');
                }
            } catch (error) {
                console.error("Error communicating with backend:", error);
                alert("Failed to connect to backend server. Make sure it is running.");
            }
        });
    }
});
