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

export async function fetchRetellCalls(
    limit = 50000,
    filterCriteria?: { start_timestamp?: { lower_threshold?: number; upper_threshold?: number } }
): Promise<RetellCall[]> {
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
                    filter_criteria: filterCriteria,
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

/**
 * Fetch calls specifically for a given phone number by scanning recent calls.
 */
export async function fetchCallsForNumber(phoneNumber: string): Promise<RetellCall[]> {
    if (!apiKey || !phoneNumber) return [];

    // Clean target phone number (last 10 digits)
    const targetClean = phoneNumber.replace(/\D/g, '').slice(-10);
    if (!targetClean) return [];

    const matchNumber = (p: string) => {
        return p?.replace(/\D/g, '').slice(-10) === targetClean;
    };

    try {
        // Fetch up to 2000 recent calls to find matches
        let allCalls: RetellCall[] = [];
        let paginationKey: string | undefined = undefined;
        let totalSearched = 0;

        while (totalSearched < 2000) {
            const response = await fetch("https://api.retellai.com/v2/list-calls", {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${apiKey}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    limit: 1000,
                    pagination_key: paginationKey,
                    sort_order: 'descending'
                })
            });

            if (!response.ok) break;

            const data = await response.json();
            if (Array.isArray(data) && data.length > 0) {
                totalSearched += data.length;

                // Keep only matches
                const matches = data.filter((c: RetellCall) => {
                    // Check if either to or from matches the target number AND the company's number was involved
                    const isTargetInvolved = matchNumber(c.to_number) || matchNumber(c.from_number);
                    return isTargetInvolved;
                });

                allCalls = [...allCalls, ...matches];

                if (data.length < 1000) break;
                paginationKey = data[data.length - 1].call_id;
            } else {
                break;
            }
        }
        return allCalls;
    } catch (e) {
        console.error("Failed to fetch calls for number", e);
        return [];
    }
}
