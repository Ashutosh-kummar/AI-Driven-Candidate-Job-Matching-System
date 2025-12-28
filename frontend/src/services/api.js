import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Jobs API
export const jobsAPI = {
  getAll: () => api.get('/jobs'),
  getById: (id) => api.get(`/jobs/${id}`),
  create: (data) => api.post('/jobs', data),
  update: (id, data) => api.put(`/jobs/${id}`, data),
  delete: (id) => api.delete(`/jobs/${id}`),
};

// Resumes API
export const resumesAPI = {
  getAll: () => api.get('/resumes'),
  getById: (id) => api.get(`/resumes/${id}`),
  upload: (formData) => api.post('/resumes/upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  }),
  delete: (id) => api.delete(`/resumes/${id}`),
};

// Matches API
export const matchesAPI = {
  getByJob: (jobId) => api.get(`/matches/job/${jobId}`),
  getByResume: (resumeId) => api.get(`/matches/resume/${resumeId}`),
  getById: (id) => api.get(`/matches/${id}`),
  create: (data) => api.post('/matches', data),
  matchAll: (jobId) => api.post(`/matches/job/${jobId}/match-all`),
  updateFeedback: (id, data) => api.put(`/matches/${id}/feedback`, data),
  delete: (id) => api.delete(`/matches/${id}`),
};

export default api;


