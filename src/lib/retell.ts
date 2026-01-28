import Retell from 'retell-sdk';

const apiKey = import.meta.env.VITE_RETELL_API_KEY || "key_fad360827b8750f1277df70c3573";

// Phone number to filter by (EcoTech's number)
// Based on observed call logs
export const ECOTECH_NUMBER = "+12898166495";

let retellClient: Retell;

try {
    retellClient = new Retell({
        apiKey: apiKey,
    });
} catch (error) {
    console.error("Failed to initialize Retell client:", error);
}

export interface RetellCall {
    call_id: string;
    call_type?: string;
    agent_id: string;
    call_status: string;
    start_timestamp: number;
    end_timestamp?: number;
    duration_ms?: number;
    transcript?: string;
    recording_url?: string;
    public_log_url?: string;
    from_number: string;
    to_number: string;
    direction: 'inbound' | 'outbound';
    call_analysis?: {
        call_summary?: string;
        user_sentiment?: string;
        call_successful?: boolean;
        custom_analysis_data?: any;
    };
    metadata?: any;
    disconnection_reason?: string;
    // Add other fields as needed
}

export async function fetchRetellCalls(limit = 100): Promise<RetellCall[]> {
    if (!retellClient) return [];

    try {
        // The SDK returns a list response. We might need to handle pagination if needed, 
        // but for now we just get the first batch.
        const response = await retellClient.call.list({
            limit: limit,
            // filter_criteria: { from_number: ECOTECH_NUMBER } // Check if SDK supports this
        });

        // SDK usually returns strictly strictly typed objects.
        // We cast or map as needed.
        return response as unknown as RetellCall[];
    } catch (error) {
        console.error("Error fetching Retell calls:", error);
        throw error;
    }
}
