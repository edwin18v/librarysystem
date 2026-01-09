const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const path = require('path');
const app = express();

app.use(cors());
app.use(express.json());

// Determine Database Path
// If running in Electron (env var set), use that. Otherwise use local directory.
const DB_FILE = process.env.USER_DATA_PATH
    ? path.join(process.env.USER_DATA_PATH, 'database.sqlite')
    : path.join(__dirname, 'database.sqlite');

console.log(`Using Database File: ${DB_FILE}`);

// Connect to Database
const db = new sqlite3.Database(DB_FILE, (err) => {
    if (err) {
        console.error('Error opening database ' + DB_FILE, err.message);
    } else {
        console.log('Connected to the SQLite database.');
        // Ensure tables exist
        db.run(`CREATE TABLE IF NOT EXISTS books (
            id INTEGER PRIMARY KEY,
            title TEXT,
            author TEXT,
            publisher TEXT,
            isbn TEXT,
            category TEXT,
            classCode TEXT,
            status TEXT
        )`);
        db.run(`CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY,
            name TEXT,
            studentId TEXT
        )`);
        db.run(`CREATE TABLE IF NOT EXISTS transactions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            userId INTEGER,
            bookId INTEGER,
            action TEXT,
            date TEXT
        )`);

        // Quick Schema Migration for existing tables (won't fail if columns exist, but simple catch)
        const addColumn = (table, col) => {
            db.run(`ALTER TABLE ${table} ADD COLUMN ${col} TEXT`, (err) => {
                // Ignore error if column exists
            });
        };
        addColumn('books', 'publisher');
        addColumn('books', 'isbn');
        addColumn('books', 'category');
        addColumn('books', 'classCode');
        addColumn('users', 'studentId');
    }
});

// Helper for Promisified DB queries
function dbAll(query, params = []) {
    return new Promise((resolve, reject) => {
        db.all(query, params, (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
        });
    });
}

function dbRun(query, params = []) {
    return new Promise((resolve, reject) => {
        db.run(query, params, function (err) {
            if (err) reject(err);
            else resolve(this);
        });
    });
}

function dbGet(query, params = []) {
    return new Promise((resolve, reject) => {
        db.get(query, params, (err, row) => {
            if (err) reject(err);
            else resolve(row);
        });
    });
}

// Routes

