# AI-Driven Candidate-Job Matching System

An intelligent recruitment platform that uses Claude AI to automatically match candidate resumes with job postings, providing detailed match scores, skill analysis, and recruiter feedback capabilities.

## Features

- **Recruiter Portal**: Post job openings with detailed descriptions, requirements, and required skills
- **Candidate Portal**: Upload resumes (PDF, DOC, DOCX, TXT) with candidate information
- **AI-Powered Matching**: Uses Claude API to analyze resumes against job descriptions and rank candidates
- **Match Scoring**: Provides 0-100 match scores with detailed analysis
- **Skill Highlighting**: Automatically identifies matching and missing skills
- **Recruiter Feedback**: Allows recruiters to provide feedback to refine AI matching
- **Match Ranking Table**: Displays candidates ranked by match score with detailed insights

## Technologies

### Frontend
- React.js 18.2.0
- React Router DOM 6.16.0
- Bootstrap 5.3.1
- React Bootstrap 2.8.0
- Axios 1.5.0

### Backend
- Node.js
- Express.js 4.18.2
- MongoDB with Mongoose 7.5.0
- Multer 1.4.5 (file uploads)
- Claude API (@anthropic-ai/sdk 0.9.1)
- PDF-Parse 1.1.1 (resume text extraction)

## Project Structure

```
AI_Resume/
├── backend/
│   ├── models/
│   │   ├── Job.js
│   │   ├── Resume.js
│   │   └── Match.js
│   ├── routes/
│   │   ├── jobs.js
│   │   ├── resumes.js
│   │   └── matches.js
│   ├── services/
│   │   └── claudeService.js
│   ├── utils/
│   │   └── pdfParser.js
│   ├── uploads/
│   ├── server.js
│   ├── package.json
│   └── .env.example
├── frontend/
│   ├── public/
│   │   └── index.html
│   ├── src/
│   │   ├── components/
│   │   │   ├── RecruiterPortal.js
│   │   │   ├── CandidatePortal.js
│   │   │   └── JobMatches.js
│   │   ├── services/
│   │   │   └── api.js
│   │   ├── App.js
│   │   ├── App.css
│   │   ├── index.js
│   │   └── index.css
│   ├── package.json
│   └── .gitignore
└── README.md
```

## Setup Instructions

### Prerequisites

- Node.js (v14 or higher)
- MongoDB (local installation or MongoDB Atlas account)
- Claude API Key (from Anthropic)

### Backend Setup

1. Navigate to the backend directory:
```bash
cd backend
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file in the backend directory:
```bash
cp .env.example .env
```

4. Update the `.env` file with your configuration:
```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/ai_resume_matching
CLAUDE_API_KEY=your_claude_api_key_here
NODE_ENV=development
```

5. Make sure MongoDB is running on your system.

6. Start the backend server:
```bash
npm start
# or for development with auto-reload:
npm run dev
```

The backend server will run on `http://localhost:5000`

### Frontend Setup

1. Navigate to the frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file in the frontend directory (optional, defaults to localhost:5000):
```env
REACT_APP_API_URL=http://localhost:5000/api
```

4. Start the React development server:
```bash
npm start
```

The frontend will run on `http://localhost:3000`

## Usage

### For Recruiters

1. Navigate to the **Recruiter Portal** from the home page
2. Click **"Post New Job"** to create a job posting
3. Fill in the job details:
   - Job Title
   - Company Name
   - Location
   - Job Description
   - Requirements (comma-separated)
   - Required Skills (comma-separated)
4. Click **"Post Job"** to save the job
5. Click **"Match Candidates"** to run AI matching against all uploaded resumes
6. View the **Match Results** table with ranked candidates
7. Click **"View Details"** on any match to see:
   - Detailed AI analysis
   - Matching and missing skills
   - Highlighted matching text from resume
   - Add recruiter feedback and score

### For Candidates

1. Navigate to the **Candidate Portal** from the home page
2. Fill in your information:
   - Full Name
   - Email Address
   - Upload Resume (PDF, DOC, DOCX, or TXT format)
3. Click **"Upload Resume"** to submit
4. Your resume will be automatically matched against all posted jobs

## API Endpoints

### Jobs
- `GET /api/jobs` - Get all jobs
- `GET /api/jobs/:id` - Get single job
- `POST /api/jobs` - Create new job
- `PUT /api/jobs/:id` - Update job
- `DELETE /api/jobs/:id` - Delete job

### Resumes
- `GET /api/resumes` - Get all resumes
- `GET /api/resumes/:id` - Get single resume
- `POST /api/resumes/upload` - Upload resume (multipart/form-data)
- `DELETE /api/resumes/:id` - Delete resume

### Matches
- `GET /api/matches/job/:jobId` - Get all matches for a job
- `GET /api/matches/resume/:resumeId` - Get all matches for a resume
- `GET /api/matches/:id` - Get single match
- `POST /api/matches` - Create match (job + resume)
- `POST /api/matches/job/:jobId/match-all` - Match all resumes to a job
- `PUT /api/matches/:id/feedback` - Update match with recruiter feedback
- `DELETE /api/matches/:id` - Delete match

## Demo Data

To test the system:

1. **Post a sample job**:
   - Title: "Senior Full Stack Developer"
   - Company: "Tech Corp"
   - Description: "We are looking for an experienced full stack developer..."
   - Skills: "JavaScript, React, Node.js, MongoDB, Express"

2. **Upload sample resumes**:
   - Create PDF or text files with candidate information
   - Include relevant skills and experience
   - Upload through the Candidate Portal

3. **Run matching**:
   - Click "Match Candidates" on the job posting
   - View the ranked results with match scores

## AI Matching Features

The system uses Claude API to:
- Analyze resume content against job descriptions
- Calculate match scores (0-100)
- Identify matching skills from the resume
- Identify missing required skills
- Provide detailed analysis of the match
- Extract and highlight relevant matching text

## Recruiter Feedback

Recruiters can provide feedback on matches to help refine the AI:
- Add text feedback about the match quality
- Provide a feedback score (0-100)
- This data can be used to improve future matching algorithms

## File Upload

- Supported formats: PDF, DOC, DOCX, TXT
- Maximum file size: 10MB
- PDF files are automatically parsed to extract text
- Uploaded files are stored in `backend/uploads/`

## Environment Variables

### Backend (.env)
- `PORT` - Server port (default: 5000)
- `MONGODB_URI` - MongoDB connection string
- `CLAUDE_API_KEY` - Your Claude API key from Anthropic
- `NODE_ENV` - Environment (development/production)

### Frontend (.env)
- `REACT_APP_API_URL` - Backend API URL (default: http://localhost:5000/api)

## Troubleshooting

### MongoDB Connection Issues
- Ensure MongoDB is running: `mongod` or check MongoDB service
- Verify connection string in `.env` file
- For MongoDB Atlas, use the connection string from your cluster

### Claude API Errors
- Verify your API key is correct in `.env`
- Check API quota/limits
- Ensure you have internet connection for API calls

### File Upload Issues
- Check file size (max 10MB)
- Verify file format is supported
- Ensure `backend/uploads/` directory exists and is writable

### CORS Issues
- Backend has CORS enabled for all origins (development)
- For production, configure CORS to allow only your frontend domain

## Future Enhancements

- User authentication and authorization
- Email notifications for matches
- Advanced filtering and search
- Resume parsing for DOC/DOCX files
- Machine learning model training from feedback
- Dashboard with analytics
- Export match results to CSV/PDF

## License

ISC

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## Support

For issues or questions, please open an issue on GitHub.


