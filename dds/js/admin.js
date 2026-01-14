// Administrative Dashboard JavaScript

let allParticipants = [];
let filteredParticipants = [];
let isLoggingOut = false;
let participantsRequestController = null;

// Load participants when page loads
document.addEventListener('DOMContentLoaded', function() {
    // Check authentication first before loading anything
    checkAuthStatus();
    setupLogoutHandler();
    setupRealtimeSearch();
});

// Check authentication status
function checkAuthStatus() {
    const token = localStorage.getItem('authToken');
    const loginTime = localStorage.getItem('loginTime');
    const authLoading = document.getElementById('authLoading');
    
    // First, check if session exists
    if (!token || !loginTime) {
        // Only redirect if not on login page and not authenticated
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
    
    // Hide loading message and show content
    if (authLoading) {
        authLoading.style.display = 'none';
    }
    
    // Update UI with current user info
    updateUserInfo();
    
    // Load participants only after successful authentication
    if (window.location.pathname.includes('/admin')) {
        loadParticipants();
    }
}

// Update user info display
function updateUserInfo() {
    const username = localStorage.getItem('username');
    const isAdmin = localStorage.getItem('isAdmin') === 'true';
    
    if (username) {
        // Add user info to admin header
        const adminHeader = document.querySelector('.admin-header');
        if (adminHeader) {
            const userInfo = document.createElement('div');
            userInfo.innerHTML = `
                <div style="text-align: right;">
                    <span style="margin-right: 15px;">Logged in as: <strong>${username}</strong></span>
                    <button class="btn" onclick="logout()" style="background: #e74c3c;">Logout</button>
                    ${isAdmin ? '<button class="btn" onclick="showUserManager()" style="background: #f39c12; margin-left: 10px;">Manage Users</button>' : ''}
                </div>
            `;
            adminHeader.appendChild(userInfo);
        }
    }
}

// Setup logout handler
function setupLogoutHandler() {
    // Add keyboard shortcut for logout
    document.addEventListener('keydown', function(e) {
        if (e.ctrlKey && e.key === 'l') {
            e.preventDefault();
            logout();
        }
    });
}

// Logout function
function logout() {
    if (confirm('Are you sure you want to logout?')) {
        isLoggingOut = true; // Prevent new requests during logout
        
        // Cancel any ongoing participants request
        if (participantsRequestController) {
            participantsRequestController.abort();
        }
        
        // Find logout button for loading state
        const logoutBtn = document.querySelector('[onclick="logout()"]');
        const originalText = logoutBtn ? logoutBtn.textContent : '';
        
        // Show loading state
        if (logoutBtn) {
            logoutBtn.disabled = true;
            logoutBtn.textContent = 'Logging out...';
        }
        
        // Call backend to properly clear server session
        fetch('/api/logout', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        })
        .then(function(response) {
            return response.json();
        })
        .then(function(result) {
            if (result.success) {
                clearSession();
                window.location.href = '/login';
            } else {
                alert('Logout failed on server. Please try again.');
                isLoggingOut = false; // Reset state on failure
                // Reset button state
                if (logoutBtn) {
                    logoutBtn.disabled = false;
                    logoutBtn.textContent = originalText;
                }
            }
        })
        .catch(function(error) {
            console.error('Logout error:', error);
            // Fallback: clear local session and redirect anyway
            clearSession();
            window.location.href = '/login';
        });
    }
}

// Clear session
function clearSession() {
    localStorage.removeItem('authToken');
    localStorage.removeItem('username');
    localStorage.removeItem('isAdmin');
    localStorage.removeItem('loginTime');
    isLoggingOut = false; // Reset logout state
    
    // Cancel any ongoing requests
    if (participantsRequestController) {
        participantsRequestController.abort();
        participantsRequestController = null;
    }
}

// Setup real-time search
function setupRealtimeSearch() {
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('input', function() {
            searchParticipants();
        });
    }
}

