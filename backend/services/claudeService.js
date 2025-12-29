const { GoogleGenerativeAI } = require('@google/generative-ai');
const dotenv = require('dotenv');

dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

/**
 * Match candidate to job using Gemini Pro API (new format with feedback support)
 */
async function matchCandidateToJob({ job, resumeText, feedbackSummary = '' }) {
  try {
    const jobTitle = job.title || 'N/A';
    const jobDescription = job.description || '';
    const jobRequirements = job.requirements || [];
    const jobSkills = job.skillsRequired || [];

    let prompt = `You are an expert recruiter analyzing a candidate's resume against a job posting. 

JOB TITLE: ${jobTitle}

JOB DESCRIPTION:
${jobDescription}

JOB REQUIREMENTS:
${jobRequirements.join(', ')}

REQUIRED SKILLS:
${jobSkills.join(', ')}

CANDIDATE RESUME:
${resumeText}`;

    // Add feedback summary if available
    if (feedbackSummary) {
      prompt += `\n\nRECRUITER FEEDBACK SUMMARY (use this to refine your analysis):
${feedbackSummary}`;
    }

    prompt += `\n\nPlease analyze this resume against the job posting and provide a STRICT JSON response only (no additional text):
{
  "score": <number 0-100>,
  "matchedSkills": ["skill1", "skill2", ...],
  "missingSkills": ["skill1", "skill2", ...],
  "highlights": ["highlight1", "highlight2", ...],
  "reasoningSummary": "<brief 2-3 sentence summary>"
}`;

    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const responseText = response.text();
    
    // Extract JSON from response (robust parsing)
    let jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        const parsedResult = JSON.parse(jsonMatch[0]);
        return {
          score: parsedResult.score || 0,
          matchedSkills: Array.isArray(parsedResult.matchedSkills) ? parsedResult.matchedSkills : [],
          missingSkills: Array.isArray(parsedResult.missingSkills) ? parsedResult.missingSkills : [],
          highlights: Array.isArray(parsedResult.highlights) ? parsedResult.highlights : [],
          reasoningSummary: parsedResult.reasoningSummary || '',
        };
      } catch (parseError) {
        console.error('JSON parse error:', parseError);
        // Fall through to fallback parser
      }
    }

    // Fallback parsing if JSON extraction fails
    return parseGeminiResponseNew(responseText);
  } catch (error) {
    console.error('Gemini API Error:', error);
    throw new Error('Failed to analyze resume with AI: ' + error.message);
  }
}

/**
 * Match resume to job description using Gemini Pro API (legacy format for backward compatibility)
 */
async function matchResumeToJob(resumeText, jobDescription, jobRequirements, jobSkills) {
  try {
    const prompt = `You are an expert recruiter analyzing a candidate's resume against a job posting. 

JOB TITLE: ${jobDescription.split('\n')[0] || 'N/A'}

JOB DESCRIPTION:
${jobDescription}

JOB REQUIREMENTS:
${jobRequirements.join(', ')}

REQUIRED SKILLS:
${jobSkills.join(', ')}

CANDIDATE RESUME:
${resumeText}

Please analyze this resume against the job posting and provide:
1. A match score from 0-100 (be specific, e.g., 85, not "high")
2. List of matching skills found in the resume
3. List of missing skills that are required but not found
4. A brief analysis (2-3 sentences) explaining the match quality
5. Highlighted matching text from the resume (extract relevant phrases that match job requirements)

Format your response as JSON:
{
  "matchScore": <number 0-100>,
  "matchingSkills": ["skill1", "skill2", ...],
  "missingSkills": ["skill1", "skill2", ...],
  "analysis": "<brief analysis text>",
  "highlightedText": "<relevant matching phrases from resume>"
}`;

    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const responseText = response.text();
    
    // Try to extract JSON from the response
    let jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        const parsedResult = JSON.parse(jsonMatch[0]);
        return {
          matchScore: parsedResult.matchScore || 0,
          matchingSkills: parsedResult.matchingSkills || [],
          missingSkills: parsedResult.missingSkills || [],
          aiAnalysis: parsedResult.analysis || '',
          highlightedText: parsedResult.highlightedText || '',
        };
      } catch (parseError) {
        // Fall through to fallback parser
      }
    }

    // Fallback parsing if JSON extraction fails
    return parseGeminiResponse(responseText);
  } catch (error) {
    console.error('Gemini API Error:', error);
    throw new Error('Failed to analyze resume with AI: ' + error.message);
  }
}

/**
 * Fallback parser for new format
 */
