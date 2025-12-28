import React, { useState, useEffect } from 'react';
import { Container, Card, Form, Button, Table, Alert, Badge } from 'react-bootstrap';
import { resumesAPI, matchesAPI } from '../services/api';

function CandidatePortal() {
  const [resumes, setResumes] = useState([]);
  const [formData, setFormData] = useState({
    candidateName: '',
    email: '',
    resume: null,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    loadResumes();
  }, []);

  const loadResumes = async () => {
    try {
      const response = await resumesAPI.getAll();
      setResumes(response.data);
    } catch (err) {
      setError('Failed to load resumes: ' + err.message);
    }
  };

  const handleFileChange = (e) => {
    setFormData({ ...formData, resume: e.target.files[0] });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    if (!formData.resume) {
      setError('Please select a resume file');
      setLoading(false);
      return;
    }

    const uploadData = new FormData();
    uploadData.append('candidateName', formData.candidateName);
    uploadData.append('email', formData.email);
    uploadData.append('resume', formData.resume);

    try {
      await resumesAPI.upload(uploadData);
      setSuccess('Resume uploaded successfully!');
      setFormData({
        candidateName: '',
        email: '',
        resume: null,
      });
      document.getElementById('resumeFile').value = '';
      loadResumes();
    } catch (err) {
      setError('Failed to upload resume: ' + (err.response?.data?.error || err.message));
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (resumeId) => {
    if (window.confirm('Are you sure you want to delete this resume?')) {
      try {
        await resumesAPI.delete(resumeId);
        loadResumes();
      } catch (err) {
        setError('Failed to delete resume: ' + err.message);
      }
    }
  };

  return (
    <Container>
      <h1 className="mb-4">Candidate Portal</h1>

      {error && <Alert variant="danger" dismissible onClose={() => setError('')}>{error}</Alert>}
      {success && <Alert variant="success" dismissible onClose={() => setSuccess('')}>{success}</Alert>}

      <Card className="form-container">
        <Card.Header>
          <h3>Upload Resume</h3>
        </Card.Header>
        <Card.Body>
          <Form onSubmit={handleSubmit}>
            <Form.Group className="mb-3">
              <Form.Label>Full Name *</Form.Label>
              <Form.Control
                type="text"
                value={formData.candidateName}
                onChange={(e) => setFormData({ ...formData, candidateName: e.target.value })}
                required
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Email *</Form.Label>
              <Form.Control
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Resume File (PDF, DOC, DOCX, TXT) *</Form.Label>
              <Form.Control
                id="resumeFile"
                type="file"
                accept=".pdf,.doc,.docx,.txt"
                onChange={handleFileChange}
                required
              />
              <Form.Text className="text-muted">
                Maximum file size: 10MB
              </Form.Text>
            </Form.Group>

            <Button type="submit" variant="primary" disabled={loading}>
              {loading ? 'Uploading...' : 'Upload Resume'}
            </Button>
          </Form>
        </Card.Body>
      </Card>

      <Card>
        <Card.Header>
          <h3>Uploaded Resumes</h3>
        </Card.Header>
        <Card.Body>
          {resumes.length === 0 ? (
            <p className="text-muted">No resumes uploaded yet.</p>
          ) : (
            <Table responsive striped hover>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>File Name</th>
                  <th>Uploaded</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {resumes.map((resume) => (
                  <tr key={resume._id}>
                    <td>{resume.candidateName}</td>
                    <td>{resume.email}</td>
                    <td>{resume.fileName}</td>
                    <td>{new Date(resume.uploadedAt).toLocaleDateString()}</td>
                    <td>
                      <Button
                        size="sm"
                        variant="danger"
                        onClick={() => handleDelete(resume._id)}
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

export default CandidatePortal;

