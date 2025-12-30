import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Container,
  Card,
  Badge,
  Button,
  Modal,
  Form,
  Alert,
  Spinner,
  Row,
  Col,
  ProgressBar,
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

  const getVariant = (score) => {
    if (score >= 70) return 'success';
    if (score >= 40) return 'warning';
    return 'danger';
  };

  const getInitials = (name = '') => {
    return name
      .split(' ')
      .map((n) => n[0])
      .filter(Boolean)
      .slice(0, 2)
      .join('')
      .toUpperCase();
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
        <Card className="mb-4 glass-card">
          <Card.Body>
            <Row className="align-items-center">
              <Col md={8}>
                <h2 className="mb-1">{job.title}</h2>
                <p className="mb-1 text-muted">{job.company} • {job.location}</p>
                <p className="mb-2 text-muted small">{job.description?.slice(0, 220)}{job.description?.length > 220 ? '...' : ''}</p>
                <div>
                  {(job.skills || job.skillsRequired || []).map((skill, idx) => (
                    <Badge key={idx} bg="light" text="dark" className="me-1 skill-pill">
                      {skill}
                    </Badge>
                  ))}
                </div>
              </Col>
              <Col md={4} className="text-md-end mt-3 mt-md-0">
                <Button variant="primary" onClick={handleMatchAll} disabled={loading}>
                  {loading ? 'Matching...' : 'Match All Candidates'}
                </Button>
              </Col>
            </Row>
          </Card.Body>
        </Card>
      )}

      {error && <Alert variant="danger" dismissible onClose={() => setError('')}>{error}</Alert>}

      <Card>
        <Card.Header>
          <h3 className="mb-0">Candidate Matches</h3>
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
            <Row className="g-3">
              {matches.map((match, index) => (
                <Col key={match._id} xs={12} md={6} lg={4}>
                  <Card className="match-card h-100">
                    <Card.Body className="d-flex flex-column">
                      <div className="d-flex align-items-start justify-content-between mb-3">
                        <div className="d-flex align-items-center gap-3">
                          <div className="avatar-circle bg-primary text-white">
                            {getInitials(match.resumeId?.candidateName || 'NA')}
                          </div>
                          <div>
                            <div className="small text-muted">#{index + 1}</div>
                            <h5 className="mb-0">{match.resumeId?.candidateName || 'N/A'}</h5>
                            <div className="small text-muted">{match.resumeId?.email || 'N/A'}</div>
                          </div>
                        </div>

                        <div style={{ width: 110, textAlign: 'right' }}>
                          <div className="mb-1 small text-muted">Match</div>
                          <ProgressBar
                            now={match.matchScore}
                            variant={getVariant(match.matchScore)}
                            label={`${match.matchScore}%`}
                            animated
                            striped
                          />
                        </div>
                      </div>

                      <div className="mb-2">
                        <div className="small text-muted mb-1">Matching Skills</div>
                        {match.matchingSkills.length > 0 ? (
                          match.matchingSkills.slice(0, 4).map((s, i) => (
                            <Badge key={i} bg="success" className="me-1 mb-1">
                              {s}
                            </Badge>
                          ))
                        ) : (
                          <div className="text-muted small">None</div>
                        )}
                      </div>

                      <div className="mb-3">
                        <div className="small text-muted mb-1">Missing Skills</div>
                        {match.missingSkills.length > 0 ? (
                          match.missingSkills.slice(0, 4).map((s, i) => (
                            <Badge key={i} bg="warning" text="dark" className="me-1 mb-1">
                              {s}
                            </Badge>
                          ))
                        ) : (
                          <div className="text-muted small">None</div>
                        )}
                      </div>

                      <div className="mt-auto d-flex justify-content-between align-items-center">
                        <Button size="sm" variant="outline-primary" onClick={() => handleFeedbackClick(match)}>
                          View Details
                        </Button>
                        <div className="small text-muted">Rank #{index + 1}</div>
                      </div>
                    </Card.Body>
                  </Card>
                </Col>
              ))}
            </Row>
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
              <div className="mb-3 d-flex align-items-center gap-3">
                <div className="avatar-circle large bg-secondary text-white">
                  {getInitials(selectedMatch.resumeId?.candidateName || 'NA')}
                </div>
                <div>
                  <h5 className="mb-0">Candidate: {selectedMatch.resumeId?.candidateName}</h5>
                  <div className="small text-muted">{selectedMatch.resumeId?.email}</div>
                </div>
                <div className="ms-auto text-end">
                  <div className="small text-muted">Score</div>
                  <div className={getScoreClass(selectedMatch.matchScore)} style={{ fontSize: '1.25rem', fontWeight: 700 }}>
                    {selectedMatch.matchScore}%
                  </div>
                </div>
              </div>

              <div className="mb-3">
                <h6>AI Analysis:</h6>
                <p className="text-muted">{selectedMatch.aiAnalysis || 'No analysis available.'}</p>
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
                    <Badge key={idx} bg="warning" text="dark" className="me-2 mb-2">
                      {skill}
                    </Badge>
                  ))}
                </div>
              </div>

              {selectedMatch.highlightedText && (
                <div className="mb-3">
                  <h6>Highlighted Matching Text:</h6>
                  <div
                    className="p-3 highlighted-text border rounded"
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


