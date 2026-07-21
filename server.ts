/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from 'express';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';
import { getPool, initUsersTable, seedUsersIfEmpty, rowToUser } from './src/db/postgres';

// Safe require for CommonJS modules in ES Modules (dev, via tsx) or bundled
// CJS (production, via esbuild). In dev, import.meta.url is a real string and
// createRequire succeeds. In the bundled CJS build, esbuild strips
// import.meta down to an empty object, so import.meta.url is undefined and
// createRequire throws — we catch that and fall back to the native `require`
// that Node's CJS module wrapper always provides in a real .cjs file.
let requireFn: NodeRequire;
try {
  requireFn = createRequire(import.meta.url);
} catch {
  requireFn = require;
}
const pdf = requireFn('pdf-parse');
const mammoth = requireFn('mammoth');
const XLSX = requireFn('xlsx');

// Load environment variables
dotenv.config();

// Safe __dirname resolution supporting both tsx development (ESM) and bundled CommonJS production
let currentDirName = '';
try {
  currentDirName = path.dirname(fileURLToPath(import.meta.url));
} catch (e) {
  currentDirName = __dirname;
}

const app = express();
const PORT = 3000;

app.use(express.json());

// Path to JSON DB
const DB_PATH = path.join(currentDirName, 'src', 'db', 'db.json');

// Ensure db directory exists
const dbDir = path.dirname(DB_PATH);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

// Initial/Seed Data
const SEED_DATA = {
  users: [
    { id: 'admin-1', username: 'admin', password: 'password', role: 'admin', name: 'Admin', email: 'admin@gceerode.ac.in' },
    { id: 'student-1', username: 'student', password: 'password', role: 'student', name: 'Alex Carter', email: 'alex.carter@student.edu' }
  ],
  tests: [
    {
      id: 'test-1',
      title: 'Quantitative Aptitude Prep',
      description: 'Covers essential quantitative aptitude topics including Profit & Loss, Percentages, and Probability.',
      duration: 15,
      category: 'Aptitude',
      questions: [
        {
          id: 'q1',
          question: 'A shopkeeper sells an article for $180 at a gain of 20%. What was the cost price of the article?',
          options: ['$140', '$150', '$160', '$145'],
          correctAnswer: 1
        },
        {
          id: 'q2',
          question: 'If log 27 = 1.431, what is the value of log 9?',
          options: ['0.934', '0.954', '0.845', '1.121'],
          correctAnswer: 1
        },
        {
          id: 'q3',
          question: 'Three unbiased coins are tossed. What is the probability of getting at most two heads?',
          options: ['3/4', '1/4', '7/8', '5/8'],
          correctAnswer: 2
        }
      ],
      createdAt: new Date().toISOString()
    },
    {
      id: 'test-2',
      title: 'Technical Web Core Assessment',
      description: 'Tests fundamental concepts of modern Full-Stack web development (React, JavaScript, CSS).',
      duration: 10,
      category: 'Technical',
      questions: [
        {
          id: 'q2-1',
          question: 'Which of the following is true about React state updates?',
          options: [
            'They are always synchronous',
            'They directly modify the component state on the spot',
            'They may be batched and are asynchronous',
            'They force full page refreshes'
          ],
          correctAnswer: 2
        },
        {
          id: 'q2-2',
          question: 'What is the purpose of the useEffect dependency array in React?',
          options: [
            'To define CSS styles dynamically',
            'To specify when the effect function should run or re-trigger',
            'To register Event Listeners exclusively',
            'To improve network connection speed'
          ],
          correctAnswer: 1
        }
      ],
      createdAt: new Date().toISOString()
    }
  ],
  results: [
    {
      id: 'res-1',
      userId: 'student-1',
      username: 'student',
      studentName: 'Alex Carter',
      testId: 'test-1',
      testTitle: 'Quantitative Aptitude Prep',
      category: 'Aptitude',
      score: 2,
      totalQuestions: 3,
      submittedAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // 1 day ago
      answers: { 'q1': 1, 'q2': 0, 'q3': 2 }
    }
  ],
  placementDrives: [
    {
      id: 'drive-1',
      company: 'TechCorp Global',
      role: 'Associate Software Engineer',
      salaryPackage: '$85,000 / Year',
      eligibility: 'B.Tech / MCA / M.Sc with CGPA >= 7.5. No standing backlogs.',
      date: 'July 25, 2026',
      status: 'Open'
    },
    {
      id: 'drive-2',
      company: 'InnoSystems',
      role: 'Cloud Architect & DevOps Intern',
      salaryPackage: '$45 / Hour (Internship)',
      eligibility: 'Computer Science, Information Technology, or related streams.',
      date: 'August 03, 2026',
      status: 'Open'
    },
    {
      id: 'drive-3',
      company: 'Apex Financial Tech',
      role: 'Quantitative Analyst',
      salaryPackage: '$120,000 / Year',
      eligibility: 'Highly proficient in Mathematics / Stats. CGPA >= 8.5.',
      date: 'August 18, 2026',
      status: 'Upcoming'
    }
  ],
  trainingResources: [
    {
      id: 'tr-1',
      title: 'Acing the Coding Technical Interview',
      category: 'Technical',
      type: 'Guide',
      content: 'Understand Big O notation, practice Arrays, Hashing, Linked Lists, Trees, and DP. Always communicate your thoughts out loud during tech interviews.',
      readTime: '6 mins',
      tags: ['Interview Tips', 'Algorithms', 'DS']
    },
    {
      id: 'tr-2',
      title: 'Formulas and Tricks for Quantitative Aptitude',
      category: 'Aptitude',
      type: 'Cheatsheet',
      content: 'Percentages: % change = (diff / original) * 100. Profit & Loss: Profit = SP - CP. Speed & Distance: Relative speed = Sum of speeds (moving in opposite directions).',
      readTime: '4 mins',
      tags: ['Aptitude', 'Math Tricks', 'Formulas']
    },
    {
      id: 'tr-3',
      title: 'Behavioral Questions Guide (STAR Method)',
      category: 'Verbal',
      type: 'Guide',
      content: 'STAR stands for Situation, Task, Action, Result. Frame all response stories around how you resolved conflicts, solved tech bugs, or managed tight schedules.',
      readTime: '8 mins',
      tags: ['Behavioral', 'STAR Method', 'Soft Skills']
    }
  ]
};

