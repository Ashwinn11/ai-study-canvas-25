import { LEGAL_CONFIG } from "./config";

export const TERMS_OF_SERVICE_MD = `_Last updated: November 1, 2025_

Welcome to **Masterly**. These Terms of Service ("Terms") govern your access to and use of the Masterly mobile application (the "App"). By creating an account or using the App you agree to be bound by these Terms.

## 1. Eligibility & Account Responsibilities

- Masterly is designed for learners of all ages. If you are under the age of majority in your region, please have a parent or legal guardian review these Terms with you and consent to your use of the App.
- Parents and guardians who create or manage accounts for children agree to supervise use of the App and help manage any data requests on their behalf.
- You are responsible for maintaining the confidentiality of your login credentials and for all activity that occurs under your account.
- You must provide accurate information during onboarding and keep it updated.

## 2. Subscription and Payments

- Masterly offers subscription packages billed through Apple's in-app purchase system. Pricing and billing frequency are displayed before you confirm your purchase.
- All payments are processed by Apple. By subscribing, you authorize Apple to charge your Apple ID account for the selected plan.
- Refunds are handled by Apple according to their refund policy. You can request a refund through the App Store if eligible. You may cancel future renewals at any time by visiting [Manage Subscriptions](https://apps.apple.com/account/subscriptions) in your Apple ID settings or through the app's Profile → Subscription → Manage in App Store option.
- We may change pricing or available plans with advance notice delivered through the App or email.

## 3. Acceptable Use

- You agree not to upload or share content that is illegal, harmful, harassing, or violates the rights of others.
- You may not attempt to reverse engineer, interfere with, or disrupt the App, our servers, or connected networks.
- You must comply with all applicable laws when using Masterly, including education-related privacy rules that apply to your school or organization.

## 4. Educational Content & UGC

- The App enables upload of documents, images, audio, video, scans, and text for study purposes. You retain ownership of the materials you upload and grant Masterly a license to process, transform, and display that content for your educational use.
- We reserve the right to remove any content that violates these Terms or that we deem inappropriate for our learning community.

## 5. Third-Party Services

- **Data Processing:** Masterly uses the following third-party services to deliver core functionality:
  - **Supabase**: Secure authentication, database, and file storage
  - **OpenAI**: AI-powered explanations, study guides, and practice questions
  - **Google Cloud Services**: Document AI (PDF/image OCR), Vision API (image text detection), Speech-to-Text (audio transcription), and Cloud Storage
  - **RevenueCat**: Subscription management and in-app purchase entitlements (Apple handles payment processing)
  - **Sentry**: Error monitoring and crash reporting for app stability
  - **Expo Push Notifications**: Sending study reminders and notifications to your device
- Your data will be processed by these providers solely to deliver the App's features.
- Links to third-party resources are provided for convenience. We do not endorse or assume responsibility for third-party websites or services.

## 6. Intellectual Property

- All Masterly trademarks, logos, and original content are owned by Masterly or its licensors and are protected by intellectual property laws.
- You may not copy, modify, or distribute portions of the App without written permission, except for the educational content that you create for personal use.

## 7. Termination

- You may stop using the App at any time and can request account deletion through the Profile → Settings section.
- We may suspend or terminate access to the App if you breach these Terms or if your use poses security or legal risks.
- Upon termination we will deactivate your account and delete or anonymize personal data in accordance with our Privacy Policy.

## 8. Disclaimers & Limitation of Liability

- Masterly provides learning tools and study recommendations but does not guarantee specific academic outcomes.
- The App is provided "as is" and "as available". To the fullest extent permitted by law, we disclaim warranties of merchantability, fitness for a particular purpose, and non-infringement.
- Masterly will not be liable for indirect, incidental, or consequential damages arising from your use of the App.

## 9. Changes to These Terms

We may update these Terms when we add new features or as required by law. We will notify you of material changes by email or in-app notice. Continued use after changes become effective constitutes acceptance of the revised Terms.

## 10. Apple App Store Terms

**10.1 EULA Acknowledgement:** You and Masterly acknowledge that this Terms of Service is concluded between you and Masterly only, and not with Apple, Inc. ("Apple"). Masterly, not Apple, is solely responsible for the Licensed Application (the App) and its content. This EULA does not provide for usage rules that are in conflict with Apple Media Services Terms and Conditions.

**10.2 Scope of License:** The license granted to you for the Licensed Application is limited to a non-transferable license to use the Licensed Application on any Apple-branded products (iPhone, iPad, Mac, Apple Watch, Apple TV) that you own or control, and as permitted by the Usage Rules set forth in the Apple Media Services Terms and Conditions. The Licensed Application may be accessed and used by other accounts associated with the purchaser via Family Sharing or volume purchasing as permitted by Apple.

**10.3 Product Claims and Liability:** You acknowledge that Masterly, not Apple, is solely responsible for addressing any claims by you or any third party relating to the Licensed Application or your possession and use of it, including but not limited to: (i) product liability claims; (ii) any claim that the Licensed Application fails to conform to any applicable legal or regulatory requirement; and (iii) claims arising under consumer protection, privacy, or similar legislation. Masterly's total liability for any claims shall be limited to the amounts permitted under applicable law.

**10.4 Intellectual Property:** You acknowledge that Masterly, not Apple, is solely responsible for investigating, defending, settling, and discharging any third-party claim that the Licensed Application or your possession and use of it infringes that third party's intellectual property rights.

**10.5 Your Legal Representations:** You represent and warrant that: (i) you are not located in a country that is subject to a U.S. Government embargo, or that has been designated by the U.S. Government as a "terrorist supporting" country; and (ii) you are not listed on any U.S. Government list of prohibited or restricted parties. You may not use the App if any of these representations is false.

**10.6 Third-Party Beneficiary:** You acknowledge that Apple and Apple's subsidiaries are third-party beneficiaries of this Terms of Service. Upon your acceptance of these Terms, Apple will have the right (and will be deemed to have accepted the right) to enforce these Terms against you as a third-party beneficiary.

## 11. Contact Us

If you have any questions about these Terms or need assistance, contact us at **${LEGAL_CONFIG.SUPPORT_EMAIL}**.`;

