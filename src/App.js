import React, { useEffect, useState } from 'react';
import './App.css';

const API = 'http://localhost:3000';

function App() {
  const [bookSearch, setBookSearch] = useState('');
  const [userSearch, setUserSearch] = useState('');
  const [bookIdInput, setBookIdInput] = useState('');
  const [userIdInput, setUserIdInput] = useState('');
  const [tab, setTab] = useState('books');
  const [books, setBooks] = useState([]);
  const [users, setUsers] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [selectedBook, setSelectedBook] = useState(null);
  const [selectedUser, setSelectedUser] = useState(null);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [booksRes, usersRes, transRes] = await Promise.all([
        fetch(`${API}/books`),
        fetch(`${API}/users`),
        fetch(`${API}/transactions`)
      ]);
      setBooks(await booksRes.json());
      setUsers(await usersRes.json());
      setTransactions(await transRes.json());
    } catch (err) {
      console.error("Failed to fetch data", err);
      setMessage("데이터를 불러오는데 실패했습니다.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleAction = async (action) => {
    if (!selectedUser || !selectedBook) return;
    setLoading(true);
    setMessage('');
    try {
      const res = await fetch(`${API}/${action}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: selectedUser.id, bookId: selectedBook.id })
      });
      const data = await res.json();
      if (res.ok) {
        setMessage(data.message);
        await fetchData();
      } else {
        setMessage(data.error);
      }
    } catch (err) {
      setMessage("서버 통신 오류");
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (e, type) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    setLoading(true);
    setMessage(`Uploading ${type}...`);

    try {
      const res = await fetch(`${API}/api/import/${type}`, {
        method: 'POST',
        body: formData
      });
      const data = await res.json();
      if (res.ok) {
        setMessage(data.message);
        fetchData();
      } else {
        setMessage("Upload Failed: " + data.error);
      }
    } catch (err) {
      setMessage("Upload Error");
    } finally {
      setLoading(false);
      e.target.value = null; // Reset input
    }
  };

  const handleExport = (type) => {
    window.open(`${API}/api/export/${type}`, '_blank');
  };

  const tabBtnStyle = isActive => ({
    padding: '10px 20px',
    marginRight: 8,
    borderRadius: 8,
    border: isActive ? '2px solid #1976d2' : '1px solid #ccc',
    background: isActive ? '#1976d2' : '#f5f5f5',
    color: isActive ? '#fff' : '#333',
    fontWeight: isActive ? 'bold' : 'normal',
    cursor: 'pointer',
    boxShadow: isActive ? '0 2px 8px #1976d233' : 'none',
    transition: 'all 0.2s',
  });

  return (
    <div className="App" style={{ maxWidth: 1000, margin: 'auto', padding: 24, fontFamily: 'Segoe UI, sans-serif' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h1 style={{ color: '#1976d2', margin: 0 }}>📚 도서관 사서 시스템 v2.0</h1>
        {loading && <div style={{ color: '#666' }}>⏳ 처리중...</div>}
      </header>

      <nav style={{ marginBottom: 32, display: 'flex', gap: 8 }}>
        {['books', 'users', 'borrow', 'transactions'].map(t => (
          <button key={t} style={tabBtnStyle(tab === t)} onClick={() => setTab(t)}>
            {t === 'books' ? '책 목록' : t === 'users' ? '사용자 목록' : t === 'borrow' ? '대출/반납' : '이력'}
          </button>
        ))}
      </nav>

      <main>
        {tab === 'books' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ color: '#1976d2' }}>책 목록</h2>
              <div style={{ display: 'flex', gap: 8 }}>
                <label style={{ ...tabBtnStyle(false), cursor: 'pointer', background: '#e0e0e0' }}>
                  📥 엑셀 업로드
                  <input type="file" accept=".xlsx" style={{ display: 'none' }} onChange={(e) => handleFileUpload(e, 'books')} />
                </label>
                <button style={{ ...tabBtnStyle(false), background: '#e0e0e0' }} onClick={() => handleExport('books')}>📤 엑셀 다운로드</button>
              </div>
            </div>

            <div style={{ marginBottom: 16, display: 'flex', gap: 16, justifyContent: 'center' }}>
              <input
                type="text"
                placeholder="검색 (제목/저자/ISBN/출판사)"
                value={bookSearch}
                onChange={e => setBookSearch(e.target.value)}
                style={{ padding: 8, borderRadius: 6, border: '1px solid #ccc', minWidth: 250 }}
              />
              <input
                type="text"
                placeholder="ID 입력"
                value={bookIdInput}
                onChange={e => setBookIdInput(e.target.value)}
                style={{ padding: 8, borderRadius: 6, border: '1px solid #ccc', minWidth: 80 }}
              />
              <button style={tabBtnStyle(true)} onClick={() => {
                const found = books.find(b => String(b.id) === bookIdInput);
                if (found) setSelectedBook(found);
              }}>ID 선택</button>
            </div>

            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
              <thead>
                <tr style={{ background: '#f5f5f5', textAlign: 'left' }}>
                  <th style={{ padding: 8 }}>ID</th>
                  <th style={{ padding: 8 }}>제목</th>
                  <th style={{ padding: 8 }}>저자</th>
                  <th style={{ padding: 8 }}>출판사</th>
                  <th style={{ padding: 8 }}>ISBN</th>
                  <th style={{ padding: 8 }}>분류</th>
                  <th style={{ padding: 8 }}>청구기호</th>
                  <th style={{ padding: 8 }}>상태</th>
                </tr>
              </thead>
              <tbody>
                {books.filter(book =>
                  book.title?.includes(bookSearch) ||
                  book.author?.includes(bookSearch) ||
                  book.publisher?.includes(bookSearch) ||
                  book.isbn?.includes(bookSearch) ||
                  bookSearch === ''
                ).map(book => (
                  <tr key={book.id} onClick={() => setSelectedBook(book)}
                    style={{
                      cursor: 'pointer',
                      background: selectedBook?.id === book.id ? '#e3f2fd' : 'white',
                      borderBottom: '1px solid #eee'
                    }}>
                    <td style={{ padding: 8 }}>{book.id}</td>
                    <td style={{ padding: 8, fontWeight: 'bold' }}>{book.title}</td>
                    <td style={{ padding: 8 }}>{book.author}</td>
                    <td style={{ padding: 8 }}>{book.publisher}</td>
                    <td style={{ padding: 8 }}>{book.isbn}</td>
                    <td style={{ padding: 8 }}>{book.category}</td>
                    <td style={{ padding: 8 }}>{book.classCode}</td>
                    <td style={{ padding: 8, color: book.status === '대출중' ? 'red' : 'green' }}>{book.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {tab === 'users' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ color: '#1976d2' }}>사용자 목록</h2>
              <div style={{ display: 'flex', gap: 8 }}>
                <label style={{ ...tabBtnStyle(false), cursor: 'pointer', background: '#e0e0e0' }}>
                  📥 엑셀 업로드
                  <input type="file" accept=".xlsx" style={{ display: 'none' }} onChange={(e) => handleFileUpload(e, 'users')} />
                </label>
                <button style={{ ...tabBtnStyle(false), background: '#e0e0e0' }} onClick={() => handleExport('users')}>📤 엑셀 다운로드</button>
              </div>
            </div>

            <div style={{ marginBottom: 16, display: 'flex', gap: 16, justifyContent: 'center' }}>
              <input
                type="text"
                placeholder="검색 (이름/학번)"
                value={userSearch}
                onChange={e => setUserSearch(e.target.value)}
                style={{ padding: 8, borderRadius: 6, border: '1px solid #ccc', minWidth: 200 }}
              />
              <input
                type="text"
                placeholder="ID 입력"
                value={userIdInput}
                onChange={e => setUserIdInput(e.target.value)}
                style={{ padding: 8, borderRadius: 6, border: '1px solid #ccc', minWidth: 80 }}
              />
              <button style={tabBtnStyle(true)} onClick={() => {
                const found = users.find(u => String(u.id) === userIdInput);
                if (found) setSelectedUser(found);
              }}>ID 선택</button>
            </div>

            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
              <thead>
                <tr style={{ background: '#f5f5f5', textAlign: 'left' }}>
                  <th style={{ padding: 8 }}>ID</th>
                  <th style={{ padding: 8 }}>이름</th>
                  <th style={{ padding: 8 }}>학번</th>
                </tr>
              </thead>
              <tbody>
                {users.filter(user =>
                  user.name?.includes(userSearch) ||
                  user.studentId?.includes(userSearch) ||
                  userSearch === ''
                ).map(user => (
                  <tr key={user.id} onClick={() => setSelectedUser(user)}
                    style={{
                      cursor: 'pointer',
                      background: selectedUser?.id === user.id ? '#e3f2fd' : 'white',
                      borderBottom: '1px solid #eee'
                    }}>
                    <td style={{ padding: 8 }}>{user.id}</td>
                    <td style={{ padding: 8, fontWeight: 'bold' }}>{user.name}</td>
                    <td style={{ padding: 8 }}>{user.studentId}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {tab === 'borrow' && (
          <div>
            <h2 style={{ color: '#1976d2' }}>대출/반납</h2>
            <div style={{ display: 'flex', gap: 24, marginBottom: 16, justifyContent: 'center' }}>
              <div>
                <div style={{ marginBottom: 8 }}>책 선택 (ID 혹은 목록에서 클릭)</div>
                <div style={{ padding: 12, border: '1px solid #ccc', borderRadius: 8, width: 300, background: '#fafafa' }}>
                  {selectedBook ? (
                    <>
                      <div style={{ fontWeight: 'bold', fontSize: 18 }}>{selectedBook.title}</div>
                      <div>{selectedBook.author} | {selectedBook.publisher}</div>
                      <div style={{ color: selectedBook.status === '대출중' ? 'red' : 'green' }}>{selectedBook.status}</div>
                      <div style={{ fontSize: 12, color: '#aaa' }}>ISBN: {selectedBook.isbn}</div>
                    </>
                  ) : <div style={{ color: '#aaa', fontStyle: 'italic' }}>책을 선택해주세요</div>}
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center' }}>👉</div>
              <div>
                <div style={{ marginBottom: 8 }}>사용자 선택 (ID 혹은 목록에서 클릭)</div>
                <div style={{ padding: 12, border: '1px solid #ccc', borderRadius: 8, width: 200, background: '#fafafa' }}>
                  {selectedUser ? (
                    <>
                      <div style={{ fontWeight: 'bold', fontSize: 18 }}>{selectedUser.name}</div>
                      <div>학번: {selectedUser.studentId}</div>
                      <div style={{ fontSize: 12, color: '#aaa' }}>ID: {selectedUser.id}</div>
                    </>
                  ) : <div style={{ color: '#aaa', fontStyle: 'italic' }}>사용자를 선택해주세요</div>}
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center', marginBottom: 12 }}>
              <button onClick={() => handleAction('borrow')} disabled={loading} style={{ ...tabBtnStyle(true), minWidth: 100, opacity: loading ? 0.5 : 1 }}>
                대출 하기
              </button>
              <button onClick={() => handleAction('return')} disabled={loading} style={{ ...tabBtnStyle(true), minWidth: 100, background: '#388e3c', border: '2px solid #388e3c', opacity: loading ? 0.5 : 1 }}>
                반납 하기
              </button>
            </div>
            <div style={{ marginTop: 10, color: message.includes('완료') || message.includes('successfully') ? '#388e3c' : '#d32f2f', fontWeight: 'bold', minHeight: 24, textAlign: 'center' }}>
              {message}
            </div>
          </div>
        )}

        {tab === 'transactions' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h2 style={{ color: '#1976d2', margin: 0 }}>대출/반납 이력</h2>
              <button style={{ ...tabBtnStyle(false), background: '#e0e0e0' }} onClick={() => handleExport('transactions')}>📤 이력 엑셀 다운로드</button>
            </div>
            <table style={{ margin: 'auto', borderCollapse: 'collapse', width: '100%', maxWidth: 800, boxShadow: '0 2px 8px #0001' }}>
              <thead>
                <tr style={{ background: '#e3f2fd' }}>
                  <th style={{ padding: 12, border: '1px solid #ccc' }}>날짜</th>
                  <th style={{ padding: 12, border: '1px solid #ccc' }}>사용자</th>
                  <th style={{ padding: 12, border: '1px solid #ccc' }}>책</th>
                  <th style={{ padding: 12, border: '1px solid #ccc' }}>동작</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((tr, idx) => (
                  <tr key={idx} style={{ background: idx % 2 ? '#fafafa' : '#fff' }}>
                    <td style={{ padding: 12, border: '1px solid #eee' }}>{new Date(tr.date).toLocaleString()}</td>
                    <td style={{ padding: 12, border: '1px solid #eee' }}>{users.find(u => u.id === tr.userId)?.name || tr.userId}</td>
                    <td style={{ padding: 12, border: '1px solid #eee' }}>{books.find(b => b.id === tr.bookId)?.title || tr.bookId}</td>
                    <td style={{ padding: 12, border: '1px solid #eee' }}>
                      <span style={{
                        color: tr.action === '대출' ? '#d32f2f' : '#388e3c',
                        fontWeight: 'bold',
                        padding: '4px 8px',
                        borderRadius: 4,
                        background: tr.action === '대출' ? '#ffebee' : '#e8f5e9'
                      }}>
                        {tr.action}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