// Database helper functions
function readDb() {
  try {
    if (!fs.existsSync(DB_PATH)) {
      fs.writeFileSync(DB_PATH, JSON.stringify(SEED_DATA, null, 2), 'utf-8');
      return SEED_DATA;
    }
    const data = fs.readFileSync(DB_PATH, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error reading database file, returning default seed data:', error);
    return SEED_DATA;
  }
}

function writeDb(data: any) {
  try {
    fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), 'utf-8');
  } catch (error) {
    console.error('Error writing database file:', error);
  }
}

// Lazy load Gemini AI Client to avoid startup crashes if key is missing
let aiInstance: GoogleGenAI | null = null;
function getGenAI() {
  if (!aiInstance) {
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
      console.warn('GEMINI_API_KEY is not defined. Gemini features will run on graceful offline backup templates.');
      return null;
    }
    aiInstance = new GoogleGenAI({
      apiKey: key,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build'
        }
      }
    });
  }
  return aiInstance;
}

// REST API Endpoints

// 1. Auth Endpoint: Login
app.post('/api/auth/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }

  try {
    const db = getPool();
    const { rows } = await db.query(
      'SELECT * FROM users WHERE LOWER(username) = LOWER($1) AND password = $2',
      [username, password]
    );

    if (rows.length === 0) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    const { password: _, ...safeUser } = rowToUser(rows[0])!;
    res.json({ user: safeUser });
  } catch (error: any) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Database error during login. Check DATABASE_URL.' });
  }
});

