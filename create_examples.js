const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

const inputDir = path.join(__dirname, 'input_examples');
const outputDir = path.join(__dirname, 'output_examples');

if (!fs.existsSync(inputDir)) fs.mkdirSync(inputDir);
if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir);

// 1. Input Examples (Import Format)
const booksInput = [
    { "제목": "어린왕자", "저자": "생텍쥐페리", "출판사": "열린책들", "ISBN": "9788932917245", "분류": "소설", "청구기호": "863 생84어" },
    { "제목": "해리포터와 마법사의 돌", "저자": "J.K. 롤링", "출판사": "문학수첩", "ISBN": "9788983927620", "분류": "판타지", "청구기호": "843 롤29해" }
];

const usersInput = [
    { "이름": "홍길동", "학번": "20240001" },
    { "이름": "김철수", "학번": "20240002" }
];

const bookInputSheet = XLSX.utils.json_to_sheet(booksInput);
const bookInputWb = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(bookInputWb, bookInputSheet, "Books");
XLSX.writeFile(bookInputWb, path.join(inputDir, '도서_등록_예시.xlsx'));

const userInputSheet = XLSX.utils.json_to_sheet(usersInput);
const userInputWb = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(userInputWb, userInputSheet, "Users");
XLSX.writeFile(userInputWb, path.join(inputDir, '사용자_등록_예시.xlsx'));


// 2. Output Examples (Export Format)
// These match the DB columns + alias used in server.js
const booksOutput = [
    { "id": 1, "title": "어린왕자", "author": "생텍쥐페리", "publisher": "열린책들", "isbn": "9788932917245", "category": "소설", "classCode": "863 생84어", "status": "보유중" },
    { "id": 2, "title": "해리포터", "author": "J.K. 롤링", "publisher": "문학수첩", "isbn": "9788983927620", "category": "판타지", "classCode": "843 롤29해", "status": "대출중" }
];

const usersOutput = [
    { "id": 1001, "name": "홍길동", "studentId": "20240001" },
    { "id": 1002, "name": "김철수", "studentId": "20240002" }
];

const transactionsOutput = [
    { "date": "2024-01-09T10:00:00.000Z", "userName": "홍길동", "studentId": "20240001", "bookTitle": "해리포터", "action": "대출" },
    { "date": "2024-01-08T14:30:00.000Z", "userName": "김철수", "studentId": "20240002", "bookTitle": "어린왕자", "action": "반납" }
];

const bookOutputSheet = XLSX.utils.json_to_sheet(booksOutput);
const bookOutputWb = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(bookOutputWb, bookOutputSheet, "Books");
XLSX.writeFile(bookOutputWb, path.join(outputDir, '도서_목록_출력.xlsx'));

const userOutputSheet = XLSX.utils.json_to_sheet(usersOutput);
const userOutputWb = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(userOutputWb, userOutputSheet, "Users");
XLSX.writeFile(userOutputWb, path.join(outputDir, '사용자_목록_출력.xlsx'));

const transOutputSheet = XLSX.utils.json_to_sheet(transactionsOutput);
const transOutputWb = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(transOutputWb, transOutputSheet, "Transactions");
XLSX.writeFile(transOutputWb, path.join(outputDir, '대출반납_이력_출력.xlsx'));

console.log("Example files created.");
