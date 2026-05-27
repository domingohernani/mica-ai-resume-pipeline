import { Storage } from "@google-cloud/storage";
import { PDFParse } from "pdf-parse";

// Init bucket
const storage = new Storage();

export const extractor = async (bucket, jobId, fileName) => {
    if (!bucket || !fileName) {
        throw new Error("Invalid input: ", bucket);
    }

    // Download file from bucket
    const googleBucket = storage.bucket(bucket);
    const file = googleBucket.file(`${jobId}/${fileName}`);

    // Parser Extractor
    const [buffer] = await file.download();
    const parser = new PDFParse({ data: buffer });
    const result = await parser.getText();
    await parser.destroy();

    const concatenatedTexts = result.pages.map((text) => text.text).toString();
    return concatenatedTexts;
};