import express, { Request, Response, NextFunction } from "express";
import fs from "fs";
import path from "path";
import crypto from "crypto";
import bcrypt from "bcryptjs";

export type UserRole = "OWNER" | "ADMIN" | "USER";
export type AccountStatus = "ACTIVE" | "SUSPENDED" | "DISABLED";
export type SubscriptionStatus =
  | "TRIAL"
  | "ACTIVE"
  | "EXPIRED"
  | "CANCELLED"
  | "PAST_DUE";
export type BillingCycle = "MONTHLY" | "ANNUAL";
export type PaymentStatus = "PENDING" | "SUCCEEDED" | "FAILED" | "REFUNDED";

export interface DbUser {
  id: string;
  username: string;
  email: string;
  password_hash: string;
  role: UserRole;
  status: AccountStatus;
  failed_login_attempts: number;
  locked_until: string | null;
  reset_token_hash: string | null;
  reset_token_expires_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface SafeUser {
  id: string;
  username: string;
  email: string;
  role: UserRole;
  status: AccountStatus;
  created_at: string;
  updated_at: string;
}

export interface DbSubscriptionPlan {
  id: string;
  code: string;
  name: string;
  description: string;
  price_monthly: number;
  currency: string;
  billing_cycle: BillingCycle;
  duration_days: number;
  papers_per_month_limit: number;
  max_questions_per_paper: number;
  features: string[];
  allow_custom_template_upload: boolean;
  allow_answer_key_pdf: boolean;
  allow_single_regeneration: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface DbSubscription {
  id: string;
  user_id: string;
  plan_id: string;
  status: SubscriptionStatus;
  billing_cycle: BillingCycle;
  current_period_start: string;
  current_period_end: string;
  trial_ends_at: string | null;
  cancel_at_period_end: boolean;
  cancelled_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface DbPayment {
  id: string;
  user_id: string;
  subscription_id: string | null;
  plan_id: string;
  amount: number;
  currency: string;
  status: PaymentStatus;
  provider: string;
  provider_order_id: string;
  provider_payment_id: string | null;
  webhook_signature_verified: boolean;
  created_at: string;
  updated_at: string;
}

export interface DbUsageRecord {
  id: string;
  user_id: string;
  subscription_id: string | null;
  action_type: "GENERATE_PAPER" | "REGENERATE_QUESTION";
  question_count: number;
  subject: string;
  class_name: string;
  maximum_marks: number;
  billing_period_key: string;
  bypassed_by_owner: boolean;
  created_at: string;
}

export interface DbAuditLog {
  id: string;
  actor_user_id: string | null;
  actor_username: string;
  actor_role: string;
  action: string;
  target_type: string;
  target_id: string | null;
  details: string;
  ip_address: string | null;
  created_at: string;
}

export interface DbSession {
  id: string;
  user_id: string;
  token_hash: string;
  csrf_token: string;
  expires_at: string;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
}

interface DatabaseSchema {
  users: DbUser[];
  subscription_plans: DbSubscriptionPlan[];
  subscriptions: DbSubscription[];
  payments: DbPayment[];
  usage_records: DbUsageRecord[];
  audit_logs: DbAuditLog[];
  sessions: DbSession[];
}

export interface AccessEvaluationResult {
  allowed: boolean;
  code:
    | "OWNER_BYPASS"
    | "SUBSCRIPTION_VALID"
    | "NO_SUBSCRIPTION"
    | "SUBSCRIPTION_EXPIRED"
    | "SUBSCRIPTION_CANCELLED"
    | "SUBSCRIPTION_PAST_DUE"
    | "TRIAL_EXPIRED"
    | "USAGE_LIMIT_REACHED"
    | "FEATURE_LIMIT_EXCEEDED";
  reason: string;
  subscriptionBypassed: boolean;
  role: UserRole;
  subscription: DbSubscription | null;
  plan: DbSubscriptionPlan | null;
  usageThisMonth: number;
  limitThisMonth: number | null;
  maxQuestionsPerPaper: number | null;
}

export interface AuthenticatedRequest extends Request {
  authContext?: {
    user: DbUser;
    safeUser: SafeUser;
    session: DbSession;
    accessEvaluation?: AccessEvaluationResult;
  };
}

const DB_FILE_PATH = path.resolve(process.cwd(), "data", "eduforge_db.json");

const SESSION_SECRET =
  process.env.JWT_SECRET ||
  crypto
    .createHash("sha256")
    .update(`eduforge-session-secret-${process.cwd()}`)
    .digest("hex");

const WEBHOOK_SECRET =
  process.env.PAYMENT_WEBHOOK_SECRET ||
  crypto
    .createHash("sha256")
    .update(`eduforge-webhook-secret-${process.cwd()}`)
    .digest("hex");

const SESSION_DURATION_HOURS = Math.max(
  1,
  Number(process.env.SESSION_DURATION_HOURS) || 24
);

const MAX_FAILED_LOGIN_ATTEMPTS = 5;
const ACCOUNT_LOCK_MINUTES = 15;

// Sliding window IP rate limiter for login/auth endpoints
const ipRateLimitMap = new Map<string, { count: number; windowStart: number }>();
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const MAX_AUTH_REQUESTS_PER_MINUTE = 20;

function checkIpRateLimit(ip: string): { allowed: boolean; retryAfterSec: number } {
  const now = Date.now();
  const entry = ipRateLimitMap.get(ip);
  if (!entry || now - entry.windowStart > RATE_LIMIT_WINDOW_MS) {
    ipRateLimitMap.set(ip, { count: 1, windowStart: now });
    return { allowed: true, retryAfterSec: 0 };
  }
  entry.count += 1;
  if (entry.count > MAX_AUTH_REQUESTS_PER_MINUTE) {
    const retryAfterSec = Math.ceil(
      (RATE_LIMIT_WINDOW_MS - (now - entry.windowStart)) / 1000
    );
    return { allowed: false, retryAfterSec: Math.max(1, retryAfterSec) };
  }
  return { allowed: true, retryAfterSec: 0 };
}

function getCurrentBillingPeriodKey(date = new Date()): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

function hashSha256(raw: string): string {
  return crypto
    .createHmac("sha256", SESSION_SECRET)
    .update(raw)
    .digest("hex");
}

export function computeWebhookSignature(
  providerOrderId: string,
  providerPaymentId: string,
  amount: number,
  status: string
): string {
  const payload = `${providerOrderId}|${providerPaymentId}|${amount.toFixed(2)}|${status}`;
  return crypto
    .createHmac("sha256", WEBHOOK_SECRET)
    .update(payload)
    .digest("hex");
}

/**
 * Strips password_hash and all sensitive security fields before returning a User object.
 */
export function toSafeUser(user: DbUser): SafeUser {
  return {
    id: user.id,
    username: user.username,
    email: user.email,
    role: user.role,
    status: user.status,
    created_at: user.created_at,
    updated_at: user.updated_at,
  };
}

let cachedDb: DatabaseSchema | null = null;

function loadDb(): DatabaseSchema {
  if (cachedDb) return cachedDb;
  const dir = path.dirname(DB_FILE_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  if (fs.existsSync(DB_FILE_PATH)) {
    const raw = fs.readFileSync(DB_FILE_PATH, "utf-8");
    cachedDb = JSON.parse(raw) as DatabaseSchema;
  } else {
    cachedDb = {
      users: [],
      subscription_plans: [],
      subscriptions: [],
      payments: [],
      usage_records: [],
      audit_logs: [],
      sessions: [],
    };
  }
  runStartupMigration(cachedDb);
  return cachedDb;
}

function saveDb(db: DatabaseSchema): void {
  cachedDb = db;
  const dir = path.dirname(DB_FILE_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  const tmpPath = `${DB_FILE_PATH}.tmp`;
  fs.writeFileSync(tmpPath, JSON.stringify(db, null, 2), "utf-8");
  fs.renameSync(tmpPath, DB_FILE_PATH);
}

/**
 * Ensures the OWNER account and default subscription plans exist in the database.
 * Supports environment variable initialization (OWNER_USERNAME, OWNER_PASSWORD, OWNER_PASSWORD_HASH)
 * without ever hardcoding plaintext passwords in source code.
 */
function runStartupMigration(db: DatabaseSchema): void {
  let mutated = false;
  const nowIso = new Date().toISOString();

  const envOwnerUsername = (process.env.OWNER_USERNAME || "Akash00894").trim();
  const envOwnerEmail = (
    process.env.OWNER_EMAIL || "akash00894@eduforge.ai"
  ).trim();
  const envOwnerPassword = process.env.OWNER_PASSWORD;
  const envOwnerPasswordHash = process.env.OWNER_PASSWORD_HASH;

  let ownerUser = db.users.find(
    (u) =>
      u.role === "OWNER" ||
      u.username.toLowerCase() === envOwnerUsername.toLowerCase()
  );

  if (!ownerUser && (envOwnerPassword || envOwnerPasswordHash)) {
    const passwordHash = envOwnerPasswordHash
      ? envOwnerPasswordHash.trim()
      : bcrypt.hashSync(envOwnerPassword!, 12);

    ownerUser = {
      id: "usr_owner_001",
      username: envOwnerUsername,
      email: envOwnerEmail,
      password_hash: passwordHash,
      role: "OWNER",
      status: "ACTIVE",
      failed_login_attempts: 0,
      locked_until: null,
      reset_token_hash: null,
      reset_token_expires_at: null,
      created_at: nowIso,
      updated_at: nowIso,
    };
    db.users.unshift(ownerUser);
    mutated = true;
  } else if (ownerUser) {
    if (ownerUser.role !== "OWNER" || ownerUser.status !== "ACTIVE") {
      ownerUser.role = "OWNER";
      ownerUser.status = "ACTIVE";
      ownerUser.updated_at = nowIso;
      mutated = true;
    }
    if (envOwnerPassword && envOwnerPassword.trim().length > 0) {
      ownerUser.password_hash = bcrypt.hashSync(envOwnerPassword.trim(), 12);
      ownerUser.updated_at = nowIso;
      mutated = true;
    } else if (envOwnerPasswordHash && envOwnerPasswordHash.trim().length > 0) {
      ownerUser.password_hash = envOwnerPasswordHash.trim();
      ownerUser.updated_at = nowIso;
      mutated = true;
    }
  }

  if (mutated) {
    saveDb(db);
  }
}

export function recordAuditLog(params: {
  actorUserId: string | null;
  actorUsername: string;
  actorRole: string;
  action: string;
  targetType: string;
  targetId?: string | null;
  details: string;
  ipAddress?: string | null;
}): void {
  const db = loadDb();
  const entry: DbAuditLog = {
    id: `aud_${crypto.randomBytes(6).toString("hex")}`,
    actor_user_id: params.actorUserId,
    actor_username: params.actorUsername,
    actor_role: params.actorRole,
    action: params.action,
    target_type: params.targetType,
    target_id: params.targetId || null,
    details: params.details,
    ip_address: params.ipAddress || null,
    created_at: new Date().toISOString(),
  };
  db.audit_logs.unshift(entry);
  if (db.audit_logs.length > 300) {
    db.audit_logs = db.audit_logs.slice(0, 300);
  }
  saveDb(db);
}

export function getActiveSubscriptionForUser(userId: string): {
  subscription: DbSubscription | null;
  plan: DbSubscriptionPlan | null;
} {
  const db = loadDb();
  const userSubs = db.subscriptions
    .filter((s) => s.user_id === userId)
    .sort(
      (a, b) =>
        new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
    );

  const subscription = userSubs[0] || null;
  if (!subscription) {
    return { subscription: null, plan: null };
  }

  // Automatically transition expired active/trial periods
  const now = Date.now();
  const periodEnd = new Date(subscription.current_period_end).getTime();
  if (
    (subscription.status === "ACTIVE" || subscription.status === "TRIAL") &&
    periodEnd < now
  ) {
    subscription.status = "EXPIRED";
    subscription.updated_at = new Date().toISOString();
    saveDb(db);
  }

  const plan =
    db.subscription_plans.find((p) => p.id === subscription.plan_id) || null;
  return { subscription, plan };
}

export function getMonthlyUsageCount(
  userId: string,
  actionType: "GENERATE_PAPER" | "REGENERATE_QUESTION" = "GENERATE_PAPER"
): number {
  const db = loadDb();
  const periodKey = getCurrentBillingPeriodKey();
  return db.usage_records.filter(
    (u) =>
      u.user_id === userId &&
      u.billing_period_key === periodKey &&
      u.action_type === actionType
  ).length;
}

/**
 * Centralized Authorization & Subscription Exemption Rule:
 *
 * if (user.role === "OWNER") {
 *   allow_access(); // Bypass subscription, feature permission, and usage limit checks
 * } else {
 *   validate_subscription();
 *   validate_feature_permission();
 *   validate_usage_limit();
 * }
 */
export function evaluateQuestionGeneratorAccess(
  user: DbUser,
  options?: {
    requestedQuestionCount?: number;
    isSingleRegeneration?: boolean;
    isCustomTemplateUpload?: boolean;
  }
): AccessEvaluationResult {
  const usageThisMonth = getMonthlyUsageCount(user.id, "GENERATE_PAPER");
  const { subscription, plan } = getActiveSubscriptionForUser(user.id);

  // 1. OWNER Exemption Rule — Full access without requiring any subscription
  if (user.role === "OWNER") {
    return {
      allowed: true,
      code: "OWNER_BYPASS",
      reason:
        "OWNER role verified. Subscription, plan feature limits, and monthly usage quotas are bypassed.",
      subscriptionBypassed: true,
      role: user.role,
      subscription,
      plan,
      usageThisMonth,
      limitThisMonth: null,
      maxQuestionsPerPaper: null,
    };
  }

  // 2. Normal User / Non-Owner -> Validate Subscription Existence
  if (!subscription || !plan) {
    return {
      allowed: false,
      code: "NO_SUBSCRIPTION",
      reason:
        "An active subscription is required to generate question papers. Please select a plan on the Subscription & Pricing page.",
      subscriptionBypassed: false,
      role: user.role,
      subscription: null,
      plan: null,
      usageThisMonth,
      limitThisMonth: 0,
      maxQuestionsPerPaper: 0,
    };
  }

  // 3. Validate Subscription State (ACTIVE, TRIAL, EXPIRED, CANCELLED, PAST_DUE)
  if (subscription.status === "EXPIRED") {
    return {
      allowed: false,
      code: "SUBSCRIPTION_EXPIRED",
      reason: `Your ${plan.name} (${plan.code}) subscription expired on ${new Date(
        subscription.current_period_end
      ).toLocaleDateString()}. Please renew or upgrade your subscription to continue generating question papers.`,
      subscriptionBypassed: false,
      role: user.role,
      subscription,
      plan,
      usageThisMonth,
      limitThisMonth: plan.papers_per_month_limit,
      maxQuestionsPerPaper: plan.max_questions_per_paper,
    };
  }

  if (subscription.status === "CANCELLED") {
    return {
      allowed: false,
      code: "SUBSCRIPTION_CANCELLED",
      reason: `Your ${plan.name} (${plan.code}) subscription has been cancelled. Reactivate or subscribe to a plan to access the Question Paper Generator.`,
      subscriptionBypassed: false,
      role: user.role,
      subscription,
      plan,
      usageThisMonth,
      limitThisMonth: plan.papers_per_month_limit,
      maxQuestionsPerPaper: plan.max_questions_per_paper,
    };
  }

  if (subscription.status === "PAST_DUE") {
    return {
      allowed: false,
      code: "SUBSCRIPTION_PAST_DUE",
      reason: `Your ${plan.name} (${plan.code}) subscription is past due because of a pending payment renewal. Please complete payment verification to restore access.`,
      subscriptionBypassed: false,
      role: user.role,
      subscription,
      plan,
      usageThisMonth,
      limitThisMonth: plan.papers_per_month_limit,
      maxQuestionsPerPaper: plan.max_questions_per_paper,
    };
  }

  if (subscription.status === "TRIAL" && subscription.trial_ends_at) {
    if (new Date(subscription.trial_ends_at).getTime() < Date.now()) {
      return {
        allowed: false,
        code: "TRIAL_EXPIRED",
        reason: `Your trial period for ${plan.name} ended on ${new Date(
          subscription.trial_ends_at
        ).toLocaleDateString()}. Upgrade to an active subscription to continue.`,
        subscriptionBypassed: false,
        role: user.role,
        subscription,
        plan,
        usageThisMonth,
        limitThisMonth: plan.papers_per_month_limit,
        maxQuestionsPerPaper: plan.max_questions_per_paper,
      };
    }
  }

  // 4. Validate Plan Feature Permissions
  if (
    options?.isSingleRegeneration &&
    !plan.allow_single_regeneration
  ) {
    return {
      allowed: false,
      code: "FEATURE_LIMIT_EXCEEDED",
      reason: `Single-question regeneration is not included in the ${plan.name} (${plan.code}) plan. Upgrade to BASIC or PREMIUM to unlock single-question regeneration.`,
      subscriptionBypassed: false,
      role: user.role,
      subscription,
      plan,
      usageThisMonth,
      limitThisMonth: plan.papers_per_month_limit,
      maxQuestionsPerPaper: plan.max_questions_per_paper,
    };
  }

  if (
    options?.isCustomTemplateUpload &&
    !plan.allow_custom_template_upload
  ) {
    return {
      allowed: false,
      code: "FEATURE_LIMIT_EXCEEDED",
      reason: `Custom template document extraction is not included in the ${plan.name} (${plan.code}) plan. Upgrade to BASIC or PREMIUM to upload custom templates.`,
      subscriptionBypassed: false,
      role: user.role,
      subscription,
      plan,
      usageThisMonth,
      limitThisMonth: plan.papers_per_month_limit,
      maxQuestionsPerPaper: plan.max_questions_per_paper,
    };
  }

  if (
    typeof options?.requestedQuestionCount === "number" &&
    options.requestedQuestionCount > plan.max_questions_per_paper
  ) {
    return {
      allowed: false,
      code: "FEATURE_LIMIT_EXCEEDED",
      reason: `Your ${plan.name} (${plan.code}) plan allows up to ${plan.max_questions_per_paper} questions per paper, but ${options.requestedQuestionCount} questions were requested. Reduce the question count or upgrade your plan.`,
      subscriptionBypassed: false,
      role: user.role,
      subscription,
      plan,
      usageThisMonth,
      limitThisMonth: plan.papers_per_month_limit,
      maxQuestionsPerPaper: plan.max_questions_per_paper,
    };
  }

  // 5. Validate Monthly Usage Quota (for full paper generation)
  if (
    !options?.isSingleRegeneration &&
    !options?.isCustomTemplateUpload &&
    usageThisMonth >= plan.papers_per_month_limit
  ) {
    return {
      allowed: false,
      code: "USAGE_LIMIT_REACHED",
      reason: `Monthly usage limit reached (${usageThisMonth} / ${plan.papers_per_month_limit} question papers generated this month on the ${plan.name} plan). Please upgrade your subscription plan for higher monthly capacity.`,
      subscriptionBypassed: false,
      role: user.role,
      subscription,
      plan,
      usageThisMonth,
      limitThisMonth: plan.papers_per_month_limit,
      maxQuestionsPerPaper: plan.max_questions_per_paper,
    };
  }

  return {
    allowed: true,
    code: "SUBSCRIPTION_VALID",
    reason: `Active ${plan.name} (${subscription.status}) verified (${usageThisMonth}/${plan.papers_per_month_limit} papers used this month).`,
    subscriptionBypassed: false,
    role: user.role,
    subscription,
    plan,
    usageThisMonth,
    limitThisMonth: plan.papers_per_month_limit,
    maxQuestionsPerPaper: plan.max_questions_per_paper,
  };
}

export function recordUsageEvent(params: {
  user: DbUser;
  actionType: "GENERATE_PAPER" | "REGENERATE_QUESTION";
  questionCount: number;
  subject: string;
  className: string;
  maximumMarks: number;
}): DbUsageRecord {
  const db = loadDb();
  const { subscription } = getActiveSubscriptionForUser(params.user.id);
  const record: DbUsageRecord = {
    id: `use_${crypto.randomBytes(6).toString("hex")}`,
    user_id: params.user.id,
    subscription_id: subscription?.id || null,
    action_type: params.actionType,
    question_count: params.questionCount,
    subject: params.subject || "General",
    class_name: params.className || "General",
    maximum_marks: params.maximumMarks || 0,
    billing_period_key: getCurrentBillingPeriodKey(),
    bypassed_by_owner: params.user.role === "OWNER",
    created_at: new Date().toISOString(),
  };
  db.usage_records.unshift(record);
  saveDb(db);
  return record;
}

function parseCookies(cookieHeader?: string): Record<string, string> {
  const out: Record<string, string> = {};
  if (!cookieHeader) return out;
  const parts = cookieHeader.split(";");
  for (const part of parts) {
    const idx = part.indexOf("=");
    if (idx > 0) {
      const k = part.slice(0, idx).trim();
      const v = decodeURIComponent(part.slice(idx + 1).trim());
      out[k] = v;
    }
  }
  return out;
}

function extractSessionToken(req: Request): string | null {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.slice(7).trim();
    if (token) return token;
  }
  const cookies = parseCookies(req.headers.cookie);
  if (cookies.eduforge_session) {
    return cookies.eduforge_session;
  }
  return null;
}

function setSessionCookie(res: Response, rawToken: string, maxAgeSeconds: number): void {
  const cookieParts = [
    `eduforge_session=${encodeURIComponent(rawToken)}`,
    "Path=/",
    "HttpOnly",
    `Max-Age=${maxAgeSeconds}`,
    "SameSite=Lax",
  ];
  res.setHeader("Set-Cookie", cookieParts.join("; "));
}

function clearSessionCookie(res: Response): void {
  res.setHeader(
    "Set-Cookie",
    "eduforge_session=; Path=/; HttpOnly; Max-Age=0; SameSite=Lax"
  );
}

/**
 * Authentication Middleware:
 * Validates session token (Bearer or HttpOnly cookie), checks account status,
 * and enforces CSRF protection when mutating via cookie session.
 */
export function authenticateUser(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  const rawToken = extractSessionToken(req);
  if (!rawToken) {
    return res.status(401).json({
      error: "Authentication required. Please log in to continue.",
      code: "UNAUTHENTICATED",
    });
  }

  const db = loadDb();
  const tokenHash = hashSha256(rawToken);
  const now = Date.now();

  const session = db.sessions.find((s) => s.token_hash === tokenHash);
  if (!session || new Date(session.expires_at).getTime() < now) {
    if (session) {
      db.sessions = db.sessions.filter((s) => s.id !== session.id);
      saveDb(db);
    }
    return res.status(401).json({
      error: "Your session has expired. Please sign in again.",
      code: "SESSION_EXPIRED",
    });
  }

  // Verify CSRF token if state-changing request relies on cookie without Bearer header
  const isStateChanging = ["POST", "PUT", "PATCH", "DELETE"].includes(
    req.method.toUpperCase()
  );
  const hasBearer = Boolean(
    req.headers.authorization && req.headers.authorization.startsWith("Bearer ")
  );
  if (isStateChanging && !hasBearer) {
    const csrfHeader = req.headers["x-csrf-token"];
    if (!csrfHeader || csrfHeader !== session.csrf_token) {
      return res.status(403).json({
        error: "CSRF token validation failed.",
        code: "CSRF_INVALID",
      });
    }
  }

  const user = db.users.find((u) => u.id === session.user_id);
  if (!user) {
    return res.status(401).json({
      error: "Account associated with this session no longer exists.",
      code: "USER_NOT_FOUND",
    });
  }

  if (user.status !== "ACTIVE") {
    return res.status(403).json({
      error: `Your account is currently ${user.status}. Please contact the platform administrator.`,
      code: "ACCOUNT_INACTIVE",
    });
  }

  req.authContext = {
    user,
    safeUser: toSafeUser(user),
    session,
  };
  next();
}

/**
 * Role-Based Access Control (RBAC) Middleware
 */
export function requireRoles(allowedRoles: UserRole[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const ctx = req.authContext;
    if (!ctx) {
      return res.status(401).json({
        error: "Authentication required.",
        code: "UNAUTHENTICATED",
      });
    }
    if (!allowedRoles.includes(ctx.user.role)) {
      return res.status(403).json({
        error: `Access denied. Required role: ${allowedRoles.join(" or ")}. Current role: ${ctx.user.role}.`,
        code: "FORBIDDEN_ROLE",
      });
    }
    next();
  };
}

/**
 * Centralized Question Paper Generator Authorization Middleware:
 * - OWNER -> Full access (bypasses subscription, feature, and usage checks)
 * - Normal User -> Checks active subscription, plan permissions, and monthly usage quota
 */
export function authorizeQuestionGeneratorMiddleware(mode: {
  isSingleRegeneration?: boolean;
  isCustomTemplateUpload?: boolean;
}) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const ctx = req.authContext;
    if (!ctx) {
      return res.status(401).json({
        error: "Authentication required.",
        code: "UNAUTHENTICATED",
      });
    }

    let requestedQuestionCount = 0;
    if (Array.isArray(req.body?.typeConfigs)) {
      requestedQuestionCount = req.body.typeConfigs
        .filter((tc: any) => tc && tc.enabled && Number(tc.count) > 0)
        .reduce((acc: number, tc: any) => acc + Number(tc.count || 0), 0);
    }

    const evaluation = evaluateQuestionGeneratorAccess(ctx.user, {
      requestedQuestionCount,
      isSingleRegeneration: mode.isSingleRegeneration,
      isCustomTemplateUpload: mode.isCustomTemplateUpload,
    });

    ctx.accessEvaluation = evaluation;

    if (!evaluation.allowed) {
      return res.status(403).json({
        error: evaluation.reason,
        code: evaluation.code,
        accessEvaluation: {
          allowed: evaluation.allowed,
          code: evaluation.code,
          reason: evaluation.reason,
          role: evaluation.role,
          usageThisMonth: evaluation.usageThisMonth,
          limitThisMonth: evaluation.limitThisMonth,
          maxQuestionsPerPaper: evaluation.maxQuestionsPerPaper,
          planCode: evaluation.plan?.code || null,
          subscriptionStatus: evaluation.subscription?.status || null,
        },
      });
    }

    next();
  };
}

export function mountAuthAndSubscriptionRoutes(app: express.Application): void {
  // Public endpoint: Fetch active subscription plans from database (not hardcoded in frontend)
  app.get("/api/public/plans", (_req, res) => {
    const db = loadDb();
    const activePlans = db.subscription_plans.filter((p) => p.is_active);
    res.json({ plans: activePlans });
  });

  // Auth 1: Register / Signup
  app.post("/api/auth/register", (req, res) => {
    try {
      const ip =
        (req.headers["x-forwarded-for"] as string) ||
        req.socket.remoteAddress ||
        "unknown";
      const rateLimit = checkIpRateLimit(ip);
      if (!rateLimit.allowed) {
        return res.status(429).json({
          error: `Too many requests. Please try again in ${rateLimit.retryAfterSec} seconds.`,
        });
      }

      const { username, email, password, initialPlanCode } = req.body || {};
      const cleanUsername = String(username || "").trim();
      const cleanEmail = String(email || "")
        .trim()
        .toLowerCase();
      const rawPassword = String(password || "");

      if (!/^[a-zA-Z0-9_.-]{3,32}$/.test(cleanUsername)) {
        return res.status(400).json({
          error:
            "Username must be 3–32 characters and contain only letters, numbers, underscores, dots, or hyphens.",
        });
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
        return res.status(400).json({
          error: "Please enter a valid email address.",
        });
      }
      if (rawPassword.length < 6) {
        return res.status(400).json({
          error: "Password must be at least 6 characters long.",
        });
      }

      const db = loadDb();
      if (
        db.users.some(
          (u) => u.username.toLowerCase() === cleanUsername.toLowerCase()
        )
      ) {
        return res.status(409).json({
          error: "Username is already taken. Please choose another username.",
        });
      }
      if (db.users.some((u) => u.email.toLowerCase() === cleanEmail)) {
        return res.status(409).json({
          error: "An account with this email address already exists.",
        });
      }

      const nowIso = new Date().toISOString();
      const passwordHash = bcrypt.hashSync(rawPassword, 12);

      const newUser: DbUser = {
        id: `usr_${crypto.randomBytes(6).toString("hex")}`,
        username: cleanUsername,
        email: cleanEmail,
        password_hash: passwordHash,
        role: "USER",
        status: "ACTIVE",
        failed_login_attempts: 0,
        locked_until: null,
        reset_token_hash: null,
        reset_token_expires_at: null,
        created_at: nowIso,
        updated_at: nowIso,
      };
      db.users.push(newUser);

      // Optional initial FREE plan or Trial provisioning if requested
      if (initialPlanCode && initialPlanCode !== "NONE") {
        const plan = db.subscription_plans.find(
          (p) =>
            p.code.toUpperCase() === String(initialPlanCode).toUpperCase() &&
            p.is_active
        );
        if (plan && plan.price_monthly === 0) {
          const periodEnd = new Date(
            Date.now() + plan.duration_days * 24 * 60 * 60 * 1000
          ).toISOString();
          const newSub: DbSubscription = {
            id: `sub_${crypto.randomBytes(6).toString("hex")}`,
            user_id: newUser.id,
            plan_id: plan.id,
            status: "ACTIVE",
            billing_cycle: plan.billing_cycle,
            current_period_start: nowIso,
            current_period_end: periodEnd,
            trial_ends_at: null,
            cancel_at_period_end: false,
            cancelled_at: null,
            created_at: nowIso,
            updated_at: nowIso,
          };
          db.subscriptions.push(newSub);
        }
      }

      // Create authenticated session
      const rawSessionToken = crypto.randomBytes(32).toString("hex");
      const csrfToken = crypto.randomBytes(24).toString("hex");
      const maxAgeSec = SESSION_DURATION_HOURS * 3600;
      const session: DbSession = {
        id: `ses_${crypto.randomBytes(6).toString("hex")}`,
        user_id: newUser.id,
        token_hash: hashSha256(rawSessionToken),
        csrf_token: csrfToken,
        expires_at: new Date(Date.now() + maxAgeSec * 1000).toISOString(),
        ip_address: ip,
        user_agent: String(req.headers["user-agent"] || ""),
        created_at: nowIso,
      };
      db.sessions.push(session);
      saveDb(db);

      recordAuditLog({
        actorUserId: newUser.id,
        actorUsername: newUser.username,
        actorRole: newUser.role,
        action: "USER_REGISTERED",
        targetType: "Users",
        targetId: newUser.id,
        details: `Registered new USER account (${newUser.username}, ${newUser.email}).`,
        ipAddress: ip,
      });

      setSessionCookie(res, rawSessionToken, maxAgeSec);
      const accessEvaluation = evaluateQuestionGeneratorAccess(newUser);
      res.status(201).json({
        user: toSafeUser(newUser),
        token: rawSessionToken,
        csrfToken,
        accessEvaluation,
      });
    } catch (err: any) {
      res.status(500).json({
        error: err?.message || "Registration failed.",
      });
    }
  });

  // Auth 2: Login (authenticates strictly against Users database table with bcrypt)
  app.post("/api/auth/login", (req, res) => {
    try {
      const ip =
        (req.headers["x-forwarded-for"] as string) ||
        req.socket.remoteAddress ||
        "unknown";
      const rateLimit = checkIpRateLimit(ip);
      if (!rateLimit.allowed) {
        return res.status(429).json({
          error: `Too many login attempts from this IP. Please wait ${rateLimit.retryAfterSec} seconds.`,
        });
      }

      const { identifier, username, password } = req.body || {};
      const loginId = String(identifier || username || "").trim();
      const rawPassword = String(password || "");

      if (!loginId || !rawPassword) {
        return res.status(400).json({
          error: "Username/email and password are required.",
        });
      }

      const db = loadDb();
      const user = db.users.find(
        (u) =>
          u.username.toLowerCase() === loginId.toLowerCase() ||
          u.email.toLowerCase() === loginId.toLowerCase()
      );

      if (!user) {
        return res.status(401).json({
          error: "Invalid username or password.",
        });
      }

      // Check temporary brute-force lock
      if (
        user.locked_until &&
        new Date(user.locked_until).getTime() > Date.now()
      ) {
        const remainingMin = Math.ceil(
          (new Date(user.locked_until).getTime() - Date.now()) / 60000
        );
        return res.status(423).json({
          error: `Account temporarily locked due to multiple failed login attempts. Try again in ${remainingMin} minute(s).`,
        });
      }

      if (user.status !== "ACTIVE") {
        return res.status(403).json({
          error: `Account status is ${user.status}. Access is restricted.`,
        });
      }

      const isPasswordValid = bcrypt.compareSync(
        rawPassword,
        user.password_hash
      );
      if (!isPasswordValid) {
        user.failed_login_attempts = (user.failed_login_attempts || 0) + 1;
        if (user.failed_login_attempts >= MAX_FAILED_LOGIN_ATTEMPTS) {
          user.locked_until = new Date(
            Date.now() + ACCOUNT_LOCK_MINUTES * 60 * 1000
          ).toISOString();
        }
        user.updated_at = new Date().toISOString();
        saveDb(db);

        recordAuditLog({
          actorUserId: user.id,
          actorUsername: user.username,
          actorRole: user.role,
          action: "USER_LOGIN_FAILED",
          targetType: "Users",
          targetId: user.id,
          details: `Failed login attempt (${user.failed_login_attempts}/${MAX_FAILED_LOGIN_ATTEMPTS}).`,
          ipAddress: ip,
        });

        return res.status(401).json({
          error: "Invalid username or password.",
        });
      }

      // Reset failed login attempts upon successful authentication
      user.failed_login_attempts = 0;
      user.locked_until = null;
      user.updated_at = new Date().toISOString();

      const rawSessionToken = crypto.randomBytes(32).toString("hex");
      const csrfToken = crypto.randomBytes(24).toString("hex");
      const maxAgeSec = SESSION_DURATION_HOURS * 3600;
      const nowIso = new Date().toISOString();

      const session: DbSession = {
        id: `ses_${crypto.randomBytes(6).toString("hex")}`,
        user_id: user.id,
        token_hash: hashSha256(rawSessionToken),
        csrf_token: csrfToken,
        expires_at: new Date(Date.now() + maxAgeSec * 1000).toISOString(),
        ip_address: ip,
        user_agent: String(req.headers["user-agent"] || ""),
        created_at: nowIso,
      };
      db.sessions.push(session);
      saveDb(db);

      recordAuditLog({
        actorUserId: user.id,
        actorUsername: user.username,
        actorRole: user.role,
        action: "USER_LOGIN_SUCCESS",
        targetType: "Users",
        targetId: user.id,
        details: `Authenticated ${user.username} with role=${user.role}${
          user.role === "OWNER"
            ? " (OWNER subscription exemption active)"
            : ""
        }.`,
        ipAddress: ip,
      });

      setSessionCookie(res, rawSessionToken, maxAgeSec);
      const accessEvaluation = evaluateQuestionGeneratorAccess(user);

      res.json({
        user: toSafeUser(user),
        token: rawSessionToken,
        csrfToken,
        accessEvaluation,
      });
    } catch (err: any) {
      res.status(500).json({
        error: err?.message || "Login failed.",
      });
    }
  });

  // Auth 3: Logout
  app.post(
    "/api/auth/logout",
    authenticateUser,
    (req: AuthenticatedRequest, res) => {
      const db = loadDb();
      const ctx = req.authContext!;
      db.sessions = db.sessions.filter((s) => s.id !== ctx.session.id);
      saveDb(db);
      clearSessionCookie(res);

      recordAuditLog({
        actorUserId: ctx.user.id,
        actorUsername: ctx.user.username,
        actorRole: ctx.user.role,
        action: "USER_LOGOUT",
        targetType: "Sessions",
        targetId: ctx.session.id,
        details: `User ${ctx.user.username} logged out.`,
      });

      res.json({ success: true });
    }
  );

  // Auth 4: Current Authenticated User Session & Subscription Context
  app.get(
    "/api/auth/me",
    authenticateUser,
    (req: AuthenticatedRequest, res) => {
      const ctx = req.authContext!;
      const accessEvaluation = evaluateQuestionGeneratorAccess(ctx.user);
      const db = loadDb();
      const recentUsage = db.usage_records
        .filter((u) => u.user_id === ctx.user.id)
        .slice(0, 25);
      const payments = db.payments
        .filter((p) => p.user_id === ctx.user.id)
        .slice(0, 25);

      res.json({
        user: ctx.safeUser,
        csrfToken: ctx.session.csrf_token,
        accessEvaluation,
        recentUsage,
        payments,
      });
    }
  );

  // Auth 4b: Update Authenticated User Profile (Email)
  app.patch(
    "/api/auth/profile",
    authenticateUser,
    (req: AuthenticatedRequest, res) => {
      const ctx = req.authContext!;
      const { email } = req.body || {};
      const cleanEmail = String(email || "")
        .trim()
        .toLowerCase();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
        return res.status(400).json({
          error: "Please enter a valid email address.",
        });
      }

      const db = loadDb();
      if (
        db.users.some(
          (u) => u.id !== ctx.user.id && u.email.toLowerCase() === cleanEmail
        )
      ) {
        return res.status(409).json({
          error: "Another account is already using this email address.",
        });
      }

      const user = db.users.find((u) => u.id === ctx.user.id);
      if (!user) {
        return res.status(404).json({ error: "User not found." });
      }
      user.email = cleanEmail;
      user.updated_at = new Date().toISOString();
      saveDb(db);

      recordAuditLog({
        actorUserId: user.id,
        actorUsername: user.username,
        actorRole: user.role,
        action: "USER_PROFILE_UPDATED",
        targetType: "Users",
        targetId: user.id,
        details: `Updated profile email for ${user.username} to ${user.email}.`,
      });

      res.json({
        user: toSafeUser(user),
        message: "Profile updated successfully.",
      });
    }
  );

