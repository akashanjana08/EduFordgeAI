import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  ArrowRight,
  Check,
  GraduationCap,
  KeyRound,
  Lock,
  LogIn,
  Mail,
  Menu,
  ShieldCheck,
  User,
  UserPlus,
  AlertCircle,
  CheckCircle2,
  Loader2,
  X,
} from "lucide-react";
import {
  AccessEvaluation,
  SubscriptionPlan,
  UserProfile,
} from "../types";

export type AuthScreenMode =
  | "landing"
  | "login"
  | "register"
  | "forgot_password"
  | "reset_password";

function pathToAuthMode(pathname: string): AuthScreenMode {
  const clean = pathname.toLowerCase().replace(/\/+$/, "") || "/";
  if (clean === "/login") return "login";
  if (clean === "/signup" || clean === "/register") return "register";
  if (clean === "/forgot-password") return "forgot_password";
  if (clean === "/reset-password") return "reset_password";
  return "landing";
}

function authModeToPath(mode: AuthScreenMode): string {
  switch (mode) {
    case "login":
      return "/login";
    case "register":
      return "/signup";
    case "forgot_password":
      return "/forgot-password";
    case "reset_password":
      return "/reset-password";
    default:
      return "/";
  }
}

interface LandingAndAuthViewProps {
  plans: SubscriptionPlan[];
  onAuthenticated: (payload: {
    user: UserProfile;
    token: string;
    csrfToken: string;
    accessEvaluation: AccessEvaluation;
  }) => void;
}

