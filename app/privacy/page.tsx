'use client';

import { useEffect } from 'react';
import { BlobBackground } from '@/components/ui/BlobBackground';

export default function PrivacyPage() {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="min-h-screen content-layer py-20 relative">
      <BlobBackground position="top" color="#ff7664" animate={true} />
      <div className="container mx-auto px-4 max-w-4xl relative z-10">
        <div className="bg-white rounded-2xl shadow-elevated p-8 md:p-12">
          <h1 className="text-4xl font-bold mb-4 text-foreground">Privacy Policy</h1>
          <p className="text-sm text-foreground/70 mb-8">Last updated: November 1, 2025</p>
          
          <div className="prose prose-lg max-w-none text-foreground/80 space-y-6">
            <p>
              Masterly ("we", "us", "our") is committed to protecting your privacy. This Privacy Policy explains what information we collect, how we use it, and the choices you have.
            </p>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 my-6">
              <p className="text-sm text-blue-900">
                <strong>Important Note:</strong> Apple Inc. and its subsidiaries are third-party beneficiaries of our Terms of Service and have the right to enforce those terms against you.
              </p>
            </div>

            <h2 className="text-2xl font-semibold text-foreground mt-8 mb-4">1. Information We Collect</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Account Information:</strong> Name, email address, grade level, study goals, and other onboarding details you provide.</li>
              <li><strong>Content Uploads:</strong> Documents, images, audio, video, and text you submit for study material generation.</li>
              <li><strong>Usage Data:</strong> App interactions, feature usage patterns, device type, operating system, and diagnostics.</li>
              <li><strong>Analytics & Logs:</strong> Event telemetry collected to improve reliability. You can opt out from analytics in the Profile settings.</li>
              <li><strong>Notifications:</strong> If you enable push notifications, we collect a device token to deliver reminders.</li>
              <li><strong>Error & Crash Reports:</strong> When the app encounters errors, we collect diagnostic data (device model, OS version, stack traces) via Sentry to improve stability. No personally identifying information is included in crash reports.</li>
            </ul>

            <h2 className="text-2xl font-semibold text-foreground mt-8 mb-4">2. How We Use Information</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>Deliver core learning features, including AI-generated study guides and spaced repetition reminders.</li>
              <li>Personalize content recommendations and track study progress.</li>
              <li>Provide customer support, prevent abuse, and maintain security.</li>
              <li>Communicate product updates and important changes to our Terms or policies.</li>
            </ul>

            <h2 className="text-2xl font-semibold text-foreground mt-8 mb-4">3. Data Sharing & Processors</h2>
            <p className="font-medium text-foreground mb-3">We share data with the following processors to deliver app functionality:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Supabase:</strong> Hosts authentication, database, and file storage. All data is encrypted in transit.</li>
              <li><strong>OpenAI:</strong> Processes content (documents, images, audio) you upload to generate AI-powered explanations, study guides, and practice questions.</li>
              <li><strong>Google Cloud Services:</strong>
                <ul className="list-disc pl-6 mt-1 space-y-1">
                  <li><strong>Document AI:</strong> Analyzes PDFs and images using OCR to extract text</li>
                  <li><strong>Vision API:</strong> Detects and extracts text from images</li>
                  <li><strong>Speech-to-Text:</strong> Transcribes audio and video files to text</li>
                  <li><strong>Cloud Storage:</strong> Temporarily stores files during processing</li>
                </ul>
              </li>
              <li><strong>RevenueCat:</strong> Processes subscription purchase events and manages entitlements. RevenueCat does not store payment card information (handled by Apple).</li>
              <li><strong>Sentry:</strong> Receives error logs and crash reports to diagnose and improve app stability. Sentry does not receive personally identifying information in crash reports.</li>
              <li><strong>Expo Push Notification Service:</strong> Delivers study reminders and notifications. We collect device tokens only to send notifications you enable.</li>
              <li>We do not sell your personal information. We only share data with these processors under strict data processing agreements that limit their use to providing services to Masterly.</li>
            </ul>

            <h2 className="text-2xl font-semibold text-foreground mt-8 mb-4">4. Data Retention</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>We retain your personal data while your account is active. If you request deletion or close your account, we remove or anonymize personal data within 30 days except where retention is required by law.</li>
              <li>Aggregated, de-identified data may be retained for analytics and product improvement.</li>
            </ul>

            <h2 className="text-2xl font-semibold text-foreground mt-8 mb-4">5. Your Choices & Rights</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Access & Update:</strong> Review and update profile details in the Profile → Settings tab.</li>
              <li><strong>Analytics Opt-Out:</strong> Disable analytics collection from the Profile settings. Push notifications are opt-in and can be disabled in system settings.</li>
              <li><strong>Account Deletion:</strong> Use the in-app account deletion flow or email support@masterlyapp.in to request deletion. We will confirm completion once all associated data is removed.</li>
              <li><strong>Children's Privacy (COPPA):</strong> Masterly supports learners of all ages. When a child under 13 uses the App, a parent or legal guardian must review this Privacy Policy, provide any required consent, and supervise the experience. We honor verified requests from parents or guardians to access, update, or delete a child's information by contacting support@masterlyapp.in.</li>
              <li><strong>California Residents (CCPA):</strong> You have the right to request disclosure of data collected, request deletion, and opt out of data "sales" (we do not sell data). Contact support@masterlyapp.in to exercise these rights.</li>
              <li><strong>European Residents (GDPR):</strong> You have rights to data access, rectification, erasure, and portability under GDPR. Contact support@masterlyapp.in for requests.</li>
            </ul>

            <h2 className="text-2xl font-semibold text-foreground mt-8 mb-4">6. Security</h2>
            <p>
              We implement industry-standard safeguards, including encryption in transit (TLS), secure credential storage, and role-based access controls. Despite these measures, no system is completely secure; please use strong passwords and keep your device protected.
            </p>

            <h2 className="text-2xl font-semibold text-foreground mt-8 mb-4">7. International Transfers</h2>
            <p>
              If you access Masterly from outside the United States, your information may be transferred to and processed in the U.S. or other countries where our service providers operate. We ensure appropriate protections are in place for such transfers.
            </p>

            <h2 className="text-2xl font-semibold text-foreground mt-8 mb-4">8. Policy Updates</h2>
            <p>
              We may update this Privacy Policy to reflect changes in technology, law, or our services. We will notify you of material changes via email or in-app messaging. Continued use of the App after such changes indicates acceptance of the revised Policy.
            </p>

            <h2 className="text-2xl font-semibold text-foreground mt-8 mb-4">9. Contact Us</h2>
            <p>
              For privacy questions or requests, contact <strong>support@masterlyapp.in</strong>
            </p>
          </div>

          <div className="mt-12 pt-8 border-t border-border">
            <a 
              href="/" 
              className="inline-flex items-center text-primary hover:text-primary/80 font-medium transition-colors"
            >
              ← Back to Home
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}