  // Auth 4c: Change Password for Authenticated User
  app.post(
    "/api/auth/change-password",
    authenticateUser,
    (req: AuthenticatedRequest, res) => {
      const ctx = req.authContext!;
      const { currentPassword, newPassword } = req.body || {};
      const rawCurrent = String(currentPassword || "");
      const rawNew = String(newPassword || "");

      if (!rawCurrent || rawNew.length < 6) {
        return res.status(400).json({
          error:
            "Current password and a new password of at least 6 characters are required.",
        });
      }

      const db = loadDb();
      const user = db.users.find((u) => u.id === ctx.user.id);
      if (!user) {
        return res.status(404).json({ error: "User not found." });
      }

      if (!bcrypt.compareSync(rawCurrent, user.password_hash)) {
        return res.status(401).json({
          error: "Current password is incorrect.",
        });
      }

      user.password_hash = bcrypt.hashSync(rawNew, 12);
      user.updated_at = new Date().toISOString();
      saveDb(db);

      recordAuditLog({
        actorUserId: user.id,
        actorUsername: user.username,
        actorRole: user.role,
        action: "USER_PASSWORD_CHANGED",
        targetType: "Users",
        targetId: user.id,
        details: `Changed password via authenticated profile settings for ${user.username}.`,
      });

      res.json({
        success: true,
        message: "Password updated securely with bcrypt cost-12 hashing.",
      });
    }
  );