// Load all participants from the server
function loadParticipants() {
    // Skip if logging out
    if (isLoggingOut) {
        return Promise.resolve();
    }
    
    // Cancel any existing request
    if (participantsRequestController) {
        participantsRequestController.abort();
    }
    
    // Create new abort controller
    participantsRequestController = new AbortController();
    
    // Show loading indicator
    const loadingMsg = document.getElementById('authLoading');
    if (loadingMsg) {
        loadingMsg.innerHTML = 'Loading participants data...';
        loadingMsg.style.display = 'block';
    }
    
    return fetch('/api/admin/participants', {
        signal: participantsRequestController.signal
    })
        .then(function(response) {
            return response.json();
        })
        .then(function(participants) {
            // Ensure participants is an array
            if (!Array.isArray(participants)) {
                console.error('Expected array but got:', typeof participants, participants);
                participants = [];
            }
            allParticipants = participants;
            filteredParticipants = participants;
            renderParticipants();
            renderStats();
            
            // Hide loading indicator
            if (loadingMsg) {
                loadingMsg.style.display = 'none';
            }
        })
        .catch(function(error) {
            // Don't show error for aborted requests or auth redirects
            if (error.name !== 'AbortError' && 
                !error.message.includes('NS_BINDING_ABORTED') &&
                !error.message.includes('HTTP 401') &&
                !error.message.includes('Failed to fetch')) {
                console.error('Error loading participants:', error);
                showError('Failed to load participants data');
            } else if (error.message.includes('HTTP 401')) {
                // Silently redirect on auth error
                window.location.href = '/login';
            }
        });
}

// Render participants table
function renderParticipants() {
    const tbody = document.getElementById('participantsTableBody');
    const noDataMessage = document.getElementById('noDataMessage');
    
    if (filteredParticipants.length === 0) {
        tbody.innerHTML = '';
        noDataMessage.style.display = 'block';
        return;
    }
    
    noDataMessage.style.display = 'none';
    
    tbody.innerHTML = filteredParticipants.map(participant => {

        
        return `
            <tr>
                <td>${participant.id}</td>
                <td>${formatDate(participant.created_at)}</td>
                <td>${getAgeGroupText(participant.age_group)}</td>
                <td>${getGenderText(participant.gender)}</td>
                <td>${getScoreClass(parseFloat(participant.total_score), participant.total_score)}</td>
                <td>${getScoreClass(parseFloat(participant.emotional_burden), participant.emotional_burden)}</td>
                <td>${getScoreClass(parseFloat(participant.physician_related_distress), participant.physician_related_distress)}</td>
                <td>${getScoreClass(parseFloat(participant.regimen_distress), participant.regimen_distress)}</td>
                <td>${getScoreClass(parseFloat(participant.interpersonal_distress), participant.interpersonal_distress)}</td>
                <td>
                    <button class="btn btn-primary" onclick="viewDetails(${participant.id})">View Details</button>
                    <button class="btn btn-danger" onclick="deleteParticipant(${participant.id})">Delete</button>
                </td>
            </tr>
        `;
    }).join('');
}

// Render statistics
function renderStats() {
    const statsGrid = document.getElementById('statsGrid');
    
    const totalParticipants = allParticipants.length;
    const avgTotalScore = calculateAverage('total_score');
    const avgEmotionalBurden = calculateAverage('emotional_burden');
    const avgPhysicianDistress = calculateAverage('physician_related_distress');
    
    statsGrid.innerHTML = `
        <div class="stat-card">
            <div class="stat-number">${totalParticipants}</div>
            <div class="stat-label">Total Participants</div>
        </div>
        <div class="stat-card">
            <div class="stat-number">${avgTotalScore}</div>
            <div class="stat-label">Average Total Score</div>
        </div>
        <div class="stat-card">
            <div class="stat-number">${avgEmotionalBurden}</div>
            <div class="stat-label">Average Emotional Burden</div>
        </div>
        <div class="stat-card">
            <div class="stat-number">${avgPhysicianDistress}</div>
            <div class="stat-label">Average Physician Distress</div>
        </div>
    `;
}

// Calculate average for a score field
function calculateAverage(field) {
    const validScores = allParticipants
        .map(p => parseFloat(p[field]))
        .filter(score => !isNaN(score));
    
    if (validScores.length === 0) return 'N/A';
    return (validScores.reduce((sum, score) => sum + score, 0) / validScores.length).toFixed(2);
}

// Get score styling and classification
function getScoreClass(score, scoreText) {
    if (isNaN(score) || scoreText === null) return 'N/A';
    
    let className = '';
    if (score >= 3.0) {
        className = 'score-high';
    } else if (score >= 2.0) {
        className = 'score-medium';
    } else {
        className = 'score-low';
    }
    
    return `<span class="${className}">${parseFloat(score).toFixed(2)}</span>`;
}

// Format date
function formatDate(dateString) {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
}

// Get age group text
function getAgeGroupText(ageGroup) {
    const ageGroups = {
        1: '18-30 years',
        2: '30-40 years', 
        3: '40-50 years',
        4: '50-60 years',
        5: 'Above 60 years'
    };
    return ageGroups[ageGroup] || 'N/A';
}

