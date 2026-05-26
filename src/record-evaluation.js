import "dotenv/config"

export const recordEvaluation = async (jobId, applicationId, evaluation) => {
    const url = process.env.MAIN_APP_URL;
    try {
        const response = await fetch(`${url}/api/jobs/${jobId}/applications/${applicationId}/evaluation`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(evaluation)
        })
        const data = await response.json()
        return data;
    } catch (error) {
        console.error(error);
    }
} 