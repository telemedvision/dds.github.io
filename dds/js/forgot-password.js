// Forgot password handling
document.addEventListener('DOMContentLoaded', function() {
    var form = document.getElementById('forgotForm');
    
    // Handle forgot password form submission
    form.addEventListener('submit', function(e) {
        e.preventDefault();
        
        var username = document.getElementById('username').value;
        
        if (!username) {
            showError('Please enter your username');
            return;
        }
        
        fetch('/api/forgot-password', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ username: username })
        })
            .then(function(response) {
                return response.json();
            })
            .then(function(result) {
                if (result.success) {
                    showSuccess('Password reset instructions have been sent');
                    
                    // For development, show token (in production, this would be emailed)
                    if (result.token) {
                        setTimeout(function() {
                            if (typeof confirm !== 'undefined' && 
                                confirm('Token generated: ' + result.token.substring(0, 8) + '...\n\nIn production, this would be sent via email.\n\nWould you like to use this token now?')) {
                                window.location.href = '/reset-password?token=' + result.token;
                            }
                        }, 2000);
                    }
                } else {
                    showError(result.message || 'Failed to process request');
                }
            })
            .catch(function(error) {
                console.error('Forgot password error:', error);
                showError('Request failed. Please try again.');
            });
    });
});

// Show error message
function showError(message) {
    const errorDiv = document.getElementById('errorMessage');
    const successDiv = document.getElementById('successMessage');
    
    errorDiv.textContent = message;
    errorDiv.style.display = 'block';
    successDiv.style.display = 'none';
    
    // Hide after 5 seconds
    setTimeout(function() {
        errorDiv.style.display = 'none';
    }, 5000);
}

// Show success message
function showSuccess(message) {
    const errorDiv = document.getElementById('errorMessage');
    const successDiv = document.getElementById('successMessage');
    
    successDiv.textContent = message;
    successDiv.style.display = 'block';
    errorDiv.style.display = 'none';
}