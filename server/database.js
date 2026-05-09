import sqlite3 from 'sqlite3';
import crypto from 'crypto';

const db = new sqlite3.Database('game.sqlite', (err) => {
  if (err) throw err;
});

db.run("PRAGMA foreign_keys = ON");

db.serialize(() => {
  // Tabella Utenti (con monete)
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    hash TEXT NOT NULL,
    salt TEXT NOT NULL,
    coins INTEGER DEFAULT 100
  )`);

  // Tabella Frasi
  db.run(`CREATE TABLE IF NOT EXISTS phrases (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    text TEXT NOT NULL,
    is_demo BOOLEAN DEFAULT 0
  )`, () => {
    // Popolamento frasi (almeno 20 + 3 demo)
    db.get("SELECT COUNT(*) as count FROM phrases", (err, row) => {
      if (row.count === 0) {
        const phrases = [
          // Demo (30-50 chars)
          ['THE QUICK BROWN FOX JUMPS OVER THE LAZY DOG', 1],
          ['PRACTICE MAKES PERFECT IN EVERY SINGLE WAY', 1],
          ['BETTER LATE THAN NEVER BUT NEVER LATE IS BEST', 1],
          // Regular
          ['TO BE OR NOT TO BE THAT IS THE MAIN QUESTION', 0],
          ['ALL THAT GLITTERS IS NOT GOLD MY DEAR FRIEND', 0],
          ['KNOWLEDGE IS POWER AND TIME IS MONEY INDEED', 0],
          ['ACTIONS SPEAK LOUDER THAN WORDS ALWAYS DO', 0],
          ['A JOURNEY OF A THOUSAND MILES BEGINS TODAY', 0],
          ['LIFE IS WHAT HAPPENS WHILE YOU MAKE PLANS', 0],
          ['THE EARLY BIRD CATCHES THE WORM EVERY DAY', 0],
          ['AN APPLE A DAY KEEPS THE DOCTOR AWAY NOW', 0],
          ['BE THE CHANGE YOU WISH TO SEE IN THE WORLD', 0],
          ['EVERY CLOUD HAS A SILVER LINING SOMEWHERE', 0],
          ['HAPPINESS DEPENDS UPON OURSELVES AND OTHERS', 0],
          ['IMAGINATION IS MORE IMPORTANT THAN KNOWLEDGE', 0],
          ['STAY HUNGRY STAY FOOLISH SAID STEVE JOBS', 0],
          ['THE ONLY CONSTANT IN LIFE IS CHANGE ITSELF', 0],
          ['WHERE THERE IS A WILL THERE IS A WAY ALWAYS', 0],
          ['YOU ONLY LIVE ONCE BUT IF YOU DO IT RIGHT', 0],
          ['SUCCESS IS NOT FINAL FAILURE IS NOT FATAL', 0],
          ['DREAM BIG AND DARE TO FAIL FOR GREAT THINGS', 0],
          ['STAY POSITIVE WORK HARD MAKE IT HAPPEN NOW', 0],
          ['BELIEVE YOU CAN AND YOU ARE HALFWAY THERE', 0]
        ];
        const stmt = db.prepare("INSERT INTO phrases (text, is_demo) VALUES (?, ?)");
        phrases.forEach(p => stmt.run(p));
        stmt.finalize();
      }
    });
  });

  // Tabella Partite (per gestire il timer e lo stato lato server)
  db.run(`CREATE TABLE IF NOT EXISTS games (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER, -- NULL per utenti anonimi
    phrase_id INTEGER NOT NULL,
    revealed_letters TEXT DEFAULT '', -- Lettere indovinate (es: "A,E,T")
    start_time TEXT NOT NULL,
    status TEXT DEFAULT 'active', -- 'active', 'won', 'lost', 'abandoned'
    vowel_used BOOLEAN DEFAULT 0,
    FOREIGN KEY(user_id) REFERENCES users(id),
    FOREIGN KEY(phrase_id) REFERENCES phrases(id)
  )`);

  // Popolamento Utenti (Password: "password")
  db.get("SELECT COUNT(*) as count FROM users", (err, row) => {
    if (row.count === 0) {
      const salt = crypto.randomBytes(16).toString('hex');
      crypto.scrypt('password', salt, 32, (err, hashedPassword) => {
        const hash = hashedPassword.toString('hex');
        const stmt = db.prepare("INSERT INTO users (username, hash, salt, coins) VALUES (?, ?, ?, ?)");
        stmt.run('player_rich', hash, salt, 500); // Giocatore con molte monete
        stmt.run('player_poor', hash, salt, 0);   // Giocatore senza monete
        stmt.run('player_new', hash, salt, 100);  // Giocatore nuovo
        stmt.finalize();
      });
    }
  });
});

export default db;