import { useEffect } from 'react';
import { BlobBackground } from '@/components/ui/BlobBackground';

export const Terms = () => {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="min-h-screen content-layer py-20 relative">
      <BlobBackground position="top" color="#ff7664" animate={true} />
      <div className="container mx-auto px-4 max-w-4xl relative z-10">
        <div className="bg-white rounded-2xl shadow-elevated p-8 md:p-12">
          <h1 className="text-4xl font-bold mb-4 text-foreground">Terms of Service</h1>
          <p className="text-sm text-foreground/70 mb-8">Last updated: October 15, 2024</p>
          
          <div className="prose prose-lg max-w-none text-foreground/80 space-y-6">
            <p>
              Welcome to <strong>Masterly</strong>. These Terms of Service ("Terms") govern your access to and use of the Masterly mobile application (the "App"). By creating an account or using the App you agree to be bound by these Terms.
            </p>

            <h2 className="text-2xl font-semibold text-foreground mt-8 mb-4">1. Eligibility & Account Responsibilities</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>You must be at least 13 years old to create or use a Masterly account. If you are between 13 and the age of majority in your jurisdiction, you must have permission from your parent or legal guardian.</li>
              <li>You are responsible for maintaining the confidentiality of your login credentials and for all activity that occurs under your account.</li>
              <li>You must provide accurate information during onboarding and keep it updated.</li>
            </ul>

            <h2 className="text-2xl font-semibold text-foreground mt-8 mb-4">2. Subscription and Payments</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>Masterly offers subscription packages billed through Apple's in-app purchase system: <strong>Weekly Study Pass</strong>, <strong>Monthly Study Pro</strong>, and <strong>Yearly Master Plan</strong>. Pricing and billing frequency are displayed before you confirm your purchase.</li>
              <li>All payments are processed by Apple. By subscribing, you authorize Apple to charge your Apple ID account for the selected plan.</li>
              <li>Fees are non-refundable except where required by applicable law. You may cancel future renewals at any time in your device subscription settings.</li>
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
            <ul className="list-disc pl-6 space-y-2">
              <li>Masterly uses Supabase for secure authentication and data storage, OpenAI for AI-powered explanations, and Google services for document analysis. Your data will be processed by these providers solely to deliver the App's features.</li>
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

            <h2 className="text-2xl font-semibold text-foreground mt-8 mb-4">10. Contact Us</h2>
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
};