const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cors());
app.use(express.static(path.join(__dirname)));

// Database setup
const db = new sqlite3.Database('diabetes_distress.db');

// Initialize database tables
function initDatabase() {
    const schema = `
        -- Participants table
        CREATE TABLE IF NOT EXISTS participants (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            signature_date TEXT,
            participant_signature TEXT,
            investigator_signature TEXT,
            investigator_date TEXT
        );

        CREATE TABLE IF NOT EXISTS sociodemographic (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            participant_id INTEGER,
            age_group INTEGER,
            marital_status INTEGER,
            gender INTEGER,
            education_level INTEGER,
            employment_status INTEGER,
            living_situation INTEGER,
            health_insurance INTEGER,
            payment_difficulty INTEGER,
            FOREIGN KEY (participant_id) REFERENCES participants (id)
        );

        CREATE TABLE IF NOT EXISTS dds_responses (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            participant_id INTEGER,
            question_number INTEGER,
            response INTEGER,
            FOREIGN KEY (participant_id) REFERENCES participants (id)
        );

        CREATE TABLE IF NOT EXISTS health_facility (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            participant_id INTEGER,
            travel_time INTEGER,
            transport_mode INTEGER,
            transport_other TEXT,
            wait_time INTEGER,
            wait_rating INTEGER,
            missed_visit INTEGER,
            FOREIGN KEY (participant_id) REFERENCES participants (id)
        );

        CREATE TABLE IF NOT EXISTS psychosocial (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            participant_id INTEGER,
            help_frequency INTEGER,
            primary_helper INTEGER,
            exercise_advice INTEGER,
            diet_advice INTEGER,
            diabetes_education INTEGER,
            food_restriction INTEGER,
            meal_plan_compliance INTEGER,
            FOREIGN KEY (participant_id) REFERENCES participants (id)
        );

        CREATE TABLE IF NOT EXISTS dds_scores (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            participant_id INTEGER,
            emotional_burden REAL,
            physician_related_distress REAL,
            regimen_distress REAL,
            interpersonal_distress REAL,
            total_score REAL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (participant_id) REFERENCES participants (id)
        );
    `;

    db.exec(schema, (err) => {
        if (err) {
            console.error('Error creating tables:', err);
        } else {
            console.log('Database tables created successfully');
        }
    });
}

// API Routes

// Serve the main questionnaire
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Submit questionnaire data
app.post('/api/submit', async (req, res) => {
    try {
        const data = req.body;
        
        // Start transaction
        await new Promise((resolve, reject) => {
            db.run('BEGIN TRANSACTION', (err) => {
                if (err) reject(err);
                else resolve();
            });
        });

        // Create participant record
        const participantId = await new Promise((resolve, reject) => {
            db.run(`
                INSERT INTO participants 
                (signature_date, participant_signature, investigator_signature, investigator_date)
                VALUES (?, ?, ?, ?)
            `, [
                data.signature?.signature_date,
                data.signature?.participant_signature,
                data.signature?.investigator_signature,
                data.signature?.investigator_date
            ], function(err) {
                if (err) reject(err);
                else resolve(this.lastID);
            });
        });

        // Save sociodemographic data
        if (data.sociodemographic) {
            await new Promise((resolve, reject) => {
                db.run(`
                    INSERT INTO sociodemographic 
                    (participant_id, age_group, marital_status, gender, education_level, 
                     employment_status, living_situation, health_insurance, payment_difficulty)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                `, [
                    participantId,
                    data.sociodemographic.age_group,
                    data.sociodemographic.marital_status,
                    data.sociodemographic.gender,
                    data.sociodemographic.education_level,
                    data.sociodemographic.employment_status,
                    data.sociodemographic.living_situation,
                    data.sociodemographic.health_insurance,
                    data.sociodemographic.payment_difficulty
                ], (err) => {
                    if (err) reject(err);
                    else resolve();
                });
            });
        }

        // Save DDS responses
        if (data.dds_responses) {
            for (let i = 1; i <= 17; i++) {
                const response = data.dds_responses[`dds-${i}`];
                if (response) {
                    await new Promise((resolve, reject) => {
                        db.run(`
                            INSERT INTO dds_responses (participant_id, question_number, response)
                            VALUES (?, ?, ?)
                        `, [participantId, i, parseInt(response)], (err) => {
                            if (err) reject(err);
                            else resolve();
                        });
                    });
                }
            }
        }

        // Save health facility data
        if (data.health_facility) {
            await new Promise((resolve, reject) => {
                db.run(`
                    INSERT INTO health_facility 
                    (participant_id, travel_time, transport_mode, transport_other, 
                     wait_time, wait_rating, missed_visit)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                `, [
                    participantId,
                    data.health_facility.travel_time,
                    data.health_facility.transport_mode,
                    data.health_facility.transport_other,
                    data.health_facility.wait_time,
                    data.health_facility.wait_rating,
                    data.health_facility.missed_visit
                ], (err) => {
                    if (err) reject(err);
                    else resolve();
                });
            });
        }

        // Save psychosocial data
        if (data.psychosocial) {
            await new Promise((resolve, reject) => {
                db.run(`
                    INSERT INTO psychosocial 
                    (participant_id, help_frequency, primary_helper, exercise_advice, 
                     diet_advice, diabetes_education, food_restriction, meal_plan_compliance)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                `, [
                    participantId,
                    data.psychosocial.help_frequency,
                    data.psychosocial.primary_helper,
                    data.psychosocial.exercise_advice,
                    data.psychosocial.diet_advice,
                    data.psychosocial.diabetes_education,
                    data.psychosocial.food_restriction,
                    data.psychosocial.meal_plan_compliance
                ], (err) => {
                    if (err) reject(err);
                    else resolve();
                });
            });
        }

        // Calculate DDS scores
        await calculateDDSScores(participantId);

        // Commit transaction
        await new Promise((resolve, reject) => {
            db.run('COMMIT', (err) => {
                if (err) reject(err);
                else resolve();
            });
        });

        res.json({ 
            success: true, 
            participantId: participantId,
            message: 'Questionnaire submitted successfully' 
        });

    } catch (error) {
        // Rollback transaction on error
        await new Promise((resolve) => {
            db.run('ROLLBACK', () => resolve());
        });
        
        console.error('Error submitting questionnaire:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error submitting questionnaire: ' + error.message 
        });
    }
});

