import React, { useEffect, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  CreditCard,
  FileSpreadsheet,
  Layers,
  Loader2,
  Plus,
  RefreshCw,
  Save,
  Shield,
  Users,
} from "lucide-react";
import {
  AccountStatus,
  AuditLogRecord,
  PaymentRecord,
  SubscriptionPlan,
  SubscriptionStatus,
  UsageRecord,
  UserProfile,
  UserRole,
  UserSubscription,
} from "../types";
import { readApiJson } from "../services/api";

interface AdminOwnerConsoleViewProps {
  currentUser: UserProfile;
  authToken: string;
  csrfToken: string;
  onPlansUpdated: () => Promise<void>;
}

type AdminSubTab = "users" | "plans" | "subscriptions" | "payments_audit";

export const AdminOwnerConsoleView: React.FC<AdminOwnerConsoleViewProps> = ({
  currentUser,
  authToken,
  csrfToken,
  onPlansUpdated,
}) => {
  const [subTab, setSubTab] = useState<AdminSubTab>("users");
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [infoMsg, setInfoMsg] = useState<string | null>(null);

  const [users, setUsers] = useState<UserProfile[]>([]);
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [subscriptions, setSubscriptions] = useState<UserSubscription[]>([]);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [usageRecords, setUsageRecords] = useState<UsageRecord[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogRecord[]>([]);

  // New Plan Form State
  const [newPlanCode, setNewPlanCode] = useState("");
  const [newPlanName, setNewPlanName] = useState("");
  const [newPlanDesc, setNewPlanDesc] = useState("");
  const [newPlanPrice, setNewPlanPrice] = useState(99);
  const [newPlanLimit, setNewPlanLimit] = useState(500);
  const [newPlanMaxQ, setNewPlanMaxQ] = useState(120);

  // Plan inline edits
  const [editingPlanId, setEditingPlanId] = useState<string | null>(null);
  const [editPlanPrice, setEditPlanPrice] = useState<number>(0);
  const [editPlanLimit, setEditPlanLimit] = useState<number>(0);
  const [editPlanMaxQ, setEditPlanMaxQ] = useState<number>(0);

  const authHeaders = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${authToken}`,
    "X-CSRF-Token": csrfToken,
  };

  const fetchOverview = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetch("/api/admin/overview", {
        headers: authHeaders,
      });
      const data = await readApiJson(res);
      if (!res.ok) {
        throw new Error(data.error || "Failed to load administrative overview.");
      }
      setUsers(data.users || []);
      setPlans(data.plans || []);
      setSubscriptions(data.subscriptions || []);
      setPayments(data.payments || []);
      setUsageRecords(data.usageRecords || []);
      setAuditLogs(data.auditLogs || []);
    } catch (err: any) {
      setErrorMsg(err?.message || "Error loading admin overview.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOverview();
  }, []);

  const handleUpdateUser = async (
    targetUserId: string,
    updates: { role?: UserRole; status?: AccountStatus }
  ) => {
    setErrorMsg(null);
    setInfoMsg(null);
    try {
      const res = await fetch(`/api/admin/users/${targetUserId}`, {
        method: "PATCH",
        headers: authHeaders,
        body: JSON.stringify(updates),
      });
      const data = await readApiJson(res);
      if (!res.ok) {
        throw new Error(data.error || "Failed to update user.");
      }
      setInfoMsg(
        `Updated user ${data.user.username} (role=${data.user.role}, status=${data.user.status}).`
      );
      await fetchOverview();
    } catch (err: any) {
      setErrorMsg(err?.message || "Could not update user.");
    }
  };

  const handleAssignSubscription = async (
    userId: string,
    planId: string,
    status: SubscriptionStatus
  ) => {
    setErrorMsg(null);
    setInfoMsg(null);
    try {
      const res = await fetch("/api/admin/subscriptions/assign", {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify({ userId, planId, status }),
      });
      const data = await readApiJson(res);
      if (!res.ok) {
        throw new Error(data.error || "Failed to assign subscription.");
      }
      setInfoMsg("User subscription updated.");
      await fetchOverview();
    } catch (err: any) {
      setErrorMsg(err?.message || "Could not assign subscription.");
    }
  };

  const handleSavePlanEdit = async (planId: string) => {
    setErrorMsg(null);
    setInfoMsg(null);
    try {
      const res = await fetch(`/api/admin/plans/${planId}`, {
        method: "PUT",
        headers: authHeaders,
        body: JSON.stringify({
          price_monthly: editPlanPrice,
          papers_per_month_limit: editPlanLimit,
          max_questions_per_paper: editPlanMaxQ,
        }),
      });
      const data = await readApiJson(res);
      if (!res.ok) {
        throw new Error(data.error || "Failed to update plan.");
      }
      setEditingPlanId(null);
      setInfoMsg(`Updated ${data.plan.name} (${data.plan.code}) in database.`);
      await fetchOverview();
      await onPlansUpdated();
    } catch (err: any) {
      setErrorMsg(err?.message || "Could not update plan.");
    }
  };

  const handleCreatePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setInfoMsg(null);
    try {
      const res = await fetch("/api/admin/plans", {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify({
          code: newPlanCode.trim().toUpperCase(),
          name: newPlanName.trim(),
          description: newPlanDesc.trim(),
          price_monthly: Number(newPlanPrice),
          papers_per_month_limit: Number(newPlanLimit),
          max_questions_per_paper: Number(newPlanMaxQ),
          features: [
            `${newPlanLimit} Question Papers / month`,
            `Up to ${newPlanMaxQ} questions per paper`,
            "All school templates & custom template extraction",
            "Student & Answer Key PDF generation",
          ],
        }),
      });
      const data = await readApiJson(res);
      if (!res.ok) {
        throw new Error(data.error || "Failed to create subscription plan.");
      }
      setNewPlanCode("");
      setNewPlanName("");
      setNewPlanDesc("");
      setInfoMsg(`Created new plan ${data.plan.name} (${data.plan.code}).`);
      await fetchOverview();
      await onPlansUpdated();
    } catch (err: any) {
      setErrorMsg(err?.message || "Could not create plan.");
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 space-y-5 sm:space-y-6">
      {/* Header */}
      <div className="bg-white border border-slate-200 rounded-lg p-4 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <p className="text-xs font-mono text-sky-700 break-words">
            Role-Based Governance Console · Signed in as {currentUser.username} (
            {currentUser.role})
          </p>
          <h2 className="text-lg sm:text-xl font-bold text-slate-950">
            Owner &amp; Administrator Management Console
          </h2>
          <p className="text-xs text-slate-600 leading-relaxed">
            Manage Users, configure database SubscriptionPlans, assign Subscriptions, inspect UsageRecords, and review AuditLogs.
          </p>
        </div>

        <button
          onClick={fetchOverview}
          className="py-2.5 sm:py-2 px-3.5 rounded border border-slate-300 hover:border-slate-400 bg-white text-slate-800 text-xs font-semibold flex items-center justify-center gap-2 shrink-0 min-h-[40px]"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          <span>Refresh Database Records</span>
        </button>
      </div>

      {/* Sub-Navigation */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:flex items-center gap-1.5 p-1.5 bg-slate-200/70 rounded-lg w-full lg:w-fit">
        {[
          { id: "users" as const, label: `Users (${users.length})`, icon: Users },
          {
            id: "plans" as const,
            label: `Subscription Plans (${plans.length})`,
            icon: Layers,
          },
          {
            id: "subscriptions" as const,
            label: `Subscriptions & Usage (${usageRecords.length})`,
            icon: FileSpreadsheet,
          },
          {
            id: "payments_audit" as const,
            label: `Payments & Audit Logs (${auditLogs.length})`,
            icon: Shield,
          },
        ].map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setSubTab(tab.id)}
              className={`py-2.5 sm:py-2 px-3.5 sm:px-4 rounded-md text-xs font-semibold flex items-center justify-center sm:justify-start gap-2 transition-colors min-h-[40px] ${
                subTab === tab.id
                  ? "bg-white text-slate-950 shadow-xs"
                  : "text-slate-600 hover:text-slate-950"
              }`}
            >
              <Icon className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">{tab.label}</span>
            </button>
          );
        })}
      </div>

      {errorMsg && (
        <div className="p-3.5 rounded bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {infoMsg && (
        <div className="p-3.5 rounded bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{infoMsg}</span>
        </div>
      )}

      {loading ? (
        <div className="bg-white border border-slate-200 rounded-lg p-12 flex items-center justify-center gap-2 text-xs text-slate-500">
          <Loader2 className="w-4 h-4 animate-spin text-sky-600" />
          <span>Loading database records...</span>
        </div>
      ) : subTab === "users" ? (
        /* TAB 1: USERS & SUBSCRIPTION ASSIGNMENT */
        <div className="bg-white border border-slate-200 rounded-lg p-4 sm:p-6 space-y-4">
          <div>
            <h3 className="text-sm sm:text-base font-bold text-slate-950">
              Users Table (Sanitized — Password Hashes Never Exposed)
            </h3>
            <p className="text-xs text-slate-500">
              Manage roles (OWNER, ADMIN, USER), account status (ACTIVE, SUSPENDED, DISABLED), and subscription assignments.
            </p>
          </div>

          {/* Mobile Stacked Cards (< 768px) */}
          <div className="md:hidden space-y-3">
            {users.map((u) => {
              const sub = subscriptions.find((s) => s.user_id === u.id);
              const plan = plans.find((p) => p.id === sub?.plan_id);
              const isPrimaryOwner =
                u.username.toLowerCase() === "akash00894";

              return (
                <div
                  key={u.id}
                  className="p-4 rounded-md border border-slate-200 bg-slate-50/70 space-y-3 text-xs"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="font-mono font-bold text-slate-950">
                        {u.username}
                      </div>
                      <div className="text-slate-600 break-all">{u.email}</div>
                    </div>
                    <span className="font-mono text-[11px] font-semibold text-sky-700 shrink-0">
                      {u.role}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <label className="block text-[11px] text-slate-500 mb-1">
                        Role
                      </label>
                      <select
                        disabled={isPrimaryOwner}
                        value={u.role}
                        onChange={(e) =>
                          handleUpdateUser(u.id, {
                            role: e.target.value as UserRole,
                          })
                        }
                        className="w-full px-2.5 py-1.5 rounded border border-slate-300 text-xs font-mono bg-white disabled:bg-slate-100"
                      >
                        <option value="OWNER">OWNER</option>
                        <option value="ADMIN">ADMIN</option>
                        <option value="USER">USER</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[11px] text-slate-500 mb-1">
                        Status
                      </label>
                      <select
                        disabled={isPrimaryOwner}
                        value={u.status}
                        onChange={(e) =>
                          handleUpdateUser(u.id, {
                            status: e.target.value as AccountStatus,
                          })
                        }
                        className="w-full px-2.5 py-1.5 rounded border border-slate-300 text-xs font-mono bg-white disabled:bg-slate-100"
                      >
                        <option value="ACTIVE">ACTIVE</option>
                        <option value="SUSPENDED">SUSPENDED</option>
                        <option value="DISABLED">DISABLED</option>
                      </select>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-200 space-y-2">
                    <div className="flex items-center justify-between font-mono text-[11px]">
                      <span className="text-slate-500 font-sans">Subscription:</span>
                      {u.role === "OWNER" ? (
                        <span className="text-emerald-700 font-semibold">
                          OWNER_BYPASS
                        </span>
                      ) : sub && plan ? (
                        <span>
                          {plan.code} · {sub.status}
                        </span>
                      ) : (
                        <span className="text-slate-400">None</span>
                      )}
                    </div>
                    {u.role !== "OWNER" && (
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="text-[11px] text-slate-500 mr-1">
                          Assign:
                        </span>
                        {plans.map((p) => (
                          <button
                            key={p.id}
                            onClick={() =>
                              handleAssignSubscription(u.id, p.id, "ACTIVE")
                            }
                            className="px-2.5 py-1 rounded border border-slate-300 bg-white hover:border-sky-600 text-[11px] font-mono min-h-[32px]"
                          >
                            {p.code}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Tablet & Desktop Table (>= 768px) */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500">
                  <th className="py-2.5 pr-4 font-semibold">Username</th>
                  <th className="py-2.5 pr-4 font-semibold">Email</th>
                  <th className="py-2.5 pr-4 font-semibold">Role</th>
                  <th className="py-2.5 pr-4 font-semibold">Status</th>
                  <th className="py-2.5 pr-4 font-semibold">
                    Current Subscription
                  </th>
                  <th className="py-2.5 font-semibold">Quick Assign Plan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {users.map((u) => {
                  const sub = subscriptions.find((s) => s.user_id === u.id);
                  const plan = plans.find((p) => p.id === sub?.plan_id);
                  const isPrimaryOwner =
                    u.username.toLowerCase() === "akash00894";

                  return (
                    <tr key={u.id}>
                      <td className="py-3 pr-4 font-mono font-semibold text-slate-900">
                        {u.username}
                      </td>
                      <td className="py-3 pr-4 text-slate-600">{u.email}</td>
                      <td className="py-3 pr-4">
                        <select
                          disabled={isPrimaryOwner}
                          value={u.role}
                          onChange={(e) =>
                            handleUpdateUser(u.id, {
                              role: e.target.value as UserRole,
                            })
                          }
                          className="px-2 py-1 rounded border border-slate-300 text-xs font-mono bg-white disabled:bg-slate-100"
                        >
                          <option value="OWNER">OWNER</option>
                          <option value="ADMIN">ADMIN</option>
                          <option value="USER">USER</option>
                        </select>
                      </td>
                      <td className="py-3 pr-4">
                        <select
                          disabled={isPrimaryOwner}
                          value={u.status}
                          onChange={(e) =>
                            handleUpdateUser(u.id, {
                              status: e.target.value as AccountStatus,
                            })
                          }
                          className="px-2 py-1 rounded border border-slate-300 text-xs font-mono bg-white disabled:bg-slate-100"
                        >
                          <option value="ACTIVE">ACTIVE</option>
                          <option value="SUSPENDED">SUSPENDED</option>
                          <option value="DISABLED">DISABLED</option>
                        </select>
                      </td>
                      <td className="py-3 pr-4 font-mono">
                        {u.role === "OWNER" ? (
                          <span className="text-emerald-700 font-semibold">
                            OWNER_BYPASS (Unrestricted)
                          </span>
                        ) : sub && plan ? (
                          <span>
                            {plan.code} · {sub.status}
                          </span>
                        ) : (
                          <span className="text-slate-400">None</span>
                        )}
                      </td>
                      <td className="py-3">
                        {u.role === "OWNER" ? (
                          <span className="text-slate-400">
                            Not required for OWNER
                          </span>
                        ) : (
                          <div className="flex flex-wrap items-center gap-1.5">
                            {plans.map((p) => (
                              <button
                                key={p.id}
                                onClick={() =>
                                  handleAssignSubscription(
                                    u.id,
                                    p.id,
                                    "ACTIVE"
                                  )
                                }
                                className="px-2 py-1 rounded border border-slate-300 hover:border-sky-600 text-[11px] font-mono"
                              >
                                {p.code}
                              </button>
                            ))}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : subTab === "plans" ? (
        /* TAB 2: CONFIGURABLE SUBSCRIPTION PLANS */
        <div className="space-y-6">
          <div className="bg-white border border-slate-200 rounded-lg p-4 sm:p-6 space-y-4">
            <div>
              <h3 className="text-sm sm:text-base font-bold text-slate-950">
                Database SubscriptionPlans Configuration
              </h3>
              <p className="text-xs text-slate-500">
                Modify plan pricing, monthly question paper limits, and max questions per paper directly in the backend database.
              </p>
            </div>

            {/* Mobile Stacked Cards (< 768px) */}
            <div className="md:hidden space-y-3">
              {plans.map((plan) => {
                const isEditing = editingPlanId === plan.id;
                return (
                  <div
                    key={plan.id}
                    className="p-4 rounded-md border border-slate-200 bg-slate-50/70 space-y-3 text-xs"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <span className="font-bold text-slate-950">
                          {plan.name}
                        </span>{" "}
                        <span className="font-mono text-slate-500">
                          ({plan.code})
                        </span>
                      </div>
                      <span className="font-mono font-bold text-slate-900">
                        ${plan.price_monthly}/mo
                      </span>
                    </div>

                    {isEditing ? (
                      <div className="grid grid-cols-1 gap-2.5 pt-2 border-t border-slate-200 font-mono">
                        <div>
                          <label className="block text-[11px] font-sans text-slate-600 mb-0.5">
                            Price ($/mo)
                          </label>
                          <input
                            type="number"
                            min={0}
                            value={editPlanPrice}
                            onChange={(e) =>
                              setEditPlanPrice(Number(e.target.value))
                            }
                            className="w-full px-2.5 py-1.5 border border-slate-300 rounded bg-white"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-sans text-slate-600 mb-0.5">
                            Papers / Month Limit
                          </label>
                          <input
                            type="number"
                            min={1}
                            value={editPlanLimit}
                            onChange={(e) =>
                              setEditPlanLimit(Number(e.target.value))
                            }
                            className="w-full px-2.5 py-1.5 border border-slate-300 rounded bg-white"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-sans text-slate-600 mb-0.5">
                            Max Questions / Paper
                          </label>
                          <input
                            type="number"
                            min={5}
                            value={editPlanMaxQ}
                            onChange={(e) =>
                              setEditPlanMaxQ(Number(e.target.value))
                            }
                            className="w-full px-2.5 py-1.5 border border-slate-300 rounded bg-white"
                          />
                        </div>
                        <div className="flex items-center gap-2 pt-1 font-sans">
                          <button
                            onClick={() => handleSavePlanEdit(plan.id)}
                            className="flex-1 py-2 px-3 rounded bg-emerald-600 text-white text-xs font-semibold flex items-center justify-center gap-1"
                          >
                            <Save className="w-3.5 h-3.5" />
                            <span>Save</span>
                          </button>
                          <button
                            onClick={() => setEditingPlanId(null)}
                            className="flex-1 py-2 px-3 rounded border border-slate-300 bg-white text-xs font-semibold"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="pt-2 border-t border-slate-200 flex items-center justify-between gap-2">
                        <div className="font-mono text-[11px] text-slate-600 space-y-0.5">
                          <div>Limit: {plan.papers_per_month_limit} papers/mo</div>
                          <div>Max Qs: {plan.max_questions_per_paper}/paper</div>
                        </div>
                        <button
                          onClick={() => {
                            setEditingPlanId(plan.id);
                            setEditPlanPrice(plan.price_monthly);
                            setEditPlanLimit(plan.papers_per_month_limit);
                            setEditPlanMaxQ(plan.max_questions_per_paper);
                          }}
                          className="px-3 py-1.5 rounded border border-slate-300 bg-white hover:border-slate-500 text-xs font-semibold min-h-[36px]"
                        >
                          Configure Limits
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Tablet & Desktop Table (>= 768px) */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500">
                    <th className="py-2 pr-4 font-semibold">Code</th>
                    <th className="py-2 pr-4 font-semibold">Name</th>
                    <th className="py-2 pr-4 font-semibold">Price ($/mo)</th>
                    <th className="py-2 pr-4 font-semibold">
                      Papers / Month Limit
                    </th>
                    <th className="py-2 pr-4 font-semibold">
                      Max Questions / Paper
                    </th>
                    <th className="py-2 font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono">
                  {plans.map((plan) => {
                    const isEditing = editingPlanId === plan.id;
                    return (
                      <tr key={plan.id}>
                        <td className="py-3 pr-4 font-bold">{plan.code}</td>
                        <td className="py-3 pr-4 font-sans">{plan.name}</td>
                        <td className="py-3 pr-4">
                          {isEditing ? (
                            <input
                              type="number"
                              min={0}
                              value={editPlanPrice}
                              onChange={(e) =>
                                setEditPlanPrice(Number(e.target.value))
                              }
                              className="w-20 px-2 py-1 border border-slate-300 rounded"
                            />
                          ) : (
                            `$${plan.price_monthly}`
                          )}
                        </td>
                        <td className="py-3 pr-4">
                          {isEditing ? (
                            <input
                              type="number"
                              min={1}
                              value={editPlanLimit}
                              onChange={(e) =>
                                setEditPlanLimit(Number(e.target.value))
                              }
                              className="w-24 px-2 py-1 border border-slate-300 rounded"
                            />
                          ) : (
                            `${plan.papers_per_month_limit} / month`
                          )}
                        </td>
                        <td className="py-3 pr-4">
                          {isEditing ? (
                            <input
                              type="number"
                              min={5}
                              value={editPlanMaxQ}
                              onChange={(e) =>
                                setEditPlanMaxQ(Number(e.target.value))
                              }
                              className="w-24 px-2 py-1 border border-slate-300 rounded"
                            />
                          ) : (
                            `${plan.max_questions_per_paper} questions`
                          )}
                        </td>
                        <td className="py-3 font-sans">
                          {isEditing ? (
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => handleSavePlanEdit(plan.id)}
                                className="px-2.5 py-1 rounded bg-emerald-600 text-white text-xs font-semibold flex items-center gap-1"
                              >
                                <Save className="w-3 h-3" />
                                <span>Save</span>
                              </button>
                              <button
                                onClick={() => setEditingPlanId(null)}
                                className="px-2 py-1 rounded border border-slate-300 text-xs"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => {
                                setEditingPlanId(plan.id);
                                setEditPlanPrice(plan.price_monthly);
                                setEditPlanLimit(plan.papers_per_month_limit);
                                setEditPlanMaxQ(plan.max_questions_per_paper);
                              }}
                              className="px-2.5 py-1 rounded border border-slate-300 hover:border-slate-500 text-xs font-semibold"
                            >
                              Configure Limits
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Add New Plan Form */}
          <form
            onSubmit={handleCreatePlan}
            className="bg-white border border-slate-200 rounded-lg p-4 sm:p-6 space-y-4"
          >
            <h3 className="text-sm sm:text-base font-bold text-slate-950">
              Create Additional Subscription Plan
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Plan Code (e.g., ENTERPRISE)
                </label>
                <input
                  type="text"
                  required
                  value={newPlanCode}
                  onChange={(e) => setNewPlanCode(e.target.value)}
                  placeholder="ENTERPRISE"
                  className="w-full px-3 py-2 border border-slate-300 rounded font-mono"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Display Name
                </label>
                <input
                  type="text"
                  required
                  value={newPlanName}
                  onChange={(e) => setNewPlanName(e.target.value)}
                  placeholder="Enterprise University"
                  className="w-full px-3 py-2 border border-slate-300 rounded"
                />
              </div>
              <div className="sm:col-span-2 lg:col-span-1">
                <label className="block font-semibold text-slate-700 mb-1">
                  Description
                </label>
                <input
                  type="text"
                  required
                  value={newPlanDesc}
                  onChange={(e) => setNewPlanDesc(e.target.value)}
                  placeholder="Multi-campus university examination license"
                  className="w-full px-3 py-2 border border-slate-300 rounded"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Monthly Price (USD)
                </label>
                <input
                  type="number"
                  min={0}
                  value={newPlanPrice}
                  onChange={(e) => setNewPlanPrice(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-slate-300 rounded font-mono"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Question Papers / Month Limit
                </label>
                <input
                  type="number"
                  min={1}
                  value={newPlanLimit}
                  onChange={(e) => setNewPlanLimit(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-slate-300 rounded font-mono"
                />
              </div>
              <div className="sm:col-span-2 lg:col-span-1">
                <label className="block font-semibold text-slate-700 mb-1">
                  Max Questions / Paper
                </label>
                <input
                  type="number"
                  min={5}
                  value={newPlanMaxQ}
                  onChange={(e) => setNewPlanMaxQ(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-slate-300 rounded font-mono"
                />
              </div>
            </div>
            <button
              type="submit"
              className="w-full sm:w-auto py-2.5 px-4 rounded bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold flex items-center justify-center gap-2 min-h-[42px]"
            >
              <Plus className="w-4 h-4" />
              <span>Add Subscription Plan to Database</span>
            </button>
          </form>
        </div>
      ) : subTab === "subscriptions" ? (
        /* TAB 3: SUBSCRIPTIONS & USAGE RECORDS */
        <div className="space-y-6">
          <div className="bg-white border border-slate-200 rounded-lg p-4 sm:p-6 space-y-4">
            <h3 className="text-sm sm:text-base font-bold text-slate-950">
              All UsageRecords (Question Paper Generation &amp; Regeneration)
            </h3>

            {/* Mobile Stacked Cards (< 768px) */}
            <div className="md:hidden space-y-3">
              {usageRecords.map((r) => {
                const u = users.find((usr) => usr.id === r.user_id);
                return (
                  <div
                    key={r.id}
                    className="p-3.5 rounded-md border border-slate-200 bg-slate-50/70 space-y-1.5 text-xs font-mono"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-bold text-slate-950">
                        {u ? `${u.username} (${u.role})` : r.user_id}
                      </span>
                      <span className="text-[11px] text-slate-500">
                        {new Date(r.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="font-sans text-slate-800">
                      {r.class_name} · {r.subject} ({r.maximum_marks}m ·{" "}
                      {r.question_count} Qs)
                    </div>
                    <div className="flex items-center justify-between pt-1 border-t border-slate-200/80 text-[11px] text-slate-600">
                      <span>{r.action_type}</span>
                      <span>
                        {r.bypassed_by_owner
                          ? "OWNER_EXEMPT"
                          : `METERED (${r.billing_period_key})`}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Tablet & Desktop Table (>= 768px) */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs font-mono">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500 font-sans">
                    <th className="py-2 pr-4 font-semibold">Timestamp</th>
                    <th className="py-2 pr-4 font-semibold">User</th>
                    <th className="py-2 pr-4 font-semibold">Action</th>
                    <th className="py-2 pr-4 font-semibold">Subject &amp; Class</th>
                    <th className="py-2 pr-4 font-semibold">Questions</th>
                    <th className="py-2 font-semibold">Access Mode</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {usageRecords.map((r) => {
                    const u = users.find((usr) => usr.id === r.user_id);
                    return (
                      <tr key={r.id}>
                        <td className="py-2.5 pr-4 text-slate-600 whitespace-nowrap">
                          {new Date(r.created_at).toLocaleString()}
                        </td>
                        <td className="py-2.5 pr-4 font-semibold">
                          {u ? `${u.username} (${u.role})` : r.user_id}
                        </td>
                        <td className="py-2.5 pr-4">{r.action_type}</td>
                        <td className="py-2.5 pr-4 font-sans">
                          {r.class_name} · {r.subject} ({r.maximum_marks}m)
                        </td>
                        <td className="py-2.5 pr-4 tabular-nums">
                          {r.question_count}
                        </td>
                        <td className="py-2.5">
                          {r.bypassed_by_owner
                            ? "OWNER_EXEMPT"
                            : `METERED (${r.billing_period_key})`}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        /* TAB 4: PAYMENTS & SECURITY AUDIT LOGS */
        <div className="space-y-6">
          <div className="bg-white border border-slate-200 rounded-lg p-4 sm:p-6 space-y-4">
            <h3 className="text-sm sm:text-base font-bold text-slate-950">
              Payments Table
            </h3>

            {/* Mobile Stacked Cards (< 768px) */}
            <div className="md:hidden space-y-3">
              {payments.map((p) => {
                const u = users.find((usr) => usr.id === p.user_id);
                return (
                  <div
                    key={p.id}
                    className="p-3.5 rounded-md border border-slate-200 bg-slate-50/70 space-y-1.5 text-xs font-mono"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-bold text-slate-950">
                        {u ? u.username : p.user_id}
                      </span>
                      <span className="font-bold text-slate-900">
                        ${p.amount} {p.currency}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-600 break-all">
                      Order: {p.provider_order_id}
                    </div>
                    <div className="flex items-center justify-between pt-1 border-t border-slate-200/80 text-[11px]">
                      <span className="text-slate-500">
                        {new Date(p.created_at).toLocaleDateString()}
                      </span>
                      <span className="text-emerald-700 font-semibold">
                        {p.status} ·{" "}
                        {p.webhook_signature_verified ? "Verified" : "Pending"}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Tablet & Desktop Table (>= 768px) */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs font-mono">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500 font-sans">
                    <th className="py-2 pr-4 font-semibold">Created</th>
                    <th className="py-2 pr-4 font-semibold">User</th>
                    <th className="py-2 pr-4 font-semibold">Order ID</th>
                    <th className="py-2 pr-4 font-semibold">Amount</th>
                    <th className="py-2 pr-4 font-semibold">Status</th>
                    <th className="py-2 font-semibold">Webhook Verified</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {payments.map((p) => {
                    const u = users.find((usr) => usr.id === p.user_id);
                    return (
                      <tr key={p.id}>
                        <td className="py-2.5 pr-4 text-slate-600 whitespace-nowrap">
                          {new Date(p.created_at).toLocaleString()}
                        </td>
                        <td className="py-2.5 pr-4">
                          {u ? u.username : p.user_id}
                        </td>
                        <td className="py-2.5 pr-4">{p.provider_order_id}</td>
                        <td className="py-2.5 pr-4 tabular-nums">
                          ${p.amount} {p.currency}
                        </td>
                        <td className="py-2.5 pr-4">{p.status}</td>
                        <td className="py-2.5 text-emerald-700">
                          {p.webhook_signature_verified ? "YES" : "NO"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-lg p-4 sm:p-6 space-y-4">
            <h3 className="text-sm sm:text-base font-bold text-slate-950">
              Security &amp; Administrative Audit Logs
            </h3>

            {/* Mobile Stacked Cards (< 768px) */}
            <div className="md:hidden space-y-3">
              {auditLogs.map((log) => (
                <div
                  key={log.id}
                  className="p-3.5 rounded-md border border-slate-200 bg-slate-50/70 space-y-1.5 text-xs"
                >
                  <div className="flex items-center justify-between gap-2 font-mono">
                    <span className="font-bold text-slate-900 break-all">
                      {log.action}
                    </span>
                    <span className="text-[11px] text-slate-500 shrink-0">
                      {new Date(log.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="font-mono text-[11px] text-sky-800">
                    Actor: {log.actor_username} ({log.actor_role})
                  </div>
                  <p className="text-slate-700 leading-relaxed break-words">
                    {log.details}
                  </p>
                </div>
              ))}
            </div>

            {/* Tablet & Desktop Table (>= 768px) */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500">
                    <th className="py-2 pr-4 font-semibold">Timestamp</th>
                    <th className="py-2 pr-4 font-semibold">Actor</th>
                    <th className="py-2 pr-4 font-semibold">Action</th>
                    <th className="py-2 font-semibold">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {auditLogs.map((log) => (
                    <tr key={log.id}>
                      <td className="py-2.5 pr-4 font-mono text-slate-500 whitespace-nowrap">
                        {new Date(log.created_at).toLocaleString()}
                      </td>
                      <td className="py-2.5 pr-4 font-mono whitespace-nowrap">
                        {log.actor_username} ({log.actor_role})
                      </td>
                      <td className="py-2.5 pr-4 font-mono font-semibold text-slate-900 whitespace-nowrap">
                        {log.action}
                      </td>
                      <td className="py-2.5 text-slate-700">{log.details}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
