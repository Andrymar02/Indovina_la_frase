import { useState, useEffect } from 'react';
import { Card, Button, Row, Col, Form, Alert, ProgressBar, Badge } from 'react-bootstrap';
import * as API from '../API';

const KEYBOARD = [
  { char: 'Q', cost: 1 }, { char: 'W', cost: 3 }, { char: 'E', cost: 10 }, { char: 'R', cost: 5 }, { char: 'T', cost: 5 }, { char: 'Y', cost: 3 }, { char: 'U', cost: 10 }, { char: 'I', cost: 10 }, { char: 'O', cost: 10 }, { char: 'P', cost: 3 },
  { char: 'A', cost: 10 }, { char: 'S', cost: 5 }, { char: 'D', cost: 5 }, { char: 'F', cost: 3 }, { char: 'G', cost: 3 }, { char: 'H', cost: 5 }, { char: 'J', cost: 1 }, { char: 'K', cost: 1 }, { char: 'L', cost: 5 },
  { char: 'Z', cost: 1 }, { char: 'X', cost: 1 }, { char: 'C', cost: 5 }, { char: 'V', cost: 1 }, { char: 'B', cost: 3 }, { char: 'N', cost: 5 }, { char: 'M', cost: 3 }
];
const VOWELS = ['A', 'E', 'I', 'O', 'U'];

const getErrorMessage = (err) => {
  if (typeof err === 'string') return err;
  if (err && err.message) return err.message;
  return String(err);
};