// 2. Auth Endpoint: Register (For Students)
app.post('/api/auth/register', async (req, res) => {
  const { username, password, name, email, branchType, department } = req.body;
  if (!username || !password || !name || !email) {
    return res.status(400).json({ error: 'All fields are required' });
  }

  try {
    const db = getPool();
    const exists = await db.query('SELECT 1 FROM users WHERE LOWER(username) = LOWER($1)', [username]);
    if (exists.rows.length > 0) {
      return res.status(400).json({ error: 'Username already taken' });
    }

    const newUser = {
      id: `student-${Date.now()}`,
      username,
      password,
      role: 'student' as const,
      name,
      email,
      branchType: branchType || '',
      department: department || '',
      approved: false
    };

    await db.query(
      `INSERT INTO users (id, username, password, role, name, email, approved, branch_type, department)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [newUser.id, newUser.username, newUser.password, newUser.role, newUser.name,
       newUser.email, newUser.approved, newUser.branchType, newUser.department]
    );

    const { password: _, ...safeUser } = newUser;
    res.json({ user: safeUser });
  } catch (error: any) {
    console.error('Register error:', error);
    res.status(500).json({ error: 'Database error during registration. Check DATABASE_URL.' });
  }
});

// 2b. Auth Endpoint: Check user approval status
app.get('/api/auth/status/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const db = getPool();
    const { rows } = await db.query('SELECT * FROM users WHERE id = $1', [id]);
    if (rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    const { password, ...safeUser } = rowToUser(rows[0])!;
    res.json({ user: safeUser });
  } catch (error: any) {
    console.error('Auth status error:', error);
    res.status(500).json({ error: 'Database error. Check DATABASE_URL.' });
  }
});

// 2c. Users API: Get list of all users (Admin view)
app.get('/api/users', async (req, res) => {
  try {
    const db = getPool();
    const { rows } = await db.query('SELECT * FROM users ORDER BY id');
    const allUsers = rows.map((r) => {
      const { password, ...safeUser } = rowToUser(r)!;
      return safeUser;
    });
    res.json({ users: allUsers });
  } catch (error: any) {
    console.error('Get users error:', error);
    res.status(500).json({ error: 'Database error. Check DATABASE_URL.' });
  }
});

// 2d. Users API: Approve user
app.put('/api/users/:id/approve', async (req, res) => {
  const { id } = req.params;
  try {
    const db = getPool();
    const { rows } = await db.query(
      'UPDATE users SET approved = true WHERE id = $1 RETURNING *',
      [id]
    );
    if (rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    const { password, ...safeUser } = rowToUser(rows[0])!;
    res.json({ user: safeUser, message: 'User approved successfully' });
  } catch (error: any) {
    console.error('Approve user error:', error);
    res.status(500).json({ error: 'Database error. Check DATABASE_URL.' });
  }
});

// 2e. Users API: Delete/Reject user
app.delete('/api/users/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const db = getPool();
    const { rowCount } = await db.query('DELETE FROM users WHERE id = $1', [id]);
    if (rowCount === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json({ success: true, message: 'User deleted/rejected successfully' });
  } catch (error: any) {
    console.error('Delete user error:', error);
    res.status(500).json({ error: 'Database error. Check DATABASE_URL.' });
  }
});

// 2h. Users API: Create a new user (Admin/Faculty privilege)
app.post('/api/users', async (req, res) => {
  const { name, username, password, email, role, approved, branchType, department } = req.body;
  if (!name || !username || !password || !email || !role) {
    return res.status(400).json({ error: 'All fields (name, username, password, email, role) are required' });
  }

  if (role !== 'student' && role !== 'admin' && role !== 'faculty') {
    return res.status(400).json({ error: 'Invalid role' });
  }

  try {
    const db = getPool();
    const exists = await db.query('SELECT 1 FROM users WHERE LOWER(username) = LOWER($1)', [username]);
    if (exists.rows.length > 0) {
      return res.status(400).json({ error: 'Username already taken' });
    }

    const newUser = {
      id: `${role}-${Date.now()}`,
      username,
      password,
      role,
      name,
      email,
      branchType: branchType || '',
      department: department || '',
      approved: approved !== undefined ? approved : true
    };

    await db.query(
      `INSERT INTO users (id, username, password, role, name, email, approved, branch_type, department)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [newUser.id, newUser.username, newUser.password, newUser.role, newUser.name,
       newUser.email, newUser.approved, newUser.branchType, newUser.department]
    );

    const { password: _, ...safeUser } = newUser;
    res.json({ user: safeUser, message: 'User created successfully' });
  } catch (error: any) {
    console.error('Create user error:', error);
    res.status(500).json({ error: 'Database error. Check DATABASE_URL.' });
  }
});

