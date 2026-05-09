const SERVER_URL = 'http://localhost:3001/api';

async function handleResponse(response) {
  if (response.ok) {
    return await response.json();
  } else {
    const errBody = await response.json();
    throw errBody.error || "Errore generico dal server";
  }
}

// --- AUTENTICAZIONE ---
export async function getUserInfo() {
  const response = await fetch(`${SERVER_URL}/sessions/current`, { credentials: 'include' });
  if (response.ok) return await response.json();
  throw new Error('Not authenticated');
}

export async function logIn(credentials) {
  const response = await fetch(`${SERVER_URL}/sessions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(credentials),
    credentials: 'include',
  });
  return handleResponse(response);
}

export async function logOut() {
  await fetch(`${SERVER_URL}/sessions/current`, { method: 'DELETE', credentials: 'include' });
}

// --- GIOCO ---
export async function startGame() {
  const response = await fetch(`${SERVER_URL}/games`, { 
    method: 'POST', 
    credentials: 'include' 
  });
  return handleResponse(response);
}

export async function getGameStatus(gameId) {
  const response = await fetch(`${SERVER_URL}/games/${gameId}`, { credentials: 'include' });
  return handleResponse(response);
}

export async function guessLetter(gameId, letter) {
  const response = await fetch(`${SERVER_URL}/games/${gameId}/letters`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ letter }),
    credentials: 'include'
  });
  return handleResponse(response);
}

export async function guessPhrase(gameId, phrase) {
  const response = await fetch(`${SERVER_URL}/games/${gameId}/phrase`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phrase }),
    credentials: 'include'
  });
  return handleResponse(response);
}

export async function endGame(gameId, reason) {
  const response = await fetch(`${SERVER_URL}/games/${gameId}/end`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ reason }),
    credentials: 'include'
  });
  return handleResponse(response);
}
