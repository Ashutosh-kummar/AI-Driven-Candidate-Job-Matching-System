const express = require('express');
const router = express.Router();
const Match = require('../models/Match');
const Job = require('../models/Job');
const Resume = require('../models/Resume');
const { matchResumeToJob } = require('../services/claudeService');

// Get all matches for a job
router.get('/job/:jobId', async (req, res) => {
  try {
    const matches = await Match.find({ jobId: req.params.jobId })
      .populate('resumeId')
      .sort({ matchScore: -1 });
    res.json(matches);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get all matches for a resume
router.get('/resume/:resumeId', async (req, res) => {
  try {
    const matches = await Match.find({ resumeId: req.params.resumeId })
      .populate('jobId')
      .sort({ matchScore: -1 });
    res.json(matches);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get single match
router.get('/:id', async (req, res) => {
  try {
    const match = await Match.findById(req.params.id)
      .populate('jobId')
      .populate('resumeId');
    if (!match) {
      return res.status(404).json({ error: 'Match not found' });
    }
    res.json(match);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create match (AI matching)
router.post('/', async (req, res) => {
  try {
    const { jobId, resumeId } = req.body;

    const job = await Job.findById(jobId);
    const resume = await Resume.findById(resumeId);

    if (!job || !resume) {
      return res.status(404).json({ error: 'Job or Resume not found' });
    }

    // Check if match already exists
    const existingMatch = await Match.findOne({ jobId, resumeId });
    if (existingMatch) {
      return res.json(existingMatch);
    }

    // Use Claude API to match
    const matchResult = await matchResumeToJob(
      resume.extractedText || resume.fileName,
      job.description,
      job.requirements,
      job.skills
    );

    const match = new Match({
      jobId,
      resumeId,
      ...matchResult,
    });

    await match.save();
    
    // Populate before sending
    await match.populate('jobId');
    await match.populate('resumeId');
    
    res.status(201).json(match);
  } catch (error) {
    console.error('Match creation error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Match all resumes to a job
router.post('/job/:jobId/match-all', async (req, res) => {
  try {
    const job = await Job.findById(req.params.jobId);
    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }

    const resumes = await Resume.find();
    const matches = [];

    for (const resume of resumes) {
      try {
        // Check if match already exists
        const existingMatch = await Match.findOne({ 
          jobId: req.params.jobId, 
          resumeId: resume._id 
        });

        if (existingMatch) {
          matches.push(existingMatch);
          continue;
        }

        // Create new match
        const matchResult = await matchResumeToJob(
          resume.extractedText || resume.fileName,
          job.description,
          job.requirements,
          job.skills
        );

        const match = new Match({
          jobId: req.params.jobId,
          resumeId: resume._id,
          ...matchResult,
        });

        await match.save();
        matches.push(match);
      } catch (error) {
        console.error(`Error matching resume ${resume._id}:`, error);
        // Continue with other resumes
      }
    }

    // Populate all matches
    const populatedMatches = await Match.find({ jobId: req.params.jobId })
      .populate('resumeId')
      .sort({ matchScore: -1 });

    res.json(populatedMatches);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update match with recruiter feedback
router.put('/:id/feedback', async (req, res) => {
  try {
    const { feedback, feedbackScore } = req.body;
    
    const match = await Match.findByIdAndUpdate(
      req.params.id,
      {
        recruiterFeedback: feedback || '',
        feedbackScore: feedbackScore || null,
      },
      { new: true, runValidators: true }
    )
      .populate('jobId')
      .populate('resumeId');

    if (!match) {
      return res.status(404).json({ error: 'Match not found' });
    }

    res.json(match);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Delete match
router.delete('/:id', async (req, res) => {
  try {
    const match = await Match.findByIdAndDelete(req.params.id);
    if (!match) {
      return res.status(404).json({ error: 'Match not found' });
    }
    res.json({ message: 'Match deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;