// Get gender text
function getGenderText(gender) {
    const genders = {
        1: 'Male',
        2: 'Female'
    };
    return genders[gender] || 'N/A';
}

// Search participants
function searchParticipants() {
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();
    
    if (!searchTerm) {
        filteredParticipants = allParticipants;
    } else {
        filteredParticipants = allParticipants.filter(participant => {
            const participantId = participant.id.toString();
            const createdDate = new Date(participant.created_at).toLocaleDateString();
            const ageGroup = getAgeGroupText(participant.age_group).toLowerCase();
            const gender = getGenderText(participant.gender).toLowerCase();
            const totalScore = (participant.total_score || '').toString();
            
            return participantId.includes(searchTerm) || 
                   createdDate.toLowerCase().includes(searchTerm) ||
                   ageGroup.includes(searchTerm) ||
                   gender.includes(searchTerm) ||
                   totalScore.includes(searchTerm);
        });
    }
    
    renderParticipants();
    renderStats(); // Update stats with filtered data
}

// Clear search
function clearSearch() {
    document.getElementById('searchInput').value = '';
    filteredParticipants = allParticipants;
    renderParticipants();
}

// View participant details
function viewDetails(participantId) {
    fetch(`/api/admin/participants/${participantId}`)
        .then(function(response) {
            return response.json();
        })
        .then(function(details) {
            if (details.error) {
                showError(details.error);
                return;
            }
            
            showDetailsModal(details);
        })
        .catch(function(error) {
            console.error('Error loading participant details:', error);
            showError('Failed to load participant details');
        });
}

// Show details modal
function showDetailsModal(details) {
    const modal = document.getElementById('detailModal');
    const modalBody = document.getElementById('modalBody');
    
    modalBody.innerHTML = `
        <div class="detail-grid">
            <div class="detail-section">
                <h4>Basic Information</h4>
                <div class="detail-row">
                    <span class="detail-label">Participant ID:</span>
                    <span>${details.id}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Created:</span>
                    <span>${formatDate(details.created_at)}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Signature Date:</span>
                    <span>${details.signature_date || 'N/A'}</span>
                </div>
            </div>
            
            <div class="detail-section">
                <h4>Sociodemographic</h4>
                <div class="detail-row">
                    <span class="detail-label">Age Group:</span>
                    <span>${getAgeGroupText(details.age_group)}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Marital Status:</span>
                    <span>${getMaritalStatusText(details.marital_status)}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Gender:</span>
                    <span>${getGenderText(details.gender)}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Education:</span>
                    <span>${getEducationText(details.education_level)}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Employment:</span>
                    <span>${getEmploymentText(details.employment_status)}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Living With:</span>
                    <span>${getLivingWithText(details.living_situation)}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Has Insurance:</span>
                    <span>${getYesNoText(details.health_insurance)}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Treatment Cost Problem:</span>
                    <span>${getPaymentDifficultyText(details.payment_difficulty)}</span>
                </div>
            </div>
            
            <div class="detail-section">
                <h4>DDS Scores</h4>
                <div class="detail-row">
                    <span class="detail-label">Total Score:</span>
                    <span>${getScoreClass(parseFloat(details.total_score), details.total_score)}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Emotional Burden:</span>
                    <span>${getScoreClass(parseFloat(details.emotional_burden), details.emotional_burden)}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Physician Distress:</span>
                    <span>${getScoreClass(parseFloat(details.physician_related_distress), details.physician_related_distress)}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Regimen Distress:</span>
                    <span>${getScoreClass(parseFloat(details.regimen_distress), details.regimen_distress)}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Interpersonal:</span>
                    <span>${getScoreClass(parseFloat(details.interpersonal_distress), details.interpersonal_distress)}</span>
                </div>
            </div>
            
            <div class="detail-section">
                <h4>Health Facility</h4>
                <div class="detail-row">
                    <span class="detail-label">Travel Time:</span>
                    <span>${getTravelTimeText(details.travel_time)}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Transport Mode:</span>
                    <span>${getTransportText(details.transport_mode)}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Wait Time:</span>
                    <span>${getWaitTimeText(details.wait_time)}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Wait Rating:</span>
                    <span>${getRatingText(details.wait_rating)}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Missed Due to Travel/Wait:</span>
                    <span>${getYesNoText(details.missed_visit)}</span>
                </div>
            </div>
            
            <div class="detail-section">
                <h4>Psychosocial</h4>
                <div class="detail-row">
                    <span class="detail-label">Help Frequency:</span>
                    <span>${getHelpFrequencyText(details.help_frequency)}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Primary Helper:</span>
                    <span>${getPrimaryHelperText(details.primary_helper)}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Exercise Advice:</span>
                    <span>${getAdviceText(details.exercise_advice)}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Diet Advice:</span>
                    <span>${getAdviceText(details.diet_advice)}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Diabetes Education:</span>
                    <span>${getAdviceText(details.diabetes_education)}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Food Restriction:</span>
                    <span>${getAgreementText(details.food_restriction)}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Meal Plan Compliance:</span>
                    <span>${getComplianceText(details.meal_plan_compliance)}</span>
                </div>
            </div>
        </div>
        
        <div class="dds-responses">
            <h4>DDS-17 Question Responses</h4>
            <div id="ddsResponses">
                <!-- DDS responses will be loaded here -->
            </div>
        </div>
    `;
    
    modal.style.display = 'block';
    
    // Load DDS responses
    loadDDSResponses(details.id);
}

