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
        const filePath = data.name;
        const bucket = data.bucket;

        const pathParts = filePath ? filePath.split('/') : [];

        if (pathParts.length !== 2) {
            console.log(`Skipping: Path structure "${filePath}" is not in the expected 'jobId/fileName' format.`);
            return;
        }

        const jobId = pathParts[0];
        const fileName = pathParts[1];

        // Fetch job post details
        const job = await jobPost(jobId);

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

        // Extract the pdf upload through Cloud Storage
        const extractedText = await extractor(bucket, jobId, fileName);

        const evaluation = await evaluator(extractedText, jobDescription)
        // Use the uuid defined as a fileName
        const applicationId = fileName.split('.')[0];
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