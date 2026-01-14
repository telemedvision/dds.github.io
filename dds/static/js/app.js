// DDS Questionnaire Application JavaScript
class DDSQuestionnaire {
    constructor() {
        this.currentSection = 0;
        this.sections = ['consent', 'sociodemographic', 'dds-17', 'health-facility', 'psychosocial'];
        this.formData = {};
        this.validationRules = this.getValidationRules();
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.updateProgress();
        this.setupRadioButtons();
        this.setupFormValidation();
        this.loadSavedData();
    }

    setupEventListeners() {
        // Form submission
        const form = document.getElementById('dds-form');
        if (form) {
            form.addEventListener('submit', (e) => this.handleFormSubmit(e));
        }

        // Navigation buttons
        document.querySelectorAll('.btn-nav').forEach(btn => {
            btn.addEventListener('click', (e) => this.handleNavigation(e));
        });

        // Save progress
        document.querySelectorAll('.btn-save').forEach(btn => {
            btn.addEventListener('click', () => this.saveProgress());
        });

        // Clear form
        document.querySelectorAll('.btn-clear').forEach(btn => {
            btn.addEventListener('click', () => this.clearForm());
        });

        // Auto-save on change
        document.querySelectorAll('input').forEach(input => {
            input.addEventListener('change', () => this.autoSave());
        });
    }

    setupRadioButtons() {
        // Enhanced radio button interactions
        document.querySelectorAll('.radio-option').forEach(option => {
            const radio = option.querySelector('input[type="radio"]');
            if (radio) {
                option.addEventListener('click', () => {
                    // Remove selected class from siblings
                    option.parentElement.querySelectorAll('.radio-option').forEach(opt => {
                        opt.classList.remove('selected');
                    });
                    // Add selected class to clicked option
                    option.classList.add('selected');
                    radio.checked = true;
                    this.autoSave();
                });

                // Set initial state
                if (radio.checked) {
                    option.classList.add('selected');
                }
            }
        });
    }

    setupFormValidation() {
        // Real-time validation
        document.querySelectorAll('input[required]').forEach(input => {
            input.addEventListener('blur', () => this.validateField(input));
            input.addEventListener('input', () => this.clearFieldError(input));
        });

        // Text input validation
        document.querySelectorAll('input[type="text"]').forEach(input => {
            input.addEventListener('input', () => this.validateTextInput(input));
        });
    }

    getValidationRules() {
        return {
            consent: {
                'participant-signature': { required: true, message: 'Participant signature is required' },
                'investigator-signature': { required: true, message: 'Investigator signature is required' }
            },
            sociodemographic: {
                'sociodem-age': { required: true, message: 'Please select your age range' },
                'sociodem-marital': { required: true, message: 'Please select your marital status' },
                'sociodem-gender': { required: true, message: 'Please select your gender' },
                'sociodem-education': { required: true, message: 'Please select your education level' },
                'sociodem-employment': { required: true, message: 'Please select your employment status' },
                'sociodem-living': { required: true, message: 'Please select who you live with' },
                'sociodem-insurance': { required: true, message: 'Please select your insurance status' },
                'sociodem-payment': { required: true, message: 'Please answer this question' }
            },
            'dds-17': (function() {
                var ddsRules = {};
                for (var i = 1; i <= 17; i++) {
                    ddsRules['dds-' + i] = { required: true, message: 'Please answer question ' + i };
                }
                return ddsRules;
            })(),
            'health-facility': {
                'health-travel': { required: true, message: 'Please select travel time' },
                'health-transport': { required: true, message: 'Please select transport mode' },
                'health-wait': { required: true, message: 'Please select waiting time' },
                'health-rating': { required: true, message: 'Please rate waiting time' },
                'health-missed': { required: true, message: 'Please answer this question' }
            },
            psychosocial: {
                'psychosocial-help': { required: true, message: 'Please answer this question' },
                'psychosocial-helper': { required: true, message: 'Please select who helps you most' },
                'psychosocial-exercise': { required: true, message: 'Please answer this question' },
                'psychosocial-diet': { required: true, message: 'Please answer this question' },
                'psychosocial-education': { required: true, message: 'Please answer this question' },
                'psychosocial-foods': { required: true, message: 'Please answer this question' },
                'psychosocial-meal-plan': { required: true, message: 'Please answer this question' }
            }
        };
    }

    validateField(field) {
        const fieldName = field.name;
        const section = this.getCurrentSection();
        const rules = this.validationRules[section];

        if (rules && rules[fieldName]) {
            const rule = rules[fieldName];
            
            if (rule.required && !field.checked && field.type === 'radio') {
                this.showFieldError(field, rule.message);
                return false;
            }

            if (rule.required && field.type === 'text' && !field.value.trim()) {
                this.showFieldError(field, rule.message);
                return false;
            }
        }

        this.clearFieldError(field);
        return true;
    }

