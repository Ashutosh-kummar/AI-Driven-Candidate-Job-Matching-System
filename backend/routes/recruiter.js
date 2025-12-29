const express = require('express');
const router = express.Router();
const Job = require('../models/Job');
const Application = require('../models/Application');
const Feedback = require('../models/Feedback');
const User = require('../models/User');
const { requireAuth, requireRole } = require('../middleware/auth');

// Get recruiter's own jobs
router.get('/jobs', requireAuth, requireRole('recruiter'), async (req, res) => {
  try {
    const jobs = await Job.find({ recruiterId: req.user._id }).sort({ createdAt: -1 });
    res.json(jobs);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get applicants for a specific job
router.get('/jobs/:jobId/applications', requireAuth, requireRole('recruiter'), async (req, res) => {
  try {
    // Verify job belongs to recruiter
    const job = await Job.findById(req.params.jobId);
    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }
    if (job.recruiterId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'You can only view applicants for your own jobs' });
    }

    // Get applications sorted by match score
    const applications = await Application.find({ jobId: req.params.jobId })
      .populate('candidateId', 'name email')
      .populate('resumeId', 'fileName')
      .sort({ matchScore: -1 });

    // Get feedback for each candidate
    const applicationsWithFeedback = await Promise.all(
      applications.map(async (app) => {
        const feedbacks = await Feedback.find({
          jobId: req.params.jobId,
          candidateId: app.candidateId._id,
        }).sort({ createdAt: -1 });
        return {
          ...app.toObject(),
          feedbacks,
        };
      })
    );

    res.json(applicationsWithFeedback);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;