// 2f. Users API: Update user role
app.put('/api/users/:id/role', async (req, res) => {
  const { id } = req.params;
  const { role } = req.body;
  if (role !== 'student' && role !== 'admin' && role !== 'faculty') {
    return res.status(400).json({ error: 'Invalid role' });
  }
  try {
    const db = getPool();
    const approved = (role === 'admin' || role === 'faculty') ? true : undefined;
    const { rows } = approved !== undefined
      ? await db.query('UPDATE users SET role = $1, approved = $2 WHERE id = $3 RETURNING *', [role, approved, id])
      : await db.query('UPDATE users SET role = $1 WHERE id = $2 RETURNING *', [role, id]);

    if (rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    const { password, ...safeUser } = rowToUser(rows[0])!;
    res.json({ user: safeUser, message: 'User role updated successfully' });
  } catch (error: any) {
    console.error('Update role error:', error);
    res.status(500).json({ error: 'Database error. Check DATABASE_URL.' });
  }
});

// 2g. Users API: Update user details (Admin privilege)
app.put('/api/users/:id', async (req, res) => {
  const { id } = req.params;
  const { name, username, email, role, approved, branchType, department, password } = req.body;

  if (role && role !== 'student' && role !== 'admin' && role !== 'faculty') {
    return res.status(400).json({ error: 'Invalid role' });
  }

  try {
    const db = getPool();
    const existing = await db.query('SELECT * FROM users WHERE id = $1', [id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    const current = rowToUser(existing.rows[0])!;

    if (username !== undefined) {
      const usernameTaken = await db.query(
        'SELECT 1 FROM users WHERE LOWER(username) = LOWER($1) AND id != $2',
        [username, id]
      );
      if (usernameTaken.rows.length > 0) {
        return res.status(400).json({ error: 'Username already taken' });
      }
    }

    const merged = {
      name: name !== undefined ? name : current.name,
      username: username !== undefined ? username : current.username,
      email: email !== undefined ? email : current.email,
      role: role !== undefined ? role : current.role,
      approved: approved !== undefined ? approved : ((role === 'admin' || role === 'faculty') ? true : current.approved),
      branchType: branchType !== undefined ? branchType : current.branchType,
      department: department !== undefined ? department : current.department,
      password: (password !== undefined && password !== '') ? password : current.password,
    };

    const { rows } = await db.query(
      `UPDATE users SET name = $1, username = $2, email = $3, role = $4,
       approved = $5, branch_type = $6, department = $7, password = $8 WHERE id = $9 RETURNING *`,
      [merged.name, merged.username, merged.email, merged.role,
       merged.approved, merged.branchType, merged.department, merged.password, id]
    );

    const { password: _, ...safeUser } = rowToUser(rows[0])!;
    res.json({ user: safeUser, message: 'User updated successfully' });
  } catch (error: any) {
    console.error('Update user error:', error);
    res.status(500).json({ error: 'Database error. Check DATABASE_URL.' });
  }
});

// 3. Tests API: List
app.get('/api/tests', (req, res) => {
  const db = readDb();
  // Strip correct answers from questions if client is a student to prevent source-code cheating
  const role = req.query.role as string;
  
  if (role === 'student') {
    const studentTests = db.tests.map((test: any) => ({
      ...test,
      questions: test.questions.map((q: any) => {
        const { correctAnswer, ...safeQuestion } = q;
        return safeQuestion;
      })
    }));
    return res.json({ tests: studentTests });
  }
  
  res.json({ tests: db.tests });
});

// 4. Tests API: Create Manually by Admin
app.post('/api/tests', (req, res) => {
  const { title, description, duration, category, questions } = req.body;
  if (!title || !duration || !category || !questions || !Array.isArray(questions)) {
    return res.status(400).json({ error: 'Missing required test properties' });
  }

  const db = readDb();
  const newTest = {
    id: `test-${Date.now()}`,
    title,
    description: description || 'No description provided.',
    duration: parseInt(duration) || 15,
    category,
    questions: questions.map((q: any, idx: number) => ({
      id: q.id || `q-${idx}-${Date.now()}`,
      question: q.question,
      options: q.options || [],
      correctAnswer: parseInt(q.correctAnswer) || 0
    })),
    createdAt: new Date().toISOString()
  };

  db.tests.push(newTest);
  writeDb(db);
  res.status(201).json({ test: newTest });
});

// 4b. Tests API: Delete a test (Admin/Faculty)
app.delete('/api/tests/:id', (req, res) => {
  const { id } = req.params;
  const db = readDb();
  const initialLength = db.tests.length;
  db.tests = db.tests.filter((t: any) => t.id !== id);

  if (db.tests.length === initialLength) {
    return res.status(404).json({ error: 'Test not found' });
  }

  // Also remove any student results tied to this test, so the gradebook
  // doesn't reference a test that no longer exists
  db.results = db.results.filter((r: any) => r.testId !== id);

  writeDb(db);
  res.json({ success: true, message: 'Test and its associated results deleted successfully' });
});

// 5. Tests API: Generate Test with Gemini AI!
app.post('/api/tests/generate-ai', async (req, res) => {
  const { topic, numQuestions, category, difficulty } = req.body;
  
  if (!topic || !numQuestions || !category) {
    return res.status(400).json({ error: 'Topic, number of questions, and category are required' });
  }

  const ai = getGenAI();

  // Offline Graceful Fallback if Gemini key is missing
  if (!ai) {
    console.log('Gemini AI API key not found. Using pre-formatted mock question database fallback.');
    const db = readDb();
    
    // Generate simple questions based on the topic
    const sampleQuestions = Array.from({ length: parseInt(numQuestions) || 5 }).map((_, idx) => ({
      id: `q-ai-${idx}-${Date.now()}`,
      question: `What is the core definition/concept of ${topic} (Scenario ${idx + 1})?`,
      options: [
        'Option A: Primary industry standard definition',
        'Option B: Secondary alternative framework',
        'Option C: Deprecated application pattern',
        'Option D: Unrelated technical process'
      ],
      correctAnswer: 0
    }));

    const newTest = {
      id: `test-ai-${Date.now()}`,
      title: `AI: ${topic} (${difficulty || 'Medium'})`,
      description: `Automatically generated placement preparation exam focusing on ${topic}.`,
      duration: (parseInt(numQuestions) || 5) * 4,
      category,
      questions: sampleQuestions,
      createdAt: new Date().toISOString()
    };

    db.tests.push(newTest);
    writeDb(db);
    return res.json({ test: newTest, offlineFallback: true });
  }

  try {
    const prompt = `Generate a set of ${numQuestions} multiple choice questions (MCQs) for a student placement preparation test on the topic: "${topic}".
The category is: "${category}" and the difficulty level is: "${difficulty || 'Medium'}".
Each question must have exactly 4 options. Specifiy the correctAnswer index (0, 1, 2, or 3) representing the correct choice.
Make the questions realistic to software/engineering corporate placement papers (Aptitude, Tech, and Logical).
Return the result STRICTLY as a JSON array matching this schema:
[
  {
    "question": "A clear description of the problem or query...",
    "options": ["Option 0 text", "Option 1 text", "Option 2 text", "Option 3 text"],
    "correctAnswer": 0
  }
]
`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        maxOutputTokens: 65536,
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              question: { type: Type.STRING },
              options: {
                type: Type.ARRAY,
                items: { type: Type.STRING }
              },
              correctAnswer: { type: Type.INTEGER }
            },
            required: ['question', 'options', 'correctAnswer']
          }
        },
        systemInstruction: "You are an expert recruitment coordinator and placement test creator for top global IT & engineering companies."
      }
    });

    const textOutput = response.text || '[]';
    const parsedQuestions = JSON.parse(textOutput);

    // Save generated test
    const db = readDb();
    const newTest = {
      id: `test-ai-${Date.now()}`,
      title: `AI: ${topic} (${difficulty || 'Medium'})`,
      description: `Gemini AI generated recruitment prep mock test focusing on ${topic}.`,
      duration: (parsedQuestions.length || 5) * 3, // 3 mins per question
      category,
      questions: parsedQuestions.map((q: any, idx: number) => ({
        id: `q-ai-${idx}-${Date.now()}`,
        question: q.question,
        options: q.options,
        correctAnswer: q.correctAnswer
      })),
      createdAt: new Date().toISOString()
    };

    db.tests.push(newTest);
    writeDb(db);

    res.json({ test: newTest });
  } catch (error: any) {
    console.error('Error generating questions with Gemini AI:', error);
    res.status(500).json({ error: 'AI test generation failed. Please try again or create manually.' });
  }
});