  // Auth 5: Forgot Password (generates time-limited reset token stored as hash)
  app.post("/api/auth/forgot-password", (req, res) => {
    const { identifier } = req.body || {};
    const cleanId = String(identifier || "").trim();
    if (!cleanId) {
      return res.status(400).json({
        error: "Please enter your username or email address.",
      });
    }

    const db = loadDb();
    const user = db.users.find(
      (u) =>
        u.username.toLowerCase() === cleanId.toLowerCase() ||
        u.email.toLowerCase() === cleanId.toLowerCase()
    );

    if (!user) {
      // Return generic message to prevent account enumeration
      return res.json({
        message:
          "If an account matches that identifier, a password reset token has been generated.",
      });
    }

    const rawResetToken = crypto.randomBytes(20).toString("hex");
    user.reset_token_hash = hashSha256(rawResetToken);
    user.reset_token_expires_at = new Date(
      Date.now() + 30 * 60 * 1000
    ).toISOString();
    user.updated_at = new Date().toISOString();
    saveDb(db);

    recordAuditLog({
      actorUserId: user.id,
      actorUsername: user.username,
      actorRole: user.role,
      action: "PASSWORD_RESET_REQUESTED",
      targetType: "Users",
      targetId: user.id,
      details: `Generated 30-minute password reset token for ${user.username}.`,
    });

    res.json({
      message:
        "Password reset token generated. Use this token in the Reset Password form within 30 minutes.",
      resetToken: rawResetToken,
      expiresAt: user.reset_token_expires_at,
    });
  });

