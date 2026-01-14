-- Diabetes Distress Scale Database Schema
-- This schema stores responses from the DDS-17 questionnaire

-- Participants table
CREATE TABLE IF NOT EXISTS participants (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    signature_date TEXT,
    participant_signature TEXT,
    investigator_signature TEXT,
    investigator_date TEXT
);

-- Sociodemographic Characteristics
CREATE TABLE IF NOT EXISTS sociodemographic (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    participant_id INTEGER,
    age_group INTEGER, -- 1:18-30, 2:30-40, 3:40-50, 4:50-60, 5:60+
    marital_status INTEGER, -- 1:Single, 2:Widowed, 3:Married, 4:Divorced
    gender INTEGER, -- 1:Male, 2:Female
    education_level INTEGER, -- 1:None, 2:Primary, 3:Secondary, 4:Tertiary
    employment_status INTEGER, -- 1:Employed, 2:Unemployed, 3:Retired, 4:Other
    living_situation INTEGER, -- 1:Alone, 2:Family/Friends, 3:Other
    health_insurance INTEGER, -- 1:Yes, 2:No
    payment_difficulty INTEGER, -- 1:Strongly agree, 2:Agree, 3:Disagree, 4:Strongly disagree
    FOREIGN KEY (participant_id) REFERENCES participants (id)
);

-- DDS-17 Responses
CREATE TABLE IF NOT EXISTS dds_responses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    participant_id INTEGER,
    question_number INTEGER,
    response INTEGER, -- 1:Not a problem, 2:Slight, 3:Moderate, 4:Somewhat serious, 5:Serious, 6:Very serious
    FOREIGN KEY (participant_id) REFERENCES participants (id)
);

-- Health Facility Factors
CREATE TABLE IF NOT EXISTS health_facility (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    participant_id INTEGER,
    travel_time INTEGER, -- 1:<30min, 2:30-60min, 3:>60min
    transport_mode INTEGER, -- 1:Walking, 2:Public, 3:Private, 4:Other
    transport_other TEXT,
    wait_time INTEGER, -- 1:<60min, 2:60-120min, 3:>120min
    wait_rating INTEGER, -- 1:Acceptable, 2:Too long
    missed_visit INTEGER, -- 1:Yes, 2:No
    FOREIGN KEY (participant_id) REFERENCES participants (id)
);

-- Psychosocial Factors
CREATE TABLE IF NOT EXISTS psychosocial (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    participant_id INTEGER,
    help_frequency INTEGER, -- 1:Never, 2:Rarely, 3:Sometimes, 4:Often, 5:Always
    primary_helper INTEGER, -- 1:Spouse, 2:Family, 3:Friend, 4:Health worker, 5:No one
    exercise_advice INTEGER, -- 1:Yes, 2:No, 3:Not sure
    diet_advice INTEGER, -- 1:Yes, 2:No, 3:Not sure
    diabetes_education INTEGER, -- 1:Yes, 2:No, 3:Not sure
    food_restriction INTEGER, -- 1:Strongly agree, 2:Agree, 3:Disagree, 4:Strongly disagree
    meal_plan_compliance INTEGER, -- 1:Never, 2:Rarely, 3:Sometimes, 4:Often, 5:Always
    FOREIGN KEY (participant_id) REFERENCES participants (id)
);

-- DDS Scores (calculated)
CREATE TABLE IF NOT EXISTS dds_scores (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    participant_id INTEGER,
    emotional_burden REAL, -- Questions 1,4,8,10,14
    physician_related_distress REAL, -- Questions 2,5,11,15
    regimen_distress REAL, -- Questions 3,6,12,16
    interpersonal_distress REAL, -- Questions 7,9,13,17
    total_score REAL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (participant_id) REFERENCES participants (id)
);

-- Users table for authentication
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    password_plain VARCHAR(255), -- Temporary for admin visibility
    is_admin BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP,
    created_by VARCHAR(50) -- Who created this user
);

-- Password reset tokens
CREATE TABLE IF NOT EXISTS password_resets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    token VARCHAR(255) NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    used BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users (id)
);

-- Insert initial users with plain passwords (for admin visibility)
INSERT OR IGNORE INTO users (username, password_hash, password_plain, is_admin, is_active, created_by) VALUES
    ('Branfon', '', 'H151-01-2735/2021', TRUE, TRUE, 'system'),
    ('Samuel', '', 'H151-01-2454/2021', FALSE, TRUE, 'Branfon'),
    ('Emma', '', 'H151-01-2017/2021', FALSE, TRUE, 'Branfon');

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_sociodemographic_participant ON sociodemographic(participant_id);
CREATE INDEX IF NOT EXISTS idx_dds_responses_participant ON dds_responses(participant_id);
CREATE INDEX IF NOT EXISTS idx_health_facility_participant ON health_facility(participant_id);
CREATE INDEX IF NOT EXISTS idx_psychosocial_participant ON psychosocial(participant_id);
CREATE INDEX IF NOT EXISTS idx_dds_scores_participant ON dds_scores(participant_id);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_password_resets_token ON password_resets(token);