export type QuestionType =
  | "mcq"
  | "subjective"
  | "diagram"
  | "numeric"
  | "derivation"
  | "application";

export type SubjectiveSubtype = "short_answer" | "long_answer" | "descriptive";

export type DifficultyLevel = "Easy" | "Moderate" | "Difficult" | "Mixed";

export interface MixedDifficultyDistribution {
  easyPct: number;
  moderatePct: number;
  difficultPct: number;
}

export interface QuestionTypeConfig {
  questionType: QuestionType;
  label: string;
  enabled: boolean;
  count: number;
  marksPerQuestion: number;
  difficulty: DifficultyLevel;
  numOptions: number;
  subjectiveSubtype?: SubjectiveSubtype;
}

export interface SchoolDetails {
  schoolName: string;
  schoolAddress: string;
  academicSession: string;
  examName: string;
  term: string;
  examDate: string;
  timeDuration: string;
  logoDataUrl: string | null;
  logoFilename: string | null;
  logoDimensions: { width: number; height: number } | null;
}

export interface TemplateSectionRule {
  name: string;
  subtitle: string;
  questionTypes: QuestionType[];
  marksPerQuestion?: number;
  expectedCount?: number;
}

export interface TemplateDefinition {
  templateId: string;
  templateName: string;
  description: string;
  pageSize: "A4";
  twoColumnQuestions: boolean;
  compactSpacing: boolean;
  borderStyle: "single" | "double" | "modern_accent" | "minimal";
  logoPosition: "left" | "center";
  instructions: string[];
  sections: TemplateSectionRule[];
  questionPatterns?: Array<{
    section: string;
    count: number;
    marksPerQuestion: number;
    questionTypes: string[];
    rawPattern: string;
  }>;
  footerNote: string;
  isCustomUploaded?: boolean;
}

export interface Question {
  id: string;
  type: QuestionType;
  question: string;
  options?: string[];
  correct_answer?: string;
  marks: number;
  difficulty: "Easy" | "Moderate" | "Difficult";
  topic: string;
  solution?: string;
  diagram_description?: string;
  diagram_svg?: string;
  required_calculation?: string;
  subjective_subtype?: SubjectiveSubtype;
  section_name?: string;
}

export interface QuestionSection {
  name: string;
  subtitle: string;
  questions: Question[];
  sectionMarks: number;
  marksSummaryLabel: string;
}

export interface ValidationCheckItem {
  key: string;
  label: string;
  passed: boolean;
  detail: string;
}

export interface ValidationResult {
  isValid: boolean;
  countValidated: boolean;
  marksValidated: boolean;
  difficultyValidated: boolean;
  questionTypesValidated: boolean;
  noDuplicatesDetected: boolean;
  mcqValidated: boolean;
  numericValidated: boolean;
  expectedQuestions: number;
  actualQuestions: number;
  expectedMarks: number;
  actualMarks: number;
  duplicatePairs: string[];
  errors: string[];
  checks: ValidationCheckItem[];
}

export interface LLMRuntimeConfig {
  modelName: string;
  temperature: number;
  maxOutputTokens: number;
  batchSize: number;
}

export type UserRole = "OWNER" | "ADMIN" | "USER";
export type AccountStatus = "ACTIVE" | "SUSPENDED" | "DISABLED";
export type SubscriptionStatus =
  | "TRIAL"
  | "ACTIVE"
  | "EXPIRED"
  | "CANCELLED"
  | "PAST_DUE";

export interface UserProfile {
  id: string;
  username: string;
  email: string;
  role: UserRole;
  status: AccountStatus;
  created_at: string;
  updated_at: string;
}

export interface SubscriptionPlan {
  id: string;
  code: string;
  name: string;
  description: string;
  price_monthly: number;
  currency: string;
  billing_cycle: "MONTHLY" | "ANNUAL";
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

export interface UserSubscription {
  id: string;
  user_id: string;
  plan_id: string;
  status: SubscriptionStatus;
  billing_cycle: "MONTHLY" | "ANNUAL";
  current_period_start: string;
  current_period_end: string;
  trial_ends_at: string | null;
  cancel_at_period_end: boolean;
  cancelled_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface PaymentRecord {
  id: string;
  user_id: string;
  subscription_id: string | null;
  plan_id: string;
  amount: number;
  currency: string;
  status: "PENDING" | "SUCCEEDED" | "FAILED" | "REFUNDED";
  provider: string;
  provider_order_id: string;
  provider_payment_id: string | null;
  webhook_signature_verified: boolean;
  created_at: string;
  updated_at: string;
}

export interface UsageRecord {
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

export interface AuditLogRecord {
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

export interface AccessEvaluation {
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
  subscription: UserSubscription | null;
  plan: SubscriptionPlan | null;
  usageThisMonth: number;
  limitThisMonth: number | null;
  maxQuestionsPerPaper: number | null;
}

