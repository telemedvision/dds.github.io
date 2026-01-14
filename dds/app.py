from flask import Flask, render_template, request, jsonify, redirect, url_for, send_from_directory, session
from database_integration import DiabetesDistressDB
import os
import sqlite3
import secrets
from datetime import datetime, timedelta

app = Flask(__name__)
app.config['SECRET_KEY'] = 'development-key-change-in-production'
app.config['SESSION_PERMANENT'] = False

# Database connection management for preventing locks
from contextlib import contextmanager

class DatabaseManager:
    """Database connection manager with proper configuration"""
    
    def __init__(self, db_path: str = "diabetes_distress.db"):
        self.db_path = db_path
    
    @contextmanager
    def get_connection(self):
        """Context manager for database connections with proper configuration"""
        conn = None
        try:
            conn = sqlite3.connect(self.db_path)
            # Essential configurations
            conn.execute("PRAGMA foreign_keys = ON")
            conn.execute("PRAGMA busy_timeout = 30000")
            conn.execute("PRAGMA journal_mode = WAL")
            yield conn
        except Exception as e:
            if conn:
                conn.rollback()
            raise e
        finally:
            if conn:
                conn.close()

# Global database manager instance
db_manager = DatabaseManager()
db = DiabetesDistressDB()

# Hardcoded admin credentials (as requested)
ADMIN_USERS = {
    'Branfon': {
        'password': 'H151-01-2735/2021',
        'is_admin': True
    },
    'Samuel': {
        'password': 'H151-01-2454/2021', 
        'is_admin': True
    },
    'Emma': {
        'password': 'H151-01-2017/2021',
        'is_admin': True
    }
}

# Authentication routes
@app.route('/login')
def login_page():
    """Serve login page"""
    # If already authenticated, redirect to admin
    if 'user_id' in session:
        return redirect(url_for('admin_dashboard'))
    return render_template('login.html')

@app.route('/api/login', methods=['POST'])
def login():
    """Handle login authentication"""
    try:
        data = request.get_json()
        username = data.get('username')
        password = data.get('password')
        
        if not username or not password:
            return jsonify({'success': False, 'message': 'Username and password required'})
        
        user = ADMIN_USERS.get(username)
        if user and user['password'] == password:
            # Store session data
            session['user_id'] = username
            session['is_admin'] = user['is_admin']
            session['login_time'] = datetime.now().isoformat()
            session.permanent = True  # Session lasts for 24 hours
            
            return jsonify({
                'success': True,
                'username': username,
                'isAdmin': user['is_admin']
            })
        else:
            return jsonify({'success': False, 'message': 'Invalid username or password'})
            
    except Exception as e:
        return jsonify({'success': False, 'message': f'Login error: {str(e)}'}), 500

@app.route('/forgot-password')
def forgot_password_page():
    """Serve forgot password page"""
    return render_template('forgot_password.html')

@app.route('/api/forgot-password', methods=['POST'])
def forgot_password():
    """Handle forgot password request"""
    try:
        data = request.get_json()
        username = data.get('username')
        
        if not username:
            return jsonify({'success': False, 'message': 'Username required'})
        
        user = ADMIN_USERS.get(username)
        if user:
            return jsonify({
                'success': True, 
                'message': f'Contact administrator for {username} password reset',
                'admin_contact': 'Branfon - System Administrator'
            })
        else:
            return jsonify({
                'success': False, 
                'message': f'User {username} not found. Please contact Branfon.'
            })
            
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

@app.route('/api/logout', methods=['POST'])
def logout():
    """Handle logout"""
    session.clear()
    return jsonify({'success': True})

def require_admin_auth(f):
    """Admin authentication decorator"""
    from functools import wraps
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'user_id' not in session:
            return jsonify({'error': 'Authentication required'}), 401
        
        # Check if current user is admin
        current_user = session.get('user_id') or ''
        user = ADMIN_USERS.get(current_user, {})
        
        if not user.get('is_admin', False):
            return jsonify({'error': 'Admin access required'}), 401
        
        return f(*args, **kwargs)
    return decorated_function

@app.route('/admin')
def admin_dashboard():
    """Administrative dashboard for viewing responses"""
    # Check authentication
    if 'user_id' not in session:
        return redirect(url_for('login_page'))
    return render_template('admin.html')

@app.route('/api/admin/users', methods=['GET'])
@require_admin_auth
def get_users():
    """Get all users for management"""
    try:
        # Return all users with their roles
        users_list = []
        for username, user_data in ADMIN_USERS.items():
            users_list.append({
                'username': username,
                'password_plain': user_data['password'],
                'is_admin': user_data['is_admin'],
                'is_active': True,
                'created_at': '2026-01-13T00:00:00Z',
                'created_by': 'System',
                'last_login': None
            })
        return jsonify(users_list)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/admin/create-user', methods=['POST'])
@require_admin_auth
def create_user():
    """Create new user (Branfon only)"""
    try:
        data = request.get_json()
        username = data.get('username')
        password = data.get('password')
        
        if not username or not password:
            return jsonify({'success': False, 'message': 'Username and password required'})
        
        if username in ADMIN_USERS:
            return jsonify({'success': False, 'message': 'Username already exists'})
        
        # Add new user
        ADMIN_USERS[username] = {
            'password': password,
            'is_admin': False
        }
        
        return jsonify({'success': True, 'message': 'User created successfully'})
        
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

