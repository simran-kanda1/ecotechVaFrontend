import { Dialog } from "@radix-ui/react-dialog";
import { Info, X, Clock, Calendar } from "lucide-react";

interface DashboardLegendModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export function DashboardLegendModal({ isOpen, onClose }: DashboardLegendModalProps) {
    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            {isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 text-left">
                    <div
                        className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity animate-in fade-in"
                        onClick={onClose}
                    />

                    <div className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-2xl shadow-xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-200 border border-slate-200 dark:border-slate-800">
                        {/* Header */}
                        <div className="flex-none px-6 py-4 bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center">
                            <div>
                                <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                    <Info className="w-5 h-5 text-royal-600" />
                                    Dashboard Legend & Info
                                </h2>
                                <p className="text-xs text-slate-500 mt-1">
                                    Explanation of row colours, call statuses, and callback schedules.
                                </p>
                            </div>
                            <button
                                onClick={onClose}
                                className="p-2 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-full transition-colors"
                            >
                                <X className="w-5 h-5 text-slate-500" />
                            </button>
                        </div>

                        {/* Content */}
                        <div className="p-6 overflow-y-auto max-h-[80vh] space-y-6">

                            {/* Row Colors Section */}
                            <div>
                                <h3 className="text-sm font-semibold text-slate-900 dark:text-white uppercase tracking-wider mb-3">
                                    Row Colors
                                </h3>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <div className="flex items-start gap-3 p-3 rounded-lg bg-blue-100/80 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800">
                                        <div className="w-4 h-4 mt-0.5 rounded-full bg-blue-400 shrink-0"></div>
                                        <div>
                                            <p className="font-semibold text-sm text-blue-900 dark:text-blue-100">Urgent</p>
                                            <p className="text-xs text-blue-700 dark:text-blue-300 mt-0.5">Negative sentiment or issue with booking/adding the requested date and time to the CRM.</p>
                                        </div>
                                    </div>
                                    <div className="flex items-start gap-3 p-3 rounded-lg bg-green-100/80 dark:bg-green-900/30 border border-green-200 dark:border-green-800">
                                        <div className="w-4 h-4 mt-0.5 rounded-full bg-green-400 shrink-0"></div>
                                        <div>
                                            <p className="font-semibold text-sm text-green-900 dark:text-green-100">Booked</p>
                                            <p className="text-xs text-green-700 dark:text-green-300 mt-0.5">Appointment has been successfully booked.</p>
                                        </div>
                                    </div>
                                    <div className="flex items-start gap-3 p-3 rounded-lg bg-red-100/80 dark:bg-red-900/30 border border-red-200 dark:border-red-800">
                                        <div className="w-4 h-4 mt-0.5 rounded-full bg-red-400 shrink-0"></div>
                                        <div>
                                            <p className="font-semibold text-sm text-red-900 dark:text-red-100">Dead Lead</p>
                                            <p className="text-xs text-red-700 dark:text-red-300 mt-0.5">Not interested, requested DNC, or marked dead.</p>
                                        </div>
                                    </div>
                                    <div className="flex items-start gap-3 p-3 rounded-lg bg-purple-100/80 dark:bg-purple-900/30 border border-purple-200 dark:border-purple-800">
                                        <div className="w-4 h-4 mt-0.5 rounded-full bg-purple-400 shrink-0"></div>
                                        <div>
                                            <p className="font-semibold text-sm text-purple-900 dark:text-purple-100">Supply Only</p>
                                            <p className="text-xs text-purple-700 dark:text-purple-300 mt-0.5">Status is 'Supply Only' based on notes.</p>
                                        </div>
                                    </div>
                                    <div className="flex items-start gap-3 p-3 rounded-lg bg-orange-100/80 dark:bg-orange-900/30 border border-orange-200 dark:border-orange-800">
                                        <div className="w-4 h-4 mt-0.5 rounded-full bg-orange-400 shrink-0"></div>
                                        <div>
                                            <p className="font-semibold text-sm text-orange-900 dark:text-orange-100">Needs Follow-Up / Voicemail</p>
                                            <p className="text-xs text-orange-700 dark:text-orange-300 mt-0.5">Left voicemail, missed call, or slated for follow-up.</p>
                                        </div>
                                    </div>
                                    <div className="flex items-start gap-3 p-3 rounded-lg bg-yellow-100/80 dark:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-800">
                                        <div className="w-4 h-4 mt-0.5 rounded-full bg-yellow-400 shrink-0"></div>
                                        <div>
                                            <p className="font-semibold text-sm text-yellow-900 dark:text-yellow-100">Registered / Outside Hours</p>
                                            <p className="text-xs text-yellow-700 dark:text-yellow-300 mt-0.5">Call triggered outside active agent hours or just registered.</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Statuses and Labels */}
                            <div>
                                <h3 className="text-sm font-semibold text-slate-900 dark:text-white uppercase tracking-wider mb-3">
                                    Labels & Tags
                                </h3>
                                <ul className="space-y-3">
                                    <li className="flex items-start gap-3 text-sm text-slate-600 dark:text-slate-400">
                                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-[10px] font-mono text-slate-500 whitespace-nowrap mt-0.5">
                                            LEAD: 123456
                                        </span>
                                        <p>Indicates the lead ID exported or matched with your CRM.</p>
                                    </li>
                                    <li className="flex items-start gap-3 text-sm text-slate-600 dark:text-slate-400">
                                        <div className="inline-flex items-center px-2 py-1 rounded-md bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[10px] font-mono whitespace-nowrap mt-0.5 shadow-sm">
                                            OppID-456
                                        </div>
                                        <p>Displays the current corresponding custom Opportunity ID for the lead directly in the database.</p>
                                    </li>
                                    <li className="flex items-start gap-3 text-sm text-slate-600 dark:text-slate-400">
                                        <span className="text-[10px] uppercase tracking-wide font-medium text-slate-500 px-1 py-0.5 bg-slate-100 dark:bg-slate-800 rounded mt-0.5">
                                            Attempt #N
                                        </span>
                                        <p>Tracks how many times the voice agent has attempted to call the lead so far.</p>
                                    </li>
                                </ul>
                            </div>