    validateTextInput(input) {
        const value = input.value.trim();
        
        // Special validation for "Other" text fields
        if (input.name.includes('other') && input.type === 'text') {
            const correspondingRadio = document.querySelector(`input[name="${input.name.replace('-text', '')}"][value="4"]`);
            if (correspondingRadio && correspondingRadio.checked && !value) {
                this.showFieldError(input, 'Please specify the "Other" option');
                return false;
            }
        }

        this.clearFieldError(input);
        return true;
    }

    showFieldError(field, message) {
        this.clearFieldError(field);
        
        if (field.type === 'radio') {
            // Show error on the fieldset
            const fieldset = field.closest('fieldset');
            fieldset.classList.add('error');
            
            const errorDiv = document.createElement('div');
            errorDiv.className = 'error-message';
            errorDiv.innerHTML = `⚠️ ${message}`;
            fieldset.appendChild(errorDiv);
        } else {
            // Show error on the input
            field.classList.add('error');
            
            const errorDiv = document.createElement('div');
            errorDiv.className = 'error-message';
            errorDiv.innerHTML = `⚠️ ${message}`;
            field.parentNode.appendChild(errorDiv);
        }
    }

    clearFieldError(field) {
        if (field.type === 'radio') {
            const fieldset = field.closest('fieldset');
            if (fieldset) {
                fieldset.classList.remove('error');
                const errorMessage = fieldset.querySelector('.error-message');
                if (errorMessage) {
                    errorMessage.remove();
                }
            }
        } else {
            field.classList.remove('error');
            const errorMessage = field.parentNode.querySelector('.error-message');
            if (errorMessage) {
                errorMessage.remove();
            }
        }
    }

    validateSection(section) {
        const rules = this.validationRules[section];
        let isValid = true;

        if (rules) {
            Object.keys(rules).forEach(fieldName => {
                const field = document.querySelector(`input[name="${fieldName}"]`);
                if (field) {
                    if (field.type === 'radio') {
                        const checkedRadio = document.querySelector(`input[name="${fieldName}"]:checked`);
                        if (!checkedRadio) {
                            this.showFieldError(field, rules[fieldName].message);
                            isValid = false;
                        }
                    } else {
                        if (!this.validateField(field)) {
                            isValid = false;
                        }
                    }
                }
            });
        }

        return isValid;
    }

    getCurrentSection() {
        // Determine current section based on visible elements
        if (document.querySelector('.consent-section:not([style*="display: none"])')) {
            return 'consent';
        } else if (document.querySelector('#sociodemographic-section:not([style*="display: none"])')) {
            return 'sociodemographic';
        } else if (document.querySelector('#dds-17-section:not([style*="display: none"])')) {
            return 'dds-17';
        } else if (document.querySelector('#health-facility-section:not([style*="display: none"])')) {
            return 'health-facility';
        } else if (document.querySelector('#psychosocial-section:not([style*="display: none"])')) {
            return 'psychosocial';
        }
        return 'consent';
    }

    handleNavigation(e) {
        e.preventDefault();
        const direction = e.target.dataset.direction;
        
        if (direction === 'next') {
            if (this.validateCurrentSection()) {
                this.nextSection();
            } else {
                this.showNotification('Please complete all required fields before proceeding', 'error');
            }
        } else if (direction === 'prev') {
            this.previousSection();
        }
    }

    validateCurrentSection() {
        const section = this.getCurrentSection();
        return this.validateSection(section);
    }

    nextSection() {
        if (this.currentSection < this.sections.length - 1) {
            this.saveCurrentSectionData();
            this.currentSection++;
            this.showSection(this.sections[this.currentSection]);
            this.updateProgress();
        }
    }

    previousSection() {
        if (this.currentSection > 0) {
            this.saveCurrentSectionData();
            this.currentSection--;
            this.showSection(this.sections[this.currentSection]);
            this.updateProgress();
        }
    }

    showSection(sectionName) {
        // Hide all sections
        document.querySelectorAll('.section').forEach(section => {
            section.style.display = 'none';
        });

        // Show current section
        const currentSectionElement = document.getElementById(`${sectionName}-section`);
        if (currentSectionElement) {
            currentSectionElement.style.display = 'block';
        }

        // Update navigation buttons
        this.updateNavigationButtons();
    }

