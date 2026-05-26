import { evaluator } from "./evaluator.js";
import { jobPost } from "./job-post.js";
import { recordEvaluation } from "./record-evaluation.js";
import { extractor } from "./text-extractor.js";

/**
 * Cloud Function triggered when a file is uploaded to GCS
 */
export const processResume = async (reqOrEvent, res) => {
    try {
        const data = reqOrEvent?.body ?? reqOrEvent;
        const jobId = data.jobId;
        const applicationId = data.applicationId;
        // Fetch job post details
        const job = await jobPost(jobId);
        // Extracted text from the pdf uploaded
        const extractedText = await extractor(data);

        const jobDescription = `
            Position: ${job.position}
            Department: ${job.department}
            Location: ${job.location}
            Experience Level: ${job.experienceLevel}
            Employment Type: ${job.employmentType}

            ### About the Role
            ${job.description}

            ### Requirements & Qualifications
            ${job.requirements}

            ### Core Technical Skills
            ${job.skills.join(', ')}
        `;

        const evaluation = await evaluator(extractedText, jobDescription)
        const result = await recordEvaluation(jobId, applicationId, evaluation)
        console.log(result);

        if (res) {
            return res.status(200).send("Processed");
        }
    } catch (error) {
        console.error("Error processing resume:", error);
        if (res) {
            return res.status(500).send("Error processing resume");
        }
    }
}