  // Auth 6: Reset Password
  app.post("/api/auth/reset-password", (req, res) => {
    const { resetToken, newPassword } = req.body || {};
    const cleanToken = String(resetToken || "").trim();
    const rawNewPassword = String(newPassword || "");

    if (!cleanToken || rawNewPassword.length < 6) {
      return res.status(400).json({
        error:
          "A valid reset token and a new password of at least 6 characters are required.",
      });
    }

    const db = loadDb();
    const tokenHash = hashSha256(cleanToken);
    const user = db.users.find((u) => u.reset_token_hash === tokenHash);

    if (
      !user ||
      !user.reset_token_expires_at ||
      new Date(user.reset_token_expires_at).getTime() < Date.now()
    ) {
      return res.status(400).json({
        error: "Invalid or expired password reset token.",
      });
    }

    user.password_hash = bcrypt.hashSync(rawNewPassword, 12);
    user.reset_token_hash = null;
    user.reset_token_expires_at = null;
    user.failed_login_attempts = 0;
    user.locked_until = null;
    user.updated_at = new Date().toISOString();

    // Invalidate all existing sessions for security
    db.sessions = db.sessions.filter((s) => s.user_id !== user.id);
    saveDb(db);

    recordAuditLog({
      actorUserId: user.id,
      actorUsername: user.username,
      actorRole: user.role,
      action: "PASSWORD_RESET_COMPLETED",
      targetType: "Users",
      targetId: user.id,
      details: `Password reset completed and active sessions revoked for ${user.username}.`,
    });

    res.json({
      success: true,
      message: "Password has been reset securely. You can now sign in.",
    });
  });

