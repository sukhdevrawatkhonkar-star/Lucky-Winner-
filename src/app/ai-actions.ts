
'use server';

import { getHistoricalAnalysis, HistoricalAnalysisInput, HistoricalAnalysisOutput } from '@/ai/flows/historical-result-analysis';
import { getSupportResponse, CustomerSupportInput, CustomerSupportOutput } from '@/ai/flows/customer-support-flow';


export async function getResultAnalysisAI(input: HistoricalAnalysisInput): Promise<HistoricalAnalysisOutput> {
    try {
        const result = await getHistoricalAnalysis(input);
        return result;
    } catch (error) {
        console.error("Error in getResultAnalysis:", error);
        throw new Error("Failed to get result analysis. Please try again.");
    }
}

export async function getAIChatResponse(input: CustomerSupportInput): Promise<CustomerSupportOutput> {
    try {
        const result = await getSupportResponse(input);
        return result;
    } catch (error) {
        console.error("Error in getAIChatResponse:", error);
        throw new Error("Failed to get AI response. Please try again.");
    }
}
