// Form validation and submission handling
document.addEventListener('DOMContentLoaded', function() {
    const form = document.querySelector('form');
    
    // Form validation rules
    const validationRules = {
        // Sociodemographic validation
        'sociodem-age': {
            required: true,
            message: 'Please select your age group'
        },
        'sociodem-marital': {
            required: true,
            message: 'Please select your marital status'
        },
        'sociodem-gender': {
            required: true,
            message: 'Please select your gender'
        },
        'sociodem-education': {
            required: true,
            message: 'Please select your education level'
        },
        'sociodem-employment': {
            required: true,
            message: 'Please select your employment status'
        },
        'sociodem-living': {
            required: true,
            message: 'Please select your living situation'
        },
        'sociodem-insurance': {
            required: true,
            message: 'Please indicate if you have health insurance'
        },
        'sociodem-payment': {
            required: true,
            message: 'Please answer the payment difficulty question'
        },
        
        // DDS validation - all questions required
        
        // Health facility validation
        'health-travel': {
            required: true,
            message: 'Please select travel time'
        },
        'health-transport': {
            required: true,
            message: 'Please select transport mode'
        },
        'health-wait': {
            required: true,
            message: 'Please select wait time'
        },
        'health-rating': {
            required: true,
            message: 'Please rate the waiting time'
        },
        'health-missed': {
            required: true,
            message: 'Please answer the missed visit question'
        },
        
        // Psychosocial validation
        'psychosocial-help': {
            required: true,
            message: 'Please answer the help frequency question'
        },
        'psychosocial-helper': {
            required: true,
            message: 'Please select who helps you most'
        },
        'psychosocial-exercise': {
            required: true,
            message: 'Please answer the exercise advice question'
        },
        'psychosocial-diet': {
            required: true,
            message: 'Please answer the diet advice question'
        },
        'psychosocial-education': {
            required: true,
            message: 'Please answer the diabetes education question'
        },
        'psychosocial-foods': {
            required: true,
            message: 'Please answer the food restriction question'
        },
        'psychosocial-meal-plan': {
            required: true,
            message: 'Please answer meal plan compliance question'
        }
    };
    
    // Add DDS validation rules (all questions 1-17)
    for (var i = 1; i <= 17; i++) {
        validationRules['dds-' + i] = {
            required: true,
            message: 'Please answer DDS question ' + i
        };
    }
    
    // Validate form
    function validateForm() {
        const errors = [];
        
        // Check all validation rules
        for (const [fieldName, rule] of Object.entries(validationRules)) {
            const field = document.querySelector(`[name="${fieldName}"]`);
            
            if (rule.required) {
                let isValid = false;
                let elementToFocus = null;
                
                if (field && field.type === 'radio') {
                    // For radio buttons, check if any option in the group is checked
                    const radioGroup = document.querySelectorAll(`[name="${fieldName}"]`);
                    const checkedRadio = Array.from(radioGroup).find(radio => radio.checked);
                    isValid = checkedRadio !== undefined;
                    elementToFocus = checkedRadio || radioGroup[0];
                } else if (field) {
                    // For other field types
                    isValid = field.value.trim() !== '' || field.checked;
                    elementToFocus = field;
                }
                
                if (!isValid) {
                    errors.push({
                        field: fieldName,
                        message: rule.message,
                        element: elementToFocus
                    });
                }
            }
        }
        
        // Special validation: if "Other" transport is selected, require text
        const transportOther = document.querySelector('[name="health-transport"][value="4"]');
        const transportOtherText = document.getElementById('health-transport-other-text');
        if (transportOther && transportOther.checked && (!transportOtherText || !transportOtherText.value.trim())) {
            errors.push({
                field: 'health-transport-other-text',
                message: 'Please specify other transport mode',
                element: transportOtherText
            });
        }
        
        return errors;
    }
    
    // Display validation errors
    function displayErrors(errors) {
        // Clear previous errors
        clearErrors();
        
        errors.forEach((error, index) => {
            const element = error.element;
            if (element) {
                // Add error class
                element.classList.add('error');
                
                // Create error message
                const errorMessage = document.createElement('div');
                errorMessage.className = 'error-message';
                errorMessage.textContent = error.message;
                errorMessage.setAttribute('data-error-for', error.field);
                
                // Insert error message after the field's parent fieldset or label
                const parent = element.closest('fieldset') || element.closest('.sub-question') || element.parentElement;
                if (parent) {
                    parent.appendChild(errorMessage);
                }
                
                // Focus on first error
                if (index === 0) {
                    element.focus();
                    element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
            }
        });
    }
    
    // Clear all error displays
    function clearErrors() {
        // Remove error classes
        document.querySelectorAll('.error').forEach(element => {
            element.classList.remove('error');
        });
        
        // Remove error messages
        document.querySelectorAll('.error-message').forEach(element => {
            element.remove();
        });
    }
    
    // Real-time validation feedback
    function setupRealtimeValidation() {
        // Radio button validation
        document.querySelectorAll('input[type="radio"]').forEach(radio => {
            radio.addEventListener('change', function() {
                const fieldName = this.name;
                const fieldset = this.closest('fieldset');
                const fieldsetError = fieldset ? fieldset.querySelector('.error-message') : null;
                
                if (fieldsetError && fieldsetError.getAttribute('data-error-for') === fieldName) {
                    fieldsetError.remove();
                    document.querySelectorAll(`[name="${fieldName}"]`).forEach(el => {
                        el.classList.remove('error');
                    });
                }
            });
        });
        
        // Text input validation
        document.querySelectorAll('input[type="text"]').forEach(input => {
            input.addEventListener('input', function() {
                if (this.value.trim()) {
                    this.classList.remove('error');
                    const errorMessage = this.parentElement.querySelector('.error-message');
                    if (errorMessage) {
                        errorMessage.remove();
                    }
                }
            });
        });
    }
    
    // Show validation summary
    function showValidationSummary(errors) {
        const summaryDiv = document.createElement('div');
        summaryDiv.className = 'validation-summary';
        summaryDiv.innerHTML = `
            <h3>Please correct the following errors:</h3>
            <ul>
                ${errors.map(error => `<li>${error.message}</li>`).join('')}
            </ul>
        `;
        
        // Insert at the top of the form
        form.insertBefore(summaryDiv, form.firstChild);
        summaryDiv.scrollIntoView({ behavior: 'smooth' });
    }
    
    // Form submission handler
    if (form) {
        form.addEventListener('submit', function(e) {
            e.preventDefault();
            
            // Clear previous errors
            clearErrors();
            
            // Validate form
            const errors = validateForm();
            
            if (errors.length > 0) {
                displayErrors(errors);
                showValidationSummary(errors);
                return;
            }
            
            // Collect form data
            const formData = new FormData(form);
            const data = {};
            
            // Convert FormData to JSON
            for (let [key, value] of formData.entries()) {
                // For radio buttons, only keep the checked value
                if (data[key]) {
                    // Skip duplicate radio button values
                    continue;
                }
                data[key] = value;
            }
            
            // Show loading state
            const submitButton = form.querySelector('button[type="submit"]') || 
                                document.querySelector('input[type="submit"]') ||
                                createSubmitButton();
            
            if (submitButton) {
                submitButton.disabled = true;
                submitButton.textContent = 'Submitting...';
            }
            
            // Submit data to server
            submitFormData(data, submitButton);
        });
    }
    
    // Create submit button if none exists
    function createSubmitButton() {
        const button = document.createElement('button');
        button.type = 'submit';
        button.textContent = 'Submit Questionnaire';
        button.className = 'submit-btn';
        form.appendChild(button);
        return button;
    }
    
    // Submit form data to server
    function submitFormData(data, submitButton) {
        return fetch('/submit', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data)
        })
            .then(function(response) {
                return response.json();
            })
            .then(function(result) {
                    if (result.success) {
                        // Show success message
                        showSuccessMessage(result.participant_id);
                    
                    // Redirect to thank you page immediately
                    window.location.href = '/thank-you';
                } else {
                    throw new Error(result.message || 'Submission failed');
                }
            })
            .catch(function(error) {
                console.error('Submission error:', error);
                showErrorMessage(error.message);
            })
            .finally(function() {
                // Re-enable submit button
                if (submitButton) {
                    submitButton.disabled = false;
                    submitButton.textContent = 'Submit Questionnaire';
                }
            });
    }
    
    // Show success message
    function showSuccessMessage(participantId) {
        const successDiv = document.createElement('div');
        successDiv.className = 'success-message';
        successDiv.innerHTML = `
            <h3>✓ Questionnaire Submitted Successfully!</h3>
            <p>Your responses have been recorded.</p>
            ${participantId ? `<p>Participant ID: ${participantId}</p>` : ''}
            <p>Redirecting to thank you page...</p>
        `;
        
        form.parentElement.insertBefore(successDiv, form);
        successDiv.scrollIntoView({ behavior: 'smooth' });
    }
    
    // Show error message
    function showErrorMessage(message) {
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error-summary';
        errorDiv.innerHTML = `
            <h3>✗ Submission Failed</h3>
            <p>${message}</p>
            <p>Please try again or contact support if the problem persists.</p>
        `;
        
        form.parentElement.insertBefore(errorDiv, form);
        errorDiv.scrollIntoView({ behavior: 'smooth' });
        
        // Remove error message after 5 seconds
        setTimeout(() => {
            errorDiv.remove();
        }, 5000);
    }
    
    // Setup real-time validation
    setupRealtimeValidation();
    
    // Add CSS styles for validation
    const style = document.createElement('style');
    style.textContent = `
        .error {
            border: 2px solid #dc3545 !important;
            background-color: #fff5f5 !important;
        }
        
        .error-message {
            color: #dc3545;
            font-size: 14px;
            margin-top: 5px;
            font-weight: bold;
        }
        
        .validation-summary {
            background: #fff3cd;
            border: 1px solid #ffeaa7;
            border-radius: 5px;
            padding: 15px;
            margin-bottom: 20px;
        }
        
        .validation-summary h3 {
            color: #856404;
            margin-top: 0;
        }
        
        .validation-summary ul {
            margin-bottom: 0;
            color: #856404;
        }
        
        .success-message {
            background: #d4edda;
            border: 1px solid #c3e6cb;
            border-radius: 5px;
            padding: 15px;
            margin-bottom: 20px;
            text-align: center;
        }
        
        .success-message h3 {
            color: #155724;
            margin-top: 0;
        }
        
        .error-summary {
            background: #f8d7da;
            border: 1px solid #f5c6cb;
            border-radius: 5px;
            padding: 15px;
            margin-bottom: 20px;
            text-align: center;
        }
        
        .error-summary h3 {
            color: #721c24;
            margin-top: 0;
        }
        
        .submit-btn {
            background: #007bff;
            color: white;
            padding: 12px 24px;
            border: none;
            border-radius: 5px;
            font-size: 16px;
            cursor: pointer;
            margin-top: 20px;
            transition: background 0.3s;
        }
        
        .submit-btn:hover:not(:disabled) {
            background: #0056b3;
        }
        
        .submit-btn:disabled {
            background: #6c757d;
            cursor: not-allowed;
        }
        
        input[type="radio"]:focus {
            outline: 2px solid #007bff;
            outline-offset: 2px;
        }
        
        fieldset {
            border: 1px solid #ddd;
            padding: 15px;
            margin-bottom: 15px;
            border-radius: 5px;
        }
        
        fieldset.error {
            border-color: #dc3545;
            background-color: #fff5f5;
        }
        
        legend {
            font-weight: bold;
            color: #333;
        }
        
        .dds-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 20px;
        }
        
        .dds-table th,
        .dds-table td {
            border: 1px solid #ddd;
            padding: 8px;
            text-align: left;
        }
        
        .dds-table th {
            background-color: #f2f2f2;
            font-weight: bold;
        }
        
        .dds-table .question-text {
            font-weight: normal;
            max-width: 300px;
        }
        
        .dds-table input[type="radio"] {
            margin: 0 5px;
        }
    `;
    document.head.appendChild(style);
});