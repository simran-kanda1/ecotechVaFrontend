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

export async function fetchRetellCalls(limit = 5000): Promise<RetellCall[]> {
    if (!apiKey) {
        console.error("Retell API Key is missing");
        return [];
    }

    console.log("Starting to fetch Retell calls...");

    let allCalls: RetellCall[] = [];
    let paginationKey: string | undefined = undefined;
    const BATCH_SIZE = 1000; // Retell API max limit per request

    try {
        while (allCalls.length < limit) {
            // Determine how many to fetch in this batch
            const remaining = limit - allCalls.length;
            const fetchLimit = Math.min(remaining, BATCH_SIZE);

            const response = await fetch("https://api.retellai.com/v2/list-calls", {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${apiKey}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    limit: fetchLimit,
                    pagination_key: paginationKey,
                    // optimization: filter by date if possible, but Retell doesn't support simple date param in top level, 
                    // only via filter_criteria which is complex. For now, fetch all chronological.
                    sort_order: 'descending' // Default is descending, making sure we get latest first
                })
            });

            if (!response.ok) {
                throw new Error(`Retell API error: ${response.status} ${response.statusText}`);
            }

            const data = await response.json();

            if (Array.isArray(data)) {
                if (data.length === 0) break;

                allCalls = [...allCalls, ...data];

                // If we got fewer than we asked for, we are at the end
                if (data.length < fetchLimit) break;

                // Prepare next cursor
                paginationKey = data[data.length - 1].call_id;
            } else {
                console.warn("Retell API returned unexpected format", data);
                break;
            }
        }

        return allCalls as RetellCall[];

    } catch (error) {
        console.error("Error fetching Retell calls:", error);
        return allCalls; // Return what we have so far
    }
}