// Get all books
app.get('/books', async (req, res) => {
    try {
        const books = await dbAll("SELECT * FROM books");
        res.json(books);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get all users
app.get('/users', async (req, res) => {
    try {
        const users = await dbAll("SELECT * FROM users");
        res.json(users);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get all transactions
app.get('/transactions', async (req, res) => {
    try {
        const transactions = await dbAll("SELECT * FROM transactions ORDER BY date DESC");
        res.json(transactions);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Borrow a book
app.post('/borrow', async (req, res) => {
    const { userId, bookId } = req.body;
    try {
        const book = await dbGet("SELECT * FROM books WHERE id = ?", [bookId]);
        const user = await dbGet("SELECT * FROM users WHERE id = ?", [userId]);

        if (!book || !user) return res.status(400).json({ error: 'Book or User not found.' });
        if (book.status === '대출중') return res.status(400).json({ error: 'Book is already borrowed.' });

        // Update book status
        await dbRun("UPDATE books SET status = '대출중' WHERE id = ?", [bookId]);

        // Record transaction
        const date = new Date().toISOString();
        const result = await dbRun("INSERT INTO transactions (userId, bookId, action, date) VALUES (?, ?, '대출', ?)", [userId, bookId, date]);

        res.json({ message: '대출 완료', transactionId: result.lastID });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Return a book
app.post('/return', async (req, res) => {
    const { userId, bookId } = req.body;
    try {
        const book = await dbGet("SELECT * FROM books WHERE id = ?", [bookId]);
        const user = await dbGet("SELECT * FROM users WHERE id = ?", [userId]);

        if (!book || !user) return res.status(400).json({ error: 'Book or User not found.' });
        if (book.status !== '대출중') return res.status(400).json({ error: 'Book is not currently borrowed.' });

        // Update book status
        await dbRun("UPDATE books SET status = '보유중' WHERE id = ?", [bookId]);

        // Record transaction
        const date = new Date().toISOString();
        const result = await dbRun("INSERT INTO transactions (userId, bookId, action, date) VALUES (?, ?, '반납', ?)", [userId, bookId, date]);

        res.json({ message: '반납 완료', transactionId: result.lastID });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Serve frontend build if available (Production ready)
app.use(express.static(path.join(__dirname, 'build')));

// Multer setup for file uploads
const multer = require('multer');
const upload = multer({ dest: 'uploads/' });
const fs = require('fs');
const XLSX = require('xlsx');

// Import Books
app.post('/api/import/books', upload.single('file'), (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    try {
        const workbook = XLSX.readFile(req.file.path);
        const sheetName = workbook.SheetNames[0];
        const data = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);

        const stmt = db.prepare("INSERT OR REPLACE INTO books (id, title, author, publisher, isbn, category, classCode, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)");
        let count = 0;
        data.forEach(row => {
            // Mapping Logic: Adjust keys based on Excel headers if needed. Assuming matching names or simple mapping.
            // Expected Excel Headers: ID, Title, Author, Publisher, ISBN, Category, ClassCode
            stmt.run(
                row.ID || row.id,
                row.Title || row.title || row['제목'],
                row.Author || row.author || row['저자'],
                row.Publisher || row.publisher || row['출판사'],
                row.ISBN || row.isbn,
                row.Category || row.category || row['분류'],
                row.ClassCode || row.classCode || row['청구기호'],
                '보유중' // Default status
            );
            count++;
        });
        stmt.finalize();
        fs.unlinkSync(req.file.path); // Cleanup
        res.json({ message: `Imported ${count} books successfully` });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Import Users
app.post('/api/import/users', upload.single('file'), (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    try {
        const workbook = XLSX.readFile(req.file.path);
        const sheetName = workbook.SheetNames[0];
        const data = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);

        const stmt = db.prepare("INSERT OR REPLACE INTO users (id, name, studentId) VALUES (?, ?, ?)");
        let count = 0;
        data.forEach(row => {
            stmt.run(
                row.ID || row.id,
                row.Name || row.name || row['이름'],
                row.StudentID || row.studentId || row['학번']
            );
            count++;
        });
        stmt.finalize();
        fs.unlinkSync(req.file.path);
        res.json({ message: `Imported ${count} users successfully` });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Export Books
app.get('/api/export/books', async (req, res) => {
    try {
        const books = await dbAll("SELECT * FROM books");
        const worksheet = XLSX.utils.json_to_sheet(books);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Books');

        const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
        res.setHeader('Content-Disposition', 'attachment; filename="books_export.xlsx"');
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.send(buffer);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Export Users
app.get('/api/export/users', async (req, res) => {
    try {
        const users = await dbAll("SELECT * FROM users");
        const worksheet = XLSX.utils.json_to_sheet(users);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Users');

        const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
        res.setHeader('Content-Disposition', 'attachment; filename="users_export.xlsx"');
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.send(buffer);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Export Transactions
app.get('/api/export/transactions', async (req, res) => {
    try {
        const query = `
            SELECT t.date, u.name as userName, u.studentId, b.title as bookTitle, t.action 
            FROM transactions t
            LEFT JOIN users u ON t.userId = u.id
            LEFT JOIN books b ON t.bookId = b.id
            ORDER BY t.date DESC
        `;
        const transactions = await dbAll(query);

        const worksheet = XLSX.utils.json_to_sheet(transactions);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Transactions');

        const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
        res.setHeader('Content-Disposition', 'attachment; filename="transactions_export.xlsx"');
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.send(buffer);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get(/^(?!\/api).+/, (req, res) => {
    if (req.accepts('html')) {
        const buildIndex = path.join(__dirname, 'build', 'index.html');
        if (require('fs').existsSync(buildIndex)) {
            res.sendFile(buildIndex);
        } else {
            res.status(404).send('API Server is running. Frontend build not found.');
        }
    } else {
        res.status(404).json({ error: 'Not found' });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
