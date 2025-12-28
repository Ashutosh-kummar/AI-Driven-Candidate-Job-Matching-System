import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Button, Form, Table, Badge, Alert } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { jobsAPI, matchesAPI } from '../services/api';

function RecruiterPortal() {
  const [jobs, setJobs] = useState([]);
  const [showJobForm, setShowJobForm] = useState(false);
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
  const navigate = useNavigate();

  useEffect(() => {
    loadJobs();
  }, []);

  const loadJobs = async () => {
    try {
      const response = await jobsAPI.getAll();
      setJobs(response.data);
    } catch (err) {
      setError('Failed to load jobs: ' + err.message);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await jobsAPI.create(formData);
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
      setError('Failed to create job: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleMatchAll = async (jobId) => {
    setLoading(true);
    setError('');

    try {
      await matchesAPI.matchAll(jobId);
      navigate(`/job/${jobId}/matches`);
    } catch (err) {
      setError('Failed to match candidates: ' + err.message);
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
      <h1 className="mb-4">Recruiter Portal</h1>

      {error && <Alert variant="danger" dismissible onClose={() => setError('')}>{error}</Alert>}

      <Card className="form-container">
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
                      {job.skills.slice(0, 3).map((skill, idx) => (
                        <Badge key={idx} bg="secondary" className="me-1">
                          {skill}
                        </Badge>
                      ))}
                      {job.skills.length > 3 && '...'}
                    </td>
                    <td>{new Date(job.createdAt).toLocaleDateString()}</td>
                    <td>
                      <Button
                        size="sm"
                        variant="success"
                        onClick={() => handleMatchAll(job._id)}
                        disabled={loading}
                        className="me-2"
                      >
                        Match Candidates
                      </Button>
                      <Button
                        size="sm"
                        variant="info"
                        onClick={() => navigate(`/job/${job._id}/matches`)}
                        className="me-2"
                      >
                        View Matches
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
    </Container>
  );
}

export default RecruiterPortal;


