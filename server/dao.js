import db from './database.js';
import crypto from 'crypto';

// --- LOGICA COSTI ---
const LETTER_COSTS = {
  'A':10, 'E':10, 'I':10, 'O':10, 'U':10,
  'T':5, 'N':5, 'S':5, 'R':5, 'H':5, 'L':5, 'D':5, 'C':5,
  'M':3, 'G':3, 'F':3, 'Y':3, 'W':3, 'P':3, 'B':3,
  'V':1, 'K':1, 'J':1, 'X':1, 'Q':1, 'Z':1
};

export const getLetterCost = (letter) => LETTER_COSTS[letter.toUpperCase()] || 0;
export const isVowel = (letter) => ['A','E','I','O','U'].includes(letter.toUpperCase());

// --- FUNZIONI DAO ---

export const getUserCoins = (userId) => {
  return new Promise((resolve, reject) => {
    db.get("SELECT coins FROM users WHERE id = ?", [userId], (err, row) => {
      if (err) reject(err);
      else resolve(row.coins);
    });
  });
};

export const updateUserCoins = (userId, amount) => {
  return new Promise((resolve, reject) => {
    // Il testo dice: se monete non sufficienti, usa tutte quelle disponibili (minimo 0)
    db.run("UPDATE users SET coins = MAX(0, coins + ?) WHERE id = ?", [amount, userId], function(err) {
      if (err) reject(err);
      else resolve(this.changes);
    });
  });
};

// Crea una nuova partita
export const startNewGame = (userId, isDemo = false) => {
  return new Promise((resolve, reject) => {
    const sqlPhrase = isDemo ? 
      "SELECT * FROM phrases WHERE is_demo = 1 ORDER BY RANDOM() LIMIT 1" :
      "SELECT * FROM phrases WHERE is_demo = 0 ORDER BY RANDOM() LIMIT 1";

    db.get(sqlPhrase, [], (err, phrase) => {
      if (err) return reject(err);
      
      const startTime = new Date().toISOString();
      const sqlGame = "INSERT INTO games (user_id, phrase_id, start_time) VALUES (?, ?, ?)";
      db.run(sqlGame, [userId, phrase.id, startTime], function(err) {
        if (err) reject(err);
        else resolve({ gameId: this.lastID, phraseLength: phrase.text.length, startTime });
      });
    });
  });
};

// Ottieni lo stato filtrato della partita (senza svelare la frase)
export const getGameStatus = (gameId) => {
  return new Promise((resolve, reject) => {
    const sql = `SELECT g.*, p.text FROM games g JOIN phrases p ON g.phrase_id = p.id WHERE g.id = ?`;
    db.get(sql, [gameId], (err, game) => {
      if (err) return reject(err);
      if (!game) return resolve(null);

      const revealed = game.revealed_letters.split(',');
      // Trasforma la frase in una maschera: svela solo spazi e lettere indovinate
      const maskedText = game.text.split('').map(char => {
        if (char === ' ') return ' ';
        if (revealed.includes(char.toUpperCase())) return char.toUpperCase();
        return '_';
      }).join('');

      resolve({
        id: game.id,
        maskedText,
        revealedLetters: game.revealed_letters,
        startTime: game.start_time,
        status: game.status,
        vowelUsed: game.vowel_used,
        // NON inviamo la frase intera 'game.text' qui!
      });
    });
  });
};


