-- EduForge AI — Production Authentication & Subscription Database Schema

CREATE TABLE IF NOT EXISTS Users (
    id VARCHAR(64) PRIMARY KEY,
    username VARCHAR(64) NOT NULL UNIQUE,
    email VARCHAR(160) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('OWNER', 'ADMIN', 'USER')),
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'SUSPENDED', 'DISABLED')),
    failed_login_attempts INTEGER NOT NULL DEFAULT 0,
    locked_until TIMESTAMP NULL,
    reset_token_hash VARCHAR(255) NULL,
    reset_token_expires_at TIMESTAMP NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS SubscriptionPlans (
    id VARCHAR(64) PRIMARY KEY,
    code VARCHAR(40) NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL,
    description TEXT NOT NULL,
    price_monthly NUMERIC(10, 2) NOT NULL DEFAULT 0,
    currency VARCHAR(10) NOT NULL DEFAULT 'USD',
    billing_cycle VARCHAR(20) NOT NULL DEFAULT 'MONTHLY' CHECK (billing_cycle IN ('MONTHLY', 'ANNUAL')),
    duration_days INTEGER NOT NULL DEFAULT 30,
    papers_per_month_limit INTEGER NOT NULL,
    max_questions_per_paper INTEGER NOT NULL DEFAULT 50,
    features JSONB NOT NULL,
    allow_custom_template_upload BOOLEAN NOT NULL DEFAULT TRUE,
    allow_answer_key_pdf BOOLEAN NOT NULL DEFAULT TRUE,
    allow_single_regeneration BOOLEAN NOT NULL DEFAULT TRUE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS Subscriptions (
    id VARCHAR(64) PRIMARY KEY,
    user_id VARCHAR(64) NOT NULL REFERENCES Users(id) ON DELETE CASCADE,
    plan_id VARCHAR(64) NOT NULL REFERENCES SubscriptionPlans(id),
    status VARCHAR(20) NOT NULL CHECK (status IN ('TRIAL', 'ACTIVE', 'EXPIRED', 'CANCELLED', 'PAST_DUE')),
    billing_cycle VARCHAR(20) NOT NULL DEFAULT 'MONTHLY',
    current_period_start TIMESTAMP NOT NULL,
    current_period_end TIMESTAMP NOT NULL,
    trial_ends_at TIMESTAMP NULL,
    cancel_at_period_end BOOLEAN NOT NULL DEFAULT FALSE,
    cancelled_at TIMESTAMP NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS Payments (
    id VARCHAR(64) PRIMARY KEY,
    user_id VARCHAR(64) NOT NULL REFERENCES Users(id) ON DELETE CASCADE,
    subscription_id VARCHAR(64) NULL REFERENCES Subscriptions(id) ON DELETE SET NULL,
    plan_id VARCHAR(64) NOT NULL REFERENCES SubscriptionPlans(id),
    amount NUMERIC(10, 2) NOT NULL,
    currency VARCHAR(10) NOT NULL DEFAULT 'USD',
    status VARCHAR(20) NOT NULL CHECK (status IN ('PENDING', 'SUCCEEDED', 'FAILED', 'REFUNDED')),
    provider VARCHAR(40) NOT NULL DEFAULT 'STRIPE_COMPAT_GATEWAY',
    provider_order_id VARCHAR(120) NOT NULL UNIQUE,
    provider_payment_id VARCHAR(120) NULL,
    webhook_signature_verified BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS UsageRecords (
    id VARCHAR(64) PRIMARY KEY,
    user_id VARCHAR(64) NOT NULL REFERENCES Users(id) ON DELETE CASCADE,
    subscription_id VARCHAR(64) NULL REFERENCES Subscriptions(id) ON DELETE SET NULL,
    action_type VARCHAR(40) NOT NULL CHECK (action_type IN ('GENERATE_PAPER', 'REGENERATE_QUESTION')),
    question_count INTEGER NOT NULL DEFAULT 1,
    subject VARCHAR(100) NOT NULL,
    class_name VARCHAR(80) NOT NULL,
    maximum_marks INTEGER NOT NULL DEFAULT 0,
    billing_period_key VARCHAR(16) NOT NULL,
    bypassed_by_owner BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS AuditLogs (
    id VARCHAR(64) PRIMARY KEY,
    actor_user_id VARCHAR(64) NULL,
    actor_username VARCHAR(64) NOT NULL,
    actor_role VARCHAR(20) NOT NULL,
    action VARCHAR(80) NOT NULL,
    target_type VARCHAR(60) NOT NULL,
    target_id VARCHAR(64) NULL,
    details TEXT NOT NULL,
    ip_address VARCHAR(64) NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
