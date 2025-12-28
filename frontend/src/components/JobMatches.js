import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Container,
  Card,
  Table,
  Badge,
  Button,
  Modal,
  Form,
  Alert,
  Spinner,
} from 'react-bootstrap';
import { matchesAPI, jobsAPI } from '../services/api';

function JobMatches() {
  const { jobId } = useParams();
  const navigate = useNavigate();
  const [job, setJob] = useState(null);
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [selectedMatch, setSelectedMatch] = useState(null);
  const [feedback, setFeedback] = useState({ feedback: '', feedbackScore: '' });

  useEffect(() => {
    loadData();
  }, [jobId]);

  const loadData = async () => {
    setLoading(true);
    setError('');

    try {
      const [jobResponse, matchesResponse] = await Promise.all([
        jobsAPI.getById(jobId),
        matchesAPI.getByJob(jobId),
      ]);
      setJob(jobResponse.data);
      setMatches(matchesResponse.data);
    } catch (err) {
      setError('Failed to load data: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleMatchAll = async () => {
    setLoading(true);
    setError('');

    try {
      await matchesAPI.matchAll(jobId);
      loadData();
    } catch (err) {
      setError('Failed to match candidates: ' + err.message);
      setLoading(false);
    }
  };

  const handleFeedbackClick = (match) => {
    setSelectedMatch(match);
    setFeedback({
      feedback: match.recruiterFeedback || '',
      feedbackScore: match.feedbackScore || '',
    });
    setShowFeedbackModal(true);
  };

  const handleFeedbackSubmit = async (e) => {
    e.preventDefault();
    setError('');

    try {
      await matchesAPI.updateFeedback(selectedMatch._id, feedback);
      setShowFeedbackModal(false);
      loadData();
    } catch (err) {
      setError('Failed to update feedback: ' + err.message);
    }
  };

  const getScoreClass = (score) => {
    if (score >= 70) return 'match-score-high';
    if (score >= 40) return 'match-score-medium';
    return 'match-score-low';
  };

  const highlightSkills = (text, skills) => {
    if (!text || !skills || skills.length === 0) return text;
    
    let highlighted = text;
    skills.forEach((skill) => {
      const regex = new RegExp(`(${skill})`, 'gi');
      highlighted = highlighted.replace(regex, '<span class="highlight-skill">$1</span>');
    });
    return highlighted;
  };

  if (loading && matches.length === 0) {
    return (
      <Container className="text-center mt-5">
        <Spinner animation="border" role="status">
          <span className="visually-hidden">Loading...</span>
        </Spinner>
      </Container>
    );
  }

  return (
    <Container>
      <Button variant="secondary" onClick={() => navigate('/recruiter')} className="mb-3">
        ← Back to Recruiter Portal
      </Button>

      {job && (
        <Card className="mb-4">
          <Card.Header>
            <h2>{job.title}</h2>
            <p className="mb-0">{job.company} - {job.location}</p>
          </Card.Header>
          <Card.Body>
            <p><strong>Description:</strong></p>
            <p>{job.description}</p>
            <p><strong>Required Skills:</strong></p>
            <div>
              {job.skills.map((skill, idx) => (
                <Badge key={idx} bg="primary" className="me-2">
                  {skill}
                </Badge>
              ))}
            </div>
          </Card.Body>
        </Card>
      )}

      {error && <Alert variant="danger" dismissible onClose={() => setError('')}>{error}</Alert>}

      <Card>
        <Card.Header className="d-flex justify-content-between align-items-center">
          <h3>Candidate Matches</h3>
          <Button variant="primary" onClick={handleMatchAll} disabled={loading}>
            {loading ? 'Matching...' : 'Match All Candidates'}
          </Button>
        </Card.Header>
        <Card.Body>
          {matches.length === 0 ? (
            <div className="text-center py-5">
              <p className="text-muted">No matches found yet.</p>
              <Button variant="primary" onClick={handleMatchAll} disabled={loading}>
                {loading ? 'Matching...' : 'Match Candidates'}
              </Button>
            </div>
          ) : (
            <div className="table-responsive">
              <Table striped hover>
                <thead>
                  <tr>
                    <th>Rank</th>
                    <th>Candidate</th>
                    <th>Email</th>
                    <th>Match Score</th>
                    <th>Matching Skills</th>
                    <th>Missing Skills</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {matches.map((match, index) => (
                    <tr key={match._id}>
                      <td>
                        <Badge bg={index === 0 ? 'success' : 'secondary'}>
                          #{index + 1}
                        </Badge>
                      </td>
                      <td>{match.resumeId?.candidateName || 'N/A'}</td>
                      <td>{match.resumeId?.email || 'N/A'}</td>
                      <td>
                        <span className={getScoreClass(match.matchScore)}>
                          {match.matchScore}%
                        </span>
                      </td>
                      <td>
                        {match.matchingSkills.length > 0 ? (
                          <div>
                            {match.matchingSkills.slice(0, 3).map((skill, idx) => (
                              <Badge key={idx} bg="success" className="me-1">
                                {skill}
                              </Badge>
                            ))}
                            {match.matchingSkills.length > 3 && (
                              <Badge bg="secondary">+{match.matchingSkills.length - 3}</Badge>
                            )}
                          </div>
                        ) : (
                          <span className="text-muted">None</span>
                        )}
                      </td>
                      <td>
                        {match.missingSkills.length > 0 ? (
                          <div>
                            {match.missingSkills.slice(0, 3).map((skill, idx) => (
                              <Badge key={idx} bg="warning" className="me-1">
                                {skill}
                              </Badge>
                            ))}
                            {match.missingSkills.length > 3 && (
                              <Badge bg="secondary">+{match.missingSkills.length - 3}</Badge>
                            )}
                          </div>
                        ) : (
                          <span className="text-muted">None</span>
                        )}
                      </td>
                      <td>
                        <Button
                          size="sm"
                          variant="info"
                          onClick={() => handleFeedbackClick(match)}
                        >
                          View Details
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </div>
          )}
        </Card.Body>
      </Card>

      {/* Match Details Modal */}
      <Modal show={showFeedbackModal} onHide={() => setShowFeedbackModal(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>Match Details & Feedback</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedMatch && (
            <>
              <div className="mb-3">
                <h5>Candidate: {selectedMatch.resumeId?.candidateName}</h5>
                <p><strong>Email:</strong> {selectedMatch.resumeId?.email}</p>
                <p>
                  <strong>Match Score:</strong>{' '}
                  <span className={getScoreClass(selectedMatch.matchScore)}>
                    {selectedMatch.matchScore}%
                  </span>
                </p>
              </div>

              <div className="mb-3">
                <h6>AI Analysis:</h6>
                <p>{selectedMatch.aiAnalysis || 'No analysis available.'}</p>
              </div>

              <div className="mb-3">
                <h6>Matching Skills:</h6>
                <div>
                  {selectedMatch.matchingSkills.map((skill, idx) => (
                    <Badge key={idx} bg="success" className="me-2 mb-2">
                      {skill}
                    </Badge>
                  ))}
                </div>
              </div>

              <div className="mb-3">
                <h6>Missing Skills:</h6>
                <div>
                  {selectedMatch.missingSkills.map((skill, idx) => (
                    <Badge key={idx} bg="warning" className="me-2 mb-2">
                      {skill}
                    </Badge>
                  ))}
                </div>
              </div>

              {selectedMatch.highlightedText && (
                <div className="mb-3">
                  <h6>Highlighted Matching Text:</h6>
                  <div
                    className="p-3 bg-light border rounded"
                    dangerouslySetInnerHTML={{
                      __html: highlightSkills(selectedMatch.highlightedText, selectedMatch.matchingSkills),
                    }}
                  />
                </div>
              )}

              <hr />

              <Form onSubmit={handleFeedbackSubmit}>
                <Form.Group className="mb-3">
                  <Form.Label>Recruiter Feedback</Form.Label>
                  <Form.Control
                    as="textarea"
                    rows={3}
                    value={feedback.feedback}
                    onChange={(e) => setFeedback({ ...feedback, feedback: e.target.value })}
                    placeholder="Add your feedback about this match..."
                  />
                </Form.Group>

                <Form.Group className="mb-3">
                  <Form.Label>Feedback Score (0-100)</Form.Label>
                  <Form.Control
                    type="number"
                    min="0"
                    max="100"
                    value={feedback.feedbackScore}
                    onChange={(e) => setFeedback({ ...feedback, feedbackScore: e.target.value })}
                    placeholder="Your assessment score"
                  />
                </Form.Group>

                <Button type="submit" variant="primary">
                  Save Feedback
                </Button>
              </Form>
            </>
          )}
        </Modal.Body>
      </Modal>
    </Container>
  );
}

export default JobMatches;