  // Subscription & Billing 1: Initiate Checkout Order
  app.post(
    "/api/payments/checkout",
    authenticateUser,
    (req: AuthenticatedRequest, res) => {
      const ctx = req.authContext!;
      const { planId, billingCycle } = req.body || {};
      const db = loadDb();

      const plan = db.subscription_plans.find(
        (p) => (p.id === planId || p.code === planId) && p.is_active
      );
      if (!plan) {
        return res.status(404).json({
          error: "Selected subscription plan was not found.",
        });
      }

      const cycle: BillingCycle =
        billingCycle === "ANNUAL" ? "ANNUAL" : "MONTHLY";
      const amount =
        cycle === "ANNUAL"
          ? Math.round(plan.price_monthly * 10 * 100) / 100
          : plan.price_monthly;

      const nowIso = new Date().toISOString();
      const providerOrderId = `ord_${Date.now()}_${crypto
        .randomBytes(4)
        .toString("hex")}`;
      const payment: DbPayment = {
        id: `pay_${crypto.randomBytes(6).toString("hex")}`,
        user_id: ctx.user.id,
        subscription_id: null,
        plan_id: plan.id,
        amount,
        currency: plan.currency,
        status: "PENDING",
        provider: "EDUFORGE_GATEWAY",
        provider_order_id: providerOrderId,
        provider_payment_id: null,
        webhook_signature_verified: false,
        created_at: nowIso,
        updated_at: nowIso,
      };
      db.payments.unshift(payment);
      saveDb(db);

      // Prepare simulated gateway transaction & HMAC-SHA256 webhook signature
      // so the Payment Gateway Webhook endpoint can cryptographically verify the payment
      const simulatedPaymentId = `tx_${crypto.randomBytes(6).toString("hex")}`;
      const webhookSignature = computeWebhookSignature(
        providerOrderId,
        simulatedPaymentId,
        amount,
        "SUCCEEDED"
      );

      res.json({
        checkoutOrder: {
          paymentId: payment.id,
          providerOrderId,
          planId: plan.id,
          planName: plan.name,
          planCode: plan.code,
          billingCycle: cycle,
          amount,
          currency: plan.currency,
          // Gateway webhook payload & signature generated server-side
          gatewayWebhookPayload: {
            providerOrderId,
            providerPaymentId: simulatedPaymentId,
            amount,
            status: "SUCCEEDED",
            signature: webhookSignature,
          },
        },
      });
    }
  );