    updateNavigationButtons() {
        const prevBtn = document.querySelector('.btn-prev');
        const nextBtn = document.querySelector('.btn-next');
        const submitBtn = document.querySelector('.btn-submit');

        if (prevBtn) {
            prevBtn.style.display = this.currentSection === 0 ? 'none' : 'inline-flex';
        }

        if (nextBtn && submitBtn) {
            if (this.currentSection === this.sections.length - 1) {
                nextBtn.style.display = 'none';
                submitBtn.style.display = 'inline-flex';
            } else {
                nextBtn.style.display = 'inline-flex';
                submitBtn.style.display = 'none';
            }
        }
    }

    updateProgress() {
        const progressFill = document.querySelector('.progress-fill');
        const progressText = document.querySelector('.progress-text');
        
        if (progressFill && progressText) {
            const progress = ((this.currentSection + 1) / this.sections.length) * 100;
            progressFill.style.width = `${progress}%`;
            progressText.textContent = `Step ${this.currentSection + 1} of ${this.sections.length}`;
        }
    }

    saveCurrentSectionData() {
        const section = this.getCurrentSection();
        const sectionData = {};

        // Collect all form data from current section
        document.querySelectorAll(`#${section}-section input`).forEach(input => {
            if (input.type === 'radio' && input.checked) {
                sectionData[input.name] = input.value;
            } else if (input.type === 'text') {
                sectionData[input.name] = input.value;
            }
        });

        this.formData[section] = sectionData;
    }

    handleFormSubmit(e) {
        var self = this;
        e.preventDefault();

        // Validate all sections
        var isValid = true;
        this.sections.forEach(function(section) {
            if (!self.validateSection(section)) {
                isValid = false;
            }
        });

        if (!isValid) {
            this.showNotification('Please complete all required fields', 'error');
            return;
        }

        // Collect all form data
        this.collectAllFormData();

        // Show loading state
        var submitBtn = document.querySelector('.btn-submit');
        var originalText = submitBtn.innerHTML;
        submitBtn.innerHTML = '<span class="spinner"></span> Submitting...';
        submitBtn.disabled = true;

        // Submit to backend
        this.submitToBackend()
            .then(function(response) {
                if (response.success) {
                    self.showNotification('Questionnaire submitted successfully!', 'success');
                    self.clearSavedData();
                    setTimeout(function() {
                        window.location.href = '/thank-you';
                    }, 2000);
                } else {
                    throw new Error(response.message || 'Submission failed');
                }
            })
            .catch(function(error) {
                console.error('Submission error:', error);
                self.showNotification('Failed to submit questionnaire. Please try again.', 'error');
            })
            .finally(function() {
                // Restore button state
                var submitBtn = document.querySelector('.btn-submit');
                submitBtn.innerHTML = originalText;
                submitBtn.disabled = false;
            });
    }

    collectAllFormData() {
        this.formData = {};
        
        document.querySelectorAll('input').forEach(input => {
            if (input.type === 'radio' && input.checked) {
                this.formData[input.name] = input.value;
            } else if (input.type === 'text' && input.value) {
                this.formData[input.name] = input.value;
            }
        });

        // Add metadata
        this.formData.metadata = {
            submittedAt: new Date().toISOString(),
            userAgent: navigator.userAgent,
            sessionId: this.getSessionId()
        };
    }

