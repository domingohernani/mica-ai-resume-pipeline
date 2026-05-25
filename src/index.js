import { extractor } from "./text-extractor.js";

/**
 * Cloud Function triggered when a file is uploaded to GCS
 */
export const processResume = async (reqOrEvent, res) => {
    try {
        const data = reqOrEvent?.body ?? reqOrEvent;
        const extractedText = await extractor(data);
        console.log(extractedText);


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