import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests if available
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Handle 401 errors (unauthorized)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

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

// Auth API
export const authAPI = {
  signup: (data) => api.post('/auth/signup', data),
  login: (data) => api.post('/auth/login', data),
  getMe: () => api.get('/auth/me'),
};

// Applications API
export const applicationsAPI = {
  getMyApplications: () => api.get('/applications/me'),
  getMatchScore: (data) => api.post('/applications/match/score', data),
  apply: (data) => api.post('/applications/apply', data),
};

// Feedback API
export const feedbackAPI = {
  create: (data) => api.post('/feedback', data),
  getByJob: (jobId) => api.get(`/feedback/job/${jobId}`),
};

// Recruiter API
export const recruiterAPI = {
  getMyJobs: () => api.get('/recruiter/jobs'),
  getJobApplications: (jobId) => api.get(`/recruiter/jobs/${jobId}/applications`),
};

export default api;


