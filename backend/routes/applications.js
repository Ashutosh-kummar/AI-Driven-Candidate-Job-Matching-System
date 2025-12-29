const express = require('express');
const router = express.Router();
const Application = require('../models/Application');
const Job = require('../models/Job');
const Resume = require('../models/Resume');
const { requireAuth, requireRole } = require('../middleware/auth');
const { matchCandidateToJob } = require('../services/claudeService');

// Get candidate's own applications
router.get('/me', requireAuth, requireRole('candidate'), async (req, res) => {
  try {
    const applications = await Application.find({ candidateId: req.user._id })
      .populate('jobId', 'title company location')
      .populate('resumeId', 'fileName')
      .sort({ createdAt: -1 });
    res.json(applications);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get match score for a job (candidate only)
router.post('/match/score', requireAuth, requireRole('candidate'), async (req, res) => {
  try {
    const { jobId, resumeId } = req.body;

    if (!jobId || !resumeId) {
      return res.status(400).json({ error: 'jobId and resumeId are required' });
    }

    const job = await Job.findById(jobId);
    const resume = await Resume.findById(resumeId);

    if (!job || !resume) {
      return res.status(404).json({ error: 'Job or Resume not found' });
    }

    // Check if resume belongs to candidate
    if (resume.candidateId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'You can only use your own resumes' });
    }

    // Check if application already exists (for caching)
    const existingApp = await Application.findOne({ jobId, candidateId: req.user._id });
    if (existingApp && !req.body.force) {
      return res.json({
        score: existingApp.matchScore,
        matchedSkills: existingApp.matchedSkills,
        missingSkills: existingApp.missingSkills,
        highlights: existingApp.highlights,
        reasoningSummary: existingApp.highlights.join(' '),
      });
    }

    // Get feedback summary for this job (if any)
    const Feedback = require('../models/Feedback');
    const feedbacks = await Feedback.find({ jobId })
      .sort({ createdAt: -1 })
      .limit(10)
      .populate('candidateId', 'name');
    
    let feedbackSummary = '';
    if (feedbacks.length > 0) {
      const feedbackTexts = feedbacks.map(f => 
        `Recruiter ${f.verdict === 'good' ? 'accepted' : 'rejected'} candidate: ${f.notes || 'No notes'}`
      );
      feedbackSummary = feedbackTexts.join('\n');
    }

    // Call matching service
    const matchResult = await matchCandidateToJob({
      job,
      resumeText: resume.resumeText,
      feedbackSummary,
    });

    res.json(matchResult);
  } catch (error) {
    console.error('Match score error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Apply to a job (candidate only)
router.post('/apply', requireAuth, requireRole('candidate'), async (req, res) => {
  try {
    const { jobId, resumeId } = req.body;

    if (!jobId || !resumeId) {
      return res.status(400).json({ error: 'jobId and resumeId are required' });
    }

    // Check if already applied
    const existingApp = await Application.findOne({ jobId, candidateId: req.user._id });
    if (existingApp) {
      return res.status(400).json({ error: 'You have already applied to this job' });
    }

    const job = await Job.findById(jobId);
    const resume = await Resume.findById(resumeId);

    if (!job || !resume) {
      return res.status(404).json({ error: 'Job or Resume not found' });
    }

    // Check if resume belongs to candidate
    if (resume.candidateId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'You can only use your own resumes' });
    }

    // Get feedback summary for this job (if any)
    const Feedback = require('../models/Feedback');
    const feedbacks = await Feedback.find({ jobId })
      .sort({ createdAt: -1 })
      .limit(10);
    
    let feedbackSummary = '';
    if (feedbacks.length > 0) {
      const feedbackTexts = feedbacks.map(f => 
        `Recruiter ${f.verdict === 'good' ? 'accepted' : 'rejected'} candidate: ${f.notes || 'No notes'}`
      );
      feedbackSummary = feedbackTexts.join('\n');
    }

    // Calculate match score
    const matchResult = await matchCandidateToJob({
      job,
      resumeText: resume.resumeText,
      feedbackSummary,
    });

    // Create application
    const application = new Application({
      jobId,
      candidateId: req.user._id,
      resumeId,
      matchScore: matchResult.score,
      matchedSkills: matchResult.matchedSkills,
      missingSkills: matchResult.missingSkills,
      highlights: matchResult.highlights,
      status: 'applied',
    });

    await application.save();
    
    // Populate before sending
    await application.populate('jobId', 'title company location');
    await application.populate('resumeId', 'fileName');
    
    res.status(201).json(application);
  } catch (error) {
    console.error('Apply error:', error);
    if (error.code === 11000) {
      return res.status(400).json({ error: 'You have already applied to this job' });
    }
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;

