import sqlite3
import os

DB_PATH = os.path.join(os.path.dirname(__file__), 'data', 'braindump.db')



def get_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
    with get_connection() as conn:
        conn.execute('''
            CREATE TABLE IF NOT EXISTS thoughts (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            text        TEXT NOT NULL,
            done        INTEGER DEFAULT 0,
            created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')



def add_thought(text):
    with get_connection() as conn:
        conn.execute('INSERT INTO thoughts (text) VALUES (?)', (text,))

def get_all():
    with get_connection() as conn:
        rows = conn.execute('SELECT * FROM thoughts ORDER BY created_at ASC').fetchall()
        return [dict(row) for row in rows]

def toggle_done(thought_id):
    with get_connection() as conn:
        conn.execute('UPDATE thoughts SET done = 1 - done WHERE id = ?', (thought_id,))

def delete_done():
    with get_connection() as conn:
        conn.execute('DELETE FROM thoughts WHERE done = 1')