function Game({ user, refreshUser }) {
  const [gameState, setGameState] = useState('waiting'); // 'waiting', 'playing', 'ended'
  const [gameData, setGameData] = useState(null);
  const [timeLeft, setTimeLeft] = useState(60);
  const [guessInput, setGuessInput] = useState('');
  const [message, setMessage] = useState(null); 
  const [finalPhrase, setFinalPhrase] = useState('');

  // Funzione sicura per aggiornare le monete senza crash
  const safeRefreshUser = () => {
    if (user && typeof refreshUser === 'function') {
      refreshUser();
    }
  };

  useEffect(() => {
    let timer;
    if (gameState === 'playing' && timeLeft > 0) {
      timer = setInterval(() => setTimeLeft(t => t - 1), 1000);
    } else if (gameState === 'playing' && timeLeft === 0) {
      handleEndGame('timeout');
    }
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameState, timeLeft]);

  const startGame = async () => {
    setMessage(null);
    try {
      const newGame = await API.startGame();
      const status = await API.getGameStatus(newGame.gameId);
      setGameData(status);
      setTimeLeft(300); 
      setGuessInput('');
      setGameState('playing');
      safeRefreshUser(); 
    } catch (err) {
      setMessage({ type: 'danger', text: getErrorMessage(err) });
    }
  };

  const handleLetterGuess = async (letter) => {
    try {
      const res = await API.guessLetter(gameData.id, letter);
      if (res.correct) {
        setMessage({ type: 'success', text: `Ottimo! La lettera ${letter} è presente.` });
      } else {
        setMessage({ type: 'danger', text: `Peccato, la lettera ${letter} non c'è. Ti è costata il doppio!` });
      }
      const updatedStatus = await API.getGameStatus(gameData.id);
      setGameData(updatedStatus);
      safeRefreshUser(); // Ora aggiornerà le monete senza crashare!
    } catch (err) {
      setMessage({ type: 'danger', text: getErrorMessage(err) });
    }
  };

  const handlePhraseGuess = async (e) => {
    e.preventDefault();
    if (!guessInput.trim()) return;
    
    try {
      const res = await API.guessPhrase(gameData.id, guessInput);
      if (res.correct) {
        setFinalPhrase(res.fullPhrase);
        setGameState('ended');
        setMessage({ type: 'success', text: '🎉 INCREDIBILE! Hai indovinato la frase e vinto 100 monete!' });
      } else {
        setMessage({ type: 'danger', text: '❌ La frase è sbagliata. La partita continua, nessuna penalità.' });
        setGuessInput('');
      }
      safeRefreshUser();
    } catch (err) {
      setMessage({ type: 'danger', text: getErrorMessage(err) });
    }
  };

  const handleEndGame = async (reason) => {
    try {
      const res = await API.endGame(gameData.id, reason);
      setFinalPhrase(res.fullPhrase);
      setGameState('ended');
      if (reason === 'timeout') {
        setMessage({ type: 'danger', text: '⏳ Tempo scaduto! Hai ricevuto una penalità di 20 monete.' });
      } else {
        setMessage({ type: 'warning', text: '🏃‍♂️ Hai abbandonato la partita. Nessuna penalità.' });
      }
      safeRefreshUser();
    } catch (err) {
      setMessage({ type: 'danger', text: getErrorMessage(err) });
    }
  };

  if (gameState === 'waiting') {
    return (
      <Card className="text-center shadow-sm mt-5 p-5">
        <h2>{user ? "Pronto a giocare?" : "Modalità Demo"}</h2>
        <p className="lead">
          {user ? "Hai 60 secondi per indovinare la frase segreta in inglese." 
                : "Gioca una partita di prova gratuita. Fai il login per guadagnare monete!"}
        </p>
        <div>
          <Button variant="primary" size="lg" onClick={startGame}>
            Inizia Partita
          </Button>
        </div>
      </Card>
    );
  }

  if (gameState === 'ended') {
    return (
      <Card className="text-center shadow-sm mt-5 p-5 border-0">
        <Alert variant={message?.type}>{message?.text}</Alert>
        <h4 className="mt-4">La frase segreta era:</h4>
        <h2 className="text-success fw-bold p-3 bg-light rounded border">{finalPhrase}</h2>
        <div className="mt-4">
          <Button variant="primary" onClick={() => setGameState('waiting')}>Torna alla Home</Button>
        </div>
      </Card>
    );
  }

  const revealedArray = gameData?.revealedLetters ? gameData.revealedLetters.split(',') : [];

  return (
    <div className="mt-4">
      <Row className="mb-3">
        <Col>
          <h4>Tempo rimasto: {timeLeft}s</h4>
          <ProgressBar now={(timeLeft / 60) * 100} variant={timeLeft > 15 ? 'info' : 'danger'} />
        </Col>
        <Col className="text-end">
          <Button variant="outline-danger" onClick={() => handleEndGame('abandoned')}>
            Abbandona Partita
          </Button>
        </Col>
      </Row>

      {message && <Alert variant={message.type} onClose={() => setMessage(null)} dismissible>{message.text}</Alert>}

      <Card className="mb-4 bg-light shadow-sm">
        <Card.Body className="text-center py-4" style={{ overflowX: 'auto', whiteSpace: 'nowrap' }}>
          <div className="d-inline-flex gap-2" style={{ fontSize: '1.8rem', fontFamily: 'monospace' }}>
            {gameData?.maskedText.split('').map((char, idx) => (
              char === ' ' ? (
                <span key={idx} style={{ minWidth: '25px' }}></span> // Spazio
              ) : (
                <span key={idx} className="border-bottom border-dark border-3 pb-1 text-center" style={{ minWidth: '30px', display: 'inline-block' }}>
                  {char !== '_' ? char : '\u00A0'}
                </span>
              )
            ))}
          </div>
        </Card.Body>
      </Card>

      <Row>
        <Col md={7}>
          <Card className="shadow-sm h-100">
            <Card.Body>
              <h5>Scegli una lettera</h5>
              <div className="d-flex flex-wrap justify-content-center gap-2 mt-3">
                {KEYBOARD.map(key => {
                  const isVow = VOWELS.includes(key.char);
                  const isDisabled = revealedArray.includes(key.char) || (isVow && gameData?.vowelUsed);
                  
                  return (
                    <Button 
                      key={key.char} 
                      variant={isVow ? "outline-primary" : "outline-secondary"}
                      disabled={isDisabled}
                      onClick={() => handleLetterGuess(key.char)}
                      style={{ width: '45px', height: '60px' }}
                      className="d-flex flex-column align-items-center justify-content-center p-0 shadow-sm"
                    >
                      <span style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>{key.char}</span>
                      <Badge bg={isVow ? "primary" : "secondary"} className="mt-1" style={{ fontSize: '0.7em' }}>
                        {key.cost}
                      </Badge>
                    </Button>
                  );
                })}
              </div>
              {gameData?.vowelUsed && <p className="text-muted text-center mt-4 small">Hai già usato la vocale per questa partita.</p>}
            </Card.Body>
          </Card>
        </Col>

        <Col md={5}>
          <Card className="shadow-sm h-100 bg-warning bg-opacity-10">
            <Card.Body className="d-flex flex-column justify-content-center">
              <h5>Sai già la risposta?</h5>
              <p className="small text-muted mb-3">Se indovini la frase esatta vinci 100 monete! Se sbagli non succede nulla.</p>
              <Form onSubmit={handlePhraseGuess}>
                <Form.Group className="mb-3">
                  <Form.Control 
                    type="text" 
                    placeholder="Scrivi la frase intera..." 
                    value={guessInput}
                    onChange={(e) => setGuessInput(e.target.value)}
                    autoComplete="off"
                  />
                </Form.Group>
                <Button variant="success" type="submit" className="w-100 fw-bold">
                  Indovina Frase!
                </Button>
              </Form>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </div>
  );
}

export default Game;