// 5b. Tests API: Generate Test from File (docx, pdf, xls, json) with Gemini AI!
app.post('/api/tests/generate-from-file', async (req, res) => {
  const { fileName, fileData, category, difficulty, numQuestions } = req.body;
  const targetQuestionCount = Number(numQuestions) > 0 ? Number(numQuestions) : 5;

  if (!fileName || !fileData || !category) {
    return res.status(400).json({ error: 'File name, base64 data, and category are required' });
  }

  let extractedText = '';
  let directMcqs: any[] | null = null;

  try {
    const buffer = Buffer.from(fileData, 'base64');
    const ext = path.extname(fileName).toLowerCase();

    if (ext === '.json') {
      const jsonStr = buffer.toString('utf-8');
      try {
        const parsed = JSON.parse(jsonStr);

        // Format A: bare top-level array of MCQs, e.g. [{question, options, correctAnswer}]
        if (Array.isArray(parsed) && parsed.length > 0 && parsed[0].question && Array.isArray(parsed[0].options)) {
          directMcqs = parsed;
        }
        // Format B: wrapped object with a nested "questions" array, e.g.
        // { title, questions: [{ question, options, correct_answer: "text of the right option" }] }
        else if (parsed && Array.isArray(parsed.questions) && parsed.questions.length > 0 &&
                 parsed.questions[0].question && Array.isArray(parsed.questions[0].options)) {
          directMcqs = parsed.questions.map((q: any) => {
            let correctIndex = 0;

            // correctAnswer might already be a numeric index
            if (typeof q.correctAnswer === 'number') {
              correctIndex = q.correctAnswer;
            } else if (typeof q.correct_answer === 'number') {
              correctIndex = q.correct_answer;
            } else {
              // Otherwise it's given as answer text (e.g. "10", "₹100") -
              // find which option it matches (trimmed, case-insensitive)
              const answerText = String(q.correctAnswer ?? q.correct_answer ?? '').trim().toLowerCase();
              const matchIndex = q.options.findIndex((opt: string) => String(opt).trim().toLowerCase() === answerText);
              correctIndex = matchIndex !== -1 ? matchIndex : 0;
            }

            return {
              question: q.question,
              options: q.options,
              correctAnswer: correctIndex
            };
          });
        } else {
          extractedText = jsonStr;
        }
      } catch (e) {
        extractedText = jsonStr;
      }
    } else if (ext === '.pdf') {
      // pdf-parse library
      const data = await pdf(buffer);
      extractedText = data.text || '';
    } else if (ext === '.docx') {
      // mammoth library
      const result = await mammoth.extractRawText({ buffer });
      extractedText = result.value || '';
    } else if (ext === '.xls' || ext === '.xlsx') {
      // xlsx library
      const workbook = XLSX.read(buffer, { type: 'buffer' });
      workbook.SheetNames.forEach(sheetName => {
        const worksheet = workbook.Sheets[sheetName];
        extractedText += XLSX.utils.sheet_to_txt(worksheet) + '\n';
      });
    } else if (ext === '.txt' || ext === '.csv') {
      // Plain text - CSV is just comma-separated plain text, no special parsing needed
      extractedText = buffer.toString('utf-8');
    } else {
      return res.status(400).json({ error: `Unsupported file extension: ${ext}. Supported types: docx, pdf, xls, xlsx, json, txt, csv` });
    }
  } catch (err: any) {
    console.error('Error parsing uploaded file:', err);
    return res.status(400).json({ error: `Failed to parse file: ${err.message || err}` });
  }

  const ai = getGenAI();

  // Offline Fallback
  if (!ai) {
    console.log('Gemini AI API key not found. Using offline file generator fallback.');
    const db = readDb();
    
    // Create direct or mock questions
    const finalQuestions = directMcqs || Array.from({ length: targetQuestionCount }, (_, i) => ({
      question: `[Offline Fallback] Question ${i + 1} extracted from file "${fileName}": Can you identify the correct statement about this concept?`,
      options: [
        'Option A: Industry-standard best practice',
        'Option B: Experimental secondary methodology',
        'Option C: Deprecated system behavior',
        'Option D: Unrelated technical function'
      ],
      correctAnswer: 0
    }));

    const newTest = {
      id: `test-ai-${Date.now()}`,
      title: `AI: File - ${fileName.substring(0, 20)} (${difficulty || 'Medium'})`,
      description: `Automatically created test from uploaded document "${fileName}".`,
      duration: finalQuestions.length * 4,
      category,
      questions: finalQuestions.map((q: any, idx: number) => ({
        id: `q-ai-${idx}-${Date.now()}`,
        question: q.question,
        options: q.options || ['Option A', 'Option B', 'Option C', 'Option D'],
        correctAnswer: typeof q.correctAnswer === 'number' ? q.correctAnswer : 0
      })),
      createdAt: new Date().toISOString()
    };

    db.tests.push(newTest);
    writeDb(db);
    return res.json({ test: newTest, offlineFallback: true });
  }

  // If we have direct MCQs, we don't even need Gemini
  if (directMcqs) {
    // Respect the user's selected question count here too, same as the AI path
    const trimmedMcqs = directMcqs.length > targetQuestionCount
      ? directMcqs.slice(0, targetQuestionCount)
      : directMcqs;

    const db = readDb();
    const newTest = {
      id: `test-ai-${Date.now()}`,
      title: `Imported: ${fileName.substring(0, 20)}`,
      description: `Imported directly from JSON file "${fileName}".`,
      duration: trimmedMcqs.length * 3,
      category,
      questions: trimmedMcqs.map((q: any, idx: number) => ({
        id: `q-ai-${idx}-${Date.now()}`,
        question: q.question,
        options: q.options,
        correctAnswer: typeof q.correctAnswer === 'number' ? q.correctAnswer : 0
      })),
      createdAt: new Date().toISOString()
    };

    db.tests.push(newTest);
    writeDb(db);
    return res.json({ test: newTest });
  }

  // Use Gemini to generate test questions from extractedText
  try {
    const prompt = `You are an elite placement cell training director and assessment designer.
We have extracted text from an uploaded file named "${fileName}".
Your task is to analyze the extracted text and generate a structured set of multiple choice questions (MCQs) for a mock placement prep test.

Extracted Text from file:
"""
${extractedText.substring(0, 8000)}
"""

Target Category: "${category}"
Difficulty Target: "${difficulty || 'Medium'}"
Target Question Count: exactly ${targetQuestionCount} questions

Requirements:
1. Extract or write EXACTLY ${targetQuestionCount} highly relevant MCQs based on the questions, formulas, or technical/logical/verbal concepts found in the text. If the text lists direct questions, prioritize extracting and formatting them. If it contains general information, generate high-quality MCQs from it. Do not return more or fewer than ${targetQuestionCount} questions.
2. Each MCQ must have exactly 4 options.
3. Specifiy the correctAnswer index (0, 1, 2, or 3) representing the correct choice.
4. Return the result STRICTLY as a JSON array matching this schema:
[
  {
    "question": "A clear description of the problem or query...",
    "options": ["Option 0 text", "Option 1 text", "Option 2 text", "Option 3 text"],
    "correctAnswer": 0
  }
]
`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        maxOutputTokens: 65536,
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              question: { type: Type.STRING },
              options: {
                type: Type.ARRAY,
                items: { type: Type.STRING }
              },
              correctAnswer: { type: Type.INTEGER }
            },
            required: ['question', 'options', 'correctAnswer']
          }
        },
        systemInstruction: "You are an expert recruitment coordinator and placement test creator for top global IT & engineering companies."
      }
    });

    const textOutput = response.text || '[]';
    let parsedQuestions = JSON.parse(textOutput);

    // Safeguard: Gemini doesn't always follow exact-count instructions perfectly.
    // Trim to the requested count so the test always matches what the user picked.
    if (Array.isArray(parsedQuestions) && parsedQuestions.length > targetQuestionCount) {
      parsedQuestions = parsedQuestions.slice(0, targetQuestionCount);
    }

    const db = readDb();
    const newTest = {
      id: `test-ai-${Date.now()}`,
      title: `AI Document: ${fileName.substring(0, 25)}`,
      description: `Gemini AI generated preparation test from uploaded file "${fileName}".`,
      duration: (parsedQuestions.length || 5) * 3,
      category,
      questions: parsedQuestions.map((q: any, idx: number) => ({
        id: `q-ai-${idx}-${Date.now()}`,
        question: q.question,
        options: q.options,
        correctAnswer: q.correctAnswer
      })),
      createdAt: new Date().toISOString()
    };

    db.tests.push(newTest);
    writeDb(db);

    res.json({ test: newTest });
  } catch (error: any) {
    console.error('Error generating questions from file with Gemini AI:', error);
    res.status(500).json({ error: 'AI test generation from file failed. Please verify the file contents or try a different document.' });
  }
});

