// Administrative Dashboard JavaScript

let allParticipants = [];
let filteredParticipants = [];

// Load participants when page loads
document.addEventListener('DOMContentLoaded', function() {
    loadParticipants();
});

// Load all participants from the server
function loadParticipants() {
    fetch('/api/admin/participants')
        .then(function(response) {
            return response.json();
        })
        .then(function(participants) {
            allParticipants = participants;
            filteredParticipants = participants;
            
            renderParticipants();
            renderStats();
        })
        .catch(function(error) {
            console.error('Error loading participants:', error);
            showError('Failed to load participants data');
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
    
    tbody.innerHTML = filteredParticipants.map(function(participant) {
        return '<tr>' +
                '<td>' + participant.id + '</td>' +
                '<td>' + formatDate(participant.created_at) + '</td>' +
                '<td>' + getAgeGroupText(participant.age_group) + '</td>' +
                '<td>' + getGenderText(participant.gender) + '</td>' +
                '<td>' + getScoreClass(parseFloat(participant.total_score), participant.total_score) + '</td>' +
                '<td>' + getScoreClass(parseFloat(participant.emotional_burden), participant.emotional_burden) + '</td>' +
                '<td>' + getScoreClass(parseFloat(participant.physician_related_distress), participant.physician_related_distress) + '</td>' +
                '<td>' + getScoreClass(parseFloat(participant.regimen_distress), participant.regimen_distress) + '</td>' +
                '<td>' + getScoreClass(parseFloat(participant.interpersonal_distress), participant.interpersonal_distress) + '</td>' +
                '<td>' +
                    '<button class="btn btn-primary" onclick="viewDetails(' + participant.id + ')">View Details</button>' +
                    '<button class="btn btn-danger" onclick="deleteParticipant(' + participant.id + ')">Delete</button>' +
                '</td>' +
            '</tr>';
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
            
            return participantId.includes(searchTerm) || 
                   createdDate.includes(searchTerm);
        });
    }
    
    renderParticipants();
}

// Clear search
function clearSearch() {
    document.getElementById('searchInput').value = '';
    filteredParticipants = allParticipants;
    renderParticipants();
}

// View participant details
function viewDetails(participantId) {
    fetch('/api/admin/participants/' + participantId)
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
    fetch('/api/admin/participants/' + participantId + '/responses')
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
            var questionText = ddsQuestions[response.question_number - 1] || 'Question ' + response.question_number;
            var responseText = getResponseText(response.response);
            
            return '<div class="response-item">' +
                '<span><strong>Q' + response.question_number + ':</strong> ' + questionText + '</span>' +
                '<span>' + responseText + '</span>' +
                '</div>';
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

// Close modal
function closeModal() {
    document.getElementById('detailModal').style.display = 'none';
}

// Delete participant
function deleteParticipant(participantId) {
    if (typeof confirm !== 'undefined' && !confirm('Are you sure you want to delete this participant and all their data? This action cannot be undone.')) {
        return;
    }
    
    fetch('/api/admin/participants/' + participantId, {
        method: 'DELETE'
    })
        .then(function(response) {
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
            showError('Failed to delete participant');
        });
}

// Export data to CSV
function exportData() {
    try {
        // Create CSV content
        const headers = ['Participant ID', 'Date', 'Age Group', 'Gender', 'Total Score', 'Emotional Burden', 
                        'Physician Distress', 'Regimen Distress', 'Interpersonal Distress'];
        
        const csvContent = [
            headers.join(','),
            ...filteredParticipants.map(participant => [
                participant.id,
                formatDate(participant.created_at),
                getAgeGroupText(participant.age_group),
                getGenderText(participant.gender),
                participant.total_score || '',
                participant.emotional_burden || '',
                participant.physician_related_distress || '',
                participant.regimen_distress || '',
                participant.interpersonal_distress || ''
            ].join(','))
        ].join('\n');
        
        // Create download link
        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `dds_participants_${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        
        showSuccess('Data exported successfully');
        
    } catch (error) {
        console.error('Error exporting data:', error);
        showError('Failed to export data');
    }
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

// Close modal when clicking outside
window.onclick = function(event) {
    const modal = document.getElementById('detailModal');
    if (event.target === modal) {
        closeModal();
    }
}

// Add keyboard shortcuts
document.addEventListener('keydown', function(event) {
    if (event.key === 'Escape') {
        closeModal();
    }
});