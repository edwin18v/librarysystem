const fs = require('fs');
const XLSX = require('xlsx');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const BOOKS_FILE = 'books.xlsx';
const USERS_FILE = 'users.xlsx';
const TRANSACTIONS_FILE = 'transactions.xlsx';
const DB_FILE = 'database.sqlite';

// Initialize Database
const db = new sqlite3.Database(DB_FILE);

db.serialize(() => {
    // Create Tables
    db.run(`CREATE TABLE IF NOT EXISTS books (
        id INTEGER PRIMARY KEY,
        title TEXT,
        author TEXT,
        status TEXT
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY,
        name TEXT
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS transactions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        userId INTEGER,
        bookId INTEGER,
        action TEXT,
        date TEXT
    )`);

    // Migrate Books
    if (fs.existsSync(BOOKS_FILE)) {
        const workbook = XLSX.readFile(BOOKS_FILE);
        const sheetName = workbook.SheetNames[0];
        const books = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName] || {});

        const stmt = db.prepare("INSERT OR REPLACE INTO books (id, title, author, status) VALUES (?, ?, ?, ?)");
        books.forEach(book => {
            stmt.run(book.id, book.title, book.author, book.status || '보유중');
        });
        stmt.finalize();
        console.log(`Migrated ${books.length} books.`);
    }

    // Migrate Users
    if (fs.existsSync(USERS_FILE)) {
        const workbook = XLSX.readFile(USERS_FILE);
        const sheetName = workbook.SheetNames[0];
        const users = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName] || {});

        const stmt = db.prepare("INSERT OR REPLACE INTO users (id, name) VALUES (?, ?)");
        users.forEach(user => {
            stmt.run(user.id, user.name);
        });
        stmt.finalize();
        console.log(`Migrated ${users.length} users.`);
    }

    // Migrate Transactions
    if (fs.existsSync(TRANSACTIONS_FILE)) {
        const workbook = XLSX.readFile(TRANSACTIONS_FILE);
        const sheetName = workbook.SheetNames[0];
        const transactions = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName] || {});

        const stmt = db.prepare("INSERT INTO transactions (userId, bookId, action, date) VALUES (?, ?, ?, ?)");
        transactions.forEach(tr => {
            stmt.run(tr.userId, tr.bookId, tr.action, tr.date);
        });
        stmt.finalize();
        console.log(`Migrated ${transactions.length} transactions.`);
    }
});

db.close((err) => {
    if (err) {
        console.error(err.message);
    }
    console.log('Migration completed.');
});
