import React, { useState, useEffect } from 'react';
import { Container, Card, Button, Form, Table, Badge, Alert, Modal } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { jobsAPI, recruiterAPI, feedbackAPI } from '../services/api';

function RecruiterPortal() {
  const [jobs, setJobs] = useState([]);
  const [applicants, setApplicants] = useState([]);
  const [selectedJob, setSelectedJob] = useState(null);
  const [showJobForm, setShowJobForm] = useState(false);
  const [showApplicantsModal, setShowApplicantsModal] = useState(false);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [selectedCandidate, setSelectedCandidate] = useState(null);
  const [feedbackData, setFeedbackData] = useState({
    verdict: 'good',
    notes: '',
  });
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    requirements: '',
    skills: '',
    company: '',
    location: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    loadJobs();
  }, []);

  const loadJobs = async () => {
    try {
      const response = await recruiterAPI.getMyJobs();
      setJobs(response.data);
    } catch (err) {
      setError('Failed to load jobs: ' + err.message);
    }
  };

  const loadApplicants = async (jobId) => {
    try {
      const response = await recruiterAPI.getJobApplications(jobId);
      setApplicants(response.data);
    } catch (err) {
      setError('Failed to load applicants: ' + err.message);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      await jobsAPI.create(formData);
      setSuccess('Job posted successfully!');
      setFormData({
        title: '',
        description: '',
        requirements: '',
        skills: '',
        company: '',
        location: '',
      });
      setShowJobForm(false);
      loadJobs();
    } catch (err) {
      setError('Failed to create job: ' + (err.response?.data?.error || err.message));
    } finally {
      setLoading(false);
    }
  };

  const handleViewApplicants = async (job) => {
    setSelectedJob(job);
    await loadApplicants(job._id);
    setShowApplicantsModal(true);
  };

  const handleSubmitFeedback = async () => {
    if (!selectedJob || !selectedCandidate) return;

    setLoading(true);
    setError('');
    try {
      await feedbackAPI.create({
        jobId: selectedJob._id,
        candidateId: selectedCandidate.candidateId._id,
        verdict: feedbackData.verdict,
        notes: feedbackData.notes,
      });
      setSuccess('Feedback submitted successfully!');
      setShowFeedbackModal(false);
      setFeedbackData({ verdict: 'good', notes: '' });
      await loadApplicants(selectedJob._id);
    } catch (err) {
      setError('Failed to submit feedback: ' + (err.response?.data?.error || err.message));
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (jobId) => {
    if (window.confirm('Are you sure you want to delete this job?')) {
      try {
        await jobsAPI.delete(jobId);
        loadJobs();
      } catch (err) {
        setError('Failed to delete job: ' + err.message);
      }
    }
  };

  return (
    <Container>
      <h1 className="mb-4">Recruiter Dashboard</h1>

      {error && <Alert variant="danger" dismissible onClose={() => setError('')}>{error}</Alert>}
      {success && <Alert variant="success" dismissible onClose={() => setSuccess('')}>{success}</Alert>}

      {/* Create Job Form */}
      <Card className="mb-4">
        <Card.Header>
          <h3>{showJobForm ? 'Post New Job' : 'Job Postings'}</h3>
        </Card.Header>
        <Card.Body>
          {!showJobForm ? (
            <Button onClick={() => setShowJobForm(true)} variant="primary" className="mb-3">
              + Post New Job
            </Button>
          ) : (
            <Form onSubmit={handleSubmit}>
              <Form.Group className="mb-3">
                <Form.Label>Job Title *</Form.Label>
                <Form.Control
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  required
                />
              </Form.Group>

              <Form.Group className="mb-3">
                <Form.Label>Company *</Form.Label>
                <Form.Control
                  type="text"
                  value={formData.company}
                  onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                  required
                />
              </Form.Group>

              <Form.Group className="mb-3">
                <Form.Label>Location</Form.Label>
                <Form.Control
                  type="text"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                />
              </Form.Group>

              <Form.Group className="mb-3">
                <Form.Label>Job Description *</Form.Label>
                <Form.Control
                  as="textarea"
                  rows={5}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  required
                />
              </Form.Group>

              <Form.Group className="mb-3">
                <Form.Label>Requirements (comma-separated)</Form.Label>
                <Form.Control
                  type="text"
                  value={formData.requirements}
                  onChange={(e) => setFormData({ ...formData, requirements: e.target.value })}
                  placeholder="e.g., 3+ years experience, Bachelor's degree"
                />
              </Form.Group>

              <Form.Group className="mb-3">
                <Form.Label>Required Skills (comma-separated) *</Form.Label>
                <Form.Control
                  type="text"
                  value={formData.skills}
                  onChange={(e) => setFormData({ ...formData, skills: e.target.value })}
                  placeholder="e.g., JavaScript, React, Node.js, MongoDB"
                  required
                />
              </Form.Group>

              <Button type="submit" variant="primary" disabled={loading}>
                {loading ? 'Posting...' : 'Post Job'}
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={() => setShowJobForm(false)}
                className="ms-2"
              >
                Cancel
              </Button>
            </Form>
          )}
        </Card.Body>
      </Card>

      {/* Posted Jobs */}
      <Card>
        <Card.Header>
          <h3>Posted Jobs</h3>
        </Card.Header>
        <Card.Body>
          {jobs.length === 0 ? (
            <p className="text-muted">No jobs posted yet.</p>
          ) : (
            <Table responsive striped hover>
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Company</th>
                  <th>Location</th>
                  <th>Skills</th>
                  <th>Posted</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {jobs.map((job) => (
                  <tr key={job._id}>
                    <td>{job.title}</td>
                    <td>{job.company}</td>
                    <td>{job.location || 'N/A'}</td>
                    <td>
                      {job.skillsRequired?.slice(0, 3).map((skill, idx) => (
                        <Badge key={idx} bg="secondary" className="me-1">
                          {skill}
                        </Badge>
                      ))}
                      {job.skillsRequired?.length > 3 && '...'}
                    </td>
                    <td>{new Date(job.createdAt).toLocaleDateString()}</td>
                    <td>
                      <Button
                        size="sm"
                        variant="info"
                        onClick={() => handleViewApplicants(job)}
                        className="me-2"
                      >
                        View Applicants
                      </Button>
                      <Button
                        size="sm"
                        variant="danger"
                        onClick={() => handleDelete(job._id)}
                      >
                        Delete
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </Card.Body>
      </Card>

      {/* Applicants Modal */}
      <Modal show={showApplicantsModal} onHide={() => setShowApplicantsModal(false)} size="xl">
        <Modal.Header closeButton>
          <Modal.Title>Applicants for {selectedJob?.title}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {applicants.length === 0 ? (
            <p className="text-muted">No applicants yet.</p>
          ) : (
            <Table responsive striped hover>
              <thead>
                <tr>
                  <th>Candidate</th>
                  <th>Email</th>
                  <th>Match Score</th>
                  <th>Matched Skills</th>
                  <th>Missing Skills</th>
                  <th>Highlights</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {applicants.map((app) => (
                  <tr key={app._id}>
                    <td>{app.candidateId?.name || 'N/A'}</td>
                    <td>{app.candidateId?.email || 'N/A'}</td>
                    <td>
                      <Badge bg={app.matchScore >= 70 ? 'success' : app.matchScore >= 50 ? 'warning' : 'danger'}>
                        {app.matchScore}%
                      </Badge>
                    </td>
                    <td>
                      {app.matchedSkills?.slice(0, 3).map((skill, idx) => (
                        <Badge key={idx} bg="success" className="me-1">
                          {skill}
                        </Badge>
                      ))}
                      {app.matchedSkills?.length > 3 && '...'}
                    </td>
                    <td>
                      {app.missingSkills?.slice(0, 3).map((skill, idx) => (
                        <Badge key={idx} bg="danger" className="me-1">
                          {skill}
                        </Badge>
                      ))}
                      {app.missingSkills?.length > 3 && '...'}
                    </td>
                    <td>
                      {app.highlights?.slice(0, 2).map((h, idx) => (
                        <div key={idx} className="small text-muted">{h.substring(0, 50)}...</div>
                      ))}
                    </td>
                    <td>
                      <Button
                        size="sm"
                        variant="primary"
                        onClick={() => {
                          setSelectedCandidate(app);
                          setShowFeedbackModal(true);
                        }}
                      >
                        Add Feedback
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}

          {/* Show previous feedback for each candidate */}
          {applicants.map((app) => (
            app.feedbacks && app.feedbacks.length > 0 && (
              <Card key={`feedback-${app._id}`} className="mt-3">
                <Card.Header>
                  <strong>Previous Feedback for {app.candidateId?.name}</strong>
                </Card.Header>
                <Card.Body>
                  {app.feedbacks.map((feedback, idx) => (
                    <div key={idx} className="mb-2">
                      <Badge bg={feedback.verdict === 'good' ? 'success' : 'danger'} className="me-2">
                        {feedback.verdict === 'good' ? 'Good Match' : 'Bad Match'}
                      </Badge>
                      <span className="small text-muted">
                        {new Date(feedback.createdAt).toLocaleDateString()}
                      </span>
                      {feedback.notes && (
                        <p className="mt-1 mb-0">{feedback.notes}</p>
                      )}
                    </div>
                  ))}
                </Card.Body>
              </Card>
            )
          ))}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowApplicantsModal(false)}>
            Close
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Feedback Modal */}
      <Modal show={showFeedbackModal} onHide={() => setShowFeedbackModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Submit Feedback</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            <Form.Group className="mb-3">
              <Form.Label>Verdict *</Form.Label>
              <Form.Select
                value={feedbackData.verdict}
                onChange={(e) => setFeedbackData({ ...feedbackData, verdict: e.target.value })}
              >
                <option value="good">Good Match</option>
                <option value="bad">Bad Match</option>
              </Form.Select>
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Notes</Form.Label>
              <Form.Control
                as="textarea"
                rows={4}
                value={feedbackData.notes}
                onChange={(e) => setFeedbackData({ ...feedbackData, notes: e.target.value })}
                placeholder="Add any notes about this candidate..."
              />
            </Form.Group>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowFeedbackModal(false)}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSubmitFeedback} disabled={loading}>
            {loading ? 'Submitting...' : 'Submit Feedback'}
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
}

export default RecruiterPortal;