  // Subscription & Billing 2: Payment Webhook Verification
  // Never trusts frontend status directly; verifies HMAC-SHA256 signature against pending order
  app.post("/api/payments/webhook", (req, res) => {
    const {
      providerOrderId,
      providerPaymentId,
      amount,
      status,
      signature,
    } = req.body || {};

    if (!providerOrderId || !providerPaymentId || !signature) {
      return res.status(400).json({
        error: "Missing webhook payment fields or cryptographic signature.",
      });
    }

    const db = loadDb();
    const payment = db.payments.find(
      (p) => p.provider_order_id === providerOrderId
    );
    if (!payment) {
      return res.status(404).json({
        error: "Payment order not found.",
      });
    }

    const expectedSignature = computeWebhookSignature(
      providerOrderId,
      providerPaymentId,
      Number(amount ?? payment.amount),
      String(status || "SUCCEEDED")
    );

    if (signature !== expectedSignature) {
      payment.status = "FAILED";
      payment.updated_at = new Date().toISOString();
      saveDb(db);
      return res.status(400).json({
        error: "Webhook cryptographic signature verification failed.",
      });
    }

    const plan = db.subscription_plans.find((p) => p.id === payment.plan_id);
    if (!plan) {
      return res.status(404).json({
        error: "Associated subscription plan not found.",
      });
    }

    const now = new Date();
    const nowIso = now.toISOString();
    const isAnnual = payment.amount > plan.price_monthly && plan.price_monthly > 0;
    const durationDays = isAnnual ? 365 : plan.duration_days || 30;
    const periodEndIso = new Date(
      now.getTime() + durationDays * 24 * 60 * 60 * 1000
    ).toISOString();

    // Update or create user subscription
    let sub = db.subscriptions.find((s) => s.user_id === payment.user_id);
    if (sub) {
      sub.plan_id = plan.id;
      sub.status = "ACTIVE";
      sub.billing_cycle = isAnnual ? "ANNUAL" : "MONTHLY";
      sub.current_period_start = nowIso;
      sub.current_period_end = periodEndIso;
      sub.trial_ends_at = null;
      sub.cancel_at_period_end = false;
      sub.cancelled_at = null;
      sub.updated_at = nowIso;
    } else {
      sub = {
        id: `sub_${crypto.randomBytes(6).toString("hex")}`,
        user_id: payment.user_id,
        plan_id: plan.id,
        status: "ACTIVE",
        billing_cycle: isAnnual ? "ANNUAL" : "MONTHLY",
        current_period_start: nowIso,
        current_period_end: periodEndIso,
        trial_ends_at: null,
        cancel_at_period_end: false,
        cancelled_at: null,
        created_at: nowIso,
        updated_at: nowIso,
      };
      db.subscriptions.unshift(sub);
    }

    payment.status = "SUCCEEDED";
    payment.subscription_id = sub.id;
    payment.provider_payment_id = providerPaymentId;
    payment.webhook_signature_verified = true;
    payment.updated_at = nowIso;
    saveDb(db);

    const user = db.users.find((u) => u.id === payment.user_id);
    recordAuditLog({
      actorUserId: user?.id || null,
      actorUsername: user?.username || "WEBHOOK_GATEWAY",
      actorRole: user?.role || "SYSTEM",
      action: "PAYMENT_WEBHOOK_VERIFIED",
      targetType: "Subscriptions",
      targetId: sub.id,
      details: `Verified webhook payment ${providerPaymentId} ($${payment.amount} ${payment.currency}) and activated ${plan.name} (${plan.code}) subscription.`,
    });

    res.json({
      verified: true,
      subscription: sub,
      plan,
      payment,
    });
  });