// 6. Tests API: Submit Test Attempt & Grade!
app.post('/api/tests/:id/submit', (req, res) => {
  const testId = req.params.id;
  const { userId, studentName, username, answers } = req.body; // answers is record of { questionId: selectedIndex }

  if (!userId || !studentName || !username || !answers) {
    return res.status(400).json({ error: 'Missing user identification or answers' });
  }

  const db = readDb();
  const test = db.tests.find((t: any) => t.id === testId);

  if (!test) {
    return res.status(404).json({ error: 'Test not found' });
  }

  // Calculate score
  let score = 0;
  test.questions.forEach((q: any) => {
    const studentAnswer = answers[q.id];
    if (studentAnswer !== undefined && parseInt(studentAnswer) === q.correctAnswer) {
      score++;
    }
  });

  const newResult = {
    id: `res-${Date.now()}`,
    userId,
    username,
    studentName,
    testId,
    testTitle: test.title,
    category: test.category,
    score,
    totalQuestions: test.questions.length,
    submittedAt: new Date().toISOString(),
    answers
  };

  db.results.push(newResult);
  writeDb(db);

  res.json({ result: newResult, correctAnswers: test.questions.map((q: any) => ({ id: q.id, correctAnswer: q.correctAnswer })) });
});

// 7. Results API: Get Results for Single Student
app.get('/api/results/student/:userId', (req, res) => {
  const userId = req.params.userId;
  const db = readDb();
  const studentResults = db.results.filter((res: any) => res.userId === userId);
  res.json({ results: studentResults });
});

