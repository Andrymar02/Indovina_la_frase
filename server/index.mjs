import express from 'express';
import morgan from 'morgan';
import cors from 'cors';
import passport from 'passport';
import LocalStrategy from 'passport-local';
import session from 'express-session';
import * as dao from './dao.js';

const app = express();
const port = 3001;

app.use(morgan('dev'));
app.use(express.json());

app.use(cors({
  origin: 'http://localhost:5173',
  credentials: true,
}));

// --- PASSPORT CONFIG ---
passport.use(new LocalStrategy(async (username, password, cb) => {
  try {
    const user = await dao.getUser(username, password);
    if (!user) return cb(null, false, { message: 'Credenziali errate.' });
    return cb(null, user);
  } catch (err) {
    return cb(err);
  }
}));

passport.serializeUser((user, cb) => cb(null, user.id));
passport.deserializeUser(async (id, cb) => {
  try {
    const user = await dao.getUserById(id);
    cb(null, user);
  } catch (err) {
    cb(err);
  }
});

app.use(session({
  secret: 'esame-indovina-la-frase-segreto',
  resave: false,
  saveUninitialized: false,
}));
app.use(passport.authenticate('session'));

const isLoggedIn = (req, res, next) => {
  if (req.isAuthenticated()) return next();
  return res.status(401).json({ error: 'Non autorizzato' });
};

// --- API UTENTI ---
app.post('/api/sessions', passport.authenticate('local'), (req, res) => res.json(req.user));
app.get('/api/sessions/current', (req, res) => req.isAuthenticated() ? res.json(req.user) : res.status(401).json({ error: 'Non loggato' }));
app.delete('/api/sessions/current', (req, res) => req.logout(() => res.json({})));

// --- API GIOCO ---

// Inizia partita
app.post('/api/games', async (req, res) => {
  try {
    const isDemo = !req.isAuthenticated();
    if (!isDemo) {
      const coins = await dao.getUserCoins(req.user.id);
      if (coins <= 0) return res.status(403).json({ error: 'Non hai abbastanza monete per giocare.' });
    }
    const result = await dao.startNewGame(isDemo ? null : req.user.id, isDemo);
    res.status(201).json(result);
  } catch (err) {
    res.status(500).json({ error: 'Errore avvio partita.' });
  }
});

// Stato partita (Restituisce la stringa con gli underscore)
app.get('/api/games/:id', async (req, res) => {
  try {
    const status = await dao.getGameStatus(req.params.id);
    if (!status) return res.status(404).json({ error: 'Partita inesistente.' });
    res.json(status);
  } catch (err) {
    res.status(500).json({ error: 'Errore lettura stato.' });
  }
});

// Indovina lettera
app.post('/api/games/:id/letters', async (req, res) => {
  try {
    const { letter } = req.body;
    if (!letter || letter.length !== 1) return res.status(400).json({ error: 'Lettera non valida.' });
    
    const userId = req.isAuthenticated() ? req.user.id : null;
    const result = await dao.guessLetter(req.params.id, userId, letter);
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err });
  }
});

// Indovina frase completa
app.post('/api/games/:id/phrase', async (req, res) => {
  try {
    const { phrase } = req.body;
    const userId = req.isAuthenticated() ? req.user.id : null;
    const result = await dao.guessPhrase(req.params.id, userId, phrase);
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err });
  }
});

// Termina partita (Timeout o Abbandono)
app.post('/api/games/:id/end', async (req, res) => {
  try {
    const { reason } = req.body; // 'timeout' o 'abandoned'
    const userId = req.isAuthenticated() ? req.user.id : null;
    const result = await dao.endGame(req.params.id, userId, reason);
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err });
  }
});

app.listen(port, () => console.log(`Backend "Indovina Frase" su http://localhost:${port}`));