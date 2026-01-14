import sqlite3
from datetime import datetime
from typing import Dict, List, Optional, Union


from contextlib import contextmanager

class DatabaseManager:
    """Database connection manager with proper configuration"""
    
    def __init__(self, db_path: str = "diabetes_distress.db"):
        self.db_path = db_path
        self._configure_database()
    
    def _configure_database(self):
        """Configure database with optimal settings"""
        conn = sqlite3.connect(self.db_path)
        try:
            conn.execute("PRAGMA foreign_keys = ON")
            conn.execute("PRAGMA journal_mode = WAL")
            conn.execute("PRAGMA busy_timeout = 30000")
            conn.execute("PRAGMA synchronous = NORMAL")
            conn.commit()
        finally:
            conn.close()
    
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


class DiabetesDistressDB:
    def __init__(self, db_path: str = "diabetes_distress.db"):
        self.db_path = db_path
        self.init_database()
    
    def init_database(self):
        """Initialize the database with schema"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        # Read schema file
        with open('database_schema.sql', 'r') as f:
            schema = f.read()
        
        # Execute schema with CREATE TABLE IF NOT EXISTS
        cursor.executescript(schema)
        conn.commit()
        conn.close()
    
    def create_participant(self, signature_data: Dict) -> Union[int, None]:
        """Create a new participant record"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute("""
            INSERT INTO participants 
            (signature_date, participant_signature, investigator_signature, investigator_date)
            VALUES (?, ?, ?, ?)
        """, (
            signature_data.get('signature_date'),
            signature_data.get('participant_signature'),
            signature_data.get('investigator_signature'),
            signature_data.get('investigator_date')
        ))
        
        participant_id = cursor.lastrowid
        conn.commit()
        conn.close()
        return participant_id if participant_id is not None else 0
    
    def save_sociodemographic(self, participant_id: int, data: Dict):
        """Save sociodemographic data"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute("""
            INSERT INTO sociodemographic 
            (participant_id, age_group, marital_status, gender, education_level, 
             employment_status, living_situation, health_insurance, payment_difficulty)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            participant_id,
            data.get('age_group'),
            data.get('marital_status'),
            data.get('gender'),
            data.get('education_level'),
            data.get('employment_status'),
            data.get('living_situation'),
            data.get('health_insurance'),
            data.get('payment_difficulty')
        ))
        
        conn.commit()
        conn.close()
    
    def save_dds_responses(self, participant_id: int, responses: Dict):
        """Save DDS-17 questionnaire responses"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        for question_num in range(1, 18):
            response = responses.get(f'dds-{question_num}')
            if response is not None:
                cursor.execute("""
                    INSERT INTO dds_responses (participant_id, question_number, response)
                    VALUES (?, ?, ?)
                """, (participant_id, question_num, int(response)))
        
        conn.commit()
        conn.close()
    
    def save_health_facility(self, participant_id: int, data: Dict):
        """Save health facility related factors"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute("""
            INSERT INTO health_facility 
            (participant_id, travel_time, transport_mode, transport_other, 
             wait_time, wait_rating, missed_visit)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        """, (
            participant_id,
            data.get('travel_time'),
            data.get('transport_mode'),
            data.get('transport_other'),
            data.get('wait_time'),
            data.get('wait_rating'),
            data.get('missed_visit')
        ))
        
        conn.commit()
        conn.close()
    
    def save_psychosocial(self, participant_id: int, data: Dict):
        """Save psychosocial factors"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute("""
            INSERT INTO psychosocial 
            (participant_id, help_frequency, primary_helper, exercise_advice, 
             diet_advice, diabetes_education, food_restriction, meal_plan_compliance)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            participant_id,
            data.get('help_frequency'),
            data.get('primary_helper'),
            data.get('exercise_advice'),
            data.get('diet_advice'),
            data.get('diabetes_education'),
            data.get('food_restriction'),
            data.get('meal_plan_compliance')
        ))
        
        conn.commit()
        conn.close()
    
    def calculate_dds_scores(self, participant_id: int):
        """Calculate and save DDS scores"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        # Get all responses for this participant
        cursor.execute("""
            SELECT question_number, response 
            FROM dds_responses 
            WHERE participant_id = ? 
            ORDER BY question_number
        """, (participant_id,))
        
        responses = dict(cursor.fetchall())
        
        # Calculate subscale scores
        # Emotional burden: questions 1,4,8,10,14
        emotional_burden = self._calculate_subscale_average([1,4,8,10,14], responses)
        
        # Physician-related distress: questions 2,5,11,15
        physician_distress = self._calculate_subscale_average([2,5,11,15], responses)
        
        # Regimen distress: questions 3,6,12,16
        regimen_distress = self._calculate_subscale_average([3,6,12,16], responses)
        
        # Interpersonal distress: questions 7,9,13,17
        interpersonal_distress = self._calculate_subscale_average([7,9,13,17], responses)
        
        # Total score (average of all 17 questions)
        total_score = sum(responses.values()) / len(responses)
        
        # Save scores
        cursor.execute("""
            INSERT INTO dds_scores 
            (participant_id, emotional_burden, physician_related_distress, 
             regimen_distress, interpersonal_distress, total_score)
            VALUES (?, ?, ?, ?, ?, ?)
        """, (participant_id, emotional_burden, physician_distress, 
              regimen_distress, interpersonal_distress, total_score))
        
        conn.commit()
        conn.close()
    
    def _calculate_subscale_average(self, questions: List[int], responses: Dict) -> float:
        """Calculate average score for a subscale"""
        scores = []
        for q in questions:
            if q in responses and responses[q] is not None:
                scores.append(responses[q])
        
        return sum(scores) / len(scores) if scores else 0.0
    
    def get_participant_summary(self, participant_id: int) -> Optional[Dict]:
        """Get complete summary for a participant"""
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        
        # Get all data
        cursor.execute("""
            SELECT p.*, s.*, h.*, ps.*, d.*
            FROM participants p
            LEFT JOIN sociodemographic s ON p.id = s.participant_id
            LEFT JOIN health_facility h ON p.id = h.participant_id
            LEFT JOIN psychosocial ps ON p.id = ps.participant_id
            LEFT JOIN dds_scores d ON p.id = d.participant_id
            WHERE p.id = ?
        """, (participant_id,))
        
        result = cursor.fetchone()
        conn.close()
        
        return dict(result) if result else None
    
    def get_all_participants(self) -> List[Dict]:
        """Get list of all participants with summary data"""
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        
        cursor.execute("""
            SELECT p.id, p.created_at, p.signature_date,
                   d.total_score, d.emotional_burden, d.physician_related_distress, 
                   d.regimen_distress, d.interpersonal_distress,
                   s.age_group, s.gender, s.education_level
            FROM participants p
            LEFT JOIN dds_scores d ON p.id = d.participant_id
            LEFT JOIN sociodemographic s ON p.id = s.participant_id
            ORDER BY p.created_at DESC
        """)
        
        results = cursor.fetchall()
        conn.close()
        
        return [dict(row) for row in results]
    
    def get_dds_responses(self, participant_id: int) -> List[Dict]:
        """Get all DDS responses for a participant"""
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        
        cursor.execute("""
            SELECT question_number, response
            FROM dds_responses
            WHERE participant_id = ?
            ORDER BY question_number
        """, (participant_id,))
        
        results = cursor.fetchall()
        conn.close()
        
        return [dict(row) for row in results]
    
    def authenticate_user(self, username: str, password: str) -> Optional[Dict]:
        """Authenticate user credentials"""
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        
        cursor.execute("""
            SELECT id, username, password_hash, password_plain, is_admin, is_active
            FROM users 
            WHERE username = ? AND is_active = TRUE
        """, (username,))
        
        user = cursor.fetchone()
        conn.close()
        
        if user and (user['password_hash'] == password or user['password_plain'] == password):
            # Update last login
            self.update_last_login(user['id'])
            return dict(user)
        
        return None
    
    def update_last_login(self, user_id: int):
        """Update user's last login timestamp"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute("""
            UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?
        """, (user_id,))
        
        conn.commit()
        conn.close()
    
    def get_all_users(self) -> List[Dict]:
        """Get all users for admin management"""
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        
        cursor.execute("""
            SELECT id, username, password_plain, is_admin, is_active, created_at, last_login, created_by
            FROM users 
            ORDER BY created_at DESC
        """)
        
        results = cursor.fetchall()
        conn.close()
        
        return [dict(row) for row in results]
    
    def create_user(self, username: str, password: str, is_admin: bool = False, created_by: str = 'Branfon') -> bool:
        """Create new user account"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            cursor.execute("""
                INSERT INTO users (username, password_plain, is_admin, is_active, created_by)
                VALUES (?, ?, ?, TRUE, ?)
            """, (username, password, is_admin, created_by))
            
            conn.commit()
            conn.close()
            return True
        except Exception:
            return False
    
    def create_password_reset_token(self, username: str) -> Optional[str]:
        """Create password reset token"""
        import secrets
        import datetime
        
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        # Get user
        cursor.execute("SELECT id FROM users WHERE username = ? AND is_active = TRUE", (username,))
        user = cursor.fetchone()
        
        if not user:
            conn.close()
            return None
        
        # Create token
        token = secrets.token_hex(16)
        expires = datetime.datetime.now() + datetime.timedelta(hours=1)  # 1 hour expiry
        
        cursor.execute("""
            INSERT INTO password_resets (user_id, token, expires_at)
            VALUES (?, ?, ?)
        """, (user[0], token, expires))
        
        conn.commit()
        conn.close()
        return token
    
    def validate_reset_token(self, token: str) -> Optional[Dict]:
        """Validate password reset token"""
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        
        cursor.execute("""
            SELECT pr.user_id, u.username, pr.expires_at
            FROM password_resets pr
            JOIN users u ON pr.user_id = u.id
            WHERE pr.token = ? AND pr.used = FALSE AND pr.expires_at > CURRENT_TIMESTAMP
        """, (token,))
        
        result = cursor.fetchone()
        conn.close()
        
        return dict(result) if result else None