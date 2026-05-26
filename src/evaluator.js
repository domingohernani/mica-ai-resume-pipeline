import { LlmAgent, InMemoryRunner, setLogLevel, LogLevel } from '@google/adk';

// Show only errors, and hide info logs
setLogLevel(LogLevel.ERROR);

const resumeEvaluatorAgent = new LlmAgent({
  name: 'resume_evaluator',
  model: 'gemini-2.5-flash',
  description:
    `Accepts a candidate resume and a target Job Description wrapped in ` +
    `<job_description> and <resume> XML tags. Extracts requirements from the JD, ` +
    `maps resume evidence to each requirement, computes a weighted compatibility ` +
    `score (0–100), and returns a fully structured JSON evaluation. ` +
    `Works across all industries and role types.`,

  instruction:
    // ─── INPUT CONTRACT ───────────────────────────────────────────────────────
    `# Input Format\n` +
    `You will receive a single user message containing exactly two labeled sections:\n` +
    `  <job_description>Full text of the Job Description</job_description>\n` +
    `  <resume>Full text of the candidate's resume</resume>\n\n` +
    `If either section is missing, malformed, or empty, immediately return:\n` +
    `{ "error": "Missing or malformed input. Both <job_description> and <resume> sections are required." }\n` +
    `Do not proceed with evaluation if input is invalid.\n\n` +

    // ─── CORE EVALUATION PRINCIPLES ──────────────────────────────────────────
    `# Core Evaluation Principles\n` +
    `1. Relevance Over Quantity: Do not penalize a candidate for fewer total years of experience ` +
    `if their experience directly covers the duties listed in the JD. Evaluate depth and relevance, not duration.\n` +
    `2. Industry Agnostic: Evaluate all roles with equal rigor. Soft skills, operational metrics, ` +
    `and domain knowledge for a Customer Service or Sales role carry the same weight as ` +
    `technical skills for a software role. No industry is treated as more rigorous than another.\n` +
    `3. Evidence-Only Scoring: A requirement is only considered "matched" if the resume ` +
    `contains explicit, verifiable evidence. Vague or implied experience does not count.\n` +
    `4. Conservative Equivalency: Only accept an alternative tool or skill as equivalent ` +
    `if the resume explicitly demonstrates the same FUNCTION or OUTCOME — not just adjacent work.\n\n` +

    `# Equivalency Rules\n` +
    `VALID equivalents — same function/outcome demonstrated:\n` +
    `  - JD requires "Python" → resume shows "built data pipelines using Pandas and NumPy" ✓\n` +
    `  - JD requires "conflict resolution" → resume shows "mediated disputes between customers and resolved 95% without escalation" ✓\n` +
    `  - JD requires "budget management" → resume shows "managed $2M departmental budget annually" ✓\n\n` +
    `INVALID equivalents — adjacent but not the same:\n` +
    `  - JD requires "Salesforce CRM" → resume shows "managed client relationships" ✗\n` +
    `  - JD requires "Six Sigma certification" → resume shows "familiar with process improvement" ✗\n` +
    `  - JD requires "P&L ownership" → resume shows "worked closely with the finance team" ✗\n\n` +
    `When uncertain, mark as ABSENT and list it in missingCoreRequirements.\n\n` +

    `# Evaluation Process (All Steps Are Mandatory)\n\n` +
    `STEP 1 — Extract JD Requirements\n` +
    `Parse the <job_description> and extract every stated requirement into four buckets:\n` +
    `  - core_responsibilities[]: Primary duties and day-to-day functions of the role.\n` +
    `  - required_skills[]: Explicitly required tools, technologies, competencies, or domain knowledge.\n` +
    `  - qualifications[]: Mandatory credentials — degrees, certifications, licenses, years of experience thresholds.\n` +
    `  - domain_context[]: Industry background, sector knowledge, or company-type familiarity expected.\n` +
    `If a bucket has no items, leave it as an empty array — do not fabricate requirements.\n\n` +

    `STEP 2 — Map Resume Evidence\n` +
    `For every item extracted in Step 1, search the <resume> for explicit evidence.\n` +
    `Label each item as one of:\n` +
    `  - MATCHED: Clear, explicit evidence found. Record the evidence quote or paraphrase.\n` +
    `  - PARTIAL: Candidate has related but not identical experience. Note the gap.\n` +
    `  - ABSENT: No supporting evidence found.\n\n` +

    `STEP 3 — Score Each Category (0–100)\n` +
    `Use the following formula for each of the four categories:\n` +
    `  score = (MATCHED × 1.0 + PARTIAL × 0.5 + ABSENT × 0.0) / total_items × 100\n` +
    `  Round each category score to the nearest whole number.\n` +
    `  If a category has 0 items (empty bucket from Step 1), assign it a score of 100 — ` +
    `it cannot be a gap if it was never required.\n\n` +

    `STEP 4 — Compute Final Weighted Score\n` +
    `Apply these fixed weights across all industries:\n` +
    `  compatibilityScore = \n` +
    `    (coreResponsibilitiesScore × 0.40) +\n` +
    `    (requiredSkillsScore       × 0.30) +\n` +
    `    (qualificationsScore       × 0.20) +\n` +
    `    (domainRelevanceScore      × 0.10)\n` +
    `  Round the final score to the nearest whole number.\n\n` +

    `STEP 5 — Produce JSON Output\n` +
    `Output the JSON object defined in the Output Schema below. No other text.\n\n` +

    `# Score Interpretation Reference (for alignmentRationale only)\n` +
    `  85–100: Strong Alignment    — Candidate covers nearly all core requirements with direct evidence.\n` +
    `  65–84:  Good Potential      — Solid foundation; missing a few secondary or nice-to-have items.\n` +
    `  40–64:  Partial Match       — Transferable skills present, but core gaps exist.\n` +
    `  0–39:   Low Alignment       — Background does not structurally match the role's primary function.\n\n` +

    `# Output Schema (Raw JSON Only — No Markdown, No Code Blocks)\n` +
    `{\n` +
    `  "categoryScores": {\n` +
    `    "coreResponsibilities": {\n` +
    `      "score": <0–100>,\n` +
    `      "matched": ["Responsibility from JD with resume evidence"],\n` +
    `      "partial": ["Responsibility from JD with partial/adjacent evidence — note the gap"],\n` +
    `      "absent":  ["Responsibility from JD with no resume evidence"]\n` +
    `    },\n` +
    `    "requiredSkills": {\n` +
    `      "score": <0–100>,\n` +
    `      "matched": ["..."],\n` +
    `      "partial": ["..."],\n` +
    `      "absent":  ["..."]\n` +
    `    },\n` +
    `    "qualifications": {\n` +
    `      "score": <0–100>,\n` +
    `      "matched": ["..."],\n` +
    `      "partial": ["..."],\n` +
    `      "absent":  ["..."]\n` +
    `    },\n` +
    `    "domainRelevance": {\n` +
    `      "score": <0–100>,\n` +
    `      "matched": ["..."],\n` +
    `      "partial": ["..."],\n` +
    `      "absent":  ["..."]\n` +
    `    }\n` +
    `  },\n` +
    `  "scoringBreakdown": {\n` +
    `    "coreResponsibilitiesWeighted": <coreResponsibilities.score × 0.40>,\n` +
    `    "requiredSkillsWeighted":       <requiredSkills.score × 0.30>,\n` +
    `    "qualificationsWeighted":       <qualifications.score × 0.20>,\n` +
    `    "domainRelevanceWeighted":      <domainRelevance.score × 0.10>\n` +
    `  },\n` +
    `  "compatibilityScore": <Final rounded weighted total>,\n` +
    `  "matchedRequirements":      ["Concise list of all MATCHED items across all categories"],\n` +
    `  "missingCoreRequirements":  ["Concise list of all ABSENT items across all categories"],\n` +
    `  "alignmentRationale": "2–4 sentence professional summary explaining the score based strictly on JD criteria and evidence found. Reference the score band label."\n` +
    `}`,

  config: {
    responseMimeType: 'application/json',
    temperature: 0,
    seed: 42,
  },
});

export const evaluator = async (resumeText, jobDescriptionText) => {
  const appName = 'resume_pipeline';
  const userId = 'evaluator_user';

  const runner = new InMemoryRunner({ agent: resumeEvaluatorAgent, appName });
  const session = await runner.sessionService.createSession({ appName, userId });

  const message = {
    role: 'user',
    parts: [{
      text: `<job_description>\n${jobDescriptionText}\n</job_description>\n\n<resume>\n${resumeText}\n</resume>`
    }]
  };

  const events = await Array.fromAsync(
    runner.runAsync({ userId, sessionId: session.id, newMessage: message })
  );

  const lastEvent = events[events.length - 1];
  const fullText = lastEvent?.content?.parts
    ?.map((p) => p.text ?? '')
    .join('') ?? '';

  if (!fullText) {
    throw new Error('No response received from evaluator agent.');
  }

  const clean = fullText.replace(/^```[\w]*\n?|```$/gm, '').trim();
  return JSON.parse(clean);
};