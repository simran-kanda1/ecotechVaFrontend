import { Dialog } from "@radix-ui/react-dialog";
import { X, Calendar, User, MessageSquare, Phone, MapPin, FileText, CheckCircle2, Tag, Mail, Music, BrainCircuit, History, Clock } from "lucide-react";
import { cn } from "../lib/utils";
import { format } from "date-fns";

interface CallDetailModalProps {
    isOpen: boolean;
    onClose: () => void;
    call: any;
    onViewOpportunity?: (call: any) => void;
}

export function CallDetailModal({ isOpen, onClose, call, onViewOpportunity }: CallDetailModalProps) {
    if (!call) return null;

    // Robust data extraction to handle various nesting structures
    // Priority: 1. call object (root)
    //           2. custom_analysis_data (variable)
    //           3. callAnalysis.custom_analysis_data (nested)
    //           4. customAnalysisDataRaw (backend raw)

    const getValue = (key: string) => {
        // 1. Check root
        if (call[key] !== undefined && call[key] !== null && call[key] !== "") return call[key];

        // 2. Check custom_analysis_data
        const custom = call.custom_analysis_data;
        if (custom && custom[key] !== undefined && custom[key] !== null && custom[key] !== "") return custom[key];

        // 3. Check callAnalysis.custom_analysis_data
        const analysisCustom = call.callAnalysis?.custom_analysis_data;
        if (analysisCustom && analysisCustom[key] !== undefined && analysisCustom[key] !== null && analysisCustom[key] !== "") return analysisCustom[key];

        // 4. Check customAnalysisDataRaw
        const raw = call.customAnalysisDataRaw;
        if (raw && raw[key] !== undefined && raw[key] !== null && raw[key] !== "") return raw[key];

        return undefined;
    };

    const analysis = call.callAnalysis || {};

    // Data extraction using the helper
    const firstName = getValue('firstName') || getValue('customerName')?.split(' ')[0] || "Unknown";
    const lastName = getValue('lastName') || "";
    const email = getValue('email') || getValue('customerEmail') || "N/A";
    const phone = getValue('phoneNumber') || getValue('phone') || getValue('customerPhone') || "N/A";
    const address = getValue('address') || analysis.address || "No address provided";

    // Key Info Fields requested
    const hadPreviousQuote = getValue('hadPreviousQuote');
    const region = getValue('region') || "YYZ";
    const salesperson = getValue('salespersonAssigned');
    const appointmentDate = getValue('appointmentDate');
    const appointmentTime = getValue('appointmentTime');
    const productsInterested = getValue('productsInterested');
    const appointmentBooked = getValue('appointmentBooked') === true;
    const crmLeadId = getValue('crmLeadId');
    const userSentiment = getValue('user_sentiment') || getValue('userSentiment');
    const lastCallTime = getValue('lastCallbackTriggeredAt') || getValue('callEndedAt') || getValue('callStartedAt') || getValue('receivedAt');

    // Shim for backward compatibility with existing JSX that uses customData.*
    const customData = {
        appointmentBooked,
        crmLeadId,
        user_sentiment: userSentiment,
        // Add other fields accessed via customData in the JSX
        hadPreviousQuote,
        salespersonAssigned: salesperson,
        appointmentDate,
        appointmentTime,
        productsInterested,
        recordingUrl: getValue('recordingUrl')
    };

    // Callback Info
    const nextCallbackTime = getValue('nextCallbackTime');
    const callbackAttempt = getValue('callbackAttemptNumber') || getValue('nextCallbackAttempt');
    const hasCallbacks = !!nextCallbackTime || (callbackAttempt && callbackAttempt > 0);

    // Handling transcripts
    const transcript = call.transcript || analysis.transcript || "No transcript available.";
    const recordingUrl = call.recordingUrl || customData.recordingUrl;

    // Helper to format Product list
    const formatProducts = (products: any) => {
        if (!products) return "None specified";
        if (Array.isArray(products)) return products.join(", ");
        return products;
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            {isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 text-left">
                    <div
                        className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity animate-in fade-in"
                        onClick={onClose}
                    />

                    <div className="relative w-full max-w-5xl max-h-[90vh] bg-white dark:bg-slate-900 rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-200 border border-slate-200 dark:border-slate-800">
                        {/* Header - Royal Blue Gradient */}
                        <div className="flex-none p-6 bg-gradient-to-r from-royal-900 to-royal-800 text-white flex justify-between items-start">
                            <div>
                                <div className="flex items-center gap-4">
                                    <span className={cn(
                                        "p-3 rounded-xl bg-white/10 backdrop-blur-md border border-white/20",
                                        customData.appointmentBooked ? "text-green-300" : "text-slate-300"
                                    )}>
                                        {customData.appointmentBooked ? <CheckCircle2 className="w-8 h-8" /> : <Phone className="w-8 h-8" />}
                                    </span>
                                    <div>
                                        <h2 className="text-2xl font-bold tracking-tight">
                                            {firstName} {lastName}
                                        </h2>
                                        <div className="flex items-center gap-3 text-royal-200 text-sm mt-1.5">
                                            <div className="flex items-center gap-1">
                                                <Phone className="w-3.5 h-3.5" />
                                                {phone}
                                            </div>
                                            <span className="text-royal-600/50">|</span>
                                            <div className="flex items-center gap-1">
                                                <Mail className="w-3.5 h-3.5" />
                                                {email}
                                            </div>
                                            <span className="text-royal-600/50">|</span>
                                            <div className="flex items-center gap-1">
                                                <MapPin className="w-3.5 h-3.5" />
                                                {address}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <button
                                onClick={onClose}
                                className="p-2 hover:bg-white/10 rounded-full transition-colors"
                            >
                                <X className="w-6 h-6 opacity-80" />
                            </button>
                        </div>

                        {/* Content */}
                        <div className="flex-1 overflow-y-auto bg-slate-50 dark:bg-slate-950">
                            <div className="p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">

                                {/* LEFT COLUMN: Summary & Transcript (7 cols) */}
                                <div className="lg:col-span-7 space-y-6">

                                    {/* AI Summary Card */}
                                    <div className="bg-white dark:bg-slate-900 rounded-xl p-6 shadow-sm border border-slate-100 dark:border-slate-800">
                                        <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                                            <BrainCircuit className="w-4 h-4 text-royal-600" />
                                            AI Summary
                                        </h3>
                                        <p className="text-slate-700 dark:text-slate-300 leading-relaxed text-sm">
                                            {analysis.call_summary || call.callSummary || "No summary generated."}
                                        </p>

                                        {/* Analyzed Tags */}
                                        <div className="mt-5 flex flex-wrap gap-2">
                                            {customData.user_sentiment && (
                                                <span className={cn(
                                                    "px-3 py-1 rounded-full text-xs font-semibold border",
                                                    customData.user_sentiment === 'Positive' ? "bg-green-50 text-green-700 border-green-200" :
                                                        customData.user_sentiment === 'Negative' ? "bg-red-50 text-red-700 border-red-200" :
                                                            "bg-slate-50 text-slate-700 border-slate-200"
                                                )}>
                                                    {customData.user_sentiment} Sentiment
                                                </span>
                                            )}
                                            {productsInterested && (
                                                <span className="px-3 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200 flex items-center gap-1.5">
                                                    <Tag className="w-3 h-3" />
                                                    {formatProducts(productsInterested)}
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    {/* Transcript */}
                                    <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden flex flex-col h-[500px]">
                                        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex justify-between items-center shrink-0">
                                            <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                                                <MessageSquare className="w-4 h-4 text-royal-600" />
                                                Transcript
                                            </h3>
                                        </div>
                                        <div className="flex-1 p-6 overflow-y-auto bg-white dark:bg-black/20 font-mono text-sm text-slate-600 dark:text-slate-400 whitespace-pre-wrap leading-relaxed">
                                            {transcript}
                                        </div>
                                    </div>

                                </div>

                                {/* RIGHT COLUMN: Key Data Points (5 cols) */}
                                <div className="lg:col-span-5 space-y-6">

                                    {/* LEAD INFO BOX */}
                                    <div className="bg-white dark:bg-slate-900 rounded-xl p-6 shadow-sm border border-slate-100 dark:border-slate-800">
                                        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Lead Details</h4>

                                        <div className="space-y-4">
                                            {/* Region */}
                                            <div className="flex justify-between items-center py-2 border-b border-slate-50 dark:border-slate-800/50">
                                                <span className="text-sm text-slate-500">Region</span>
                                                <span className="text-sm font-medium text-slate-900 dark:text-slate-100">{region}</span>
                                            </div>

                                            {/* Previous Quote */}
                                            <div className="flex justify-between items-center py-2 border-b border-slate-50 dark:border-slate-800/50">
                                                <span className="text-sm text-slate-500">Previous Quote?</span>
                                                <span className={cn(
                                                    "text-sm font-medium",
                                                    hadPreviousQuote ? "text-amber-600" : "text-slate-900 dark:text-slate-100"
                                                )}>
                                                    {hadPreviousQuote === true ? "Yes" : "No"}
                                                </span>
                                            </div>

                                            {/* Products Interested */}
                                            <div className="flex justify-between items-center py-2 border-b border-slate-50 dark:border-slate-800/50">
                                                <span className="text-sm text-slate-500">Interest</span>
                                                <span className="text-sm font-medium text-slate-900 dark:text-slate-100 text-right max-w-[60%]">
                                                    {formatProducts(productsInterested)}
                                                </span>
                                            </div>

                                            {/* Lead ID */}
                                            {customData.crmLeadId && (
                                                <div className="flex justify-between items-center py-2">
                                                    <span className="text-sm text-slate-500">CRM Lead ID</span>
                                                    <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded text-xs font-mono text-slate-600 dark:text-slate-400">
                                                        <FileText className="w-3 h-3" />
                                                        {customData.crmLeadId}
                                                    </div>
                                                </div>
                                            )}

                                            {/* Last Called */}
                                            {lastCallTime && (
                                                <div className="flex justify-between items-center py-2 border-t border-slate-50 dark:border-slate-800/50 mt-2 pt-2">
                                                    <span className="text-sm text-slate-500 font-medium text-royal-600/80">Last Called</span>
                                                    <span className="text-sm font-medium text-slate-900 dark:text-slate-100">
                                                        {format(new Date(lastCallTime.seconds ? lastCallTime.seconds * 1000 : lastCallTime), "MMM d, h:mm a")}
                                                    </span>
                                                </div>
                                            )}

                                            {/* View Opportunity Button (for Logs) */}
                                            {onViewOpportunity && (
                                                <div className="mt-4 pt-2">
                                                    <button
                                                        onClick={() => onViewOpportunity(call)}
                                                        className="w-full flex items-center justify-center gap-2 py-2 px-4 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-sm font-medium transition-colors"
                                                    >
                                                        View Opportunity Details
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* APPOINTMENT STATUS */}
                                    {customData.appointmentBooked ? (
                                        <div className="bg-green-50/60 dark:bg-green-900/10 rounded-xl p-6 border border-green-100 dark:border-green-900/30">
                                            <h3 className="text-green-800 dark:text-green-400 font-bold flex items-center gap-2 mb-5">
                                                <CheckCircle2 className="w-5 h-5" />
                                                Appointment Booked
                                            </h3>

                                            <div className="space-y-4">
                                                <div className="flex items-start gap-4">
                                                    <div className="p-2 bg-green-100 dark:bg-green-900/40 rounded-lg text-green-700">
                                                        <Calendar className="w-5 h-5" />
                                                    </div>
                                                    <div>
                                                        <p className="text-xs text-green-700/70 font-bold uppercase tracking-wide">Date & Time</p>
                                                        <p className="text-lg font-bold text-green-900 dark:text-green-100">
                                                            {appointmentDate || "N/A"}
                                                        </p>
                                                        <p className="text-sm text-green-800 dark:text-green-200">
                                                            {appointmentTime || "Time not set"}
                                                        </p>
                                                    </div>
                                                </div>

                                                <div className="flex items-start gap-4">
                                                    <div className="p-2 bg-green-100 dark:bg-green-900/40 rounded-lg text-green-700">
                                                        <User className="w-5 h-5" />
                                                    </div>
                                                    <div>
                                                        <p className="text-xs text-green-700/70 font-bold uppercase tracking-wide">Salesperson</p>
                                                        <p className="font-semibold text-green-900 dark:text-green-100">
                                                            {salesperson || "Unassigned"}
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="bg-slate-100 dark:bg-slate-800 rounded-xl p-6 border border-slate-200 dark:border-slate-700 flex flex-col items-center justify-center text-center py-10">
                                            <div className="w-12 h-12 bg-slate-200 dark:bg-slate-700 rounded-full flex items-center justify-center mb-3">
                                                <Calendar className="w-6 h-6 text-slate-400" />
                                            </div>
                                            <p className="text-slate-500 font-medium">No Appointment Booked</p>
                                        </div>
                                    )}

                                    {/* CALLBACK INFO */}
                                    <div className="bg-white dark:bg-slate-900 rounded-xl p-6 shadow-sm border border-slate-100 dark:border-slate-800">
                                        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                                            <History className="w-4 h-4" />
                                            Callback Status
                                        </h4>

                                        {hasCallbacks ? (
                                            <div className="bg-sky-50 dark:bg-sky-900/10 rounded-lg p-4 border border-sky-100 dark:border-sky-800">
                                                <div className="flex items-center gap-3 mb-2">
                                                    <Clock className="w-5 h-5 text-sky-600" />
                                                    <span className="font-semibold text-sky-900 dark:text-sky-200">Next Callback Scheduled</span>
                                                </div>
                                                <p className="text-sm text-sky-700 dark:text-sky-300 pl-8">
                                                    {nextCallbackTime ? format(new Date(nextCallbackTime.seconds ? nextCallbackTime.seconds * 1000 : nextCallbackTime), "PPP 'at' p") : "Pending..."}
                                                </p>
                                                <div className="mt-2 pl-8 text-xs text-sky-600/70">
                                                    Attempt #{callbackAttempt || 1}
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="text-sm text-slate-500 flex items-center gap-2">
                                                <CheckCircle2 className="w-4 h-4 text-green-500" />
                                                No pending callbacks
                                            </div>
                                        )}
                                    </div>

                                    {/* RECORDING PLAYER */}
                                    {recordingUrl && (
                                        <div className="bg-royal-50 dark:bg-royal-900/10 rounded-xl p-4 border border-royal-100 dark:border-royal-800">
                                            <a
                                                href={recordingUrl}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-lg bg-royal-600 text-white shadow-md hover:bg-royal-700 transition-all font-medium"
                                            >
                                                <Music className="w-4 h-4" />
                                                Play Recording
                                            </a>
                                        </div>
                                    )}

                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </Dialog>
    );
}