// Calculate DDS scores
async function calculateDDSScores(participantId) {
    return new Promise((resolve, reject) => {
        db.all(`
            SELECT question_number, response 
            FROM dds_responses 
            WHERE participant_id = ? 
            ORDER BY question_number
        `, [participantId], (err, responses) => {
            if (err) {
                reject(err);
                return;
            }

            const responseMap = {};
            responses.forEach(r => {
                responseMap[r.question_number] = r.response;
            });

            // Calculate subscale scores
            const emotionalBurden = calculateSubscaleAverage([1,4,8,10,14], responseMap);
            const physicianDistress = calculateSubscaleAverage([2,5,11,15], responseMap);
            const regimenDistress = calculateSubscaleAverage([3,6,12,16], responseMap);
            const interpersonalDistress = calculateSubscaleAverage([7,9,13,17], responseMap);
            
            const values = Object.values(responseMap);
            const totalScore = values.reduce((sum, val) => sum + val, 0) / values.length;

            db.run(`
                INSERT INTO dds_scores 
                (participant_id, emotional_burden, physician_related_distress, 
                 regimen_distress, interpersonal_distress, total_score)
                VALUES (?, ?, ?, ?, ?, ?)
            `, [participantId, emotionalBurden, physicianDistress, 
                regimenDistress, interpersonalDistress, totalScore], (err) => {
                if (err) reject(err);
                else resolve();
            });
        });
    });
}

function calculateSubscaleAverage(questions, responses) {
    const scores = questions.map(q => responses[q]).filter(Boolean);
    return scores.length > 0 ? scores.reduce((sum, val) => sum + val, 0) / scores.length : 0;
}

// Get participant data
app.get('/api/participants/:id', (req, res) => {
    const participantId = req.params.id;
    
    db.get(`
        SELECT p.*, s.*, h.*, ps.*, d.*
        FROM participants p
        LEFT JOIN sociodemographic s ON p.id = s.participant_id
        LEFT JOIN health_facility h ON p.id = h.participant_id
        LEFT JOIN psychosocial ps ON p.id = ps.participant_id
        LEFT JOIN dds_scores d ON p.id = d.participant_id
        WHERE p.id = ?
    `, [participantId], (err, row) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        
        if (!row) {
            res.status(404).json({ error: 'Participant not found' });
            return;
        }
        
        res.json(row);
    });
});

// Get all participants list
app.get('/api/participants', (req, res) => {
    db.all(`
        SELECT p.id, p.created_at, d.total_score, d.emotional_burden
        FROM participants p
        LEFT JOIN dds_scores d ON p.id = d.participant_id
        ORDER BY p.created_at DESC
    `, (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json(rows);
    });
});

// Initialize database and start server
initDatabase();

app.listen(PORT, () => {
    console.log(`Diabetes Distress Scale server running on http://localhost:${PORT}`);
    console.log(`Database: diabetes_distress.db`);
});

// Graceful shutdown
process.on('SIGINT', () => {
    db.close((err) => {
        if (err) {
            console.error('Error closing database:', err.message);
        } else {
            console.log('Database connection closed.');
        }
        process.exit(0);
    });
});