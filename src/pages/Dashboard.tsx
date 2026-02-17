import { useEffect, useState } from "react";
import { collection, query, getDocs, orderBy, limit, deleteDoc, doc } from "firebase/firestore";
import { db } from "../lib/firebase";
import { Header } from "../components/Header";
import { AddLeadModal } from "../components/AddLeadModal";
import { CallDetailModal } from "../components/CallDetailModal";
import { Loader2, PhoneIncoming, CheckCircle, Calendar as CalendarIcon, ChevronLeft, ChevronRight, Phone, Clock, User, Plus, Search, Trash2 } from "lucide-react";
import { format, isAfter, isBefore, subMonths, addMonths, startOfDay } from "date-fns";
import { cn } from "../lib/utils";
import { MOCK_CALLS } from "../data/mock-data";
import { fetchRetellCalls, ECOTECH_NUMBER } from "../lib/retell";

// Type definitions
type Call = any;

const ITEMS_PER_PAGE = 50;

export default function Dashboard() {
    const [activeTab, setActiveTab] = useState<'opportunities' | 'scheduled' | 'logs'>('opportunities');
    const [leads, setLeads] = useState<Call[]>([]);
    const [scheduledCallbacks, setScheduledCallbacks] = useState<Call[]>([]);
    const [searchQuery, setSearchQuery] = useState("");

    const [loading, setLoading] = useState(true);
    const [selectedCall, setSelectedCall] = useState<Call | null>(null);
    const [isAddLeadOpen, setIsAddLeadOpen] = useState(false);

    // Billing Cycle State
    // Default to current date to calculate the relevant billing cycle
    const [currentCycleDate, setCurrentCycleDate] = useState(new Date());

    // Pagination State (Client-side for filtered results)
    const [currentPage, setCurrentPage] = useState(1);

    // Retell Logs State
    const [retellLogs, setRetellLogs] = useState<any[]>([]);

    // Helper to calculate billing cycle range
    const getBillingCycle = (date: Date) => {
        let start, end;
        if (date.getDate() >= 22) {
            start = new Date(date.getFullYear(), date.getMonth(), 22);
            end = new Date(date.getFullYear(), date.getMonth() + 1, 21, 23, 59, 59);
        } else {
            start = new Date(date.getFullYear(), date.getMonth() - 1, 22);
            end = new Date(date.getFullYear(), date.getMonth(), 21, 23, 59, 59);
        }
        return { start, end };
    };

    const { start, end } = getBillingCycle(currentCycleDate);

    // Fetch data
    // Fetch data
    useEffect(() => {
        async function fetchData() {
            setLoading(true);
            try {
                // 1. Fetch LEADS (Opportunities)
                // Fetching a larger batch to handle client-side filtering comfortably 
                const leadsRef = collection(db, "leads");
                const qLeads = query(leadsRef, orderBy("receivedAt", "desc"), limit(3000));

                let fetchedLeads: Call[] = [];
                try {
                    const querySnapshot = await getDocs(qLeads);
                    querySnapshot.forEach((doc) => {
                        fetchedLeads.push({ id: doc.id, ...doc.data() });
                    });
                } catch (e) {
                    console.log("Firebase/Network error fetching leads, falling back to mock", e);
                }

                if (fetchedLeads.length === 0) {
                    fetchedLeads = [...MOCK_CALLS];
                }
                setLeads(fetchedLeads);

                // 2. Fetch SCHEDULED CALLBACKS
                // fetch without ordering first to avoid index errors, then sort client-side
                const callbacksRef = collection(db, "scheduledCallbacks");
                const qCallbacks = query(callbacksRef, limit(1000));

                let fetchedCallbacks: Call[] = [];
                try {
                    const querySnapshot = await getDocs(qCallbacks);
                    querySnapshot.forEach((doc) => {
                        fetchedCallbacks.push({ id: doc.id, ...doc.data() });
                    });

                    // Client-side sort for callbacks (ascending)
                    fetchedCallbacks.sort((a, b) => {
                        // Schema uses 'scheduledFor'
                        const timeA = a.scheduledFor || a.nextCallbackTime;
                        const timeB = b.scheduledFor || b.nextCallbackTime;
                        if (!timeA) return 1;
                        if (!timeB) return -1;
                        const dateA = timeA?.seconds ? new Date(timeA.seconds * 1000) : new Date(timeA);
                        const dateB = timeB?.seconds ? new Date(timeB.seconds * 1000) : new Date(timeB);
                        return dateA.getTime() - dateB.getTime();
                    });

                } catch (e) {
                    console.error("Error fetching scheduled callbacks:", e);
                }
                setScheduledCallbacks(fetchedCallbacks);

                // Removed callLogs specific logic since we use computed logs now

            } catch (error) {
                console.error("Error fetching data:", error);
                setLeads([...MOCK_CALLS]);
            } finally {
                setLoading(false);
            }
        }

        fetchData();
    }, []);

    // Fetch Retell Logs
    useEffect(() => {
        if (activeTab === 'logs' && retellLogs.length === 0) {
            setLoading(true);
            fetchRetellCalls(5000) // Increase limit to ensure we capture the full month
                .then(calls => {
                    // Filter by from_number (ECOTECH_NUMBER) and map
                    const logs = calls
                        .filter((c: any) => c.from_number === ECOTECH_NUMBER)
                        .map((c: any) => ({
                            id: c.call_id,
                            receivedAt: { seconds: c.start_timestamp / 1000 },
                            firstName: "Unknown",
                            lastName: "",
                            phoneNumber: c.to_number, // Outbound call target
                            callStatus: c.call_status,
                            callOutcome: c.call_analysis?.custom_analysis_data?.callOutcome || c.call_analysis?.user_sentiment || "Unknown",
                            disconnection_reason: c.disconnection_reason,
                            custom_analysis_data: c.call_analysis?.custom_analysis_data,
                            // Map snake_case from Retell to camelCase for Modal
                            callAnalysis: c.call_analysis,
                            recordingUrl: c.recording_url,
                            transcript: c.transcript,
                            ...c,
                            isRetellCall: true
                        }));
                    setRetellLogs(logs);
                })
                .catch(err => console.error("Failed to fetch retell logs", err))
                .finally(() => setLoading(false));
        }
    }, [activeTab]);

    // Filter Logic based on Active Tab
    const filteredItems = (() => {
        let items: Call[] = [];

        if (activeTab === 'opportunities') {
            items = leads.filter((call) => {
                let dateStr = call.receivedAt || call.callStartedAt;
                if (!dateStr) return false;
                let date = dateStr?.seconds ? new Date(dateStr.seconds * 1000) : new Date(dateStr);
                return isAfter(date, start) && isBefore(date, end);
            });
        } else if (activeTab === 'scheduled') {
            // Upcoming callbacks - Future only
            items = scheduledCallbacks.filter((call) => {
                const scheduledFor = call.scheduledFor || call.nextCallbackTime || call.custom_analysis_data?.nextCallbackTime;
                if (!scheduledFor) return false;
                let date = scheduledFor?.seconds ? new Date(scheduledFor.seconds * 1000) : new Date(scheduledFor);
                return call.status === 'pending' && isAfter(date, new Date());
            }).sort((a, b) => {
                // Ascending (Next up first)
                const timeA = a.scheduledFor || a.nextCallbackTime;
                const timeB = b.scheduledFor || b.nextCallbackTime;
                const dateA = timeA?.seconds ? new Date(timeA.seconds * 1000) : new Date(timeA || 0);
                const dateB = timeB?.seconds ? new Date(timeB.seconds * 1000) : new Date(timeB || 0);
                return dateA.getTime() - dateB.getTime();
            });
        } else {
            // Retell Logs - Fetched from API
            items = retellLogs.filter((call) => {
                let dateStr = call.receivedAt || call.callStartedAt;
                if (!dateStr) return false;
                let date = dateStr?.seconds ? new Date(dateStr.seconds * 1000) : new Date(dateStr);
                return isAfter(date, start) && isBefore(date, end);
            }).sort((a, b) => {
                const timeA = a.receivedAt?.seconds || 0;
                const timeB = b.receivedAt?.seconds || 0;
                return timeB - timeA;
            });
        }

        // Apply Search Filter
        if (searchQuery.trim()) {
            const lowerQuery = searchQuery.toLowerCase();
            items = items.filter(item => {
                const customData = item.custom_analysis_data || {};
                const firstName = (customData.firstName || item.firstName || "").toLowerCase();
                const lastName = (customData.lastName || item.lastName || "").toLowerCase();
                const phoneNumber = (item.phoneNumber || customData.customerPhone || "").toLowerCase();

                return firstName.includes(lowerQuery) ||
                    lastName.includes(lowerQuery) ||
                    phoneNumber.includes(lowerQuery);
            });
        }

        return items;
    })();

    // Pagination Logic
    const totalPages = Math.ceil(filteredItems.length / ITEMS_PER_PAGE);
    const paginatedItems = filteredItems.slice(
        (currentPage - 1) * ITEMS_PER_PAGE,
        currentPage * ITEMS_PER_PAGE
    );

    // Cycle Navigation
    const nextCycle = () => {
        setCurrentCycleDate(prev => addMonths(prev, 1));
        setCurrentPage(1);
    };

    const prevCycle = () => {
        setCurrentCycleDate(prev => subMonths(prev, 1));
        setCurrentPage(1);
    };

    const handleViewOpportunity = (call: any) => {
        const phoneNumber = call.to_number || call.phoneNumber;
        if (!phoneNumber) return;

        // Try exact match or flexible match
        const matchingLead = leads.find(l =>
            l.phoneNumber === phoneNumber ||
            l.custom_analysis_data?.customerPhone === phoneNumber ||
            // Basic flexibility: Check if one ends with the other (handling country codes partially)
            (l.phoneNumber && phoneNumber.endsWith(l.phoneNumber.replace('+1', '').replace('+', '')))
        );

        if (matchingLead) {
            setActiveTab('opportunities');
            setSelectedCall(matchingLead);
        } else {
            // Optional: User feedback if not found
            console.log("No matching opportunity found");
        }
    };

    const handleRemoveScheduled = async (e: React.MouseEvent, callId: string) => {
        e.stopPropagation(); // Prevent row click
        if (window.confirm("Are you sure you want to remove this customer from the scheduled callback list?")) {
            try {
                await deleteDoc(doc(db, "scheduledCallbacks", callId));
                setScheduledCallbacks(prev => prev.filter(c => c.id !== callId));
            } catch (error) {
                console.error("Error removing scheduled callback:", error);
                alert("Failed to remove callback. Please try again.");
            }
        }
    };

    const handleLeadUpdate = (leadId: string, updates: any) => {
        setLeads(prev => prev.map(lead =>
            lead.id === leadId ? { ...lead, ...updates } : lead
        ));

        // Also update scheduledCallbacks if relevant (e.g. if we display urgency there too)
        setScheduledCallbacks(prev => prev.map(cb =>
            cb.leadId === leadId || cb.id === leadId ? { ...cb, ...updates } : cb
        ));
    };

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 font-sans text-slate-900 dark:text-slate-100">
            <Header />

            <main className="max-w-8xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">

                {/* Dashboard Controls / Stats */}
                <div className="flex flex-col md:flex-row gap-4 items-stretch md:items-center justify-between">

                    {/* Billing Cycle Selector - Modernized */}
                    <div className="flex items-center gap-4">
                        <div className="flex items-center bg-white dark:bg-slate-900 p-1.5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
                            <button onClick={prevCycle} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-500 transition-colors">
                                <ChevronLeft className="w-5 h-5" />
                            </button>
                            <div className="px-4 text-center min-w-[200px]">
                                <p className="text-xs text-slate-400 font-medium uppercase tracking-wider mb-0.5">Billing Cycle</p>
                                <div className="flex items-center justify-center gap-2 font-semibold text-slate-800 dark:text-slate-100">
                                    <CalendarIcon className="w-4 h-4 text-royal-600" />
                                    <span>{format(start, "MMM d")} - {format(end, "MMM d, yyyy")}</span>
                                </div>
                            </div>
                            <button onClick={nextCycle} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-500 transition-colors">
                                <ChevronRight className="w-5 h-5" />
                            </button>
                        </div>

                        <button
                            onClick={() => setIsAddLeadOpen(true)}
                            className="flex items-center gap-2 bg-royal-600 hover:bg-royal-700 text-white px-4 py-3 rounded-xl shadow-lg shadow-royal-900/20 transition-all font-medium"
                        >
                            <Plus className="w-5 h-5" />
                            <span>Add Lead</span>
                        </button>
                    </div>

                    {/* Quick Stats */}
                    <div className="flex gap-4">
                        <div className="bg-white dark:bg-slate-900 px-5 py-3 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-3">
                            <div className="p-2 bg-blue-50 text-royal-600 rounded-lg">
                                <PhoneIncoming className="w-5 h-5" />
                            </div>
                            <div>
                                <p className="text-xs text-slate-400 font-semibold uppercase">{activeTab === 'logs' ? 'Total Calls' : activeTab === 'scheduled' ? 'Scheduled' : 'Total Opportunities'}</p>
                                <p className="text-lg font-bold">
                                    {activeTab === 'logs' ? filteredItems.length : activeTab === 'scheduled' ? filteredItems.length : leads.length}
                                </p>
                            </div>
                        </div>
                        <div className="bg-white dark:bg-slate-900 px-5 py-3 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-3">
                            <div className="p-2 bg-green-50 text-green-600 rounded-lg">
                                <CheckCircle className="w-5 h-5" />
                            </div>
                            <div>
                                <p className="text-xs text-slate-400 font-semibold uppercase">Appointments</p>
                                <p className="text-lg font-bold">
                                    {leads.filter(c => c.custom_analysis_data?.appointmentBooked || c.appointmentBooked).length}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Main Content Table Card */}
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col">

                    {/* Toolbar */}
                    <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row gap-4 justify-between items-center bg-slate-50/50 dark:bg-slate-900/50">

                        {/* Tabs */}
                        <div className="flex p-1 bg-slate-100 dark:bg-slate-800 rounded-lg">
                            <button
                                onClick={() => { setActiveTab('opportunities'); setCurrentPage(1); }}
                                className={cn(
                                    "px-4 py-1.5 text-sm font-medium rounded-md transition-all",
                                    activeTab === 'opportunities'
                                        ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm"
                                        : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                                )}
                            >
                                Opportunities
                            </button>
                            <button
                                onClick={() => { setActiveTab('scheduled'); setCurrentPage(1); }}
                                className={cn(
                                    "px-4 py-1.5 text-sm font-medium rounded-md transition-all",
                                    activeTab === 'scheduled'
                                        ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm"
                                        : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                                )}
                            >
                                Scheduled Callbacks
                            </button>
                            <button
                                onClick={() => { setActiveTab('logs'); setCurrentPage(1); }}
                                className={cn(
                                    "px-4 py-1.5 text-sm font-medium rounded-md transition-all",
                                    activeTab === 'logs'
                                        ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm"
                                        : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                                )}
                            >
                                Call Logs
                            </button>
                        </div>

                        <div className="flex items-center gap-4">
                            {/* Search Bar */}
                            <div className="relative w-full sm:w-auto">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                <input
                                    type="text"
                                    placeholder="Search..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="pl-9 pr-4 py-1.5 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-royal-500/20 w-full sm:w-48 transition-all focus:w-full sm:focus:w-64"
                                />
                            </div>

                            <div className="h-6 w-px bg-slate-200 dark:bg-slate-800 mx-2 hidden sm:block"></div>

                            <h2 className="font-semibold text-slate-800 dark:text-white flex items-center gap-2">
                                <span className="hidden sm:inline">
                                    {activeTab === 'opportunities' ? 'Leads' : activeTab === 'scheduled' ? 'Callbacks' : 'Logs'}
                                </span>
                                <span className="text-xs font-normal text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full">
                                    {filteredItems.length}
                                </span>
                            </h2>

                            {/* Pagination Controls (Top) */}
                            <div className="flex items-center gap-2 text-sm text-slate-500">
                                <span className="mr-2">Page {currentPage} of {Math.max(1, totalPages)}</span>
                                <button
                                    disabled={currentPage === 1}
                                    onClick={() => setCurrentPage(p => p - 1)}
                                    className="p-1 rounded hover:bg-slate-200 disabled:opacity-30"
                                >
                                    <ChevronLeft className="w-4 h-4" />
                                </button>
                                <button
                                    disabled={currentPage === totalPages || totalPages === 0}
                                    onClick={() => setCurrentPage(p => p + 1)}
                                    className="p-1 rounded hover:bg-slate-200 disabled:opacity-30"
                                >
                                    <ChevronRight className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    </div>

                    {loading ? (
                        <div className="p-20 flex flex-col items-center justify-center text-slate-400">
                            <Loader2 className="w-10 h-10 animate-spin mb-4 text-royal-600" />
                            <p>Loading data...</p>
                        </div>
                    ) : filteredItems.length === 0 ? (
                        <div className="p-20 text-center text-slate-500">
                            <div className="mx-auto w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                                <Phone className="w-8 h-8 text-slate-300" />
                            </div>
                            <h3 className="text-lg font-medium text-slate-900">No items found</h3>
                            <p className="text-slate-400 max-w-sm mx-auto mt-1">
                                No {activeTab} found for the selected view.
                            </p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-slate-50/80 dark:bg-slate-900/80 border-b border-slate-200 dark:border-slate-800">
                                        <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider w-[180px]">Date & Time</th>
                                        <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider w-[240px]">Customer</th>
                                        <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Address</th>
                                        <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider w-[140px]">Status</th>
                                        <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider w-[140px]">{activeTab === 'logs' ? 'Disconnection Reason' : 'Outcome'}</th>
                                        {activeTab === 'scheduled' && (
                                            <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider w-[100px] text-right">Actions</th>
                                        )}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                    {paginatedItems.map((call) => {
                                        const customData = call.custom_analysis_data || {};
                                        // Determine timestamp
                                        // For scheduled, we might want to show nextCallbackTime instead of receivedAt
                                        let timestamp;
                                        if (activeTab === 'scheduled') {
                                            // Schema uses scheduledFor
                                            timestamp = call.scheduledFor || call.nextCallbackTime || customData.nextCallbackTime;
                                        } else if (activeTab === 'logs') {
                                            // Use normalized timestamp if available
                                            timestamp = call._timestamp || call.startTime || call.startedAt || call.callStartedAt || call.receivedAt || call.scheduledFor;
                                        } else {
                                            timestamp = call.receivedAt || call.callStartedAt;
                                        }

                                        let dateObj = timestamp?.seconds ? new Date(timestamp.seconds * 1000) : new Date(timestamp || new Date());
                                        const isBooked = customData.appointmentBooked || call.appointmentBooked;

                                        // Address fallback
                                        // Priority: 1. Top level, 2. custom_analysis_data, 3. customAnalysisDataRaw, 4. callAnalysis, 5. City fallback
                                        let address = call.address ||
                                            customData.address ||
                                            call.customAnalysisDataRaw?.address ||
                                            call.callAnalysis?.address ||
                                            call.city ||
                                            customData.city ||
                                            "Unknown Location";

                                        // Handle names/phone
                                        let firstName = customData.firstName || call.firstName || "Unknown";
                                        let lastName = customData.lastName || call.lastName || "";
                                        let phoneNumber = call.phoneNumber || customData.customerPhone;

                                        // Lookup Helper for "Unknown" names in Logs
                                        if ((activeTab === 'scheduled' || activeTab === 'logs')) {
                                            // 1. Try attached leadData
                                            if (call.leadData) {
                                                firstName = call.leadData.firstName || firstName;
                                                lastName = call.leadData.lastName || lastName;
                                                phoneNumber = call.leadData.phone || phoneNumber;
                                                address = call.leadData.address || address;
                                            }
                                            // 2. Try looking up in the 'leads' array (Opportunities)
                                            else if (phoneNumber) {
                                                // Normalize helper: remove non-digits, compare last 10 chars
                                                const clean = (p: string) => p?.replace(/\D/g, '').slice(-10) || "";
                                                const targetPhone = clean(phoneNumber);

                                                const matchingLead = leads.find(l => {
                                                    const p1 = clean(l.phoneNumber);
                                                    const p2 = clean(l.custom_analysis_data?.customerPhone);
                                                    return (p1 && p1 === targetPhone) || (p2 && p2 === targetPhone);
                                                });

                                                if (matchingLead) {
                                                    const leadCustomData = matchingLead.custom_analysis_data || {};
                                                    firstName = leadCustomData.firstName || matchingLead.firstName || firstName;
                                                    lastName = leadCustomData.lastName || matchingLead.lastName || lastName;

                                                    // Only override address if it's currently generic/unknown
                                                    if (!address || address === "Unknown Location") {
                                                        address = matchingLead.address ||
                                                            leadCustomData.address ||
                                                            matchingLead.customAnalysisDataRaw?.address ||
                                                            matchingLead.callAnalysis?.address ||
                                                            matchingLead.city ||
                                                            leadCustomData.city ||
                                                            address;
                                                    }
                                                }
                                            }
                                        }

                                        // Merge enriched data back into a display object so the Modal receives it too
                                        const enrichedCall = {
                                            ...call,
                                            firstName,
                                            lastName,
                                            phoneNumber,
                                            address
                                        };

                                        // Check for future callback
                                        const nextCallbackTimeRaw = call.scheduledFor || call.nextCallbackTime || customData.nextCallbackTime;
                                        const nextCallbackDate = nextCallbackTimeRaw?.seconds ? new Date(nextCallbackTimeRaw.seconds * 1000) : (nextCallbackTimeRaw ? new Date(nextCallbackTimeRaw) : null);
                                        const isFutureCallback = nextCallbackDate && isAfter(nextCallbackDate, new Date());

                                        // Check for no contact / voicemail / follow up needs
                                        const outcome = (call.callOutcome || customData.callOutcome || "unknown").toLowerCase();
                                        const status = (call.callStatus || "unknown").toLowerCase();

                                        const isOrangeCondition =
                                            call.callStatus === 'follow_up' ||
                                            isFutureCallback ||
                                            outcome === 'voicemail' ||
                                            outcome === 'no_answer' ||
                                            outcome === 'not_connected' ||
                                            outcome === 'unsuccessful' ||
                                            outcome === 'unknown' ||
                                            status === 'unknown' ||
                                            customData.in_voicemail === true ||
                                            call.in_voicemail === true;


                                        const isSupplyOnly = call.customAnalysisDataRaw?.status === 'Supply Only';
                                        const isDeadLead = call.callStatus === 'dead' || outcome === 'not_interested' || outcome === 'dnc';

                                        // Check for urgent (Booked but missing CRM Lead ID OR Negative Sentiment)
                                        const hasCrmId = call.crmLeadId || customData.crmLeadId;
                                        const sentiment = (customData.user_sentiment || call.callAnalysis?.user_sentiment || "").toLowerCase();
                                        const isUrgent = (isBooked && !hasCrmId) || sentiment === 'negative' || call.isUrgent === true;

                                        return (
                                            <tr
                                                key={call.id || Math.random()}
                                                onClick={() => setSelectedCall(enrichedCall)}
                                                className={cn(
                                                    "group cursor-pointer transition-all duration-200",
                                                    isUrgent
                                                        ? "bg-blue-200/80 dark:bg-blue-900/50 hover:bg-blue-300/80 dark:hover:bg-blue-800/60"
                                                        : isBooked
                                                            ? "bg-green-200/80 dark:bg-green-900/50 hover:bg-green-300/80 dark:hover:bg-green-800/60"

                                                            : isDeadLead
                                                                ? "bg-red-100/70 dark:bg-red-900/30 hover:bg-red-200/70 dark:hover:bg-red-900/50"
                                                                : isSupplyOnly
                                                                    ? "bg-purple-100/70 dark:bg-purple-900/30 hover:bg-purple-200/70 dark:hover:bg-purple-900/50"
                                                                    : (call.callStatus === 'scheduled_outside_hours' || call.callStatus === 'registered')
                                                                        ? "bg-yellow-100/70 dark:bg-yellow-900/30 hover:bg-yellow-200/70 dark:hover:bg-yellow-900/50"
                                                                        : isOrangeCondition

                                                                            ? "bg-orange-200/80 dark:bg-orange-900/50 hover:bg-orange-300/80 dark:hover:bg-orange-800/60"
                                                                            : "hover:bg-blue-50/30 dark:hover:bg-blue-900/10"
                                                )}
                                            >
                                                {/* Date Block */}
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="flex flex-col">
                                                        <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                                                            {format(dateObj, "MMM d, yyyy")}
                                                        </span>
                                                        <div className="flex items-center gap-1.5 text-xs text-slate-400 mt-1">
                                                            {activeTab === 'scheduled' ? (
                                                                <>
                                                                    <Clock className="w-3 h-3 text-amber-500" />
                                                                    <span className="text-amber-600 font-medium">Scheduled: {format(dateObj, "h:mm a")}</span>
                                                                </>
                                                            ) : (
                                                                <>
                                                                    <Clock className="w-3 h-3" />
                                                                    {format(dateObj, "h:mm a")}
                                                                </>
                                                            )}
                                                        </div>
                                                    </div>
                                                </td>

                                                {/* Customer Block */}
                                                <td className="px-6 py-4">
                                                    <div className="flex items-start gap-3">
                                                        <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 shrink-0">
                                                            <User className="w-4 h-4" />
                                                        </div>
                                                        <div>
                                                            <p className="text-sm font-medium text-slate-900 dark:text-white">
                                                                {firstName} {lastName}
                                                            </p>
                                                            <p className="text-xs text-slate-500 mt-0.5 font-mono">
                                                                {phoneNumber}
                                                            </p>
                                                        </div>
                                                    </div>
                                                </td>

                                                {/* Address Block */}
                                                <td className="px-6 py-4">
                                                    <div className="text-sm text-slate-600 dark:text-slate-400 max-w-[250px] truncate">
                                                        {address}
                                                    </div>
                                                    {call.crmLeadId && (
                                                        <div className="inline-flex items-center gap-1 px-1.5 py-0.5 mt-1 rounded bg-slate-100 dark:bg-slate-800 text-[10px] font-mono text-slate-500">
                                                            LEAD: {call.crmLeadId}
                                                        </div>
                                                    )}
                                                </td>

                                                {/* Status Pill */}
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="flex flex-col gap-1.5 items-start">
                                                        <span className={cn(
                                                            "px-2.5 py-1 rounded-full text-xs font-medium inline-flex items-center gap-1.5",
                                                            (call.callStatus === "ended" || call.callStatus === "registered") ? "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300" : "bg-amber-50 text-amber-700"
                                                        )}>
                                                            <span className={cn("w-1.5 h-1.5 rounded-full", (call.callStatus === "ended" || call.callStatus === "registered") ? "bg-slate-400" : "bg-amber-400")}></span>
                                                            {call.callStatus || "Unknown"}
                                                        </span>
                                                        {call.callbackAttemptNumber !== undefined && (
                                                            <span className="text-[10px] uppercase tracking-wide font-medium text-slate-400 px-1">
                                                                Attempt #{call.callbackAttemptNumber}
                                                            </span>
                                                        )}
                                                    </div>
                                                </td>

                                                {/* Outcome/Result */}
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    {isBooked ? (
                                                        <span className="flex items-center gap-1.5 text-sm text-green-700 dark:text-green-400 font-medium bg-green-50 dark:bg-green-900/20 px-3 py-1 rounded-full w-fit">
                                                            <CheckCircle className="w-4 h-4" />
                                                            Booked
                                                        </span>
                                                    ) : (
                                                        <div className="flex flex-col">
                                                            <span className="text-sm text-slate-500 capitalize px-2">
                                                                {(() => {
                                                                    const reason = call.disconnection_reason ||
                                                                        call.callAnalysis?.disconnection_reason ||
                                                                        call.customAnalysisDataRaw?.disconnection_reason;

                                                                    const outcome = call.callOutcome || "No outcome";
                                                                    const isFailure = outcome === 'failed' || outcome === 'error' || outcome === 'Unknown';

                                                                    if (isFailure || reason) {
                                                                        // Prefer reason, fallback to "Unsuccessful" (hiding strict "failed")
                                                                        return (reason || "Unsuccessful").replace(/_/g, " ");
                                                                    }
                                                                    return outcome;
                                                                })()}
                                                            </span>
                                                        </div>
                                                    )}
                                                </td>
                                                {/* Actions (Only for Scheduled) */}
                                                {activeTab === 'scheduled' && (
                                                    <td className="px-6 py-4 whitespace-nowrap text-right">
                                                        {isFutureCallback && (
                                                            <button
                                                                onClick={(e) => handleRemoveScheduled(e, call.id)}
                                                                className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                                                title="Remove from scheduled list"
                                                            >
                                                                <Trash2 className="w-4 h-4" />
                                                            </button>
                                                        )}
                                                    </td>
                                                )}
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {/* Bottom Pagination */}
                    {filteredItems.length > 0 && (
                        <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex justify-end">
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                    disabled={currentPage === 1}
                                    className="px-3 py-1 text-sm rounded border bg-white disabled:opacity-50 hover:bg-slate-50"
                                >
                                    Previous
                                </button>
                                <button
                                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                    disabled={currentPage === totalPages}
                                    className="px-3 py-1 text-sm rounded border bg-white disabled:opacity-50 hover:bg-slate-50"
                                >
                                    Next
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </main>

            <CallDetailModal
                isOpen={!!selectedCall}
                onClose={() => setSelectedCall(null)}
                call={selectedCall}
                onViewOpportunity={activeTab === 'logs' ? handleViewOpportunity : undefined}
                onLeadUpdate={handleLeadUpdate}
            />

            <AddLeadModal
                isOpen={isAddLeadOpen}
                onClose={() => setIsAddLeadOpen(false)}
                onSuccess={() => {
                    // Refresh data or show success toast
                    console.log("Lead added successfully");
                    // Optionally trigger a refresh of the calls list here if we had a dedicated refresh function exposed or by tweaking an effect dependency
                }}
            />
        </div>
    );
}