# Protect all existing routes
@app.route('/submit', methods=['POST'])
@require_admin_auth
def submit_questionnaire():
    """Handle questionnaire submission"""
    try:
        data = request.get_json()
        
        # Extract signature data
        signature_data = {
            'signature_date': data.get('signature_date', ''),
            'participant_signature': data.get('participant_signature', ''),
            'investigator_signature': data.get('investigator_signature', ''),
            'investigator_date': data.get('investigator_date', '')
        }
        
        # Create participant
        participant_id = db.create_participant(signature_data)
        
        if participant_id is None:
            return jsonify({
                'success': False,
                'message': 'Failed to create participant record'
            }), 500
        
        # Save sociodemographic data
        sociodemographic_data = {
            'age_group': data.get('sociodem-age'),
            'marital_status': data.get('sociodem-marital'),
            'gender': data.get('sociodem-gender'),
            'education_level': data.get('sociodem-education'),
            'employment_status': data.get('sociodem-employment'),
            'living_situation': data.get('sociodem-living'),
            'health_insurance': data.get('sociodem-insurance'),
            'payment_difficulty': data.get('sociodem-payment')
        }
        if participant_id:
            db.save_sociodemographic(participant_id, sociodemographic_data)
        
        # Save DDS responses
        dds_responses = {}
        for i in range(1, 18):
            key = f'dds-{i}'
            if key in data and data[key] is not None:
                dds_responses[key] = data[key]
        if participant_id and dds_responses:
            db.save_dds_responses(participant_id, dds_responses)
        
        # Save health facility data
        health_facility_data = {
            'travel_time': data.get('health-travel'),
            'transport_mode': data.get('health-transport'),
            'transport_other': data.get('health-transport-other-text'),
            'wait_time': data.get('health-wait'),
            'wait_rating': data.get('health-rating'),
            'missed_visit': data.get('health-missed')
        }
        if participant_id:
            db.save_health_facility(participant_id, health_facility_data)
        
        # Save psychosocial data
        psychosocial_data = {
            'help_frequency': data.get('psychosocial-help'),
            'primary_helper': data.get('psychosocial-helper'),
            'exercise_advice': data.get('psychosocial-exercise'),
            'diet_advice': data.get('psychosocial-diet'),
            'diabetes_education': data.get('psychosocial-education'),
            'food_restriction': data.get('psychosocial-foods'),
            'meal_plan_compliance': data.get('psychosocial-meal-plan')
        }
        if participant_id:
            db.save_psychosocial(participant_id, psychosocial_data)
        
        # Calculate DDS scores
        if participant_id:
            db.calculate_dds_scores(participant_id)
        
        return jsonify({
            'success': True,
            'participant_id': participant_id,
            'message': 'Questionnaire submitted successfully'
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'Error submitting questionnaire: {str(e)}'
        }), 500

# Keep existing admin routes for participants
@app.route('/api/admin/participants')
@require_admin_auth
def get_all_participants():
    """Get all participants for admin dashboard"""
    try:
        participants = db.get_all_participants()
        return jsonify(participants)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/admin/participants/<int:participant_id>')
@require_admin_auth
def get_participant_details(participant_id):
    """Get detailed information for a specific participant"""
    try:
        summary = db.get_participant_summary(participant_id)
        if summary:
            return jsonify(summary)
        else:
            return jsonify({'error': 'Participant not found'}), 404
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/admin/participants/<int:participant_id>/responses')
@require_admin_auth
def get_participant_responses(participant_id):
    """Get DDS responses for a specific participant"""
    try:
        responses = db.get_dds_responses(participant_id)
        return jsonify(responses)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/admin/participants/<int:participant_id>', methods=['DELETE'])
@require_admin_auth
def delete_participant(participant_id):
    """Delete a participant and all their data"""
    conn = None
    try:
        conn = sqlite3.connect('diabetes_distress.db', timeout=30.0)
        conn.execute("PRAGMA foreign_keys = ON")
        cursor = conn.cursor()
        
        # Check if participant exists first
        cursor.execute("SELECT id FROM participants WHERE id = ?", (participant_id,))
        if not cursor.fetchone():
            return jsonify({'success': False, 'message': 'Participant not found'}), 404
        
        # Delete from related tables first (they use participant_id)
        related_tables = ['dds_scores', 'psychosocial', 'health_facility', 'dds_responses', 'sociodemographic']
        for table in related_tables:
            cursor.execute(f"DELETE FROM {table} WHERE participant_id = ?", (participant_id,))
        
        # Then delete from participants table (it uses id)
        cursor.execute("DELETE FROM participants WHERE id = ?", (participant_id,))
        
        conn.commit()
        
        return jsonify({'success': True, 'message': 'Participant deleted successfully'})
        
    except sqlite3.OperationalError as e:
        if "database is locked" in str(e):
            return jsonify({'success': False, 'message': 'Database is busy, please try again'}), 503
        return jsonify({'success': False, 'message': f'Database error: {str(e)}'}), 500
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500
    finally:
        if conn:
            conn.close()

# Keep existing routes
@app.route('/')
def index():
    """Serve the main questionnaire page"""
    return send_from_directory('.', 'index.html')

@app.route('/thank-you')
def thank_you():
    """Thank you page after successful submission"""
    return render_template('thank_you.html')

# Serve static files
@app.route('/styles/<path:filename>')
def serve_styles(filename):
    try:
        return send_from_directory('styles', filename)
    except:
        return "File not found", 404

@app.route('/js/<path:filename>')
def serve_js(filename):
    try:
        return send_from_directory('js', filename)
    except:
        return "File not found", 404

@app.route('/static/<path:filename>')
def serve_static(filename):
    try:
        return send_from_directory('static', filename)
    except:
        return "File not found", 404

if __name__ == '__main__':
    # Create templates directory if it doesn't exist
    if not os.path.exists('templates'):
        os.makedirs('templates')
    
    app.run(debug=True, host='0.0.0.0', port=5000)
