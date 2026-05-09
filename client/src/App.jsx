import { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { Container, Navbar, Nav, Button, Badge, Spinner } from 'react-bootstrap';
import LoginForm from './components/LoginForm';
import Game from './components/Game';
import * as API from './API';

function AppNavbar({ user, handleLogout }) {
  const navigate = useNavigate();
  return (
    <Navbar bg="dark" variant="dark" expand="lg" className="mb-4 shadow">
      <Container>
        <Navbar.Brand role="button" onClick={() => navigate('/')}>
          Indovina la Frase 💬
        </Navbar.Brand>
        <Nav className="me-auto">
          <Nav.Link onClick={() => navigate('/')}>Gioca</Nav.Link>
        </Nav>
        <Nav className="align-items-center">
          {user ? (
            <>
              <Navbar.Text className="me-3">
                <Badge bg="warning" text="dark" className="fs-6 shadow-sm">
                  💰 {user.coins} Monete
                </Badge>
              </Navbar.Text>
              <Navbar.Text className="me-3">Ciao, {user.username}!</Navbar.Text>
              <Button variant="outline-light" size="sm" onClick={handleLogout}>Logout</Button>
            </>
          ) : (
            <Button variant="light" size="sm" onClick={() => navigate('/login')}>Login</Button>
          )}
        </Nav>
      </Container>
    </Navbar>
  );
}

function MainApp() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const currentUser = await API.getUserInfo();
        setUser(currentUser);
      } catch (err) {
        // Non loggato
      } finally {
        setLoading(false);
      }
    };
    checkAuth();
  }, []);

  const handleLogin = async (credentials) => {
    const loggedUser = await API.logIn(credentials);
    setUser(loggedUser);
    navigate('/');
  };

  const handleLogout = async () => {
    await API.logOut();
    setUser(null);
    navigate('/');
  };

  // Questa è la funzione cruciale che ricarica i soldi dal database!
  const refreshUser = async () => {
    try {
      const updatedUser = await API.getUserInfo();
      setUser(updatedUser);
    } catch (err) {
      console.error("Errore nell'aggiornamento monete", err);
    }
  };

  if (loading) return <div className="text-center mt-5"><Spinner animation="border" /></div>;

  return (
    <>
      <AppNavbar user={user} handleLogout={handleLogout} />
      <Container>
        <Routes>
          {/* Qui passiamo SIA l'utente SIA la funzione refreshUser al Gioco */}
          <Route path="/" element={
            <Game user={user} refreshUser={refreshUser} />
          } />
          
          <Route path="/login" element={
            user ? <Navigate to="/" /> : <LoginForm login={handleLogin} />
          } />
          
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </Container>
    </>
  );
}

function App() {
  return (
    <BrowserRouter>
      <MainApp />
    </BrowserRouter>
  );
}

export default App;