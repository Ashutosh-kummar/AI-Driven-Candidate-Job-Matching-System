import React, { useState, useEffect } from 'react';
import { Container, Card, Form, Button, Table, Alert, Badge, Modal, ListGroup, Spinner } from 'react-bootstrap';
import { resumesAPI, jobsAPI, applicationsAPI } from '../services/api';

function CandidatePortal() {
  const [resumes, setResumes] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [applications, setApplications] = useState([]);
  const [selectedJob, setSelectedJob] = useState(null);
  const [showJobModal, setShowJobModal] = useState(false);
  const [showMatchModal, setShowMatchModal] = useState(false);
  const [matchResult, setMatchResult] = useState(null);
  const [selectedResumeId, setSelectedResumeId] = useState('');
  const [formData, setFormData] = useState({
    resume: null,
  });
  const [loading, setLoading] = useState(false);
  // Job-specific processing state: { [jobId]: true }
  const [processingJobs, setProcessingJobs] = useState({});
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    loadResumes();
    loadJobs();
    loadApplications();
  }, []);

  const loadResumes = async () => {
    try {
      const response = await resumesAPI.getAll();
      setResumes(response.data);
      // Set latest resume as selected by default
      if (response.data.length > 0 && !selectedResumeId) {
        setSelectedResumeId(response.data[0]._id);
      }
    } catch (err) {
      setError('Failed to load resumes: ' + err.message);
    }
  };

  const loadJobs = async () => {
    try {
      const response = await jobsAPI.getAll();
      setJobs(response.data);
    } catch (err) {
      setError('Failed to load jobs: ' + err.message);
    }
  };

  const loadApplications = async () => {
    try {
      const response = await applicationsAPI.getMyApplications();
      // Ensure only applications with a valid populated job are kept (defensive)
      const validApps = (response.data || []).filter(app => app && app.jobId && app.jobId._id);
      setApplications(validApps);
    } catch (err) {
      // Not critical if this fails
      console.error('Failed to load applications:', err);
    }
  };

  const handleFileChange = (e) => {
    setFormData({ ...formData, resume: e.target.files[0] });
  };

  const handleUploadResume = async (e) => {
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
    uploadData.append('resume', formData.resume);

    try {
      await resumesAPI.upload(uploadData);
      setSuccess('Resume uploaded successfully!');
      setFormData({ resume: null });
      document.getElementById('resumeFile').value = '';
      loadResumes();
    } catch (err) {
      setError('Failed to upload resume: ' + (err.response?.data?.error || err.message));
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteResume = async (resumeId) => {
    if (window.confirm('Are you sure you want to delete this resume?')) {
      try {
        await resumesAPI.delete(resumeId);
        loadResumes();
        if (selectedResumeId === resumeId) {
          setSelectedResumeId(resumes.length > 1 ? resumes.find(r => r._id !== resumeId)?._id || '' : '');
        }
      } catch (err) {
        setError('Failed to delete resume: ' + err.message);
      }
    }
  };

  const handleViewJob = (job) => {
    setSelectedJob(job);
    setShowJobModal(true);
  };

  const isProcessing = (jobId) => !!(jobId && processingJobs[jobId]);

  const startProcessing = (jobId) => {
    if (!jobId) return;
    setProcessingJobs(prev => ({ ...prev, [jobId]: true }));
  };

  const stopProcessing = (jobId) => {
    if (!jobId) return;
    setProcessingJobs(prev => {
      const copy = { ...prev };
      delete copy[jobId];
      return copy;
    });
  };

  const handleGetMatchScore = async (job) => {
    if (!selectedResumeId) {
      setError('Please select a resume first');
      return;
    }

    // mark only this job as processing (don't toggle global loading)
    startProcessing(job._id);
    setError('');
    try {
      const response = await applicationsAPI.getMatchScore({
        jobId: job._id,
        resumeId: selectedResumeId,
      });
      setMatchResult({ ...response.data, job });
      setShowMatchModal(true);
    } catch (err) {
      setError('Failed to get match score: ' + (err.response?.data?.error || err.message));
    } finally {
      stopProcessing(job._id);
    }
  };

  const handleApply = async (job) => {
    if (!selectedResumeId) {
      setError('Please select a resume first');
      return;
    }

    if (!window.confirm(`Apply to ${job.title} at ${job.company}?`)) {
      return;
    }

    // mark only this job as processing to avoid global UI blocking
    startProcessing(job._id);
    setError('');
    try {
      await applicationsAPI.apply({
        jobId: job._id,
        resumeId: selectedResumeId,
      });
      setSuccess('Application submitted successfully!');
      loadApplications();
      setShowMatchModal(false);
    } catch (err) {
      setError('Failed to apply: ' + (err.response?.data?.error || err.message));
    } finally {
      stopProcessing(job._id);
    }
  };

  return (
    <Container>
      <h1 className="mb-4">Candidate Dashboard</h1>

      {error && <Alert variant="danger" dismissible onClose={() => setError('')}>{error}</Alert>}
      {success && <Alert variant="success" dismissible onClose={() => setSuccess('')}>{success}</Alert>}

      {/* Resume Upload Section */}
      <Card className="mb-4">
        <Card.Header>
          <h3>Upload Resume</h3>
        </Card.Header>
        <Card.Body>
          <Form onSubmit={handleUploadResume}>
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

          {resumes.length > 0 && (
            <div className="mt-3">
              <Form.Label>Select Resume for Matching:</Form.Label>
              <Form.Select
                value={selectedResumeId}
                onChange={(e) => setSelectedResumeId(e.target.value)}
              >
                {resumes.map((resume) => (
                  <option key={resume._id} value={resume._id}>
                    {resume.fileName} ({new Date(resume.createdAt).toLocaleDateString()})
                  </option>
                ))}
              </Form.Select>
            </div>
          )}
        </Card.Body>
      </Card>

      {/* My Resumes Section */}
      {resumes.length > 0 && (
        <Card className="mb-4">
          <Card.Header>
            <h3>My Resumes</h3>
          </Card.Header>
          <Card.Body>
            <Table responsive striped hover>
              <thead>
                <tr>
                  <th>File Name</th>
                  <th>Uploaded</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {resumes.map((resume) => (
                  <tr key={resume._id}>
                    <td>{resume.fileName}</td>
                    <td>{new Date(resume.createdAt).toLocaleDateString()}</td>
                    <td>
                      <Button
                        size="sm"
                        variant="danger"
                        onClick={() => handleDeleteResume(resume._id)}
                      >
                        Delete
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </Card.Body>
        </Card>
      )}

      {/* Jobs List Section */}
      <Card className="mb-4">
        <Card.Header>
          <h3>Available Jobs</h3>
        </Card.Header>
        <Card.Body>
          {jobs.length === 0 ? (
            <p className="text-muted">No jobs available at the moment.</p>
          ) : (
            <Table responsive striped hover>
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Company</th>
                  <th>Location</th>
                  <th>Skills</th>
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
                    <td>
                      <Button
                        size="sm"
                        variant="info"
                        onClick={() => handleViewJob(job)}
                        className="me-2"
                      >
                        View
                      </Button>
                      {selectedResumeId && (
                        <>
                          <Button
                            size="sm"
                            variant="warning"
                            onClick={() => handleGetMatchScore(job)}
                            disabled={loading || isProcessing(job._id)}
                            className="me-2"
                          >
                            {isProcessing(job._id) ? (
                              <>
                                <Spinner animation="border" size="sm" role="status" className="me-2" />
                                Processing...
                              </>
                            ) : (
                              'Get Match Score'
                            )}
                          </Button>
                          {!applications.find(app => app.jobId?._id === job._id) && (
                            <Button
                              size="sm"
                              variant="success"
                              onClick={() => handleApply(job)}
                              disabled={loading || isProcessing(job._id)}
                            >
                              Apply
                            </Button>
                          )}
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </Card.Body>
      </Card>

      {/* My Applications Section */}
      <Card>
        <Card.Header>
          <h3>My Applications</h3>
        </Card.Header>
        <Card.Body>
          {applications.length === 0 ? (
            <p className="text-muted">You haven't applied to any jobs yet.</p>
          ) : (
            <Table responsive striped hover>
              <thead>
                <tr>
                  <th>Job Title</th>
                  <th>Company</th>
                  <th>Applied Date</th>
                  <th>Match Score</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {applications.map((app) => (
                  <tr key={app._id}>
                    <td>{app.jobId?.title || 'N/A'}</td>
                    <td>{app.jobId?.company || 'N/A'}</td>
                    <td>{new Date(app.createdAt).toLocaleDateString()}</td>
                    <td>
                      <Badge bg={app.matchScore >= 70 ? 'success' : app.matchScore >= 50 ? 'warning' : 'danger'}>
                        {app.matchScore}%
                      </Badge>
                    </td>
                    <td>
                      <Badge bg="info">{app.status}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </Card.Body>
      </Card>

      {/* Job Details Modal */}
      <Modal show={showJobModal} onHide={() => setShowJobModal(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>{selectedJob?.title}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedJob && (
            <>
              <p><strong>Company:</strong> {selectedJob.company}</p>
              <p><strong>Location:</strong> {selectedJob.location || 'N/A'}</p>
              <div className="mb-3">
                <strong>Required Skills:</strong>
                <div className="mt-2">
                  {selectedJob.skillsRequired?.map((skill, idx) => (
                    <Badge key={idx} bg="secondary" className="me-1">
                      {skill}
                    </Badge>
                  ))}
                </div>
              </div>
              <div>
                <strong>Description:</strong>
                <p className="mt-2">{selectedJob.description}</p>
              </div>
            </>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowJobModal(false)}>
            Close
          </Button>
          {selectedResumeId && selectedJob && (
            <>
              <Button
                variant="warning"
                onClick={() => {
                  setShowJobModal(false);
                  handleGetMatchScore(selectedJob);
                }}
              >
                Get Match Score
              </Button>
              {!applications.find(app => app.jobId?._id === selectedJob._id) && (
                <Button
                  variant="success"
                  onClick={() => {
                    setShowJobModal(false);
                    handleApply(selectedJob);
                  }}
                >
                  Apply
                </Button>
              )}
            </>
          )}
        </Modal.Footer>
      </Modal>

      {/* Match Score Modal */}
      <Modal show={showMatchModal} onHide={() => setShowMatchModal(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>Match Score - {matchResult?.job?.title}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {matchResult && (
            <>
              <div className="text-center mb-4">
                <h2>
                  <Badge bg={matchResult.score >= 70 ? 'success' : matchResult.score >= 50 ? 'warning' : 'danger'} style={{ fontSize: '2rem' }}>
                    {matchResult.score}%
                  </Badge>
                </h2>
                <p className="text-muted">Match Score</p>
              </div>

              {matchResult.reasoningSummary && (
                <div className="mb-3">
                  <strong>Analysis:</strong>
                  <p>{matchResult.reasoningSummary}</p>
                </div>
              )}

              {matchResult.matchedSkills && matchResult.matchedSkills.length > 0 && (
                <div className="mb-3">
                  <strong>Matched Skills:</strong>
                  <div className="mt-2">
                    {matchResult.matchedSkills.map((skill, idx) => (
                      <Badge key={idx} bg="success" className="me-1">
                        {skill}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {matchResult.missingSkills && matchResult.missingSkills.length > 0 && (
                <div className="mb-3">
                  <strong>Missing Skills:</strong>
                  <div className="mt-2">
                    {matchResult.missingSkills.map((skill, idx) => (
                      <Badge key={idx} bg="danger" className="me-1">
                        {skill}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {matchResult.highlights && matchResult.highlights.length > 0 && (
                <div className="mb-3">
                  <strong>Highlights:</strong>
                  <ListGroup className="mt-2">
                    {matchResult.highlights.map((highlight, idx) => (
                      <ListGroup.Item key={idx}>{highlight}</ListGroup.Item>
                    ))}
                  </ListGroup>
                </div>
              )}
            </>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowMatchModal(false)}>
            Close
          </Button>
          {matchResult && !applications.find(app => app.jobId?._id === matchResult.job?._id) && (
            <Button
              variant="success"
              onClick={() => handleApply(matchResult.job)}
              disabled={loading || isProcessing(matchResult.job?._id)}
            >
              {isProcessing(matchResult.job?._id) ? (
                <>
                  <Spinner animation="border" size="sm" role="status" className="me-2" />
                  Processing...
                </>
              ) : (
                'Apply Now'
              )}
            </Button>
          )}
        </Modal.Footer>
      </Modal>
    </Container>
  );
}

export default CandidatePortal;
