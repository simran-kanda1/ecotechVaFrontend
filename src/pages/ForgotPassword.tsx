import { useState } from "react";
import { Link } from "react-router-dom";
import { sendPasswordResetEmail } from "firebase/auth";
import { auth } from "../lib/firebase";
import { Loader2, Mail, ArrowLeft, CheckCircle2 } from "lucide-react";
import { Button } from "../components/ui-components";

export default function ForgotPassword() {
    const [email, setEmail] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);

    const handleReset = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError("");

        try {
            // Include Action URL here for firebase reset link if needed
            // By default it uses the domain verified under firebase auth
            // but we can pass standard action code settings if required.
            await sendPasswordResetEmail(auth, email);
            setSuccess(true);
        } catch (err: any) {
            console.error(err);
            // Handling vague error
            setError("Failed to send reset email. Verify the email address and try again.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="w-full min-h-screen lg:grid lg:grid-cols-2">
            <div className="hidden lg:flex flex-col justify-between bg-zinc-950 p-10 text-white relative overflow-hidden">
                <div className="absolute inset-0 bg-zinc-950">
                    <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1557683316-973673baf926?q=80&w=2029&auto=format&fit=crop')] bg-cover bg-center opacity-30 mix-blend-overlay"></div>
                    <div className="absolute inset-0 bg-gradient-to-tr from-black via-zinc-900/90 to-blue-900/20"></div>
                </div>

                <div className="relative z-10 flex items-center text-lg font-medium tracking-tight gap-3">
                    <img src="/simvana-logo.png" alt="Simvana Logo" className="w-8 h-8 rounded-lg" />
                    Simvana Digital Agency
                </div>
                <div className="relative z-10 mt-auto">
                    <p className="text-lg leading-relaxed text-slate-200">
                        Advanced AI Voice Agent Dashboard for monitoring calls, managing leads, and tracking performance in real-time.
                    </p>
                </div>
            </div>

            <div className="flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-white dark:bg-slate-950">
                <div className="mx-auto flex w-full flex-col justify-center space-y-6 sm:w-[380px]">
                    <div className="flex flex-col space-y-2 text-center">
                        <h1 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-white">
                            Reset Password
                        </h1>
                        <p className="text-sm text-slate-500 dark:text-slate-400">
                            Enter your email address and we'll send you a link to reset your password.
                        </p>
                    </div>

                    {success ? (
                        <div className="flex flex-col items-center gap-4 text-center mt-4">
                            <div className="w-12 h-12 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center text-green-600 dark:text-green-500">
                                <CheckCircle2 className="w-6 h-6" />
                            </div>
                            <h3 className="text-lg font-medium text-slate-900 dark:text-white">Email Sent</h3>
                            <p className="text-sm text-slate-500 mb-2">Check your inbox at <strong>{email}</strong> for instructions on how to reset your password.</p>
                            <Link to="/login" className="w-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-900 dark:text-white py-2.5 rounded-lg font-medium transition-colors mt-2 text-center text-sm">
                                Back to Login
                            </Link>
                        </div>
                    ) : (
                        <form onSubmit={handleReset} className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium leading-none text-slate-700 dark:text-slate-200" htmlFor="email">
                                    Email
                                </label>
                                <div className="relative">
                                    <Mail className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                                    <input
                                        id="email"
                                        type="email"
                                        placeholder="name@example.com"
                                        className="flex h-10 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 pl-9 text-sm ring-offset-white placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-royal-600 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-800 dark:bg-slate-950 dark:ring-offset-slate-950 dark:placeholder:text-slate-500 transition-all"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        required
                                    />
                                </div>
                            </div>

                            {error && (
                                <div className="text-red-600 text-xs text-center bg-red-50 dark:bg-red-900/10 py-2.5 rounded-lg border border-red-100 dark:border-red-900/20 font-medium leading-relaxed px-2">
                                    {error}
                                </div>
                            )}

                            <Button
                                className="w-full bg-royal-600 hover:bg-royal-700 text-white font-semibold h-11"
                                type="submit"
                                disabled={loading || !email}
                            >
                                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                {loading ? "Sending..." : "Send Reset Link"}
                            </Button>

                            <div className="mt-4 text-center">
                                <Link to="/login" className="text-sm font-medium text-royal-600 hover:text-royal-500 hover:underline flex items-center justify-center gap-1.5 transition-colors p-2">
                                    <ArrowLeft className="w-4 h-4" />
                                    Back to login
                                </Link>
                            </div>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
}
