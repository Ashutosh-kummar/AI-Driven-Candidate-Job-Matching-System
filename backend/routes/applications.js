const express = require('express');
const router = express.Router();
const Application = require('../models/Application');
const Job = require('../models/Job');
const Resume = require('../models/Resume');
const Match = require('../models/Match');
const { requireAuth, requireRole } = require('../middleware/auth');
const { matchCandidateToJob } = require('../services/claudeService');

// In-memory map to dedupe concurrent match computations per job-resume pair
const pendingMatches = new Map();

// Get candidate's own applications
router.get('/me', requireAuth, requireRole('candidate'), async (req, res) => {
  try {
    const applications = await Application.find({ candidateId: req.user._id })
      .populate('jobId', 'title company location')
      .populate('resumeId', 'fileName')
      .sort({ createdAt: -1 });

    // Convert to plain objects and ensure jobId is not null to avoid frontend runtime errors
    const safeApplications = applications.map(app => {
      const obj = app.toObject ? app.toObject() : app;
      if (!obj.jobId) {
        obj.jobId = {
          _id: null,
          title: 'No longer available',
          company: '',
          location: '',
        };
        // optional: mark as deleted for UI use
        obj.jobDeleted = true;
      }
      return obj;
    });

    res.json(safeApplications);
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

    // If the candidate already applied, return cached application (existing behavior)
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

    // Check Match collection for an existing match (cache)
    const existingMatch = await Match.findOne({ jobId, resumeId });
    if (existingMatch && !req.body.force) {
      return res.json({
        score: existingMatch.matchScore,
        matchedSkills: existingMatch.matchingSkills || [],
        missingSkills: existingMatch.missingSkills || [],
        highlights: (Array.isArray(existingMatch.highlights) ? existingMatch.highlights : (existingMatch.highlights ? [existingMatch.highlights] : [])),
        reasoningSummary: existingMatch.aiAnalysis || '',
      });
    }
    
    // Dedupe concurrent computations for same job-resume
    const key = `${jobId}_${resumeId}`;
    if (pendingMatches.has(key)) {
      // Await the in-flight computation and return its result when done
      const result = await pendingMatches.get(key);
      return res.json({
        score: result.score,
        matchedSkills: result.matchedSkills || [],
        missingSkills: result.missingSkills || [],
        highlights: result.highlights || [],
        reasoningSummary: result.reasoningSummary || '',
      });
    }

    // Start computation and store promise in pending map
    const computationPromise = (async () => {
      try {
        // Get feedback summary for this job (if any) — existing behavior
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

        // Call matching service (AI)
        const matchResult = await matchCandidateToJob({
          job,
          resumeText: resume.resumeText,
          feedbackSummary,
        });

        // Persist to Match collection for future reuse (non-destructive)
        const newMatch = new Match({
          jobId,
          resumeId,
          matchScore: matchResult.score || 0,
          matchingSkills: matchResult.matchedSkills || [],
          missingSkills: matchResult.missingSkills || [],
          aiAnalysis: matchResult.reasoningSummary || '',
          highlightedText: Array.isArray(matchResult.highlights) ? matchResult.highlights.join('\n\n') : (matchResult.highlights || ''),
        });
        await newMatch.save();

        return matchResult;
      } finally {
        // cleanup is handled by outer finally when promise resolves/rejects
      }
    })();

    pendingMatches.set(key, computationPromise);

    try {
      const matchResult = await computationPromise;
      return res.json(matchResult);
    } finally {
      pendingMatches.delete(key);
    }
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

