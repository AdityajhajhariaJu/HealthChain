# HealthChain store-review readiness

## Reviewer path

Use the synthetic, read-only reviewer surface at `/review-demo`. It never calls Supabase, sends data to Gemini, or requires a reviewer account. It demonstrates the product using fictional data only. If a store requires full authenticated access, create a dedicated non-production reviewer account in the store-console submission and never include real health information.

## Store description baseline

HealthChain is an AI-assisted health assessment and clinician-visit preparation tool. It helps people organize symptoms, timelines, records, evidence gaps, and questions for discussion with a qualified clinician. It does not diagnose, prescribe, provide treatment instructions, act as a clinician, or replace professional care. It is not an emergency service.

Avoid claims such as “diagnosis,” “root cause doctors missed,” “second opinion,” “clinician consultation,” “HIPAA compliant,” “GDPR compliant,” or “enterprise-grade encryption” unless separately validated and legally approved.

## Owner-side submission checklist

- Apple Privacy Nutrition Label completed from the actual shipped build.
- Google Play Data Safety form completed for all collected/shared data, including health data, account identifiers, analytics, and third-party SDKs.
- Google Play Health Apps declaration completed.
- In-app account deletion tested end to end.
- Apple digital subscriptions/features configured with StoreKit; Google Play digital subscriptions/features configured with Play Billing unless a documented regional exception applies.
- Privacy policy URL and in-app link tested on the exact production domain.
- Support email, legal entity, jurisdiction, retention configuration, and provider contracts reviewed by counsel.
