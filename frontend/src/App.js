import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { Navbar, Nav, Container } from 'react-bootstrap';
import RecruiterPortal from './components/RecruiterPortal';
import CandidatePortal from './components/CandidatePortal';
import JobMatches from './components/JobMatches';
import './App.css';

function App() {
  return (
    <Router>
      <div className="App">
        <Navbar bg="dark" variant="dark" expand="lg">
          <Container>
            <Navbar.Brand as={Link} to="/">
              AI Resume Matching System
            </Navbar.Brand>
            <Navbar.Toggle aria-controls="basic-navbar-nav" />
            <Navbar.Collapse id="basic-navbar-nav">
              <Nav className="me-auto">
                <Nav.Link as={Link} to="/recruiter">
                  Recruiter Portal
                </Nav.Link>
                <Nav.Link as={Link} to="/candidate">
                  Candidate Portal
                </Nav.Link>
              </Nav>
            </Navbar.Collapse>
          </Container>
        </Navbar>

        <Container className="mt-4">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/recruiter" element={<RecruiterPortal />} />
            <Route path="/candidate" element={<CandidatePortal />} />
            <Route path="/job/:jobId/matches" element={<JobMatches />} />
          </Routes>
        </Container>
      </div>
    </Router>
  );
}

function Home() {
  return (
    <div className="text-center">
      <h1 className="display-4 mb-4">AI-Driven Candidate-Job Matching System</h1>
      <p className="lead mb-4">
        Leverage AI to match the best candidates with job opportunities
      </p>
      <div className="row mt-5">
        <div className="col-md-6 mb-4">
          <div className="card h-100">
            <div className="card-body">
              <h3 className="card-title">For Recruiters</h3>
              <p className="card-text">
                Post job openings and get AI-powered candidate rankings with detailed match analysis.
              </p>
              <a href="/recruiter" className="btn btn-primary">
                Go to Recruiter Portal
              </a>
            </div>
          </div>
        </div>
        <div className="col-md-6 mb-4">
          <div className="card h-100">
            <div className="card-body">
              <h3 className="card-title">For Candidates</h3>
              <p className="card-text">
                Upload your resume and let AI match you with relevant job opportunities.
              </p>
              <a href="/candidate" className="btn btn-success">
                Go to Candidate Portal
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;