// Load DDS responses for a participant
function loadDDSResponses(participantId) {
    fetch(`/api/admin/participants/${participantId}/responses`)
        .then(function(response) {
            return response.json();
        })
        .then(function(responses) {
            const responsesDiv = document.getElementById('ddsResponses');
            if (responses.length === 0) {
                responsesDiv.innerHTML = '<p>No DDS responses found.</p>';
                return;
            }
            
            const ddsQuestions = [
                'Feeling that diabetes is taking up too much of my mental and physical energy every day',
                'Feeling that my doctor doesn\'t know enough about diabetes and diabetes care',
                'Not feeling confident in my day-to-day ability to manage diabetes',
                'Feeling angry, scared, and/or depressed when I think about living with diabetes',
                'Feeling that my doctor doesn\'t give me clear enough directions on how to manage my diabetes',
                'Feeling that I am not testing my blood sugars frequently enough',
                'Feeling that I will end up with serious long-term complications, no matter what I do',
                'I feel that I am often failing with my diabetes routine',
                'Feeling that friends or family are not supportive enough of self-care efforts',
                'Feeling that diabetes controls my life',
                'Feeling that my doctor doesn\'t take my concerns seriously enough',
                'Feeling that I am not sticking closely enough to a good meal plan',
                'Feeling that friends or family don\'t appreciate how difficult living with diabetes can be',
                'Feeling overwhelmed by the demands of living with diabetes',
                'Feeling that I don\'t have a doctor whom I can see regularly enough about my diabetes',
                'Not feeling motivated to keep up my diabetes self-care management',
                'Feeling that friends or family don\'t give me the emotional support that I would like'
            ];
            
            responsesDiv.innerHTML = responses.map(function(response) {
                const questionText = ddsQuestions[response.question_number - 1] || `Question ${response.question_number}`;
                const responseText = getResponseText(response.response);
                
                return `
                    <div class="response-item">
                        <span><strong>Q${response.question_number}:</strong> ${questionText}</span>
                        <span>${responseText}</span>
                    </div>
                `;
            }).join('');
        })
        .catch(function(error) {
            console.error('Error loading DDS responses:', error);
            document.getElementById('ddsResponses').innerHTML = '<p>Error loading DDS responses.</p>';
        });
}

// Get response text for DDS questions
function getResponseText(response) {
    const responses = {
        1: '1 - Not a problem',
        2: '2 - Slight problem',
        3: '3 - Moderate problem',
        4: '4 - Somewhat serious problem',
        5: '5 - Serious problem',
        6: '6 - Very serious problem'
    };
    return responses[response] || response;
}

// Helper functions for text conversion
function getMaritalStatusText(status) {
    const statuses = {1: 'Single', 2: 'Widowed', 3: 'Married', 4: 'Divorced'};
    return statuses[status] || 'N/A';
}

function getEducationText(education) {
    const educations = {
        1: 'No formal education',
        2: 'Primary education',
        3: 'Secondary education', 
        4: 'Tertiary level'
    };
    return educations[education] || 'N/A';
}

function getTravelTimeText(travelTime) {
    const times = {1: 'Less than 30 minutes', 2: '30–60 minutes', 3: 'More than 60 minutes'};
    return times[travelTime] || 'N/A';
}

function getTransportText(transport) {
    const transports = {1: 'Walking', 2: 'Public transport', 3: 'Private vehicle', 4: 'Other'};
    return transports[transport] || 'N/A';
}

function getWaitTimeText(waitTime) {
    const times = {1: 'Less than 60 minutes', 2: '60–120 minutes', 3: 'More than 120 minutes'};
    return times[waitTime] || 'N/A';
}

