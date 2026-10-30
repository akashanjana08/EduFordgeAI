import React, { useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  KeyRound,
  Loader2,
  Lock,
  Mail,
  Save,
  ShieldCheck,
  User,
} from "lucide-react";
import { AccessEvaluation, UserProfile } from "../types";
import { readApiJson } from "../services/api";

interface ProfileViewProps {
  user: UserProfile;
  authToken: string;
  csrfToken: string;
  accessEvaluation: AccessEvaluation;
  onRefreshSession: () => Promise<void>;
  onNavigate: (path: string) => void;
}

export const ProfileView: React.FC<ProfileViewProps> = ({
  user,
  authToken,
  csrfToken,
  accessEvaluation,
  onRefreshSession,
  onNavigate,
}) => {
  const [emailInput, setEmailInput] = useState(user.email);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const authHeaders = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${authToken}`,
    "X-CSRF-Token": csrfToken,
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);
    setSavingProfile(true);
    try {
      const res = await fetch("/api/auth/profile", {
        method: "PATCH",
        headers: authHeaders,
        body: JSON.stringify({ email: emailInput.trim() }),
      });
      const data = await readApiJson(res);
      if (!res.ok) {
        throw new Error(data.error || "Failed to update profile.");
      }
      setSuccessMsg(data.message || "Profile updated.");
      await onRefreshSession();
    } catch (err: any) {
      setErrorMsg(err?.message || "Could not update profile.");
    } finally {
      setSavingProfile(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (newPassword !== confirmPassword) {
      setErrorMsg("New password and confirmation password do not match.");
      return;
    }

    setSavingPassword(true);
    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify({
          currentPassword,
          newPassword,
        }),
      });
      const data = await readApiJson(res);
      if (!res.ok) {
        throw new Error(data.error || "Failed to change password.");
      }
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setSuccessMsg(data.message || "Password updated.");
    } catch (err: any) {
      setErrorMsg(err?.message || "Could not change password.");
    } finally {
      setSavingPassword(false);
    }
  };

  const isOwner = user.role === "OWNER";

  return (
    <div className="max-w-5xl mx-auto p-4 sm:p-6 space-y-5 sm:space-y-6">
      <div className="bg-white border border-slate-200 rounded-lg p-4 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <p className="text-xs font-mono text-sky-700">
            Route: /profile · Authenticated Account Settings
          </p>
          <h2 className="text-lg sm:text-xl font-bold text-slate-950">
            Account Profile &amp; Security
          </h2>
          <p className="text-xs text-slate-600 leading-relaxed">
            Manage your account details, inspect role-based access permissions, and update your bcrypt-hashed password.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            onClick={() => onNavigate("/dashboard")}
            className="flex-1 sm:flex-initial py-2 px-3.5 rounded border border-slate-300 hover:border-slate-400 text-xs font-semibold text-slate-700 text-center min-h-[40px]"
          >
            Back to Dashboard
          </button>
          <button
            onClick={() => onNavigate("/subscription")}
            className="flex-1 sm:flex-initial py-2 px-3.5 rounded bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold text-center min-h-[40px]"
          >
            Manage Subscription
          </button>
        </div>
      </div>

      {errorMsg && (
        <div className="p-3.5 sm:p-4 rounded bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {successMsg && (
        <div className="p-3.5 sm:p-4 rounded bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-6">
        {/* Left Card: Account Identity & Role Summary */}
        <div className="bg-white border border-slate-200 rounded-lg p-4 sm:p-6 space-y-5">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="text-sm sm:text-base font-bold text-slate-950">
              Account Identity &amp; Role
            </h3>
            <User className="w-4 h-4 text-slate-400 shrink-0" />
          </div>

          <div className="space-y-2.5 text-xs">
            <div className="flex flex-wrap items-center justify-between gap-2 py-1.5 border-b border-slate-100">
              <span className="text-slate-500">User ID</span>
              <span className="font-mono text-slate-900 break-all">{user.id}</span>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2 py-1.5 border-b border-slate-100">
              <span className="text-slate-500">Username</span>
              <span className="font-mono font-semibold text-slate-900 break-all">
                {user.username}
              </span>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2 py-1.5 border-b border-slate-100">
              <span className="text-slate-500">Assigned Role</span>
              <span className="font-mono font-semibold text-sky-700">
                {user.role}
              </span>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2 py-1.5 border-b border-slate-100">
              <span className="text-slate-500">Account Status</span>
              <span className="font-mono text-emerald-700">{user.status}</span>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2 py-1.5 border-b border-slate-100">
              <span className="text-slate-500">Subscription Policy</span>
              <span className="font-mono text-slate-800 text-right">
                {isOwner
                  ? "OWNER_BYPASS (Exempt)"
                  : accessEvaluation.plan
                  ? `${accessEvaluation.plan.code} (${accessEvaluation.subscription?.status})`
                  : "No Active Subscription"}
              </span>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2 py-1.5">
              <span className="text-slate-500">Created At</span>
              <span className="font-mono text-slate-600">
                {new Date(user.created_at).toLocaleDateString()}
              </span>
            </div>
          </div>

          <form onSubmit={handleUpdateProfile} className="pt-3 border-t border-slate-100 space-y-3">
            <label className="block text-xs font-semibold text-slate-700">
              Email Address
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="email"
                required
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                className="w-full pl-9 pr-3 py-2 rounded border border-slate-300 text-sm focus:border-sky-600 focus:outline-none"
              />
            </div>
            <button
              type="submit"
              disabled={savingProfile}
              className="w-full sm:w-auto py-2.5 px-4 rounded bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white text-xs font-semibold flex items-center justify-center gap-2 min-h-[40px]"
            >
              {savingProfile ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Save className="w-3.5 h-3.5" />
              )}
              <span>Update Email Address</span>
            </button>
          </form>
        </div>

        {/* Right Card: Change Password */}
        <div className="bg-white border border-slate-200 rounded-lg p-4 sm:p-6 space-y-5">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3 gap-3">
            <div>
              <h3 className="text-sm sm:text-base font-bold text-slate-950">
                Change Account Password
              </h3>
              <p className="text-xs text-slate-500">
                Stored in Users.password_hash using bcrypt (cost factor 12)
              </p>
            </div>
            <KeyRound className="w-4 h-4 text-slate-400 shrink-0" />
          </div>

          <form onSubmit={handleChangePassword} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Current Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="password"
                  required
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Enter current password"
                  className="w-full pl-9 pr-3 py-2 rounded border border-slate-300 text-sm focus:border-sky-600 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                New Password (minimum 6 characters)
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="password"
                  required
                  minLength={6}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new password"
                  className="w-full pl-9 pr-3 py-2 rounded border border-slate-300 text-sm focus:border-sky-600 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Confirm New Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="password"
                  required
                  minLength={6}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter new password"
                  className="w-full pl-9 pr-3 py-2 rounded border border-slate-300 text-sm focus:border-sky-600 focus:outline-none"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={savingPassword}
              className="w-full py-2.5 px-4 rounded bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white text-xs font-semibold flex items-center justify-center gap-2"
            >
              {savingPassword ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Hashing &amp; Updating Password...</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4" />
                  <span>Update Password</span>
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