  // Subscription & Billing 3: Cancel Subscription
  app.post(
    "/api/subscriptions/cancel",
    authenticateUser,
    (req: AuthenticatedRequest, res) => {
      const ctx = req.authContext!;
      const db = loadDb();
      const sub = db.subscriptions.find((s) => s.user_id === ctx.user.id);
      if (!sub) {
        return res.status(404).json({
          error: "No subscription found for your account.",
        });
      }
      const nowIso = new Date().toISOString();
      sub.status = "CANCELLED";
      sub.cancel_at_period_end = true;
      sub.cancelled_at = nowIso;
      sub.updated_at = nowIso;
      saveDb(db);

      recordAuditLog({
        actorUserId: ctx.user.id,
        actorUsername: ctx.user.username,
        actorRole: ctx.user.role,
        action: "SUBSCRIPTION_CANCELLED",
        targetType: "Subscriptions",
        targetId: sub.id,
        details: `User ${ctx.user.username} cancelled subscription ${sub.id}.`,
      });

      res.json({
        subscription: sub,
        accessEvaluation: evaluateQuestionGeneratorAccess(ctx.user),
      });
    }
  );

  // Subscription & Billing 4: Start a 7-day Trial or Simulate Subscription State
  app.post(
    "/api/subscriptions/simulate-state",
    authenticateUser,
    (req: AuthenticatedRequest, res) => {
      const ctx = req.authContext!;
      const { status, planCode } = req.body || {};
      const validStatuses: SubscriptionStatus[] = [
        "TRIAL",
        "ACTIVE",
        "EXPIRED",
        "CANCELLED",
        "PAST_DUE",
      ];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({
          error: `Invalid subscription state. Must be one of: ${validStatuses.join(", ")}`,
        });
      }

      const db = loadDb();
      const targetPlan =
        db.subscription_plans.find(
          (p) => p.code.toUpperCase() === String(planCode || "BASIC").toUpperCase()
        ) || db.subscription_plans[0];

      const now = new Date();
      const nowIso = now.toISOString();
      const futureIso = new Date(
        now.getTime() + 30 * 24 * 60 * 60 * 1000
      ).toISOString();
      const pastIso = new Date(
        now.getTime() - 5 * 24 * 60 * 60 * 1000
      ).toISOString();

      let sub = db.subscriptions.find((s) => s.user_id === ctx.user.id);
      if (!sub) {
        sub = {
          id: `sub_${crypto.randomBytes(6).toString("hex")}`,
          user_id: ctx.user.id,
          plan_id: targetPlan.id,
          status,
          billing_cycle: "MONTHLY",
          current_period_start: nowIso,
          current_period_end: status === "EXPIRED" ? pastIso : futureIso,
          trial_ends_at:
            status === "TRIAL"
              ? new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString()
              : null,
          cancel_at_period_end: status === "CANCELLED",
          cancelled_at: status === "CANCELLED" ? nowIso : null,
          created_at: nowIso,
          updated_at: nowIso,
        };
        db.subscriptions.unshift(sub);
      } else {
        if (planCode) {
          sub.plan_id = targetPlan.id;
        }
        sub.status = status;
        sub.current_period_end = status === "EXPIRED" ? pastIso : futureIso;
        sub.trial_ends_at =
          status === "TRIAL"
            ? new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString()
            : null;
        sub.cancel_at_period_end = status === "CANCELLED";
        sub.cancelled_at = status === "CANCELLED" ? nowIso : null;
        sub.updated_at = nowIso;
      }
      saveDb(db);

      recordAuditLog({
        actorUserId: ctx.user.id,
        actorUsername: ctx.user.username,
        actorRole: ctx.user.role,
        action: "SUBSCRIPTION_STATE_CHANGED",
        targetType: "Subscriptions",
        targetId: sub.id,
        details: `Set subscription state to ${status} (${targetPlan.code}) for ${ctx.user.username}.`,
      });

      res.json({
        subscription: sub,
        accessEvaluation: evaluateQuestionGeneratorAccess(ctx.user),
      });
    }
  );

  // Admin & Owner Console 1: Full System Overview
  app.get(
    "/api/admin/overview",
    authenticateUser,
    requireRoles(["OWNER", "ADMIN"]),
    (_req: AuthenticatedRequest, res) => {
      const db = loadDb();
      res.json({
        users: db.users.map(toSafeUser),
        plans: db.subscription_plans,
        subscriptions: db.subscriptions,
        payments: db.payments,
        usageRecords: db.usage_records,
        auditLogs: db.audit_logs,
      });
    }
  );

  // Admin & Owner Console 2: Update User Role or Status
  app.patch(
    "/api/admin/users/:id",
    authenticateUser,
    requireRoles(["OWNER", "ADMIN"]),
    (req: AuthenticatedRequest, res) => {
      const ctx = req.authContext!;
      const targetUserId = req.params.id;
      const { role, status, unlockAccount } = req.body || {};

      const db = loadDb();
      const targetUser = db.users.find((u) => u.id === targetUserId);
      if (!targetUser) {
        return res.status(404).json({ error: "User not found." });
      }

      // Protect the primary OWNER account from demotion or deactivation by non-owners
      if (targetUser.role === "OWNER" && ctx.user.role !== "OWNER") {
        return res.status(403).json({
          error: "Only an OWNER can modify another OWNER account.",
        });
      }
      if (
        targetUser.username.toLowerCase() === "akash00894" &&
        ((role && role !== "OWNER") || (status && status !== "ACTIVE"))
      ) {
        return res.status(400).json({
          error:
            "The primary application OWNER account (Akash00894) must remain active with role OWNER.",
        });
      }

      if (role && ["OWNER", "ADMIN", "USER"].includes(role)) {
        if (role === "OWNER" && ctx.user.role !== "OWNER") {
          return res.status(403).json({
            error: "Only an OWNER can assign the OWNER role.",
          });
        }
        targetUser.role = role as UserRole;
      }

      if (status && ["ACTIVE", "SUSPENDED", "DISABLED"].includes(status)) {
        targetUser.status = status as AccountStatus;
      }

      if (unlockAccount) {
        targetUser.failed_login_attempts = 0;
        targetUser.locked_until = null;
      }

      targetUser.updated_at = new Date().toISOString();
      saveDb(db);

      recordAuditLog({
        actorUserId: ctx.user.id,
        actorUsername: ctx.user.username,
        actorRole: ctx.user.role,
        action: "ADMIN_USER_UPDATED",
        targetType: "Users",
        targetId: targetUser.id,
        details: `Updated user ${targetUser.username}: role=${targetUser.role}, status=${targetUser.status}.`,
      });

      res.json({ user: toSafeUser(targetUser) });
    }
  );

