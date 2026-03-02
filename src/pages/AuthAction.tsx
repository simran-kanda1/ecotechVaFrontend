import { useState, useEffect } from "react";
import { useSearchParams, useNavigate, Link } from "react-router-dom";
import { verifyPasswordResetCode, confirmPasswordReset, applyActionCode } from "firebase/auth";
import { auth } from "../lib/firebase";
import { Loader2, Lock, CheckCircle2, AlertCircle, ArrowLeft } from "lucide-react";
import { Button } from "../components/ui-components";

export default function AuthAction() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();

    const mode = searchParams.get("mode");
    const oobCode = searchParams.get("oobCode");

    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [email, setEmail] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState(false);

    useEffect(() => {
        if (!mode || !oobCode) {
            setError("Invalid or missing action link.");
            setLoading(false);
            return;
        }

        if (mode === "resetPassword") {
            verifyPasswordResetCode(auth, oobCode)
                .then((emailRes) => {
                    setEmail(emailRes);
                    setLoading(false);
                })
                .catch((err) => {
                    console.error(err);
                    setError("The password reset link is invalid or has expired.");
                    setLoading(false);
                });
        } else if (mode === "verifyEmail") {
            applyActionCode(auth, oobCode)
                .then(() => {
                    setSuccess(true);
                    setLoading(false);
                })
                .catch((err) => {
                    console.error(err);
                    setError("The email verification link is invalid or has expired.");
                    setLoading(false);
                });
        } else {
            setError("Action not supported by this page.");
            setLoading(false);
        }
    }, [mode, oobCode]);

    const handleResetPassword = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");

        if (newPassword.length < 6) {
            setError("Password must be at least 6 characters.");
            return;
        }

        if (newPassword !== confirmPassword) {
            setError("Passwords do not match.");
            return;
        }

        if (!oobCode) return;

        setSubmitting(true);
        try {
            await confirmPasswordReset(auth, oobCode, newPassword);
            setSuccess(true);
        } catch (err: any) {
            console.error(err);
            setError("Failed to reset password. Please try again.");
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-royal-600" />
            </div>
        );
    }

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
                        Securely manage your credentials and regain access to the Advanced AI Voice Agent Dashboard.
                    </p>
                </div>
            </div>

            <div className="flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-white dark:bg-slate-950">
                <div className="mx-auto flex w-full flex-col justify-center space-y-6 sm:w-[380px]">
                    <div className="flex flex-col space-y-2 text-center">
                        <h1 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-white">
                            {mode === "resetPassword" ? "Reset Password" : mode === "verifyEmail" ? "Verify Email" : "Authentication"}
                        </h1>
                        <p className="text-sm text-slate-500 dark:text-slate-400">
                            {mode === "resetPassword" && email
                                ? `Create a new password for ${email}`
                                : mode === "verifyEmail"
                                    ? "We are verifying your email address."
                                    : "Secure account management"}
                        </p>
                    </div>

                    {error ? (
                        <div className="flex flex-col items-center gap-4 text-center">
                            <div className="w-12 h-12 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center text-red-600 dark:text-red-500">
                                <AlertCircle className="w-6 h-6" />
                            </div>
                            <div className="text-red-600 text-sm font-medium">{error}</div>
                            <Link to="/login" className="text-sm font-medium text-royal-600 hover:text-royal-500 flex items-center gap-1.5 mt-2">
                                <ArrowLeft className="w-4 h-4" />
                                Back to Login
                            </Link>
                        </div>
                    ) : success ? (
                        <div className="flex flex-col items-center gap-4 text-center">
                            <div className="w-12 h-12 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center text-green-600 dark:text-green-500">
                                <CheckCircle2 className="w-6 h-6" />
                            </div>
                            <h3 className="text-lg font-medium text-slate-900 dark:text-white">
                                {mode === "resetPassword" ? "Password Updated" : "Email Verified"}
                            </h3>
                            <p className="text-sm text-slate-500 mb-2">
                                {mode === "resetPassword"
                                    ? "Your password has been successfully reset. You can now log in with your new credentials."
                                    : "Your email has been successfully verified. You can now access your account."}
                            </p>
                            <Button onClick={() => navigate("/login")} className="w-full bg-royal-600 hover:bg-royal-700 h-11">
                                Go to Login
                            </Button>
                        </div>
                    ) : mode === "resetPassword" ? (
                        <form onSubmit={handleResetPassword} className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium leading-none text-slate-700 dark:text-slate-200" htmlFor="new-password">
                                    New Password
                                </label>
                                <div className="relative">
                                    <Lock className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                                    <input
                                        id="new-password"
                                        type="password"
                                        className="flex h-10 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 pl-9 text-sm ring-offset-white placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-royal-600 focus-visible:ring-offset-2 dark:border-slate-800 dark:bg-slate-950 dark:ring-offset-slate-950 dark:placeholder:text-slate-500 transition-all font-mono"
                                        value={newPassword}
                                        onChange={(e) => setNewPassword(e.target.value)}
                                        required
                                        minLength={6}
                                        placeholder="Min. 6 characters"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium leading-none text-slate-700 dark:text-slate-200" htmlFor="confirm-password">
                                    Confirm Password
                                </label>
                                <div className="relative">
                                    <Lock className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                                    <input
                                        id="confirm-password"
                                        type="password"
                                        className="flex h-10 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 pl-9 text-sm ring-offset-white placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-royal-600 focus-visible:ring-offset-2 dark:border-slate-800 dark:bg-slate-950 dark:ring-offset-slate-950 dark:placeholder:text-slate-500 transition-all font-mono"
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        required
                                        minLength={6}
                                        placeholder="Retype password"
                                    />
                                </div>
                            </div>

                            <Button
                                className="w-full bg-royal-600 hover:bg-royal-700 text-white font-semibold h-11 mt-4"
                                type="submit"
                                disabled={submitting || newPassword.length < 6 || confirmPassword.length < 6}
                            >
                                {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                {submitting ? "Resetting..." : "Reset Password"}
                            </Button>
                        </form>
                    ) : null}
                </div>
            </div>
        </div>
    );
}
