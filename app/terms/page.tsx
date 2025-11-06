'use client';

import { useEffect } from 'react';
import { BlobBackground } from '@/components/ui/BlobBackground';

export default function TermsPage() {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="min-h-screen content-layer py-20 relative">
      <BlobBackground position="top" color="#ff7664" animate={true} />
      <div className="container mx-auto px-4 max-w-4xl relative z-10">
        <div className="bg-white rounded-2xl shadow-elevated p-8 md:p-12">
          <h1 className="text-4xl font-bold mb-4 text-foreground">Terms of Service</h1>
          <p className="text-sm text-foreground/70 mb-8">Last updated: November 1, 2025</p>
          
          <div className="prose prose-lg max-w-none text-foreground/80 space-y-6">
            <p>
              Welcome to <strong>Masterly</strong>. These Terms of Service ("Terms") govern your access to and use of the Masterly mobile application (the "App"). By creating an account or using the App you agree to be bound by these Terms.
            </p>

            <h2 className="text-2xl font-semibold text-foreground mt-8 mb-4">1. Eligibility & Account Responsibilities</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>Masterly is designed for learners of all ages. If you are under the age of majority in your region, please have a parent or legal guardian review these Terms with you and consent to your use of the App.</li>
              <li>Parents and guardians who create or manage accounts for children agree to supervise use of the App and help manage any data requests on their behalf.</li>
              <li>You are responsible for maintaining the confidentiality of your login credentials and for all activity that occurs under your account.</li>
              <li>You must provide accurate information during onboarding and keep it updated.</li>
            </ul>

            <h2 className="text-2xl font-semibold text-foreground mt-8 mb-4">2. Subscription and Payments</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>Masterly offers subscription packages billed through Apple's in-app purchase system: <strong>Weekly Study Pass ($7.99/week)</strong>, <strong>Monthly Study Pro ($12.99/month)</strong>, and <strong>Yearly Master Plan ($79.99/year)</strong>. Pricing and billing frequency are displayed before you confirm your purchase.</li>
              <li>All payments are processed by Apple. By subscribing, you authorize Apple to charge your Apple ID account for the selected plan.</li>
              <li>All payments are processed by Apple. Refunds are handled by Apple according to their refund policy. You can request a refund through the App Store if eligible. You may cancel future renewals at any time by visiting <a href="https://apps.apple.com/account/subscriptions" className="text-primary hover:underline" target="_blank" rel="noopener noreferrer">Manage Subscriptions</a> in your Apple ID settings or through the app's Profile → Subscription → Manage in App Store option.</li>
              <li>We may change pricing or available plans with advance notice delivered through the App or email.</li>
            </ul>

            <h2 className="text-2xl font-semibold text-foreground mt-8 mb-4">3. Acceptable Use</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>You agree not to upload or share content that is illegal, harmful, harassing, or violates the rights of others.</li>
              <li>You may not attempt to reverse engineer, interfere with, or disrupt the App, our servers, or connected networks.</li>
              <li>You must comply with all applicable laws when using Masterly, including education-related privacy rules that apply to your school or organization.</li>
            </ul>

            <h2 className="text-2xl font-semibold text-foreground mt-8 mb-4">4. Educational Content & UGC</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>The App enables upload of documents, images, audio, and video for study purposes. You retain ownership of the materials you upload and grant Masterly a license to process, transform, and display that content for your educational use.</li>
              <li>We reserve the right to remove any content that violates these Terms or that we deem inappropriate for our learning community.</li>
            </ul>

            <h2 className="text-2xl font-semibold text-foreground mt-8 mb-4">5. Third-Party Services</h2>
            <p className="font-medium text-foreground mb-3">Masterly uses the following third-party services to deliver core functionality:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Supabase:</strong> Secure authentication, database, and file storage</li>
              <li><strong>OpenAI:</strong> AI-powered explanations, study guides, and practice questions</li>
              <li><strong>Google Cloud Services:</strong> Document AI (PDF/image OCR), Vision API (image text detection), Speech-to-Text (audio transcription), and Cloud Storage</li>
              <li><strong>RevenueCat:</strong> Subscription management and in-app purchase entitlements (Apple handles payment processing)</li>
              <li><strong>Sentry:</strong> Error monitoring and crash reporting for app stability</li>
              <li><strong>Expo Push Notifications:</strong> Sending study reminders and notifications to your device</li>
              <li>Your data will be processed by these providers solely to deliver the App's features under strict data processing agreements.</li>
              <li>Links to third-party resources are provided for convenience. We do not endorse or assume responsibility for third-party websites or services.</li>
            </ul>

            <h2 className="text-2xl font-semibold text-foreground mt-8 mb-4">6. Intellectual Property</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>All Masterly trademarks, logos, and original content are owned by Masterly or its licensors and are protected by intellectual property laws.</li>
              <li>You may not copy, modify, or distribute portions of the App without written permission, except for the educational content that you create for personal use.</li>
            </ul>

            <h2 className="text-2xl font-semibold text-foreground mt-8 mb-4">7. Termination</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>You may stop using the App at any time and can request account deletion through the Profile → Settings section.</li>
              <li>We may suspend or terminate access to the App if you breach these Terms or if your use poses security or legal risks.</li>
              <li>Upon termination we will deactivate your account and delete or anonymize personal data in accordance with our Privacy Policy.</li>
            </ul>

            <h2 className="text-2xl font-semibold text-foreground mt-8 mb-4">8. Disclaimers & Limitation of Liability</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>Masterly provides learning tools and study recommendations but does not guarantee specific academic outcomes.</li>
              <li>The App is provided "as is" and "as available". To the fullest extent permitted by law, we disclaim warranties of merchantability, fitness for a particular purpose, and non-infringement.</li>
              <li>Masterly will not be liable for indirect, incidental, or consequential damages arising from your use of the App.</li>
            </ul>

            <h2 className="text-2xl font-semibold text-foreground mt-8 mb-4">9. Changes to These Terms</h2>
            <p>
              We may update these Terms when we add new features or as required by law. We will notify you of material changes by email or in-app notice. Continued use after changes become effective constitutes acceptance of the revised Terms.
            </p>

            <h2 className="text-2xl font-semibold text-foreground mt-8 mb-4">10. Apple App Store Terms</h2>
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold text-foreground mb-2">10.1 EULA Acknowledgement</h3>
                <p>
                  You and Masterly acknowledge that this Terms of Service is concluded between you and Masterly only, and not with Apple, Inc. ("Apple"). Masterly, not Apple, is solely responsible for the Licensed Application (the App) and its content. This EULA does not provide for usage rules that are in conflict with Apple Media Services Terms and Conditions.
                </p>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-foreground mb-2">10.2 Scope of License</h3>
                <p>
                  The license granted to you for the Licensed Application is limited to a non-transferable license to use the Licensed Application on any Apple-branded products (iPhone, iPad, Mac, Apple Watch, Apple TV) that you own or control, and as permitted by the Usage Rules set forth in the Apple Media Services Terms and Conditions. The Licensed Application may be accessed and used by other accounts associated with the purchaser via Family Sharing or volume purchasing as permitted by Apple.
                </p>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-foreground mb-2">10.3 Product Claims and Liability</h3>
                <p>
                  You acknowledge that Masterly, not Apple, is solely responsible for addressing any claims by you or any third party relating to the Licensed Application or your possession and use of it, including but not limited to: (i) product liability claims; (ii) any claim that the Licensed Application fails to conform to any applicable legal or regulatory requirement; and (iii) claims arising under consumer protection, privacy, or similar legislation. Masterly's total liability for any claims shall be limited to the amounts permitted under applicable law.
                </p>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-foreground mb-2">10.4 Intellectual Property</h3>
                <p>
                  You acknowledge that Masterly, not Apple, is solely responsible for investigating, defending, settling, and discharging any third-party claim that the Licensed Application or your possession and use of it infringes that third party's intellectual property rights.
                </p>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-foreground mb-2">10.5 Your Legal Representations</h3>
                <p>
                  You represent and warrant that: (i) you are not located in a country that is subject to a U.S. Government embargo, or that has been designated by the U.S. Government as a "terrorist supporting" country; and (ii) you are not listed on any U.S. Government list of prohibited or restricted parties. You may not use the App if any of these representations is false.
                </p>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-foreground mb-2">10.6 Third-Party Beneficiary</h3>
                <p>
                  You acknowledge that Apple and Apple's subsidiaries are third-party beneficiaries of this Terms of Service. Upon your acceptance of these Terms, Apple will have the right (and will be deemed to have accepted the right) to enforce these Terms against you as a third-party beneficiary.
                </p>
              </div>
            </div>

            <h2 className="text-2xl font-semibold text-foreground mt-8 mb-4">11. Contact Us</h2>
            <p>
              If you have any questions about these Terms or need assistance, contact us at <strong>support@masterlyapp.in</strong>.
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