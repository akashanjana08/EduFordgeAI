import React, { useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  Check,
  CheckCircle2,
  CreditCard,
  FileText,
  Loader2,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  XCircle,
} from "lucide-react";
import {
  AccessEvaluation,
  PaymentRecord,
  SubscriptionPlan,
  SubscriptionStatus,
  UsageRecord,
  UserProfile,
} from "../types";

interface SubscriptionAndDashboardViewProps {
  activeSubView: "dashboard" | "subscription";
  user: UserProfile;
  authToken: string;
  csrfToken: string;
  plans: SubscriptionPlan[];
  accessEvaluation: AccessEvaluation;
  recentUsage: UsageRecord[];
  payments: PaymentRecord[];
  onOpenGenerator: () => void;
  onOpenAdminConsole: () => void;
  onOpenSubscriptionTab: () => void;
  onRefreshSession: () => Promise<void>;
}

export const SubscriptionAndDashboardView: React.FC<
  SubscriptionAndDashboardViewProps
> = ({
  activeSubView,
  user,
  authToken,
  csrfToken,
  plans,
  accessEvaluation,
  recentUsage,
  payments,
  onOpenGenerator,
  onOpenAdminConsole,
  onOpenSubscriptionTab,
  onRefreshSession,
}) => {
  const [billingCycle, setBillingCycle] = useState<"MONTHLY" | "ANNUAL">(
    "MONTHLY"
  );
  const [checkoutOrder, setCheckoutOrder] = useState<any | null>(null);
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const authHeaders = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${authToken}`,
    "X-CSRF-Token": csrfToken,
  };

  const handleStartCheckout = async (plan: SubscriptionPlan) => {
    setErrorMessage(null);
    setStatusMessage(null);
    setBusyAction(`checkout_${plan.id}`);
    try {
      const res = await fetch("/api/payments/checkout", {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify({
          planId: plan.id,
          billingCycle,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Could not initiate checkout.");
      }
      setCheckoutOrder(data.checkoutOrder);
    } catch (err: any) {
      setErrorMessage(err?.message || "Failed to start checkout.");
    } finally {
      setBusyAction(null);
    }
  };

  const handleCompletePaymentWebhook = async () => {
    if (!checkoutOrder?.gatewayWebhookPayload) return;
    setErrorMessage(null);
    setStatusMessage(null);
    setBusyAction("webhook_verify");
    try {
      const res = await fetch("/api/payments/webhook", {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify(checkoutOrder.gatewayWebhookPayload),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Payment webhook verification failed.");
      }
      setCheckoutOrder(null);
      setStatusMessage(
        `Payment verified via backend webhook (${data.payment?.provider_payment_id}). Your ${data.plan?.name} (${data.plan?.code}) subscription is now ACTIVE.`
      );
      await onRefreshSession();
    } catch (err: any) {
      setErrorMessage(err?.message || "Payment verification failed.");
    } finally {
      setBusyAction(null);
    }
  };

  const handleCancelSubscription = async () => {
    setErrorMessage(null);
    setStatusMessage(null);
    setBusyAction("cancel_sub");
    try {
      const res = await fetch("/api/subscriptions/cancel", {
        method: "POST",
        headers: authHeaders,
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to cancel subscription.");
      }
      setStatusMessage("Subscription status updated to CANCELLED.");
      await onRefreshSession();
    } catch (err: any) {
      setErrorMessage(err?.message || "Could not cancel subscription.");
    } finally {
      setBusyAction(null);
    }
  };

  const handleSimulateState = async (
    nextStatus: SubscriptionStatus,
    planCode?: string
  ) => {
    setErrorMessage(null);
    setStatusMessage(null);
    setBusyAction(`sim_${nextStatus}`);
    try {
      const res = await fetch("/api/subscriptions/simulate-state", {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify({
          status: nextStatus,
          planCode:
            planCode || accessEvaluation.plan?.code || "BASIC",
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Could not update subscription state.");
      }
      setStatusMessage(
        `Subscription state switched to ${nextStatus} for verification.`
      );
      await onRefreshSession();
    } catch (err: any) {
      setErrorMessage(err?.message || "State simulation failed.");
    } finally {
      setBusyAction(null);
    }
  };

  const isOwner = user.role === "OWNER";
  const currentSub = accessEvaluation.subscription;
  const currentPlan = accessEvaluation.plan;
  const usagePct =
    accessEvaluation.limitThisMonth && accessEvaluation.limitThisMonth > 0
      ? Math.min(
          100,
          Math.round(
            (accessEvaluation.usageThisMonth /
              accessEvaluation.limitThisMonth) *
              100
          )
        )
      : 0;

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 space-y-6 sm:space-y-8">
      {errorMessage && (
        <div className="p-3.5 sm:p-4 rounded-md bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2.5">
          <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
          <span>{errorMessage}</span>
        </div>
      )}

      {statusMessage && (
        <div className="p-3.5 sm:p-4 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs flex items-start gap-2.5">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
          <span>{statusMessage}</span>
        </div>
      )}

      {activeSubView === "dashboard" ? (
        <>
          {/* Top Overview Banner */}
          <div className="bg-white border border-slate-200 rounded-lg p-4 sm:p-6">
            <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4 sm:gap-6 pb-5 sm:pb-6 border-b border-slate-100">
              <div className="space-y-1.5 min-w-0">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500">
                  <span>Account: {user.username}</span>
                  <span aria-hidden="true">·</span>
                  <span className="break-all">Email: {user.email}</span>
                  <span aria-hidden="true">·</span>
                  <span className="font-mono font-semibold text-slate-900">
                    Role: {user.role}
                  </span>
                  <span aria-hidden="true">·</span>
                  <span>Status: {user.status}</span>
                </div>
                <h2 className="text-lg sm:text-2xl font-bold text-slate-950">
                  {isOwner
                    ? "Application Owner Workspace — Direct Unconditional Access"
                    : `Educator Dashboard — ${
                        currentPlan ? currentPlan.name : "No Active Plan"
                      }`}
                </h2>
                <p className="text-xs text-slate-600 max-w-3xl leading-relaxed">
                  {accessEvaluation.reason}
                </p>
              </div>

              <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-2.5 sm:gap-3 shrink-0">
                {accessEvaluation.allowed ? (
                  <button
                    onClick={onOpenGenerator}
                    className="py-2.5 px-5 rounded-md bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold flex items-center justify-center gap-2 transition-colors min-h-[42px]"
                  >
                    <Sparkles className="w-4 h-4 shrink-0" />
                    <span>Open Question Paper Generator</span>
                    <ArrowRight className="w-4 h-4 shrink-0" />
                  </button>
                ) : (
                  <button
                    onClick={onOpenSubscriptionTab}
                    className="py-2.5 px-5 rounded-md bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold flex items-center justify-center gap-2 transition-colors min-h-[42px]"
                  >
                    <CreditCard className="w-4 h-4 shrink-0" />
                    <span>Subscribe or Renew Plan to Unlock Generator</span>
                  </button>
                )}

                {(user.role === "OWNER" || user.role === "ADMIN") && (
                  <button
                    onClick={onOpenAdminConsole}
                    className="py-2.5 px-4 rounded-md border border-slate-300 hover:border-slate-400 bg-white text-slate-800 text-xs font-semibold text-center transition-colors min-h-[42px]"
                  >
                    Manage Users &amp; Subscriptions
                  </button>
                )}
              </div>
            </div>

            {/* 3-Column Metrics & Authorization Breakdown */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5 sm:gap-6 pt-5 sm:pt-6 divide-y md:divide-y-0 divide-slate-100">
              {/* Column 1: Authorization Rule Status */}
              <div className="space-y-2">
                <p className="text-xs font-semibold text-slate-500">
                  01. Authorization Gate Evaluation
                </p>
                <div className="flex items-center gap-2">
                  {accessEvaluation.allowed ? (
                    <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0" />
                  ) : (
                    <XCircle className="w-5 h-5 text-rose-600 shrink-0" />
                  )}
                  <span className="text-sm font-bold text-slate-950 font-mono break-all">
                    {accessEvaluation.code}
                  </span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  {isOwner
                    ? "Owner account (Akash00894) bypasses subscription validation, expiry blocks, and monthly usage quotas."
                    : accessEvaluation.allowed
                    ? "Active subscription and monthly usage quota verified by backend middleware."
                    : "Generator API calls are currently blocked by backend authorization middleware until a valid subscription is active."}
                </p>
              </div>

              {/* Column 2: Subscription Tier & Status */}
              <div className="space-y-2 pt-4 md:pt-0 md:border-l md:border-slate-100 md:pl-6">
                <p className="text-xs font-semibold text-slate-500">
                  02. Subscription Status
                </p>
                {isOwner ? (
                  <>
                    <div className="text-sm font-bold text-emerald-700 font-mono">
                      OWNER EXEMPTION (No Paid Plan Required)
                    </div>
                    <p className="text-xs text-slate-600">
                      Unlimited question papers · Unlimited questions per paper · All templates &amp; answer keys enabled.
                    </p>
                  </>
                ) : currentSub && currentPlan ? (
                  <>
                    <div className="text-sm font-bold text-slate-950">
                      {currentPlan.name} ({currentPlan.code}) ·{" "}
                      <span
                        className={`font-mono ${
                          currentSub.status === "ACTIVE" ||
                          currentSub.status === "TRIAL"
                            ? "text-emerald-700"
                            : "text-rose-600"
                        }`}
                      >
                        {currentSub.status}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 font-mono">
                      Period ends:{" "}
                      {new Date(
                        currentSub.current_period_end
                      ).toLocaleDateString()}{" "}
                      · Max {currentPlan.max_questions_per_paper} questions/paper
                    </p>
                  </>
                ) : (
                  <>
                    <div className="text-sm font-bold text-rose-600">
                      No Subscription Assigned
                    </div>
                    <p className="text-xs text-slate-600">
                      Select FREE, BASIC, or PREMIUM on the Subscription &amp; Billing tab.
                    </p>
                  </>
                )}
              </div>

              {/* Column 3: Monthly Question Paper Usage */}
              <div className="space-y-2 pt-4 md:pt-0 md:border-l md:border-slate-100 md:pl-6">
                <p className="text-xs font-semibold text-slate-500">
                  03. Monthly Question Paper Usage
                </p>
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-lg font-bold font-mono tabular-nums text-slate-950">
                    {accessEvaluation.usageThisMonth}{" "}
                    <span className="text-xs font-normal text-slate-500">
                      /{" "}
                      {isOwner
                        ? "Unlimited (OWNER)"
                        : `${accessEvaluation.limitThisMonth ?? 0} papers`}
                    </span>
                  </span>
                  {!isOwner && accessEvaluation.limitThisMonth ? (
                    <span className="text-xs font-mono text-slate-500">
                      {usagePct}% used
                    </span>
                  ) : null}
                </div>
                {!isOwner && (
                  <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                    <div
                      className={`h-full transition-all ${
                        usagePct >= 100
                          ? "bg-rose-600"
                          : usagePct >= 80
                          ? "bg-amber-500"
                          : "bg-sky-600"
                      }`}
                      style={{ width: `${usagePct}%` }}
                    />
                  </div>
                )}
                <p className="text-xs text-slate-500">
                  Every generated paper is recorded in the <span className="font-mono">UsageRecords</span> table.
                </p>
              </div>
            </div>
          </div>

          {/* Recent Usage Records Table & Mobile Cards */}
          <div className="bg-white border border-slate-200 rounded-lg p-4 sm:p-6 space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="text-sm sm:text-base font-bold text-slate-950">
                  Recent Question Paper Generation Usage
                </h3>
                <p className="text-xs text-slate-500">
                  Metered execution log from the backend UsageRecords table
                </p>
              </div>
              <FileText className="w-4 h-4 text-slate-400 shrink-0" />
            </div>

            {recentUsage.length === 0 ? (
              <p className="text-xs text-slate-500 py-4">
                No question papers generated under this account yet.
              </p>
            ) : (
              <>
                {/* Mobile Stacked Cards (< 768px) */}
                <div className="md:hidden space-y-3">
                  {recentUsage.map((rec) => (
                    <div
                      key={rec.id}
                      className="p-3.5 rounded-md border border-slate-200 bg-slate-50/60 space-y-2 text-xs"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono font-semibold text-slate-900">
                          {rec.action_type}
                        </span>
                        <span className="font-mono text-[11px] text-slate-500">
                          {new Date(rec.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      <div className="text-slate-800 font-medium">
                        {rec.class_name} · {rec.subject}
                      </div>
                      <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-200/80 font-mono text-[11px] text-slate-600">
                        <span>
                          {rec.question_count} Questions · {rec.maximum_marks} Marks
                        </span>
                        <span>
                          {rec.bypassed_by_owner
                            ? "OWNER_BYPASS"
                            : `SUBSCRIPTION (${rec.billing_period_key})`}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Tablet & Desktop Table (>= 768px) */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 text-slate-500">
                        <th className="py-2.5 pr-4 font-semibold">Timestamp</th>
                        <th className="py-2.5 pr-4 font-semibold">Action</th>
                        <th className="py-2.5 pr-4 font-semibold">
                          Class &amp; Subject
                        </th>
                        <th className="py-2.5 pr-4 font-semibold">Questions</th>
                        <th className="py-2.5 pr-4 font-semibold">Marks</th>
                        <th className="py-2.5 font-semibold">Authorization</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-mono">
                      {recentUsage.map((rec) => (
                        <tr key={rec.id}>
                          <td className="py-2.5 pr-4 text-slate-600 whitespace-nowrap">
                            {new Date(rec.created_at).toLocaleString()}
                          </td>
                          <td className="py-2.5 pr-4 text-slate-900">
                            {rec.action_type}
                          </td>
                          <td className="py-2.5 pr-4 font-sans text-slate-800">
                            {rec.class_name} · {rec.subject}
                          </td>
                          <td className="py-2.5 pr-4 tabular-nums">
                            {rec.question_count}
                          </td>
                          <td className="py-2.5 pr-4 tabular-nums">
                            {rec.maximum_marks}
                          </td>
                          <td className="py-2.5 text-slate-600">
                            {rec.bypassed_by_owner
                              ? "OWNER_BYPASS"
                              : `SUBSCRIPTION (${rec.billing_period_key})`}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        </>
      ) : (
        /* SUBSCRIPTION & PRICING VIEW */
        <div className="space-y-6 sm:space-y-8">
          <div className="bg-white border border-slate-200 rounded-lg p-4 sm:p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="space-y-1">
              <h2 className="text-lg sm:text-xl font-bold text-slate-950">
                Subscription Plans &amp; Billing Management
              </h2>
              <p className="text-xs text-slate-600 leading-relaxed">
                {isOwner
                  ? "Your account holds the OWNER role and does not require a subscription. You may still inspect or test checkout flows below."
                  : "Choose a plan to activate or upgrade your Question Paper Generator quota. All payments are verified via signed backend webhooks."}
              </p>
            </div>

            {/* Billing Cycle Toggle */}
            <div className="grid grid-cols-2 sm:flex items-center gap-1 p-1 bg-slate-100 rounded-md shrink-0">
              <button
                type="button"
                onClick={() => setBillingCycle("MONTHLY")}
                className={`px-3 py-2 sm:py-1.5 rounded text-xs font-semibold transition-colors min-h-[38px] sm:min-h-0 ${
                  billingCycle === "MONTHLY"
                    ? "bg-white text-slate-950 shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Monthly Billing
              </button>
              <button
                type="button"
                onClick={() => setBillingCycle("ANNUAL")}
                className={`px-3 py-2 sm:py-1.5 rounded text-xs font-semibold transition-colors min-h-[38px] sm:min-h-0 ${
                  billingCycle === "ANNUAL"
                    ? "bg-white text-slate-950 shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Annual (2 Mo Free)
              </button>
            </div>
          </div>

          {/* Pricing Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
            {plans.map((plan) => {
              const isCurrentPlan =
                currentPlan?.id === plan.id &&
                currentSub?.status === "ACTIVE";
              const displayPrice =
                billingCycle === "ANNUAL"
                  ? Math.round(plan.price_monthly * 10 * 100) / 100
                  : plan.price_monthly;

              return (
                <div
                  key={plan.id}
                  className={`bg-white rounded-lg border p-5 sm:p-6 flex flex-col justify-between ${
                    isCurrentPlan
                      ? "border-emerald-600 ring-1 ring-emerald-600"
                      : plan.code === "BASIC"
                      ? "border-sky-600"
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
                        ${displayPrice}
                      </span>
                      <span className="text-xs text-slate-500">
                        / {billingCycle === "ANNUAL" ? "year" : "month"}
                      </span>
                    </div>

                    <div className="space-y-1 text-xs font-mono text-slate-700">
                      <div>
                        Paper Limit: {plan.papers_per_month_limit} papers / month
                      </div>
                      <div>
                        Max Questions: {plan.max_questions_per_paper} questions / paper
                      </div>
                    </div>

                    <ul className="space-y-2 pt-2">
                      {plan.features.map((f, i) => (
                        <li
                          key={i}
                          className="flex items-start gap-2 text-xs text-slate-700"
                        >
                          <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                          <span>{f}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="pt-6 mt-6 border-t border-slate-100">
                    <button
                      onClick={() => handleStartCheckout(plan)}
                      disabled={busyAction === `checkout_${plan.id}`}
                      className={`w-full py-2.5 px-4 rounded-md text-xs font-semibold flex items-center justify-center gap-2 transition-colors min-h-[42px] ${
                        isCurrentPlan
                          ? "bg-emerald-700 hover:bg-emerald-600 text-white"
                          : "bg-slate-900 hover:bg-slate-800 text-white"
                      }`}
                    >
                      {busyAction === `checkout_${plan.id}` ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Creating Checkout Order...</span>
                        </>
                      ) : isCurrentPlan ? (
                        <span>Renew / Extend {plan.name}</span>
                      ) : (
                        <span>
                          {plan.price_monthly === 0
                            ? `Activate ${plan.name}`
                            : `Subscribe to ${plan.name}`}
                        </span>
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Checkout & Signed Payment Webhook Modal / Panel */}
          {checkoutOrder && (
            <div className="bg-slate-900 text-white rounded-lg border border-slate-700 p-4 sm:p-6 space-y-4">
              <div className="flex items-start sm:items-center justify-between border-b border-slate-800 pb-4 gap-3">
                <div>
                  <h3 className="text-sm sm:text-base font-bold">
                    Payment Gateway Checkout &amp; Webhook Verification
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Order created in Payments table (Status: PENDING). Complete checkout to dispatch the HMAC-SHA256 signed webhook to POST /api/payments/webhook.
                  </p>
                </div>
                <CreditCard className="w-5 h-5 text-sky-400 shrink-0" />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 text-xs font-mono bg-slate-950/70 p-3.5 sm:p-4 rounded border border-slate-800">
                <div>
                  <span className="text-slate-400 block">Order ID</span>
                  <span className="break-all">{checkoutOrder.providerOrderId}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">Selected Plan</span>
                  <span>
                    {checkoutOrder.planName} ({checkoutOrder.planCode})
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block">Amount</span>
                  <span>
                    ${checkoutOrder.amount} {checkoutOrder.currency} (
                    {checkoutOrder.billingCycle})
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block">Webhook Signature</span>
                  <span className="truncate block text-emerald-400">
                    {checkoutOrder.gatewayWebhookPayload.signature.slice(0, 24)}
                    ...
                  </span>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-2.5 sm:gap-3">
                <button
                  type="button"
                  onClick={() => setCheckoutOrder(null)}
                  className="py-2.5 px-4 rounded border border-slate-700 text-slate-300 hover:text-white text-xs font-semibold text-center min-h-[40px]"
                >
                  Cancel Checkout
                </button>
                <button
                  type="button"
                  onClick={handleCompletePaymentWebhook}
                  disabled={busyAction === "webhook_verify"}
                  className="py-2.5 px-5 rounded bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center justify-center gap-2 min-h-[42px]"
                >
                  {busyAction === "webhook_verify" ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Verifying Webhook Signature...</span>
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="w-4 h-4 shrink-0" />
                      <span>
                        Authorize Payment &amp; Verify Backend Webhook
                      </span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Subscription Lifecycle & State Controls */}
          <div className="bg-white border border-slate-200 rounded-lg p-4 sm:p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
              <div>
                <h3 className="text-sm sm:text-base font-bold text-slate-950">
                  Subscription Lifecycle &amp; State Controls
                </h3>
                <p className="text-xs text-slate-500">
                  Test how different subscription states (TRIAL, ACTIVE, EXPIRED, CANCELLED, PAST_DUE) affect backend authorization.
                </p>
              </div>
              {currentSub && currentSub.status === "ACTIVE" && (
                <button
                  onClick={handleCancelSubscription}
                  disabled={busyAction === "cancel_sub"}
                  className="py-2 px-3.5 rounded border border-rose-300 text-rose-700 hover:bg-rose-50 text-xs font-semibold shrink-0 min-h-[38px]"
                >
                  Cancel Current Subscription
                </button>
              )}
            </div>

            <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-2 pt-1">
              {(
                [
                  "ACTIVE",
                  "TRIAL",
                  "EXPIRED",
                  "CANCELLED",
                  "PAST_DUE",
                ] as SubscriptionStatus[]
              ).map((st) => (
                <button
                  key={st}
                  onClick={() => handleSimulateState(st)}
                  disabled={busyAction === `sim_${st}`}
                  className={`py-2 px-3 rounded border text-xs font-mono font-medium transition-colors flex items-center justify-center gap-1.5 min-h-[38px] ${
                    currentSub?.status === st
                      ? "bg-slate-900 text-white border-slate-900"
                      : "bg-white text-slate-700 border-slate-300 hover:border-slate-400"
                  }`}
                >
                  <RefreshCw className="w-3 h-3 shrink-0" />
                  <span>{st}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Payment History Table & Mobile Cards */}
          <div className="bg-white border border-slate-200 rounded-lg p-4 sm:p-6 space-y-4">
            <h3 className="text-sm sm:text-base font-bold text-slate-950">
              Payment &amp; Webhook Verification History
            </h3>
            {payments.length === 0 ? (
              <p className="text-xs text-slate-500">
                No payment transactions recorded for this account yet.
              </p>
            ) : (
              <>
                {/* Mobile Stacked Cards (< 768px) */}
                <div className="md:hidden space-y-3">
                  {payments.map((p) => (
                    <div
                      key={p.id}
                      className="p-3.5 rounded-md border border-slate-200 bg-slate-50/60 space-y-2 text-xs font-mono"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-bold text-slate-900">
                          ${p.amount} {p.currency}
                        </span>
                        <span className="text-emerald-700 font-semibold">
                          {p.status}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-600 space-y-0.5 break-all">
                        <div>Order: {p.provider_order_id}</div>
                        <div>Payment: {p.provider_payment_id || "—"}</div>
                      </div>
                      <div className="flex flex-wrap items-center justify-between gap-2 pt-1.5 border-t border-slate-200/80 text-[11px]">
                        <span className="text-slate-500">
                          {new Date(p.created_at).toLocaleDateString()}
                        </span>
                        <span className="text-emerald-700">
                          {p.webhook_signature_verified
                            ? "HMAC-SHA256 Verified"
                            : "Pending"}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Tablet & Desktop Table (>= 768px) */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 text-slate-500">
                        <th className="py-2 pr-4 font-semibold">Date</th>
                        <th className="py-2 pr-4 font-semibold">Order ID</th>
                        <th className="py-2 pr-4 font-semibold">Payment ID</th>
                        <th className="py-2 pr-4 font-semibold">Amount</th>
                        <th className="py-2 pr-4 font-semibold">Status</th>
                        <th className="py-2 font-semibold">Webhook Verified</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-mono">
                      {payments.map((p) => (
                        <tr key={p.id}>
                          <td className="py-2.5 pr-4 text-slate-600 whitespace-nowrap">
                            {new Date(p.created_at).toLocaleString()}
                          </td>
                          <td className="py-2.5 pr-4">{p.provider_order_id}</td>
                          <td className="py-2.5 pr-4">
                            {p.provider_payment_id || "—"}
                          </td>
                          <td className="py-2.5 pr-4 tabular-nums">
                            ${p.amount} {p.currency}
                          </td>
                          <td className="py-2.5 pr-4">{p.status}</td>
                          <td className="py-2.5 text-emerald-700">
                            {p.webhook_signature_verified
                              ? "HMAC-SHA256 Verified"
                              : "Pending"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
