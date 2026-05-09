import { useState } from 'react';
import { Form, Button, Alert, Container, Row, Col, Card } from 'react-bootstrap';

function LoginForm({ login }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const handleSubmit = async (event) => {
    event.preventDefault();
    setErrorMessage('');
    try {
      await login({ username, password });
    } catch (err) {
      setErrorMessage(err);
    }
  };

  return (
    <Container>
      <Row className="justify-content-center mt-5">
        <Col md={5}>
          <Card className="shadow-sm">
            <Card.Body>
              <h2 className="text-center mb-4">Accedi</h2>
              {errorMessage && <Alert variant="danger">{errorMessage}</Alert>}
              
              <Form onSubmit={handleSubmit}>
                <Form.Group className="mb-3">
                  <Form.Label>Username</Form.Label>
                  <Form.Control 
                    type="text" 
                    placeholder="Inserisci username" 
                    value={username}
                    onChange={e => setUsername(e.target.value)}
                    required
                  />
                </Form.Group>

                <Form.Group className="mb-4">
                  <Form.Label>Password</Form.Label>
                  <Form.Control 
                    type="password" 
                    placeholder="Inserisci password" 
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required
                  />
                </Form.Group>

                <Button variant="primary" type="submit" className="w-100">
                  Login
                </Button>
              </Form>
              
              <div className="mt-4 text-center text-muted">
                <small>
                  <strong>Credenziali di test (password: password):</strong><br/>
                  • <code>player_rich</code> (500 monete)<br/>
                  • <code>player_new</code> (100 monete)<br/>
                  • <code>player_poor</code> (0 monete)
                </small>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
}

export default LoginForm;