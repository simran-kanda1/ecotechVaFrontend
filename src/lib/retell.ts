// Retell API Client (Lightweight replacement for retell-sdk to avoid Node.js polyfills)

const apiKey = import.meta.env.VITE_RETELL_API_KEY || "key_fad360827b8750f1277df70c3573";

// Phone number to filter by (EcoTech's number)
export const ECOTECH_NUMBER = "+12898166495";

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

export async function fetchRetellCalls(limit = 1000): Promise<RetellCall[]> {
    if (!apiKey) {
        console.error("Retell API Key is missing");
        return [];
    }

    try {
        const response = await fetch("https://api.retellai.com/v2/list-calls", {
            method: "POST", // Retell 'list-calls' is a POST request
            headers: {
                "Authorization": `Bearer ${apiKey}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                limit: limit
            })
        });

        if (!response.ok) {
            throw new Error(`Retell API error: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();

        // Ensure we return an array
        if (Array.isArray(data)) {
            return data as RetellCall[];
        } else {
            console.warn("Retell API returned unexpected format", data);
            return [];
        }

    } catch (error) {
        console.error("Error fetching Retell calls:", error);
        return [];
    }
}