                            {/* Calling Schedule and Callbacks */}
                            <div>
                                <h3 className="text-sm font-semibold text-slate-900 dark:text-white uppercase tracking-wider mb-3">
                                    Callback & Agent Schedule
                                </h3>

                                <div className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-4 space-y-4">
                                    <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                                        <Calendar className="w-5 h-5 text-indigo-500" />
                                        <span className="font-semibold text-sm">Agent Calling Hours</span>
                                    </div>
                                    <p className="text-sm text-slate-600 dark:text-slate-400 ml-7">
                                        <strong>9:00 AM to 9:00 PM</strong>, Monday through Saturday.
                                        <br />
                                        <span className="text-blue-600 dark:text-blue-400 font-medium">No calls are made on Sundays.</span>
                                    </p>

                                    <div className="h-px bg-slate-200 dark:bg-slate-800 my-2"></div>

                                    <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                                        <Clock className="w-5 h-5 text-indigo-500" />
                                        <span className="font-semibold text-sm">Daily Callback Times</span>
                                    </div>
                                    <ul className="list-disc list-outside ml-12 text-sm text-slate-600 dark:text-slate-400 space-y-2">
                                        <li><strong>Initial Call:</strong> Placed at <strong>9:00 AM</strong> if the lead came in after hours, or immediately after the lead is received during business hours.</li>
                                        <li><strong>Standard Callbacks:</strong> Scheduled at <strong>12:00 PM</strong>, <strong>5:30 PM</strong>, and <strong>8:00 PM</strong>.</li>
                                        <li><strong>Leads older than 14 days:</strong> Scheduled callbacks will only occur at <strong>11:00 AM</strong> and <strong>6:30 PM</strong>.</li>
                                        <li><strong>Leads older than 30 days:</strong> No further scheduled callbacks will be made.</li>
                                    </ul>
                                </div>
                            </div>

                        </div>
                    </div>
                </div>
            )}
        </Dialog>
    );
}
