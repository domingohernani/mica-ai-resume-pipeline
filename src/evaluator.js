import { LlmAgent, InMemoryRunner, setLogLevel, LogLevel } from '@google/adk';

// Show only errors, and hide info logs
setLogLevel(LogLevel.ERROR);

const resumeEvaluatorAgent = new LlmAgent(
  {
    name: 'resume_evaluator',
    model: 'gemini-2.5-flash',
    description:
      `This agent accepts a candidate's resume (text or string format) and a target Job Description. ` +
      `It extracts the candidate's skills, qualifications, and experience, compares them against the ` +
      `job description requirements, and calculates a structured match score from 0 to 100.`,

    instruction:
      `# Goal\n` +
      `You are an objective, non-biased automated talent alignment analyzer. Your task is to ` +
      `compare a Candidate Resume directly against a specific Job Description (JD) and determine how ` +
      `closely the candidate's background matches the position's requirements.\n\n` +

      `# Core Rules for Non-Biased Evaluation\n` +
      `1. Contextual Seniority: Do not penalize a candidate for having fewer total ` +
      `years of experience if their experience completely covers the duties listed in the JD. Evaluate "relevance ` +
      `of experience" over "quantity of years."\n` +
      `2. Industry Agnostic: Treat all roles equally. If the job is for a Customer Service Representative or ` +
      `Sales Manager, evaluate their soft skills, operational metrics, and domain knowledge exactly as strictly as you would ` +
      `programming languages for a software role.\n` +
      `3. Strict Alignment: Focus purely on overlap. If the JD requires specific certifications, tools, or responsibilities, ` +
      `look for evidence of those (or strong equivalents) in the resume.\n\n` +

      `# Scoring Guide (0 - 100)\n` +
      `- 85-100 (Strong Alignment): The candidate possesses almost all core requirements, matching tools/skills, and has successfully performed the required responsibilities in past roles.\n` +
      `- 65-84 (Good Potential): The candidate matches the foundational expectations and core skills, but might be missing a few secondary nice-to-have requirements or specific domain tools.\n` +
      `- 40-64 (Partial Match): The candidate has transferable skills but lacks direct experience in the core responsibilities outlined in the JD.\n` +
      `- 0-39 (Low Alignment): The background does not structurally align with the role's primary function.\n\n` +

      `# Output Format (CRITICAL)\n` +
      `You MUST respond with a raw JSON object ONLY. Do not wrap the JSON in markdown formatting or code blocks. Use this exact structure:\n` +
      `{\n` +
      `  "compatibilityScore": [Number between 0 and 100],\n` +
      `  "matchedRequirements": ["Requirement or skill found in both"],\n` +
      `  "missingCoreRequirements": ["Key requirement from JD not found in resume"],\n` +
      `  "alignmentRationale": "A brief, professional, and completely objective summary explaining why the score was given based purely on the JD criteria."\n` +
      `}`, config: {
        responseMimeType: 'application/json',
        temperature: 0,
        seed: 42
      }
  }
)

export const evaluator = async (resumeText, jobDescriptionText) => {
  const appName = 'resume_pipeline';
  const userId = 'evaluator_user';

  const runner = new InMemoryRunner({ agent: resumeEvaluatorAgent, appName });
  const session = await runner.sessionService.createSession({ appName, userId });

  const message = {
    role: 'user',
    parts: [{
      text: `
            Candidate Resume:
      ${resumeText}

            ---------------------------------------
Target Job Description:
  ${jobDescriptionText}
    `}]
  };

  const events = await Array.fromAsync(
    runner.runAsync({ userId, sessionId: session.id, newMessage: message })
  );

  const lastEvent = events[events.length - 1];
  const fullText = lastEvent?.content?.parts
    ?.map((p) => p.text ?? '')
    .join('') ?? '';

  const clean = fullText.replace(/```json | ```/g, '').trim();
  return JSON.parse(clean);
}