    submitToBackend() {
        var self = this;
        // Try multiple backends in order of preference
        var backends = [
            '/api/submit',  // Node.js/Express
            '/python/api/submit',  // Python/FastAPI
            '/go/api/submit'  // Go/Gin
        ];

        // Try each backend in sequence
        return new Promise(function(resolve, reject) {
            function tryBackend(index) {
                if (index >= backends.length) {
                    reject(new Error('All backends failed to respond'));
                    return;
                }

                var endpoint = backends[index];
                fetch(endpoint, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(self.formData)
                })
                    .then(function(response) {
                        if (response.ok) {
                            return response.json();
                        } else {
                            throw new Error('Backend response not ok');
                        }
                    })
                    .then(function(data) {
                        resolve(data);
                    })
                    .catch(function(error) {
                        console.log('Backend ' + endpoint + ' failed:', error);
                        // Try next backend
                        tryBackend(index + 1);
                    });
            }

            tryBackend(0);
        });
    }

    saveProgress() {
        this.collectAllFormData();
        localStorage.setItem('dds-questionnaire-progress', JSON.stringify({
            currentSection: this.currentSection,
            formData: this.formData,
            savedAt: new Date().toISOString()
        }));

        this.showNotification('Progress saved successfully', 'success');
    }

    autoSave() {
        this.saveCurrentSectionData();
        localStorage.setItem('dds-questionnaire-autosave', JSON.stringify({
            currentSection: this.currentSection,
            formData: this.formData,
            savedAt: new Date().toISOString()
        }));
    }

    loadSavedData() {
        const saved = localStorage.getItem('dds-questionnaire-autosave');
        if (saved) {
            try {
                const data = JSON.parse(saved);
                this.formData = data.formData || {};
                this.currentSection = data.currentSection || 0;

                // Restore form fields
                Object.keys(this.formData).forEach(fieldName => {
                    const value = this.formData[fieldName];
                    const field = document.querySelector(`input[name="${fieldName}"][value="${value}"]`);
                    if (field) {
                        field.checked = true;
                        const option = field.closest('.radio-option');
                        if (option) {
                            option.classList.add('selected');
                        }
                    } else {
                        // Try text input
                        const textField = document.querySelector(`input[name="${fieldName}"]`);
                        if (textField && textField.type === 'text') {
                            textField.value = value;
                        }
                    }
                });

                this.updateProgress();
                this.showSection(this.sections[this.currentSection]);
                
                // Show notification about restored data
                this.showNotification('Previous progress restored', 'info');
            } catch (error) {
                console.error('Failed to load saved data:', error);
            }
        }
    }

    clearSavedData() {
        localStorage.removeItem('dds-questionnaire-progress');
        localStorage.removeItem('dds-questionnaire-autosave');
    }

    clearForm() {
        if (typeof confirm !== 'undefined' && confirm('Are you sure you want to clear all form data? This cannot be undone.')) {
            document.querySelectorAll('input').forEach(input => {
                if (input.type === 'radio') {
                    input.checked = false;
                    const option = input.closest('.radio-option');
                    if (option) {
                        option.classList.remove('selected');
                    }
                } else if (input.type === 'text') {
                    input.value = '';
                }
            });

            this.clearSavedData();
            this.formData = {};
            this.currentSection = 0;
            this.updateProgress();
            this.showSection(this.sections[0]);

            this.showNotification('Form cleared successfully', 'success');
        }
    }

    showNotification(message, type = 'info') {
        // Remove existing notifications
        const existingNotification = document.querySelector('.notification');
        if (existingNotification) {
            existingNotification.remove();
        }

        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.innerHTML = `
            <div class="notification-content">
                <span class="notification-icon">
                    ${type === 'success' ? '✅' : type === 'error' ? '❌' : 'ℹ️'}
                </span>
                <span class="notification-message">${message}</span>
                <button class="notification-close" onclick="this.parentElement.parentElement.remove()">×</button>
            </div>
        `;

        // Add notification styles
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 1000;
            background: ${type === 'success' ? 'var(--secondary-color)' : type === 'error' ? 'var(--danger-color)' : 'var(--primary-color)'};
            color: white;
            padding: 1rem 1.5rem;
            border-radius: var(--radius-md);
            box-shadow: var(--shadow-lg);
            max-width: 400px;
            animation: slideIn 0.3s ease;
        `;

        // Add to page
        document.body.appendChild(notification);

        // Auto-remove after 5 seconds
        setTimeout(() => {
            if (notification.parentNode) {
                notification.remove();
            }
        }, 5000);
    }

    getSessionId() {
        let sessionId = sessionStorage.getItem('dds-session-id');
        if (!sessionId) {
            sessionId = 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
            sessionStorage.setItem('dds-session-id', sessionId);
        }
        return sessionId;
    }

    // Utility functions
    formatDateTime(date) {
        return new Date(date).toLocaleString();
    }

    calculateDDSScore() {
        let totalScore = 0;
        let answeredQuestions = 0;

        for (let i = 1; i <= 17; i++) {
            const answer = this.formData[`dds-${i}`];
            if (answer) {
                totalScore += parseInt(answer);
                answeredQuestions++;
            }
        }

        return {
            totalScore,
            averageScore: answeredQuestions > 0 ? (totalScore / answeredQuestions).toFixed(2) : 0,
            answeredQuestions,
            totalQuestions: 17
        };
    }
}

// Add CSS animations
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }

    .notification-content {
        display: flex;
        align-items: center;
        gap: 0.75rem;
    }

    .notification-close {
        background: none;
        border: none;
        color: white;
        font-size: 1.25rem;
        cursor: pointer;
        padding: 0;
        margin-left: auto;
    }

    .notification-close:hover {
        opacity: 0.8;
    }
`;
document.head.appendChild(style);

// Initialize the application when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.ddsApp = new DDSQuestionnaire();
});

// Export for use in other scripts
if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
    module.exports = DDSQuestionnaire;
}