// 8. Results API: Get All Results (Admin View)
app.get('/api/results/all', (req, res) => {
  const db = readDb();
  res.json({ results: db.results });
});

// 8b. Results API: Delete a single result (Admin/Faculty gradebook cleanup)
app.delete('/api/results/:id', (req, res) => {
  const { id } = req.params;
  const db = readDb();
  const initialLength = db.results.length;
  db.results = db.results.filter((r: any) => r.id !== id);

  if (db.results.length === initialLength) {
    return res.status(404).json({ error: 'Result not found' });
  }

  writeDb(db);
  res.json({ success: true, message: 'Result deleted successfully' });
});

// 9. Placement Drives API: Get List
app.get('/api/placement-drives', (req, res) => {
  const db = readDb();
  res.json({ placementDrives: db.placementDrives });
});

// 10. Placement Drives API: Add New
app.post('/api/placement-drives', (req, res) => {
  const { company, role, salaryPackage, eligibility, date, status } = req.body;
  if (!company || !role || !salaryPackage || !eligibility || !date) {
    return res.status(400).json({ error: 'All placement drive fields are required' });
  }

  const db = readDb();
  const newDrive = {
    id: `drive-${Date.now()}`,
    company,
    role,
    salaryPackage,
    eligibility,
    date,
    status: status || 'Upcoming'
  };

  db.placementDrives.push(newDrive);
  writeDb(db);
  res.status(201).json({ placementDrive: newDrive });
});

