const Anthropic = require('@anthropic-ai/sdk');
const dotenv = require('dotenv');

dotenv.config();

const anthropic = new Anthropic({
  apiKey: process.env.CLAUDE_API_KEY,
});

/**
 * Match resume to job description using Claude API
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

    const message = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 2000,
      messages: [{
        role: 'user',
        content: prompt,
      }],
    });

    const responseText = message.content[0].text;
    
    // Try to extract JSON from the response
    let jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const result = JSON.parse(jsonMatch[0]);
      return {
        matchScore: result.matchScore || 0,
        matchingSkills: result.matchingSkills || [],
        missingSkills: result.missingSkills || [],
        aiAnalysis: result.analysis || '',
        highlightedText: result.highlightedText || '',
      };
    }

    // Fallback parsing if JSON extraction fails
    return parseClaudeResponse(responseText);
  } catch (error) {
    console.error('Claude API Error:', error);
    throw new Error('Failed to analyze resume with AI: ' + error.message);
  }
}

/**
 * Fallback parser for Claude response
 */
function parseClaudeResponse(text) {
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
  matchResumeToJob,
};