function getRatingText(rating) {
    const ratings = {1: 'Acceptable', 2: 'Too long'};
    return ratings[rating] || 'N/A';
}

function getEmploymentText(employment) {
    const employments = {
        1: 'Employed',
        2: 'Unemployed',
        3: 'Retired',
        4: 'Other'
    };
    return employments[employment] || 'N/A';
}

function getLivingWithText(livingWith) {
    const livingOptions = {
        1: 'Alone',
        2: 'Family/Friends',
        3: 'Other'
    };
    return livingOptions[livingWith] || 'N/A';
}

function getYesNoText(value) {
    if (value === 1 || value === '1') return 'Yes';
    if (value === 2 || value === '2') return 'No';
    return 'N/A';
}

function getPaymentDifficultyText(value) {
    const responses = {
        1: 'Strongly agree',
        2: 'Agree',
        3: 'Disagree',
        4: 'Strongly disagree'
    };
    return responses[value] || 'N/A';
}

function getHelpFrequencyText(value) {
    const responses = {
        1: 'Never',
        2: 'Rarely',
        3: 'Sometimes',
        4: 'Often',
        5: 'Always'
    };
    return responses[value] || 'N/A';
}

function getPrimaryHelperText(value) {
    const responses = {
        1: 'Spouse',
        2: 'Family',
        3: 'Friend',
        4: 'Health worker',
        5: 'No one'
    };
    return responses[value] || 'N/A';
}

function getAdviceText(value) {
    const responses = {
        1: 'Yes',
        2: 'No',
        3: 'Not sure'
    };
    return responses[value] || 'N/A';
}

function getAgreementText(value) {
    const responses = {
        1: 'Strongly agree',
        2: 'Agree',
        3: 'Disagree',
        4: 'Strongly disagree'
    };
    return responses[value] || 'N/A';
}

function getComplianceText(value) {
    const responses = {
        1: 'Never',
        2: 'Rarely',
        3: 'Sometimes',
        4: 'Often',
        5: 'Always'
    };
    return responses[value] || 'N/A';
}

// Close modal
function closeModal() {
    document.getElementById('detailModal').style.display = 'none';
}

// Delete participant
function deleteParticipant(participantId) {
    if (!confirm('Are you sure you want to delete this participant and all their data? This action cannot be undone.')) {
        return;
    }
    
    fetch(`/api/admin/participants/${participantId}`, {
        method: 'DELETE'
    })
        .then(function(response) {
            if (!response.ok) {
                return response.json().then(function(data) {
                    throw new Error(data.message || `HTTP ${response.status}: ${response.statusText}`);
                });
            }
            return response.json();
        })
        .then(function(result) {
            if (result.success) {
                showSuccess('Participant deleted successfully');
                loadParticipants(); // Reload the data
            } else {
                showError(result.message || 'Failed to delete participant');
            }
        })
        .catch(function(error) {
            console.error('Error deleting participant:', error);
            showError('Error: ' + error.message);
        });
}

// Map participant data function moved outside of exportData
function mapParticipantData(participant) {
    // Get DDS responses for this participant
    return fetch(`/api/admin/participants/${participant.id}/responses`)
        .then(function(response) {
            return response.json();
        })
        .then(function(responses) {
            let ddsResponses = {};
            ddsResponses = responses.reduce(function(acc, resp) {
                acc[`q${resp.question_number}`] = resp.response;
                return acc;
            }, {});
            
            return [
                participant.id,
                formatDate(participant.created_at),
                participant.signature_date || '',
                getAgeGroupText(participant.age_group),
                getMaritalStatusText(participant.marital_status),
                getGenderText(participant.gender),
                getEducationText(participant.education_level),
                getEmploymentText(participant.employment_status),
                getLivingWithText(participant.living_situation),
                getYesNoText(participant.health_insurance),
                getPaymentDifficultyText(participant.payment_difficulty),
                getTravelTimeText(participant.travel_time),
                getTransportText(participant.transport_mode),
                participant.transport_other || '',
                getWaitTimeText(participant.wait_time),
                getRatingText(participant.wait_rating),
                getYesNoText(participant.missed_visit),
                getHelpFrequencyText(participant.help_frequency),
                getPrimaryHelperText(participant.primary_helper),
                getAdviceText(participant.exercise_advice),
                getAdviceText(participant.diet_advice),
                getAdviceText(participant.diabetes_education),
                getAgreementText(participant.food_restriction),
                getComplianceText(participant.meal_plan_compliance),
                participant.total_score || '',
                participant.emotional_burden || '',
                participant.physician_related_distress || '',
                participant.regimen_distress || '',
                participant.interpersonal_distress || '',
                ddsResponses.q1 || '',
                ddsResponses.q2 || '',
                ddsResponses.q3 || '',
                ddsResponses.q4 || '',
                ddsResponses.q5 || '',
                ddsResponses.q6 || '',
                ddsResponses.q7 || '',
                ddsResponses.q8 || '',
                ddsResponses.q9 || '',
                ddsResponses.q10 || '',
                ddsResponses.q11 || '',
                ddsResponses.q12 || '',
                ddsResponses.q13 || '',
                ddsResponses.q14 || '',
                ddsResponses.q15 || '',
                ddsResponses.q16 || '',
                ddsResponses.q17 || ''
            ].map(function(field) { return `"${field}"`; }).join(',');
        })
        .catch(function(error) {
            console.error(`Error loading DDS responses for participant ${participant.id}:`, error);
            return '';
        });
}