// 10b. Placement Drives API: Update
app.put('/api/placement-drives/:id', (req, res) => {
  const { id } = req.params;
  const { company, role, salaryPackage, eligibility, date, status } = req.body;
  if (!company || !role || !salaryPackage || !eligibility || !date) {
    return res.status(400).json({ error: 'All placement drive fields are required' });
  }

  const db = readDb();
  const driveIndex = db.placementDrives.findIndex((d: any) => d.id === id);
  if (driveIndex === -1) {
    return res.status(404).json({ error: 'Placement drive not found' });
  }

  db.placementDrives[driveIndex] = {
    id,
    company,
    role,
    salaryPackage,
    eligibility,
    date,
    status: status || 'Upcoming'
  };

  writeDb(db);
  res.json({ placementDrive: db.placementDrives[driveIndex] });
});

// 10c. Placement Drives API: Delete
app.delete('/api/placement-drives/:id', (req, res) => {
  const { id } = req.params;
  const db = readDb();
  const initialLength = db.placementDrives.length;
  db.placementDrives = db.placementDrives.filter((d: any) => d.id !== id);

  if (db.placementDrives.length === initialLength) {
    return res.status(404).json({ error: 'Placement drive not found' });
  }

  writeDb(db);
  res.json({ success: true, message: 'Placement drive deleted successfully' });
});

// 11. Training Resources API: Get List
app.get('/api/training-resources', (req, res) => {
  const db = readDb();
  res.json({ trainingResources: db.trainingResources });
});

// 12. Placement Coach Chat with Gemini AI!
app.post('/api/ai/chat', async (req, res) => {
  const { messages } = req.body; // list of { role: 'user'|'model', content: string }
  
  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: 'Conversation messages history is required' });
  }

  const ai = getGenAI();

  // If Gemini is offline/missing API Key
  if (!ai) {
    const lastUserMessage = messages[messages.length - 1]?.content || '';
    let backupReply = "I am your Placement AI Coach! Currently, I am running in local offline demo mode because the API key is not configured. Here is a generic tip: Keep working on data structures, mock quantitative aptitude questions, and make sure your resume highlights your project outcomes clearly using metrics!";
    
    if (lastUserMessage.toLowerCase().includes('resume')) {
      backupReply = "Resume advice: Use active verbs (e.g. 'Created', 'Engineered', 'Automated'). Keep it to 1 page, list your high-impact projects at the top, and put your GitHub link. For each project, state what you built, the tech stack, and what result you achieved.";
    } else if (lastUserMessage.toLowerCase().includes('interview') || lastUserMessage.toLowerCase().includes('question')) {
      backupReply = "Interview tip: Be sure to practice the STAR method (Situation, Task, Action, Result) for behavioral questions. For technical interviews, trace your variables carefully and state your time complexity.";
    } else if (lastUserMessage.toLowerCase().includes('aptitude') || lastUserMessage.toLowerCase().includes('math')) {
      backupReply = "Aptitude tip: Speed is key. Memorize cubes up to 15, squares up to 30, and fraction-to-percentage conversions (e.g., 1/6 = 16.66%). This saves precious seconds during the test!";
    }

    return res.json({ reply: backupReply });
  }

  try {
    // Format messages for @google/genai chat
    // Map roles: 'user' -> 'user', 'assistant' -> 'model'
    const systemInstruction = `You are "Placement Coach Pro", an elite career counsellor and technical trainer helper for university placement boards.
Your goal is to prepare college graduates and students to crack job interviews, code assessments, aptitude rounds, and group discussions at top Fortune 500 tech/finance companies.
Provide specific, actionable advice. Suggest resources, mock question formats, and outline study timelines.
Keep your tone inspiring, highly professional, encouraging, and clear.`;

    const chatHistory = messages.map((m: any) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }]
    }));

    const lastMessage = chatHistory.pop();

    const chat = ai.chats.create({
      model: 'gemini-3.5-flash',
      config: {
        systemInstruction,
        temperature: 0.7
      },
      history: chatHistory
    });

    const response = await chat.sendMessage({
      message: lastMessage?.parts[0]?.text || 'Hello'
    });

    res.json({ reply: response.text });
  } catch (error: any) {
    console.error('Error in Placement AI Coach Chat:', error);
    res.status(500).json({ error: 'AI Coach was unable to respond. Please try again.' });
  }
});


// Serve static Vite assets in production, otherwise hook up Vite middleware
async function bootstrap() {
  const isProduction = process.env.NODE_ENV === 'production';

  // Create the users table (if needed) and seed default accounts on first run
  try {
    await initUsersTable();
    await seedUsersIfEmpty(SEED_DATA.users);
  } catch (error: any) {
    console.error('PostgreSQL connection failed on startup:', error.message);
    console.error('Set DATABASE_URL in your .env file. User login/register will not work until this is fixed.');
  }

  if (!isProduction) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  // Start Server on Port 3000
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`PLA & T backend running on http://localhost:${PORT}`);
  });
}

bootstrap().catch((err) => {
  console.error('Failed to start PLA & T server:', err);
});
