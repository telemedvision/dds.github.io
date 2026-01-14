// Login form handling
document.addEventListener('DOMContentLoaded', function() {
    var form = document.getElementById('loginForm');
    
    // Clear any lingering logout state from admin page
    localStorage.removeItem('isLoggingOut');
    
    // Check authentication status (allow re-login even if logged in)
    checkAuthStatus();
    
    // Handle login form submission
    form.addEventListener('submit', function(e) {
        e.preventDefault();
        
        var username = document.getElementById('username').value;
        var password = document.getElementById('password').value;
        
        if (!username || !password) {
            showError('Please enter both username and password');
            return;
        }
        
        fetch('/api/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ username: username, password: password })
        })
            .then(function(response) {
                return response.json();
            })
            .then(function(result) {
                if (result.success) {
                    // Update authentication data (allow re-login)
                    localStorage.setItem('authToken', result.token);
                    localStorage.setItem('username', result.username);
                    localStorage.setItem('isAdmin', result.isAdmin);
                    localStorage.setItem('loginTime', new Date().toISOString());
                    
                    // Redirect to admin dashboard
                    window.location.href = '/admin';
                } else {
                    showError(result.message || 'Invalid username or password');
                }
            })
            .catch(function(error) {
                console.error('Login error:', error);
                showError('Login failed. Please try again.');
            });
    });
});

// Check authentication status
function checkAuthStatus() {
    const token = localStorage.getItem('authToken');
    const loginTime = localStorage.getItem('loginTime');
    
    // Only redirect if not on login page and not authenticated
    if (!token || !loginTime) {
        if (window.location.pathname !== '/login') {
            window.location.href = '/login';
            return;
        }
    }
    
    // Only check session time if loginTime exists and is valid
    if (loginTime) {
        const loginDate = new Date(loginTime);
        const now = new Date();
        
        // Check if date is valid
        if (isNaN(loginDate.getTime())) {
            // Invalid date - clear session and redirect
            clearSession();
            window.location.href = '/login';
            return;
        }
        
        const hoursSinceLogin = (now - loginDate) / (1000 * 60 * 60);
        
        if (hoursSinceLogin >= 24) {
            clearSession();
            window.location.href = '/login';
            return;
        }
    }
    
    // No user info display needed on login page
}

// Show error message
function showError(message) {
    const errorDiv = document.getElementById('errorMessage');
    errorDiv.textContent = message;
    errorDiv.style.display = 'block';
    
    // Hide after 5 seconds
    setTimeout(function() {
        errorDiv.style.display = 'none';
    }, 5000);
}

// Clear session
function clearSession() {
    localStorage.removeItem('authToken');
    localStorage.removeItem('username');
    localStorage.removeItem('isAdmin');
    localStorage.removeItem('loginTime');
}