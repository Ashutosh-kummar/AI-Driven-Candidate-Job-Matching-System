const express = require('express');
const router = express.Router();
const Feedback = require('../models/Feedback');
const Application = require('../models/Application');
const { requireAuth, requireRole } = require('../middleware/auth');

// Submit feedback (recruiter only)
router.post('/', requireAuth, requireRole('recruiter'), async (req, res) => {
  try {
    const { jobId, candidateId, verdict, notes } = req.body;

    if (!jobId || !candidateId || !verdict) {
      return res.status(400).json({ error: 'jobId, candidateId, and verdict are required' });
    }

    if (verdict !== 'good' && verdict !== 'bad') {
      return res.status(400).json({ error: 'verdict must be either "good" or "bad"' });
    }

    // Verify job belongs to recruiter
    const Job = require('../models/Job');
    const job = await Job.findById(jobId);
    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }
    if (job.recruiterId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'You can only provide feedback for your own jobs' });
    }

    // Check if candidate has applied
    const application = await Application.findOne({ jobId, candidateId });
    if (!application) {
      return res.status(400).json({ error: 'Candidate has not applied to this job' });
    }

    // Create feedback
    const feedback = new Feedback({
      jobId,
      candidateId,
      recruiterId: req.user._id,
      verdict,
      notes: notes || '',
    });

    await feedback.save();
    
    // Populate before sending
    await feedback.populate('candidateId', 'name email');
    
    res.status(201).json(feedback);
  } catch (error) {
    console.error('Feedback creation error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get feedback for a job (recruiter only)
router.get('/job/:jobId', requireAuth, requireRole('recruiter'), async (req, res) => {
  try {
    // Verify job belongs to recruiter
    const Job = require('../models/Job');
    const job = await Job.findById(req.params.jobId);
    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }
    if (job.recruiterId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'You can only view feedback for your own jobs' });
    }

    const feedbacks = await Feedback.find({ jobId: req.params.jobId })
      .populate('candidateId', 'name email')
      .sort({ createdAt: -1 });
    
    res.json(feedbacks);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;

