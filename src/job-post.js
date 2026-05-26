import "dotenv/config"

export const jobPost = async (jobId) => {
    const url = process.env.MAIN_APP_URL;
    try {
        const response = await fetch(`${url}/api/jobs/${jobId}`)
        const data = await response.json()
        return data;
    } catch (error) {
        console.error(error);
    }
} 