// Gestisce il tentativo di indovinare una lettera
export const guessLetter = (gameId, userId, letter) => {
  return new Promise((resolve, reject) => {
    db.get("SELECT g.*, p.text FROM games g JOIN phrases p ON g.phrase_id = p.id WHERE g.id = ?", [gameId], async (err, game) => {
      if (err) return reject(err);
      if (!game || game.status !== 'active') return reject('Partita non valida o già terminata.');

      const upperLetter = letter.toUpperCase();
      let cost = getLetterCost(upperLetter);
      const isVow = isVowel(upperLetter);

      if (isVow && game.vowel_used) return reject('Hai già usato una vocale in questa partita.');

      let isCorrect = game.text.toUpperCase().includes(upperLetter);
      if (!isCorrect) cost *= 2; // Raddoppia il costo se sbagli

      // Se non è demo, gestiamo le monete
      if (userId) {
        const coins = await getUserCoins(userId);
        if (coins < cost && isCorrect) return reject('Monete insufficienti.');
        
        // Se sbaglia e non ha abbastanza monete per il doppio costo, gli togliamo tutto quello che ha
        const amountToDeduct = Math.min(cost, coins);
        await updateUserCoins(userId, -amountToDeduct);
      }

      // Aggiorniamo lo stato della partita
      let newRevealed = game.revealed_letters ? game.revealed_letters.split(',') : [];
      if (!newRevealed.includes(upperLetter)) newRevealed.push(upperLetter);
      
      const sqlUpdate = "UPDATE games SET revealed_letters = ?, vowel_used = ? WHERE id = ?";
      db.run(sqlUpdate, [newRevealed.join(','), isVow || game.vowel_used ? 1 : 0, gameId], function(err) {
        if (err) reject(err);
        else resolve({ correct: isCorrect, costApplied: userId ? cost : 0 });
      });
    });
  });
};

// Verifica se la frase intera è stata indovinata
export const guessPhrase = (gameId, userId, guessedPhrase) => {
  return new Promise((resolve, reject) => {
    db.get("SELECT g.*, p.text FROM games g JOIN phrases p ON g.phrase_id = p.id WHERE g.id = ?", [gameId], async (err, game) => {
      if (err) return reject(err);
      if (!game || game.status !== 'active') return reject('Partita non valida.');

      const isCorrect = game.text.toUpperCase() === guessedPhrase.toUpperCase();

      if (isCorrect) {
        // Vittoria!
        if (userId) await updateUserCoins(userId, 100);
        db.run("UPDATE games SET status = 'won' WHERE id = ?", [gameId], (err) => {
          if (err) reject(err);
          else resolve({ correct: true, fullPhrase: game.text });
        });
      } else {
        // Sbagliato, ma nessuna penalità
        resolve({ correct: false });
      }
    });
  });
};

// Termina la partita (per timeout o abbandono)
export const endGame = (gameId, userId, reason) => {
  return new Promise((resolve, reject) => {
    db.get("SELECT g.*, p.text FROM games g JOIN phrases p ON g.phrase_id = p.id WHERE g.id = ?", [gameId], async (err, game) => {
      if (err) return reject(err);
      if (!game) return reject('Partita non trovata.');

      let newStatus = reason === 'timeout' ? 'lost' : 'abandoned';

      // Penalità solo per timeout
      if (userId && reason === 'timeout') {
        const coins = await getUserCoins(userId);
        const penalty = Math.min(20, coins); // Togli massimo 20, o tutto se ne ha meno
        await updateUserCoins(userId, -penalty);
      }

      db.run("UPDATE games SET status = ? WHERE id = ?", [newStatus, gameId], (err) => {
        if (err) reject(err);
        else resolve({ status: newStatus, fullPhrase: game.text });
      });
    });
  });
};

// Autenticazione (Standard come nel progetto precedente)
export const getUser = (username, password) => {
  return new Promise((resolve, reject) => {
    db.get('SELECT * FROM users WHERE username = ?', [username], (err, row) => {
      if (err) reject(err);
      else if (!row) resolve(false);
      else {
        crypto.scrypt(password, row.salt, 32, (err, hashedPassword) => {
          if (err) reject(err);
          const passwordHex = Buffer.from(row.hash, 'hex');
          if (!crypto.timingSafeEqual(passwordHex, hashedPassword)) resolve(false);
          else resolve({ id: row.id, username: row.username, coins: row.coins });
        });
      }
    });
  });
};

export const getUserById = (id) => {
  return new Promise((resolve, reject) => {
    db.get('SELECT id, username, coins FROM users WHERE id = ?', [id], (err, row) => {
      if (err) reject(err);
      else if (!row) resolve(null);
      else resolve(row);
    });
  });
};