  // Admin & Owner Console 3: Create or Update Subscription Plan (Dynamic Backend Plan Config)
  app.post(
    "/api/admin/plans",
    authenticateUser,
    requireRoles(["OWNER", "ADMIN"]),
    (req: AuthenticatedRequest, res) => {
      const ctx = req.authContext!;
      const {
        code,
        name,
        description,
        price_monthly,
        billing_cycle,
        duration_days,
        papers_per_month_limit,
        max_questions_per_paper,
        features,
        allow_custom_template_upload,
        allow_answer_key_pdf,
        allow_single_regeneration,
      } = req.body || {};

      const cleanCode = String(code || "")
        .trim()
        .toUpperCase();
      const cleanName = String(name || "").trim();
      if (!cleanCode || !cleanName) {
        return res.status(400).json({
          error: "Plan code and plan name are required.",
        });
      }

      const db = loadDb();
      if (db.subscription_plans.some((p) => p.code === cleanCode)) {
        return res.status(409).json({
          error: `A plan with code ${cleanCode} already exists.`,
        });
      }

      const nowIso = new Date().toISOString();
      const newPlan: DbSubscriptionPlan = {
        id: `plan_${cleanCode.toLowerCase()}_${crypto
          .randomBytes(3)
          .toString("hex")}`,
        code: cleanCode,
        name: cleanName,
        description: String(description || "Custom subscription tier."),
        price_monthly: Math.max(0, Number(price_monthly) || 0),
        currency: "USD",
        billing_cycle: billing_cycle === "ANNUAL" ? "ANNUAL" : "MONTHLY",
        duration_days: Math.max(1, Number(duration_days) || 30),
        papers_per_month_limit: Math.max(
          1,
          Number(papers_per_month_limit) || 10
        ),
        max_questions_per_paper: Math.max(
          5,
          Number(max_questions_per_paper) || 50
        ),
        features: Array.isArray(features)
          ? features.map((f: unknown) => String(f))
          : [
              `${Number(papers_per_month_limit) || 10} Question Papers / month`,
              `Up to ${Number(max_questions_per_paper) || 50} questions per paper`,
            ],
        allow_custom_template_upload: Boolean(
          allow_custom_template_upload ?? true
        ),
        allow_answer_key_pdf: Boolean(allow_answer_key_pdf ?? true),
        allow_single_regeneration: Boolean(allow_single_regeneration ?? true),
        is_active: true,
        created_at: nowIso,
        updated_at: nowIso,
      };

      db.subscription_plans.push(newPlan);
      saveDb(db);

      recordAuditLog({
        actorUserId: ctx.user.id,
        actorUsername: ctx.user.username,
        actorRole: ctx.user.role,
        action: "SUBSCRIPTION_PLAN_CREATED",
        targetType: "SubscriptionPlans",
        targetId: newPlan.id,
        details: `Created plan ${newPlan.code} ($${newPlan.price_monthly}/mo, ${newPlan.papers_per_month_limit} papers/mo).`,
      });

      res.status(201).json({ plan: newPlan });
    }
  );

  app.put(
    "/api/admin/plans/:id",
    authenticateUser,
    requireRoles(["OWNER", "ADMIN"]),
    (req: AuthenticatedRequest, res) => {
      const ctx = req.authContext!;
      const planId = req.params.id;
      const db = loadDb();
      const plan = db.subscription_plans.find((p) => p.id === planId);
      if (!plan) {
        return res.status(404).json({ error: "Plan not found." });
      }

      const {
        name,
        description,
        price_monthly,
        papers_per_month_limit,
        max_questions_per_paper,
        duration_days,
        features,
        allow_custom_template_upload,
        allow_answer_key_pdf,
        allow_single_regeneration,
        is_active,
      } = req.body || {};

      if (typeof name === "string" && name.trim()) plan.name = name.trim();
      if (typeof description === "string") plan.description = description.trim();
      if (typeof price_monthly === "number")
        plan.price_monthly = Math.max(0, price_monthly);
      if (typeof papers_per_month_limit === "number")
        plan.papers_per_month_limit = Math.max(1, papers_per_month_limit);
      if (typeof max_questions_per_paper === "number")
        plan.max_questions_per_paper = Math.max(5, max_questions_per_paper);
      if (typeof duration_days === "number")
        plan.duration_days = Math.max(1, duration_days);
      if (Array.isArray(features))
        plan.features = features.map((f: unknown) => String(f));
      if (typeof allow_custom_template_upload === "boolean")
        plan.allow_custom_template_upload = allow_custom_template_upload;
      if (typeof allow_answer_key_pdf === "boolean")
        plan.allow_answer_key_pdf = allow_answer_key_pdf;
      if (typeof allow_single_regeneration === "boolean")
        plan.allow_single_regeneration = allow_single_regeneration;
      if (typeof is_active === "boolean") plan.is_active = is_active;

      plan.updated_at = new Date().toISOString();
      saveDb(db);

      recordAuditLog({
        actorUserId: ctx.user.id,
        actorUsername: ctx.user.username,
        actorRole: ctx.user.role,
        action: "SUBSCRIPTION_PLAN_UPDATED",
        targetType: "SubscriptionPlans",
        targetId: plan.id,
        details: `Updated plan ${plan.code}: $${plan.price_monthly}/mo, limit=${plan.papers_per_month_limit} papers/mo, maxQuestions=${plan.max_questions_per_paper}.`,
      });

      res.json({ plan });
    }
  );

  // Admin & Owner Console 4: Assign or Update User Subscription
  app.post(
    "/api/admin/subscriptions/assign",
    authenticateUser,
    requireRoles(["OWNER", "ADMIN"]),
    (req: AuthenticatedRequest, res) => {
      const ctx = req.authContext!;
      const { userId, planId, status } = req.body || {};
      const db = loadDb();

      const targetUser = db.users.find((u) => u.id === userId);
      const plan = db.subscription_plans.find(
        (p) => p.id === planId || p.code === planId
      );
      if (!targetUser || !plan) {
        return res
          .status(404)
          .json({ error: "Target user or subscription plan not found." });
      }

      const subStatus: SubscriptionStatus = [
        "TRIAL",
        "ACTIVE",
        "EXPIRED",
        "CANCELLED",
        "PAST_DUE",
      ].includes(status)
        ? status
        : "ACTIVE";

      const now = new Date();
      const nowIso = now.toISOString();
      const periodEndIso =
        subStatus === "EXPIRED"
          ? new Date(now.getTime() - 86400000).toISOString()
          : new Date(
              now.getTime() + (plan.duration_days || 30) * 86400000
            ).toISOString();

      let sub = db.subscriptions.find((s) => s.user_id === targetUser.id);
      if (sub) {
        sub.plan_id = plan.id;
        sub.status = subStatus;
        sub.current_period_start = nowIso;
        sub.current_period_end = periodEndIso;
        sub.updated_at = nowIso;
      } else {
        sub = {
          id: `sub_${crypto.randomBytes(6).toString("hex")}`,
          user_id: targetUser.id,
          plan_id: plan.id,
          status: subStatus,
          billing_cycle: plan.billing_cycle,
          current_period_start: nowIso,
          current_period_end: periodEndIso,
          trial_ends_at:
            subStatus === "TRIAL"
              ? new Date(now.getTime() + 7 * 86400000).toISOString()
              : null,
          cancel_at_period_end: subStatus === "CANCELLED",
          cancelled_at: subStatus === "CANCELLED" ? nowIso : null,
          created_at: nowIso,
          updated_at: nowIso,
        };
        db.subscriptions.unshift(sub);
      }
      saveDb(db);

      recordAuditLog({
        actorUserId: ctx.user.id,
        actorUsername: ctx.user.username,
        actorRole: ctx.user.role,
        action: "ADMIN_SUBSCRIPTION_ASSIGNED",
        targetType: "Subscriptions",
        targetId: sub.id,
        details: `Assigned ${plan.code} (${subStatus}) to user ${targetUser.username}.`,
      });

      res.json({ subscription: sub });
    }
  );
}
