import { evaluator } from "./evaluator.js";
import { extractor } from "./text-extractor.js";

/**
 * Cloud Function triggered when a file is uploaded to GCS
 */
export const processResume = async (reqOrEvent, res) => {
    try {
        const data = reqOrEvent?.body ?? reqOrEvent;
        const extractedText = await extractor(data);
        const evaluation = await evaluator(extractedText, `
            Position: Senior Backend Engineer (Node.js)
Department: Engineering
Experience Level: 5+ Years

### About the Role
We are looking for a Senior Backend Engineer to join our core architecture team. You will be responsible for designing, building, and maintaining the scalable server-side systems that power our high-throughput AI applications. 

### Core Responsibilities
- Design and implement low-latency, high-availability, and performant RESTful APIs using Node.js and TypeScript.
- Architect and optimize database schemas using PostgreSQL and Redis for caching.
- Deploy and manage containerized microservices on AWS (ECS, EKS, or Lambda).
- Collaborate with frontend teams to define API contracts and integrate user-facing elements.
- Mentor mid-level developers and conduct thorough, constructive code reviews.

### Required Technical Skills & Qualifications
- 5+ years of professional software engineering experience focusing on backend infrastructure.
- Expert-level mastery of Node.js and TypeScript/JavaScript.
- Strong hands-on experience with relational databases (PostgreSQL/MySQL) and advanced SQL query optimization.
- Proven experience with cloud platforms, specifically AWS (EC2, S3, RDS, CloudWatch).
- Deep understanding of microservices architecture and Docker containers.
- Excellent communication skills and a team-first mindset.

### Nice-to-Have / Bonus Qualifications
- Experience working with Python or Golang.
- Familiarity with Vertex AI, Google Cloud Platform, or LLM application engineering.
- Open-source contributions or experience scaling systems to millions of active monthly users.`)

        console.log(evaluation);

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