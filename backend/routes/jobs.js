const express = require('express');
const router = express.Router();
const Job = require('../models/Job');
const { requireAuth, requireRole } = require('../middleware/auth');

// Get all jobs (public for candidates, but can be filtered)
router.get('/', requireAuth, async (req, res) => {
  try {
    const jobs = await Job.find().sort({ createdAt: -1 });
    res.json(jobs);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get single job
router.get('/:id', async (req, res) => {
  try {
    const job = await Job.findById(req.params.id);
    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }
    res.json(job);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create new job (recruiter only)
router.post('/', requireAuth, requireRole('recruiter'), async (req, res) => {
  try {
    const { title, description, requirements, skills, company, location } = req.body;
    
    const job = new Job({
      title,
      description,
      requirements: Array.isArray(requirements) ? requirements : requirements?.split(',').map(r => r.trim()) || [],
      skillsRequired: Array.isArray(skills) ? skills : skills?.split(',').map(s => s.trim()) || [],
      company,
      location,
      recruiterId: req.user._id,
    });

    await job.save();
    res.status(201).json(job);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Update job (recruiter only, own jobs)
router.put('/:id', requireAuth, requireRole('recruiter'), async (req, res) => {
  try {
    const job = await Job.findById(req.params.id);
    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }
    if (job.recruiterId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'You can only update your own jobs' });
    }
    
    const updatedJob = await Job.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    res.json(updatedJob);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Delete job (recruiter only, own jobs)
router.delete('/:id', requireAuth, requireRole('recruiter'), async (req, res) => {
  try {
    const job = await Job.findById(req.params.id);
    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }
    if (job.recruiterId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'You can only delete your own jobs' });
    }
    
    await Job.findByIdAndDelete(req.params.id);
    res.json({ message: 'Job deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get recruiter's own jobs
router.get('/recruiter/my-jobs', requireAuth, requireRole('recruiter'), async (req, res) => {
  try {
    const jobs = await Job.find({ recruiterId: req.user._id }).sort({ createdAt: -1 });
    res.json(jobs);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;