function parseGeminiResponseNew(text) {
  // Extract score
  const scoreMatch = text.match(/["']?score["']?\s*:\s*(\d+)/i) || 
                     text.match(/match\s*score[:\s]*(\d+)/i) || 
                     text.match(/(\d+)\s*(?:out\s*of\s*100|%)/i);
  const score = scoreMatch ? parseInt(scoreMatch[1]) : 50;

  // Extract matched skills
  const matchedSkills = [];
  const matchedSection = text.match(/matchedSkills?[:\s]*\[([^\]]+)\]/i) ||
                        text.match(/matching\s*skills?[:\s]*([^\n]+(?:\n[^\n]+)*)/i);
  if (matchedSection) {
    const skillsText = matchedSection[1];
    const skillMatches = skillsText.match(/["']([^"']+)["']/g) ||
                        skillsText.match(/[-•*]\s*([^\n,]+)/g);
    if (skillMatches) {
      matchedSkills.push(...skillMatches.map(s => s.replace(/["'\[\]-•*]\s*/g, '').trim()).filter(s => s));
    }
  }

  // Extract missing skills
  const missingSkills = [];
  const missingSection = text.match(/missingSkills?[:\s]*\[([^\]]+)\]/i) ||
                        text.match(/missing\s*skills?[:\s]*([^\n]+(?:\n[^\n]+)*)/i);
  if (missingSection) {
    const missingText = missingSection[1];
    const missingMatches = missingText.match(/["']([^"']+)["']/g) ||
                          missingText.match(/[-•*]\s*([^\n,]+)/g);
    if (missingMatches) {
      missingSkills.push(...missingMatches.map(s => s.replace(/["'\[\]-•*]\s*/g, '').trim()).filter(s => s));
    }
  }

  // Extract highlights
  const highlights = [];
  const highlightsSection = text.match(/highlights?[:\s]*\[([^\]]+)\]/i);
  if (highlightsSection) {
    const highlightsText = highlightsSection[1];
    const highlightMatches = highlightsText.match(/["']([^"']+)["']/g);
    if (highlightMatches) {
      highlights.push(...highlightMatches.map(h => h.replace(/["'\[\]]/g, '').trim()).filter(h => h));
    }
  }

  // Extract reasoning
  const reasoningMatch = text.match(/reasoningSummary[:\s]*["']([^"']+)["']/i) ||
                        text.match(/analysis[:\s]*([^\n]+(?:\n[^\n]+){0,2})/i);
  const reasoningSummary = reasoningMatch ? reasoningMatch[1].trim() : 'AI analysis completed.';

  return {
    score: Math.max(0, Math.min(100, score)),
    matchedSkills: matchedSkills.slice(0, 15),
    missingSkills: missingSkills.slice(0, 15),
    highlights: highlights.length > 0 ? highlights.slice(0, 10) : [text.substring(0, 200)],
    reasoningSummary,
  };
}

/**
 * Fallback parser for Gemini response (legacy)
 */
function parseGeminiResponse(text) {
  // Extract match score
  const scoreMatch = text.match(/match\s*score[:\s]*(\d+)/i) || 
                     text.match(/(\d+)\s*(?:out\s*of\s*100|%)/i);
  const matchScore = scoreMatch ? parseInt(scoreMatch[1]) : 50;

  // Extract matching skills (look for lists or bullet points)
  const matchingSkills = [];
  const skillsSection = text.match(/matching\s*skills?[:\s]*([^\n]+(?:\n[^\n]+)*)/i);
  if (skillsSection) {
    const skillsText = skillsSection[1];
    const skillMatches = skillsText.match(/[-•*]\s*([^\n,]+)/g) || 
                        skillsText.match(/([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/g);
    if (skillMatches) {
      matchingSkills.push(...skillMatches.map(s => s.replace(/[-•*]\s*/, '').trim()));
    }
  }

  // Extract missing skills
  const missingSkills = [];
  const missingSection = text.match(/missing\s*skills?[:\s]*([^\n]+(?:\n[^\n]+)*)/i);
  if (missingSection) {
    const missingText = missingSection[1];
    const missingMatches = missingText.match(/[-•*]\s*([^\n,]+)/g) || 
                          missingText.match(/([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/g);
    if (missingMatches) {
      missingSkills.push(...missingMatches.map(s => s.replace(/[-•*]\s*/, '').trim()));
    }
  }

  // Extract analysis
  const analysisMatch = text.match(/analysis[:\s]*([^\n]+(?:\n[^\n]+){0,2})/i);
  const analysis = analysisMatch ? analysisMatch[1].trim() : 'AI analysis completed.';

  return {
    matchScore,
    matchingSkills: matchingSkills.slice(0, 10), // Limit to 10 skills
    missingSkills: missingSkills.slice(0, 10),
    aiAnalysis: analysis,
    highlightedText: text.substring(0, 500), // First 500 chars as highlight
  };
}

module.exports = {
  matchResumeToJob, // Legacy function for backward compatibility
  matchCandidateToJob, // New function with feedback support
};