export const LandingAndAuthView: React.FC<LandingAndAuthViewProps> = ({
  plans,
  onAuthenticated,
}) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [mode, setMode] = useState<AuthScreenMode>(() =>
    pathToAuthMode(location.pathname)
  );
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  useEffect(() => {
    const nextMode = pathToAuthMode(location.pathname);
    setMode(nextMode);
    setMobileNavOpen(false);
  }, [location.pathname]);

  // Login State
  const [loginIdentifier, setLoginIdentifier] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  // Register State
  const [regUsername, setRegUsername] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regInitialPlan, setRegInitialPlan] = useState<string>("FREE");

  // Forgot / Reset State
  const [forgotIdentifier, setForgotIdentifier] = useState("");
  const [generatedResetToken, setGeneratedResetToken] = useState<string | null>(
    null
  );
  const [resetTokenInput, setResetTokenInput] = useState("");
  const [newPasswordInput, setNewPasswordInput] = useState("");

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [infoMsg, setInfoMsg] = useState<string | null>(null);

  const switchMode = (next: AuthScreenMode) => {
    setErrorMsg(null);
    setInfoMsg(null);
    setMode(next);
    setMobileNavOpen(false);
    const targetPath = authModeToPath(next);
    if (location.pathname !== targetPath) {
      navigate(targetPath);
    }
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setInfoMsg(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          identifier: loginIdentifier.trim(),
          password: loginPassword,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Invalid credentials.");
      }
      onAuthenticated({
        user: data.user,
        token: data.token,
        csrfToken: data.csrfToken,
        accessEvaluation: data.accessEvaluation,
      });
    } catch (err: any) {
      setErrorMsg(err?.message || "Failed to sign in.");
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setInfoMsg(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: regUsername.trim(),
          email: regEmail.trim(),
          password: regPassword,
          initialPlanCode: regInitialPlan,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Registration failed.");
      }
      onAuthenticated({
        user: data.user,
        token: data.token,
        csrfToken: data.csrfToken,
        accessEvaluation: data.accessEvaluation,
      });
    } catch (err: any) {
      setErrorMsg(err?.message || "Could not create account.");
    } finally {
      setLoading(false);
    }
  };

  const handleForgotSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setInfoMsg(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier: forgotIdentifier.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Could not process request.");
      }
      setInfoMsg(data.message);
      if (data.resetToken) {
        setGeneratedResetToken(data.resetToken);
        setResetTokenInput(data.resetToken);
      }
    } catch (err: any) {
      setErrorMsg(err?.message || "Password reset request failed.");
    } finally {
      setLoading(false);
    }
  };

  const handleResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setInfoMsg(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resetToken: resetTokenInput.trim(),
          newPassword: newPasswordInput,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to reset password.");
      }
      setInfoMsg(
        data.message || "Password updated. Please sign in with your new password."
      );
      setGeneratedResetToken(null);
      setNewPasswordInput("");
      setMode("login");
      navigate("/login");
    } catch (err: any) {
      setErrorMsg(err?.message || "Password reset failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 flex flex-col">
      {/* Top Editorial Navigation Header */}
      <header className="bg-slate-950 text-white border-b border-slate-800 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 min-h-[64px] py-2.5 flex items-center justify-between gap-3">
          <button
            onClick={() => switchMode("landing")}
            className="flex items-center gap-2.5 sm:gap-3 text-left focus:outline-none min-w-0"
          >
            <div className="w-9 h-9 rounded-md bg-sky-500/20 border border-sky-400/30 flex items-center justify-center text-sky-400 shrink-0">
              <GraduationCap className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <span className="text-sm sm:text-base font-bold tracking-tight text-white block leading-tight truncate">
                EduForge AI
              </span>
              <span className="text-[11px] sm:text-xs text-slate-400 block truncate">
                Standardized Examination &amp; Curriculum Platform
              </span>
            </div>
          </button>

          {/* Desktop & Tablet Navigation */}
          <nav className="hidden md:flex items-center gap-6 shrink-0">
            <button
              onClick={() => switchMode("landing")}
              className={`text-sm transition-colors ${
                mode === "landing"
                  ? "text-white font-semibold underline underline-offset-8 decoration-sky-400"
                  : "text-slate-300 hover:text-white"
              }`}
            >
              Overview &amp; Pricing
            </button>
            <button
              onClick={() => switchMode("login")}
              className={`text-sm transition-colors ${
                mode === "login"
                  ? "text-white font-semibold underline underline-offset-8 decoration-sky-400"
                  : "text-slate-300 hover:text-white"
              }`}
            >
              Sign In
            </button>
            <button
              onClick={() => switchMode("register")}
              className="py-2 px-4 rounded-md bg-sky-600 hover:bg-sky-500 text-white text-sm font-semibold transition-colors"
            >
              Create Account
            </button>
          </nav>

          {/* Mobile Hamburger Button */}
          <button
            type="button"
            onClick={() => setMobileNavOpen(!mobileNavOpen)}
            aria-label="Toggle navigation menu"
            className="md:hidden p-2 rounded-md border border-slate-800 text-slate-200 hover:text-white hover:bg-slate-900 min-h-[42px] min-w-[42px] flex items-center justify-center shrink-0"
          >
            {mobileNavOpen ? (
              <X className="w-5 h-5" />
            ) : (
              <Menu className="w-5 h-5" />
            )}
          </button>
        </div>

        {/* Mobile Collapsible Navigation Drawer */}
        {mobileNavOpen && (
          <div className="md:hidden border-t border-slate-800 bg-slate-900 px-4 py-3 space-y-2">
            <button
              onClick={() => switchMode("landing")}
              className={`w-full text-left px-3 py-2.5 rounded-md text-xs font-semibold flex items-center justify-between min-h-[42px] ${
                mode === "landing"
                  ? "bg-slate-800 text-white"
                  : "text-slate-300 hover:bg-slate-800/60"
              }`}
            >
              <span>Overview &amp; Pricing</span>
              <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
            </button>
            <button
              onClick={() => switchMode("login")}
              className={`w-full text-left px-3 py-2.5 rounded-md text-xs font-semibold flex items-center justify-between min-h-[42px] ${
                mode === "login"
                  ? "bg-slate-800 text-white"
                  : "text-slate-300 hover:bg-slate-800/60"
              }`}
            >
              <span>Sign In</span>
              <LogIn className="w-3.5 h-3.5 text-slate-400" />
            </button>
            <button
              onClick={() => switchMode("register")}
              className="w-full py-2.5 px-4 rounded-md bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold flex items-center justify-center gap-2 min-h-[42px]"
            >
              <UserPlus className="w-4 h-4" />
              <span>Create Educator Account</span>
            </button>
          </div>
        )}
      </header>

      {mode === "landing" ? (
        <main className="flex-1">
          {/* Hero Section */}
          <section className="bg-slate-950 text-white border-b border-slate-800 py-10 sm:py-16 lg:py-24">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
              <div className="lg:col-span-7 space-y-5 sm:space-y-6">
                <p className="text-xs text-sky-400 font-medium">
                  Academic Assessment Suite · Role-Based Access · Print-Ready A4 PDF
                </p>
                <h1
                  className="text-2xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-white leading-tight"
                  style={{ fontFamily: "'Fraunces', serif", textWrap: "balance" }}
                >
                  Generate curriculum-validated school question papers and marking schemes in minutes.
                </h1>
                <p className="text-sm sm:text-base text-slate-300 max-w-2xl leading-relaxed">
                  Built for schools, examination boards, and subject educators. Configure section templates, enforce strict mark distributions, render technical diagrams, and export dual Student &amp; Answer Key PDFs.
                </p>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4 pt-2">
                  <button
                    onClick={() => switchMode("login")}
                    className="py-3 px-6 rounded-md bg-sky-600 hover:bg-sky-500 text-white text-sm font-semibold flex items-center justify-center gap-2 transition-colors min-h-[44px]"
                  >
                    <span>Sign In to Workspace</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => switchMode("register")}
                    className="py-3 px-6 rounded-md border border-slate-700 hover:border-slate-500 text-slate-200 hover:text-white text-sm font-semibold text-center transition-colors min-h-[44px]"
                  >
                    Register Educator Account
                  </button>
                </div>
                <div className="pt-4 border-t border-slate-800/80 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-slate-400">
                  <span>Bcrypt Cost-12 Password Hashing</span>
                  <span aria-hidden="true">·</span>
                  <span>Owner Subscription Exemption</span>
                  <span aria-hidden="true">·</span>
                  <span>Database-Configured Subscription Tiers</span>
                </div>
              </div>

              {/* Right Column: Authorization Architecture Summary */}
              <div className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-lg p-4 sm:p-6 space-y-4 sm:space-y-5">
                <div className="flex items-center justify-between border-b border-slate-800 pb-4 gap-3">
                  <div>
                    <h2 className="text-sm sm:text-base font-semibold text-white">
                      Access &amp; Authorization Model
                    </h2>
                    <p className="text-xs text-slate-400">
                      Centralized backend verification on every API request
                    </p>
                  </div>
                  <ShieldCheck className="w-5 h-5 text-sky-400 shrink-0" />
                </div>

                <div className="space-y-3.5 text-xs">
                  <div className="p-3.5 rounded bg-slate-950/70 border border-slate-800 space-y-1.5">
                    <div className="flex flex-wrap items-center justify-between gap-1 text-slate-200 font-semibold">
                      <span>01. Application Owner (OWNER Role)</span>
                      <span className="font-mono text-emerald-400">
                        Full Direct Access
                      </span>
                    </div>
                    <p className="text-slate-400 leading-relaxed">
                      The migrated owner account (<span className="font-mono text-slate-200">Akash00894</span>) authenticates against the <span className="font-mono text-slate-200">Users</span> database table using bcrypt verification and bypasses subscription, expiry, and monthly usage limits automatically.
                    </p>
                  </div>

                  <div className="p-3.5 rounded bg-slate-950/70 border border-slate-800 space-y-1.5">
                    <div className="flex flex-wrap items-center justify-between gap-1 text-slate-200 font-semibold">
                      <span>02. Educators &amp; Institutions (USER Role)</span>
                      <span className="font-mono text-sky-400">
                        Subscription-Metered
                      </span>
                    </div>
                    <p className="text-slate-400 leading-relaxed">
                      Standard accounts authenticate via session tokens and are validated against active <span className="font-mono text-slate-200">Subscriptions</span>, plan feature permissions, and monthly <span className="font-mono text-slate-200">UsageRecords</span> quotas.
                    </p>
                  </div>

                  <div className="p-3.5 rounded bg-slate-950/70 border border-slate-800 space-y-1.5">
                    <div className="flex flex-wrap items-center justify-between gap-1 text-slate-200 font-semibold">
                      <span>03. Administrators (ADMIN Role)</span>
                      <span className="font-mono text-amber-400">
                        Governance &amp; Billing
                      </span>
                    </div>
                    <p className="text-slate-400 leading-relaxed">
                      Manage registered users, configure database subscription plans, inspect webhook-verified payments, and review security audit logs.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Database-Driven Subscription Plans Section */}
          <section className="py-10 sm:py-16 max-w-7xl mx-auto px-4 sm:px-6 space-y-8 sm:space-y-10">
            <div className="max-w-2xl space-y-2">
              <p className="text-xs font-semibold text-sky-700">
                Configurable Subscription Plans
              </p>
              <h2
                className="text-2xl sm:text-3xl font-bold text-slate-950"
                style={{ fontFamily: "'Fraunces', serif" }}
              >
                Transparent plans for individual educators and academic departments
              </h2>
              <p className="text-sm text-slate-600">
                All plan limits and feature entitlements are dynamically loaded from the backend <span className="font-mono text-xs">SubscriptionPlans</span> table.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {plans.map((plan) => {
                const isPopular = plan.code === "BASIC";
                return (
                  <div
                    key={plan.id}
                    className={`bg-white rounded-lg border p-5 sm:p-6 flex flex-col justify-between ${
                      isPopular
                        ? "border-sky-600 ring-1 ring-sky-600"
                        : "border-slate-200"
                    }`}
                  >
                    <div className="space-y-4">
                      <div className="flex items-baseline justify-between gap-2">
                        <h3 className="text-lg font-bold text-slate-950">
                          {plan.name}
                        </h3>
                        <span className="text-xs font-mono text-slate-500">
                          {plan.code}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 min-h-[36px]">
                        {plan.description}
                      </p>
                      <div className="pt-2 pb-4 border-b border-slate-100 flex items-baseline gap-1">
                        <span className="text-3xl font-bold font-mono tabular-nums text-slate-950">
                          ${plan.price_monthly}
                        </span>
                        <span className="text-xs text-slate-500">
                          / {plan.billing_cycle.toLowerCase()}
                        </span>
                      </div>
                      <div className="text-xs text-slate-600 space-y-1 font-mono">
                        <div>
                          Monthly Quota: {plan.papers_per_month_limit} papers/month
                        </div>
                        <div>
                          Max Questions: {plan.max_questions_per_paper} questions/paper
                        </div>
                      </div>
                      <ul className="space-y-2.5 pt-2">
                        {plan.features.map((feat, i) => (
                          <li
                            key={i}
                            className="flex items-start gap-2.5 text-xs text-slate-700"
                          >
                            <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                            <span>{feat}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="pt-6 mt-6 border-t border-slate-100">
                      <button
                        onClick={() => {
                          setRegInitialPlan(plan.code);
                          switchMode("register");
                        }}
                        className={`w-full py-2.5 px-4 rounded-md text-xs font-semibold transition-colors min-h-[42px] ${
                          isPopular
                            ? "bg-sky-600 hover:bg-sky-500 text-white"
                            : "bg-slate-900 hover:bg-slate-800 text-white"
                        }`}
                      >
                        {plan.price_monthly === 0
                          ? "Start with Free Plan"
                          : `Create Account for ${plan.name}`}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        </main>
      ) : (
        /* Authentication Forms Container (Login / Register / Forgot / Reset) */
        <main className="flex-1 flex items-center justify-center p-4 sm:p-6">
          <div className="w-full max-w-md bg-white border border-slate-200 rounded-lg p-5 sm:p-7 space-y-5 sm:space-y-6">
            {/* Mode Switcher Tabs */}
            <div className="grid grid-cols-3 gap-1 p-1 bg-slate-100 rounded-md">
              <button
                type="button"
                onClick={() => switchMode("login")}
                className={`py-2 px-2 rounded text-xs font-semibold transition-colors min-h-[38px] ${
                  mode === "login"
                    ? "bg-white text-slate-950 shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => switchMode("register")}
                className={`py-2 px-2 rounded text-xs font-semibold transition-colors min-h-[38px] ${
                  mode === "register"
                    ? "bg-white text-slate-950 shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Sign Up
              </button>
              <button
                type="button"
                onClick={() => switchMode("forgot_password")}
                className={`py-2 px-2 rounded text-xs font-semibold transition-colors min-h-[38px] ${
                  mode === "forgot_password" || mode === "reset_password"
                    ? "bg-white text-slate-950 shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Reset
              </button>
            </div>

            {errorMsg && (
              <div className="p-3 rounded bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <span>{errorMsg}</span>
              </div>
            )}

            {infoMsg && (
              <div className="p-3 rounded bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span>{infoMsg}</span>
              </div>
            )}

            {mode === "login" && (
              <form onSubmit={handleLoginSubmit} className="space-y-4">
                <div>
                  <h2 className="text-lg font-bold text-slate-950">
                    Sign in to EduForge AI
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Enter your username or email address to authenticate against the Users database.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Username or Email
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      required
                      value={loginIdentifier}
                      onChange={(e) => setLoginIdentifier(e.target.value)}
                      placeholder="e.g., Akash00894 or teacher_rahul"
                      className="w-full pl-9 pr-3 py-2 rounded border border-slate-300 text-sm focus:border-sky-600 focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-semibold text-slate-700">
                      Password
                    </label>
                    <button
                      type="button"
                      onClick={() => switchMode("forgot_password")}
                      className="text-xs text-sky-700 hover:underline"
                    >
                      Forgot password?
                    </button>
                  </div>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="password"
                      required
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      placeholder="Enter your password"
                      className="w-full pl-9 pr-3 py-2 rounded border border-slate-300 text-sm focus:border-sky-600 focus:outline-none"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 px-4 rounded-md bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white text-xs font-semibold flex items-center justify-center gap-2 transition-colors"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Verifying Credentials...</span>
                    </>
                  ) : (
                    <>
                      <LogIn className="w-4 h-4" />
                      <span>Sign In</span>
                    </>
                  )}
                </button>

                <div className="pt-3 border-t border-slate-100 text-xs text-slate-500 space-y-1">
                  <p className="font-semibold text-slate-700">
                    Database Accounts Available for Testing:
                  </p>
                  <p>
                    · Owner Account:{" "}
                    <button
                      type="button"
                      onClick={() => setLoginIdentifier("Akash00894")}
                      className="font-mono text-sky-700 hover:underline"
                    >
                      Akash00894
                    </button>{" "}
                    (Role: OWNER · Subscription-Independent Access)
                  </p>
                  <p>
                    · Active Basic User:{" "}
                    <button
                      type="button"
                      onClick={() => setLoginIdentifier("teacher_rahul")}
                      className="font-mono text-sky-700 hover:underline"
                    >
                      teacher_rahul
                    </button>{" "}
                    (Role: USER · BASIC Plan ACTIVE)
                  </p>
                  <p>
                    · Expired Free User:{" "}
                    <button
                      type="button"
                      onClick={() => setLoginIdentifier("teacher_priya")}
                      className="font-mono text-sky-700 hover:underline"
                    >
                      teacher_priya
                    </button>{" "}
                    (Role: USER · Subscription EXPIRED)
                  </p>
                </div>
              </form>
            )}

            {mode === "register" && (
              <form onSubmit={handleRegisterSubmit} className="space-y-4">
                <div>
                  <h2 className="text-lg font-bold text-slate-950">
                    Create Educator Account
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    New accounts are created with the USER role and bcrypt-hashed credentials.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Username
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      required
                      value={regUsername}
                      onChange={(e) => setRegUsername(e.target.value)}
                      placeholder="e.g., prof_verma"
                      className="w-full pl-9 pr-3 py-2 rounded border border-slate-300 text-sm focus:border-sky-600 focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="email"
                      required
                      value={regEmail}
                      onChange={(e) => setRegEmail(e.target.value)}
                      placeholder="educator@school.edu"
                      className="w-full pl-9 pr-3 py-2 rounded border border-slate-300 text-sm focus:border-sky-600 focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Password (minimum 6 characters)
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="password"
                      required
                      minLength={6}
                      value={regPassword}
                      onChange={(e) => setRegPassword(e.target.value)}
                      placeholder="Create a strong password"
                      className="w-full pl-9 pr-3 py-2 rounded border border-slate-300 text-sm focus:border-sky-600 focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Initial Subscription Setup
                  </label>
                  <select
                    value={regInitialPlan}
                    onChange={(e) => setRegInitialPlan(e.target.value)}
                    className="w-full px-3 py-2 rounded border border-slate-300 text-xs bg-white focus:border-sky-600 focus:outline-none"
                  >
                    <option value="FREE">
                      Activate FREE Starter Plan (5 Question Papers / month)
                    </option>
                    <option value="NONE">
                      No Initial Subscription (Select & Checkout Plan After Signup)
                    </option>
                  </select>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 px-4 rounded-md bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white text-xs font-semibold flex items-center justify-center gap-2 transition-colors"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Creating Account...</span>
                    </>
                  ) : (
                    <>
                      <UserPlus className="w-4 h-4" />
                      <span>Register Account</span>
                    </>
                  )}
                </button>
              </form>
            )}

            {mode === "forgot_password" && (
              <div className="space-y-4">
                <form onSubmit={handleForgotSubmit} className="space-y-4">
                  <div>
                    <h2 className="text-lg font-bold text-slate-950">
                      Forgot Password
                    </h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Request a time-limited cryptographic reset token for your username or email.
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Username or Email
                    </label>
                    <input
                      type="text"
                      required
                      value={forgotIdentifier}
                      onChange={(e) => setForgotIdentifier(e.target.value)}
                      placeholder="Enter your username or email"
                      className="w-full px-3 py-2 rounded border border-slate-300 text-sm focus:border-sky-600 focus:outline-none"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-2.5 px-4 rounded-md bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white text-xs font-semibold flex items-center justify-center gap-2 transition-colors"
                  >
                    <KeyRound className="w-4 h-4" />
                    <span>Generate Reset Token</span>
                  </button>
                </form>

                {generatedResetToken && (
                  <div className="p-3.5 rounded bg-slate-50 border border-slate-200 space-y-2">
                    <p className="text-xs font-semibold text-slate-800">
                      Reset Token Generated (Valid for 30 minutes):
                    </p>
                    <p className="font-mono text-xs bg-white p-2 rounded border border-slate-200 break-all select-all">
                      {generatedResetToken}
                    </p>
                    <button
                      type="button"
                      onClick={() => switchMode("reset_password")}
                      className="w-full py-2 px-3 rounded bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold transition-colors"
                    >
                      Proceed to Reset Password
                    </button>
                  </div>
                )}

                <div className="text-center">
                  <button
                    type="button"
                    onClick={() => switchMode("reset_password")}
                    className="text-xs text-sky-700 hover:underline"
                  >
                    Already have a reset token? Enter it here
                  </button>
                </div>
              </div>
            )}

            {mode === "reset_password" && (
              <form onSubmit={handleResetSubmit} className="space-y-4">
                <div>
                  <h2 className="text-lg font-bold text-slate-950">
                    Set New Password
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Enter your reset token and choose a new password.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Reset Token
                  </label>
                  <input
                    type="text"
                    required
                    value={resetTokenInput}
                    onChange={(e) => setResetTokenInput(e.target.value)}
                    placeholder="Paste reset token"
                    className="w-full px-3 py-2 rounded border border-slate-300 text-xs font-mono focus:border-sky-600 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    New Password
                  </label>
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={newPasswordInput}
                    onChange={(e) => setNewPasswordInput(e.target.value)}
                    placeholder="At least 6 characters"
                    className="w-full px-3 py-2 rounded border border-slate-300 text-sm focus:border-sky-600 focus:outline-none"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 px-4 rounded-md bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white text-xs font-semibold transition-colors"
                >
                  Update Password & Sign In
                </button>
              </form>
            )}
          </div>
        </main>
      )}

      <footer className="bg-white border-t border-slate-200 py-5 px-6 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4">
          <span>EduForge AI Examination Suite</span>
          <span>
            Role-Based Access Control (OWNER · ADMIN · USER) · Webhook-Verified Subscription Billing
          </span>
        </div>
      </footer>
    </div>
  );
};
