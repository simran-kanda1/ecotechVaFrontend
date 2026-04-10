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

/**
 * Get current date information in Toronto timezone
 */
function getCurrentDateInfo() {
    const now = new Date();
    const torontoTime = new Date(now.toLocaleString('en-US', { timeZone: 'America/Toronto' }));

    const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const monthsOfYear = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

    const dayOfWeek = daysOfWeek[torontoTime.getDay()];
    const month = monthsOfYear[torontoTime.getMonth()];
    const dayOfMonth = torontoTime.getDate();
    const year = torontoTime.getFullYear();

    const longFormat = `${dayOfWeek}, ${month} ${dayOfMonth}, ${year}`;
    const shortFormat = `${year}-${String(torontoTime.getMonth() + 1).padStart(2, '0')}-${String(dayOfMonth).padStart(2, '0')}`;

    const tomorrow = new Date(torontoTime);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowDayOfWeek = daysOfWeek[tomorrow.getDay()];
    const tomorrowMonth = monthsOfYear[tomorrow.getMonth()];
    const tomorrowDay = tomorrow.getDate();
    const tomorrowYear = tomorrow.getFullYear();
    const tomorrowLong = `${tomorrowDayOfWeek}, ${tomorrowMonth} ${tomorrowDay}, ${tomorrowYear}`;
    const tomorrowShort = `${tomorrowYear}-${String(tomorrow.getMonth() + 1).padStart(2, '0')}-${String(tomorrowDay).padStart(2, '0')}`;

    return {
        current_date_long: longFormat,
        current_date_short: shortFormat,
        current_day_of_week: dayOfWeek,
        current_month: month,
        current_day: String(dayOfMonth),
        current_year: String(year),
        tomorrow_date_long: tomorrowLong,
        tomorrow_date_short: tomorrowShort,
        tomorrow_day_of_week: tomorrowDayOfWeek
    };
}

/**
 * Triggers an immediate outbound call via Retell API
 */
export async function makeOutboundCall(toNumber: string, retellAgentId?: string, lead?: any): Promise<any> {
    if (!apiKey) throw new Error("Missing Retell API key");
    
    // Ensure target number has +1 if only 10 digits
    let cleanedTo = toNumber.replace(/[^0-9+]/g, '');
    if (cleanedTo.length === 10) cleanedTo = `+1${cleanedTo}`;
    else if (cleanedTo.length === 11 && cleanedTo.startsWith('1')) cleanedTo = `+${cleanedTo}`;
    
    const dateInfo = getCurrentDateInfo();

    const metadata = {
        leadId: lead?.id || lead?.leadId || '',
        firstName: lead?.firstName || '',
        lastName: lead?.lastName || '',
        email: lead?.email || '',
        phoneNumber: lead?.phoneNumber || lead?.phone || toNumber,
        address: lead?.address || '',
        city: lead?.city || '',
        region: lead?.region || 'YYZ',
        windowsOrDoors: lead?.windowsOrDoors || '',
        salespersonName: lead?.assignedSalesperson || 'our team',
        salespersonUserId: '', // unknown from frontend
        salespersonScore: 0,
        current_date: dateInfo.current_date_short
    };

    const dynamicVariables = {
        current_date_long: dateInfo.current_date_long,
        current_date_short: dateInfo.current_date_short,
        current_day_of_week: dateInfo.current_day_of_week,
        current_month: dateInfo.current_month,
        current_day: dateInfo.current_day,
        current_year: dateInfo.current_year,
        tomorrow_date_long: dateInfo.tomorrow_date_long,
        tomorrow_date_short: dateInfo.tomorrow_date_short,
        tomorrow_day_of_week: dateInfo.tomorrow_day_of_week,
        today_is: dateInfo.current_date_long,
        
        customer_first_name: lead?.firstName || 'there',
        customer_last_name: lead?.lastName || '',
        customer_full_name: `${lead?.firstName || ''} ${lead?.lastName || ''}`.trim() || 'there',
        customer_email: lead?.email || '',
        customer_phone: lead?.phoneNumber || lead?.phone || toNumber,
        customer_address: lead?.address || '',
        customer_city: lead?.city || '',
        
        lead_id: lead?.id || lead?.leadId || '',
        interest_type: lead?.windowsOrDoors || 'windows and doors',
        windows_or_doors: lead?.windowsOrDoors || 'windows and doors',
        
        salesperson_name: lead?.assignedSalesperson || 'our team',
        salesperson_id: '',
        salesperson_performance_score: '0',
        
        service_area: lead?.region || lead?.city || 'your area',
        region: lead?.region || 'YYZ',
        has_address: lead?.address ? 'true' : 'false',
        has_city: lead?.city ? 'true' : 'false'
    };
    
    const DEFAULT_AGENT_ID = 'agent_298a63eaae62f545bfc84329a6';
    const finalAgentId = retellAgentId || DEFAULT_AGENT_ID;

    const body: any = {
        agent_id: finalAgentId,
        from_number: ECOTECH_NUMBER,
        to_number: cleanedTo,
        metadata: metadata,
        retell_llm_dynamic_variables: dynamicVariables
    };
    
    console.log("Dispatching Retell body:", body);

    
    const response = await fetch("https://api.retellai.com/v2/create-phone-call", {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${apiKey}`,
            "Content-Type": "application/json"
        },
        body: JSON.stringify(body)
    });
    
    if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        console.error("Retell create-phone-call error:", err);
        throw new Error(err.message || `Failed to trigger call: ${response.status} ${response.statusText}`);
    }
    
    return await response.json();
}
