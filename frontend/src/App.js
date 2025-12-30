import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link, Navigate, useLocation } from 'react-router-dom';
import { Navbar, Nav, Container, Row, Col, Card, Button } from 'react-bootstrap';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import RecruiterPortal from './components/RecruiterPortal';
import CandidatePortal from './components/CandidatePortal';
import JobMatches from './components/JobMatches';
import Login from './components/Login';
import Signup from './components/Signup';
import './App.css';

// Protected Route Component
const ProtectedRoute = ({ children, requiredRole }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return <div className="text-center mt-5">Loading...</div>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (requiredRole && user.role !== requiredRole) {
    // Redirect to appropriate dashboard
    return <Navigate to={user.role === 'recruiter' ? '/recruiter' : '/candidate'} replace />;
  }

  return children;
};

function AppContent() {
  const { user, logout } = useAuth();
  const location = useLocation();

  return (
    <div className="App">
      {location.pathname !== '/' && (
        <Navbar bg="dark" variant="dark" expand="lg">
          <Container>
            <Navbar.Brand as={Link} to="/">
              AI Resume Matching System
            </Navbar.Brand>
            <Navbar.Toggle aria-controls="basic-navbar-nav" />
            <Navbar.Collapse id="basic-navbar-nav">
              <Nav className="me-auto">
                {user ? (
                  <>
                    {user.role === 'recruiter' && (
                      <Nav.Link as={Link} to="/recruiter">
                        Recruiter Portal
                      </Nav.Link>
                    )}
                    {user.role === 'candidate' && (
                      <Nav.Link as={Link} to="/candidate">
                        Candidate Portal
                      </Nav.Link>
                    )}
                  </>
                ) : (
                  <>
                    <Nav.Link as={Link} to="/login">
                      Login
                    </Nav.Link>
                    <Nav.Link as={Link} to="/signup">
                      Sign Up
                    </Nav.Link>
                  </>
                )}
              </Nav>
              {user && (
                <Nav>
                  <Navbar.Text className="me-3">
                    Welcome, {user.name} ({user.role})
                  </Navbar.Text>
                  <Nav.Link onClick={logout}>Logout</Nav.Link>
                </Nav>
              )}
            </Navbar.Collapse>
          </Container>
        </Navbar>
      )}

      <Container className="mt-4">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route
            path="/recruiter"
            element={
              <ProtectedRoute requiredRole="recruiter">
                <RecruiterPortal />
              </ProtectedRoute>
            }
          />
          <Route
            path="/candidate"
            element={
              <ProtectedRoute requiredRole="candidate">
                <CandidatePortal />
              </ProtectedRoute>
            }
          />
          <Route
            path="/job/:jobId/matches"
            element={
              <ProtectedRoute requiredRole="recruiter">
                <JobMatches />
              </ProtectedRoute>
            }
          />
        </Routes>
      </Container>
    </div>
  );
}

function App() {
  return (
    <Router>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </Router>
  );
}

function Home() {
  const heroStyle = {
    background: 'linear-gradient(135deg, #0f1724 0%, #20374a 50%, #2b5364 100%)',
    color: '#fff',
    padding: '4rem 0',
    borderRadius: 12
  };
  const cardStyle = { boxShadow: '0 8px 24px rgba(16,24,40,0.12)' };

  return (
    <div>
      <div style={heroStyle} className="mb-5">
        <Container>
          <Row className="align-items-center">
            <Col md={7}>
              <h1 className="display-4 fw-bold">AI-Driven Candidate-Job Matching System</h1>
              <p className="lead text-white-50">
                Leverage AI to surface the best candidates and accelerate hiring with clear match insights.
              </p>
              <div className="mt-4">
                <Button as={Link} to="/recruiter" variant="primary" className="me-3 px-4 py-2">
                  Recruiter Portal
                </Button>
                <Button as={Link} to="/candidate" variant="success" className="px-4 py-2">
                  Candidate Portal
                </Button>
              </div>
            </Col>
            <Col md={5} className="text-center mt-4 mt-md-0">
              <Card style={{ background: 'rgba(255,255,255,0.04)', border: 'none' }} className="p-4">
                <Card.Body>
                  <h4 className="text-white mb-2">Smart Matching</h4>
                  <p className="text-white-50 mb-0">
                    Fast, explainable candidate rankings so you hire with confidence.
                  </p>
                </Card.Body>
              </Card>
            </Col>
          </Row>
        </Container>
      </div>

      <Container>
        <Row className="g-4">
          <Col md={4}>
            <Card style={cardStyle} className="h-100 p-3">
              <Card.Body>
                <h5>Post Jobs</h5>
                <p className="text-muted">Create and manage job openings with AI-enhanced descriptions.</p>
              </Card.Body>
            </Card>
          </Col>
          <Col md={4}>
            <Card style={cardStyle} className="h-100 p-3">
              <Card.Body>
                <h5>Analyze Matches</h5>
                <p className="text-muted">Detailed match scores and explanations for better hiring decisions.</p>
              </Card.Body>
            </Card>
          </Col>
          <Col md={4}>
            <Card style={cardStyle} className="h-100 p-3">
              <Card.Body>
                <h5>Upload Resumes</h5>
                <p className="text-muted">Candidates can upload resumes and improve visibility to recruiters.</p>
              </Card.Body>
            </Card>
          </Col>
        </Row>

        <Row className="mt-5">
          <Col>
            <div className="text-center text-muted">Trusted by recruiters and candidates worldwide</div>
          </Col>
        </Row>
      </Container>
    </div>
  );
}

export default App;