// Export data to CSV
function exportData() {
    // Create comprehensive CSV headers
    const headers = [
        'Participant ID', 'Date', 'Signature Date',
        'Age Group', 'Marital Status', 'Gender', 'Education Level',
        'Employment Status', 'Living Situation', 'Health Insurance', 'Payment Difficulty',
        'Travel Time', 'Transport Mode', 'Transport Other', 'Wait Time', 'Wait Rating', 'Missed Visit',
        'Help Frequency', 'Primary Helper', 'Exercise Advice', 'Diet Advice', 'Diabetes Education', 'Food Restriction', 'Meal Plan Compliance',
        'Total DDS Score', 'Emotional Burden', 'Physician Distress', 'Regimen Distress', 'Interpersonal Distress',
        'DDS Q1', 'DDS Q2', 'DDS Q3', 'DDS Q4', 'DDS Q5', 'DDS Q6', 'DDS Q7', 'DDS Q8', 'DDS Q9', 'DDS Q10', 'DDS Q11', 'DDS Q12', 'DDS Q13', 'DDS Q14', 'DDS Q15', 'DDS Q16', 'DDS Q17'
    ];
    
    // Create section labels above headers
    const sectionLabels = [];
    let currentSection = '';
    headers.forEach(function(header, index) {
        if (index < 3) {
            if (currentSection !== 'BASIC') {
                sectionLabels.push(currentSection === '' ? 'BASIC INFORMATION' : '');
                currentSection = 'BASIC';
            } else {
                sectionLabels.push('');
            }
        } else if (index < 11) {
            if (currentSection !== 'SOCIODEMOGRAPHIC') {
                sectionLabels.push('SOCIODEMOGRAPHIC FACTORS');
                currentSection = 'SOCIODEMOGRAPHIC';
            } else {
                sectionLabels.push('');
            }
        } else if (index < 18) {
            if (currentSection !== 'HEALTH') {
                sectionLabels.push('HEALTH FACILITY FACTORS');
                currentSection = 'HEALTH';
            } else {
                sectionLabels.push('');
            }
        } else if (index < 25) {
            if (currentSection !== 'PSYCHOSOCIAL') {
                sectionLabels.push('PSYCHOSOCIAL FACTORS');
                currentSection = 'PSYCHOSOCIAL';
            } else {
                sectionLabels.push('');
            }
        } else if (index < 31) {
            if (currentSection !== 'DDS') {
                sectionLabels.push('DDS SCORES');
                currentSection = 'DDS';
            } else {
                sectionLabels.push('');
            }
        } else {
            if (currentSection !== 'DDS_QUESTIONS') {
                sectionLabels.push('DDS QUESTION RESPONSES');
                currentSection = 'DDS_QUESTIONS';
            } else {
                sectionLabels.push('');
            }
        }
    });

    // Get detailed data for all participants
    const detailedData = [];
    const dataPromises = filteredParticipants.map(function(participant) {
        return fetch(`/api/admin/participants/${participant.id}`)
            .then(function(response) {
                return response.json();
            })
            .then(function(details) {
                return details;
            })
            .catch(function(error) {
                console.error(`Error loading details for participant ${participant.id}:`, error);
                return participant; // Fallback to basic data
            });
    });

    Promise.all(dataPromises)
        .then(function(detailedDataResults) {
            // Map all participant data with their DDS responses
            const participantDataPromises = detailedDataResults.map(mapParticipantData);
            return Promise.all(participantDataPromises);
        })
        .then(function(participantDataRows) {
            const csvContent = [
                sectionLabels.join(','),
                headers.join(','),
                ...participantDataRows
            ].join('\n');
            
            // Create download link
            const blob = new Blob([csvContent], { type: 'text/csv' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `dds_participants_complete_${new Date().toISOString().split('T')[0]}.csv`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
            
            showSuccess('Complete data exported successfully');
        })
        .catch(function(error) {
            console.error('Error exporting data:', error);
            showError('Failed to export data');
        });
}

// Show success message
function showSuccess(message) {
    showMessage(message, 'success');
}

// Show error message
function showError(message) {
    showMessage(message, 'error');
}

// Show message (success or error)
function showMessage(message, type) {
    const messageDiv = document.createElement('div');
    messageDiv.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 15px 20px;
        border-radius: 5px;
        color: white;
        font-weight: bold;
        z-index: 10000;
        background: ${type === 'success' ? '#27ae60' : '#e74c3c'};
    `;
    messageDiv.textContent = message;
    
    document.body.appendChild(messageDiv);
    
    setTimeout(() => {
        document.body.removeChild(messageDiv);
    }, 5000);
}

// Add user management styles
const userManagementStyles = document.createElement('style');
userManagementStyles.textContent = `
    .user-management {
        max-height: 60vh;
        overflow-y: auto;
    }
    
    .user-management h3 {
        color: #2c3e50;
        border-bottom: 2px solid #ecf0f1;
        padding-bottom: 10px;
        margin-top: 20px;
    }
    
    .form-group {
        margin-bottom: 15px;
    }
    
    .form-group label {
        display: block;
        margin-bottom: 5px;
        font-weight: bold;
        color: #2c3e50;
    }
    
    .form-group input {
        width: 100%;
        padding: 10px;
        border: 1px solid #bdc3c7;
        border-radius: 4px;
        font-size: 14px;
        box-sizing: border-box;
    }
    
    .users-list {
        max-height: 400px;
        overflow-y: auto;
        margin-bottom: 20px;
    }
    
    .user-item {
        background: #f8f9fa;
        padding: 15px;
        border-radius: 8px;
        margin-bottom: 15px;
        border-left: 4px solid #3498db;
        box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    
    .user-info {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 10px;
    }
    
    .user-role {
        background: #3498db;
        color: white;
        padding: 2px 8px;
        border-radius: 12px;
        font-size: 12px;
        font-weight: bold;
    }
    
    .user-status.active {
        background: #27ae60;
        color: white;
        padding: 2px 8px;
        border-radius: 12px;
        font-size: 12px;
    }
    
    .user-status.inactive {
        background: #95a5a6;
        color: white;
        padding: 2px 8px;
        border-radius: 12px;
        font-size: 12px;
    }
    
    .password-section {
        display: flex;
        align-items: center;
        gap: 10px;
        margin: 10px 0;
    }
    
    .password-label {
        font-weight: bold;
        color: #2c3e50;
        min-width: 80px;
    }
    
    .password-value {
        background: #ecf0f1;
        padding: 4px 8px;
        border-radius: 4px;
        font-family: monospace;
        font-size: 14px;
    }
    
    .admin-badge {
        background: #e74c3c;
        color: white;
        padding: 2px 8px;
        border-radius: 12px;
        font-size: 12px;
        font-weight: bold;
    }
    
    .btn-small {
        padding: 4px 8px;
        font-size: 12px;
        background: #95a5a6;
        color: white;
        border: none;
        border-radius: 4px;
        cursor: pointer;
    }
    
    .user-meta {
        font-size: 12px;
        color: #7f8c8d;
        margin-top: 10px;
    }
    
    .loading-message {
        text-align: center;
        color: #7f8c8d;
        padding: 20px;
    }
`;
document.head.appendChild(userManagementStyles);

// Close modal when clicking outside
window.onclick = function(event) {
    const modal = document.getElementById('detailModal');
    if (event.target === modal) {
        closeModal();
    }
    
    const userModal = document.getElementById('userModal');
    if (event.target === userModal) {
        closeUserModal();
    }
}

// Show user management modal (admin only)
function showUserManager() {
    const isAdmin = localStorage.getItem('isAdmin') === 'true';
    if (!isAdmin) {
        alert('You do not have permission to manage users.');
        return;
    }
    
    // Load current users
    loadUsers();
    
    // Create user management modal
    const modal = document.createElement('div');
    modal.id = 'userModal';
    modal.className = 'modal';
    modal.innerHTML = '<div class="modal-content">' +
            '<div class="modal-header">' +
                '<h2>User Management</h2>' +
                '<span class="close" onclick="closeUserModal()">&times;</span>' +
            '</div>' +
            '<div class="user-management">' +
                '<h3>Create New Administrator</h3>' +
                '<form id="createUserForm">' +
                    '<div class="form-group">' +
                        '<label>Username:</label>' +
                        '<input type="text" id="newUsername" required>' +
                    '</div>' +
                    '<div class="form-group">' +
                        '<label>Password:</label>' +
                        '<input type="password" id="newPassword" required>' +
                    '</div>' +
                    '<div class="form-group">' +
                        '<label>Confirm Password:</label>' +
                        '<input type="password" id="confirmPassword" required>' +
                    '</div>' +
                    '<button type="submit" class="btn btn-primary">Create User</button>' +
                '</form>' +
                
                '<h3>Current Administrators</h3>' +
                '<div id="currentUsers" class="users-list">' +
                    '<!-- Users will be loaded dynamically -->' +
                    '<div class="loading-message">Loading users...</div>' +
                '</div>' +
            '</div>' +
        '</div>';
    
    document.body.appendChild(modal);
    modal.style.display = 'block';
    
    // Setup form submission
    document.getElementById('createUserForm').addEventListener('submit', createUser);
}

// Close user management modal
function closeUserModal() {
    const modal = document.getElementById('userModal');
    if (modal) {
        modal.remove();
    }
}

// Load users from database
function loadUsers() {
    fetch('/api/admin/users')
        .then(function(response) {
            return response.json();
        })
        .then(function(users) {
            const usersContainer = document.getElementById('currentUsers');
            if (usersContainer) {
                usersContainer.innerHTML = users.map(function(user) {
                    const userRole = user.is_admin ? 'Admin' : 'User';
                    const userStatus = user.is_active ? 'Active' : 'Inactive';
                    const userStatusClass = user.is_active ? 'active' : 'inactive';
                    const passwordDisplay = user.password_plain ? '••••••' : 'Hashed';
                    const buttonText = user.password_plain ? 'Show' : 'N/A';
                    const adminBadge = user.is_admin ? '<span class="admin-badge">Super Admin</span>' : '';
                    const createdDate = new Date(user.created_at).toLocaleDateString();
                    const createdInfo = user.created_by ? 'by ' + user.created_by : '';
                    const lastLoginInfo = user.last_login ? '<br>Last login: ' + new Date(user.last_login).toLocaleDateString() : '';
                    
                    return '<div class="user-item">' +
                        '<div class="user-info">' +
                            '<strong>' + user.username + '</strong> ' +
                            '<span class="user-role">' + userRole + '</span>' +
                            '<span class="user-status ' + userStatusClass + '">' +
                                userStatus +
                            '</span>' +
                        '</div>' +
                        '<div class="password-section">' +
                            '<span class="password-label">Password:</span>' +
                            '<span class="password-value" id="password-' + user.id + '">' +
                                passwordDisplay +
                            '</span>' +
                            '<button class="btn btn-small" onclick="togglePassword(' + user.id + ', \'' + user.password_plain + '\')">' +
                                buttonText +
                            '</button>' +
                            adminBadge +
                        '</div>' +
                        '<div class="user-meta">' +
                            'Created: ' + createdDate + ' ' +
                            createdInfo +
                            lastLoginInfo +
                        '</div>' +
                    '</div>';
                }).join('');
            }
        })
        .catch(function(error) {
            console.error('Error loading users:', error);
        });
}

// Toggle password visibility
function togglePassword(userId, password) {
    const passwordElement = document.getElementById(`password-${userId}`);
    if (password && passwordElement) {
        if (passwordElement.textContent.includes('••••')) {
            passwordElement.textContent = password;
        } else {
            passwordElement.textContent = '•••••••';
        }
    }
}

// Create new user
function createUser(e) {
    e.preventDefault();
    
    const username = document.getElementById('newUsername').value;
    const password = document.getElementById('newPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    
    if (password !== confirmPassword) {
        alert('Passwords do not match');
        return;
    }
    
    fetch('/api/admin/create-user', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ username: username, password: password })
    })
        .then(function(response) {
            return response.json();
        })
        .then(function(result) {
            if (result.success) {
                alert('User created successfully!');
                // Reload users to show new user
                loadUsers();
                // Clear form
                document.getElementById('createUserForm').reset();
            } else {
                alert(result.message || 'Failed to create user');
            }
        })
        .catch(function(error) {
            console.error('Error creating user:', error);
            alert('Failed to create user');
        });
}

// Add keyboard shortcuts
document.addEventListener('keydown', function(event) {
    if (event.key === 'Escape') {
        closeModal();
    }
});