export const PRIVACY_POLICY_MD = `_Last updated: November 1, 2025_

Masterly ("we", "us", "our") is committed to protecting your privacy. This Privacy Policy explains what information we collect, how we use it, and the choices you have.

**Important Note:** Apple Inc. and its subsidiaries are third-party beneficiaries of our Terms of Service and have the right to enforce those terms against you.

## 1. Information We Collect

- **Account Information:** Name, email address, grade level, study goals, and other onboarding details you provide.
- **Content Uploads:** Documents, images, audio, video, and text you submit for study material generation.
- **Usage Data:** App interactions, feature usage patterns, device type, operating system, and diagnostics.
- **Analytics & Logs:** Event telemetry collected to improve reliability. You can opt out from analytics in the Profile settings.
- **Notifications:** If you enable push notifications, we collect a device token to deliver reminders.
- **Error & Crash Reports:** When the app encounters errors, we collect diagnostic data (device model, OS version, stack traces) via Sentry to improve stability. No personally identifying information is included in crash reports.

## 2. How We Use Information

- Deliver core learning features, including AI-generated study guides and spaced repetition reminders.
- Personalize content recommendations and track study progress.
- Provide customer support, prevent abuse, and maintain security.
- Communicate product updates and important changes to our Terms or policies.

## 3. Data Sharing & Processors

We share data with the following processors to deliver app functionality:

- **Supabase**: Hosts authentication, database, and file storage. All data is encrypted in transit.
- **OpenAI**: Processes content (documents, images, audio, video, scans, text) you upload to generate AI-powered explanations, study guides, and practice questions.
- **Google Cloud Services**:
  - **Document AI**: Analyzes PDFs and images using OCR to extract text
  - **Vision API**: Detects and extracts text from images
  - **Speech-to-Text**: Transcribes audio and video files to text
  - **Cloud Storage**: Temporarily stores files during processing
- **RevenueCat**: Processes subscription purchase events and manages entitlements. RevenueCat does not store payment card information (handled by Apple).
- **Sentry**: Receives error logs and crash reports to diagnose and improve app stability. Sentry does not receive personally identifying information in crash reports.
- **Expo Push Notification Service**: Delivers study reminders and notifications. We collect device tokens only to send notifications you enable.

We do not sell your personal information. We only share data with these processors under strict data processing agreements that limit their use to providing services to Masterly.

## 4. Data Retention

- We retain your personal data while your account is active. If you request deletion or close your account, we remove or anonymize personal data within 30 days except where retention is required by law.
- Aggregated, de-identified data may be retained for analytics and product improvement.

## 5. Your Choices & Rights

- **Access & Update:** Review and update profile details in the Profile → Settings tab.
- **Analytics Opt-Out:** Disable analytics collection from the Profile settings. Push notifications are opt-in and can be disabled in system settings.
- **Account Deletion:** Use the in-app account deletion flow or email ${LEGAL_CONFIG.SUPPORT_EMAIL} to request deletion. We will confirm completion once all associated data is removed.
- **Children's Privacy (COPPA):** Masterly supports learners of all ages. When a child under 13 uses the App, a parent or legal guardian must review this Privacy Policy, provide any required consent, and supervise the experience. We honor verified requests from parents or guardians to access, update, or delete a child's information by contacting ${LEGAL_CONFIG.SUPPORT_EMAIL}.
- **California Residents (CCPA):** You have the right to request disclosure of data collected, request deletion, and opt out of data "sales" (we do not sell data). Contact ${LEGAL_CONFIG.SUPPORT_EMAIL} to exercise these rights.
- **European Residents (GDPR):** You have rights to data access, rectification, erasure, and portability under GDPR. Contact ${LEGAL_CONFIG.SUPPORT_EMAIL} for requests.

## 6. Security

We implement industry-standard safeguards, including encryption in transit (TLS), secure credential storage, and role-based access controls. Despite these measures, no system is completely secure; please use strong passwords and keep your device protected.

## 7. International Transfers

If you access Masterly from outside the United States, your information may be transferred to and processed in the U.S. or other countries where our service providers operate. We ensure appropriate protections are in place for such transfers.

## 8. Policy Updates

We may update this Privacy Policy to reflect changes in technology, law, or our services. We will notify you of material changes via email or in-app messaging. Continued use of the App after such changes indicates acceptance of the revised Policy.

## 9. Contact Us

For privacy questions or requests, contact **${LEGAL_CONFIG.SUPPORT_EMAIL}**`;

export type LegalDocumentType = "terms" | "privacy";

export const getLegalContent = (type: LegalDocumentType) =>
  type === "terms" ? TERMS_OF_SERVICE_MD : PRIVACY_POLICY_MD;
