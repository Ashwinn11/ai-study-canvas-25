'use client';

import { useEffect } from 'react';
import { BlobBackground } from '@/components/ui/BlobBackground';

export default function HelpPage() {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="min-h-screen content-layer py-20 relative">
      <BlobBackground position="top" color="#ff7664" animate={true} />
      <div className="container mx-auto px-4 max-w-4xl relative z-10">
        <div className="bg-white rounded-2xl shadow-elevated p-8 md:p-12">
          <h1 className="text-4xl font-bold mb-4 text-gray-800">Help & Support</h1>
          <p className="text-sm text-gray-600 mb-8">Get answers to common questions about Masterly</p>

          <div className="prose prose-lg max-w-none text-gray-400 space-y-8">

            <div className="border-b border-border pb-6">
              <h2 className="text-2xl font-semibold text-gray-800 mb-3">Getting Started</h2>

              <div className="space-y-4 ml-4">
                <div>
                  <h3 className="text-lg font-medium text-gray-800">How do I sign in?</h3>
                  <p className="text-gray-600 mt-2">
                    Masterly uses OAuth for secure authentication. You can sign in using:
                  </p>
                  <ul className="list-disc pl-6 mt-2 text-gray-800/70">
                    <li><strong>Sign in with Apple</strong> - Use your Apple ID (recommended)</li>
                    <li><strong>Sign in with Google</strong> - Use your Google account</li>
                  </ul>
                  <p className="text-gray-800/70 mt-2">
                    Simply tap your preferred option on the login screen and follow the prompts.
                  </p>
                </div>

                <div>
                  <h3 className="text-lg font-medium text-gray-800">What study materials can I upload?</h3>
                  <p className="text-gray-800/70 mt-2">
                    Masterly supports a wide variety of formats:
                  </p>
                  <ul className="list-disc pl-6 mt-2 text-gray-800/70">
                    <li><strong>Documents:</strong> PDFs, Word docs, PowerPoint slides</li>
                    <li><strong>Images:</strong> Photos of notes, textbook pages, handwritten content</li>
                    <li><strong>Audio:</strong> Voice notes, lectures, recordings</li>
                    <li><strong>Video:</strong> Educational videos, lectures</li>
                    <li><strong>Text:</strong> Paste text directly into the app</li>
                  </ul>
                </div>

                <div>
                  <h3 className="text-lg font-medium text-gray-800">How does the AI work?</h3>
                  <p className="text-gray-800/70 mt-2">
                    Masterly uses advanced AI (powered by OpenAI) to:
                  </p>
                  <ul className="list-disc pl-6 mt-2 text-gray-800/70">
                    <li>Extract key concepts from your materials</li>
                    <li>Generate flashcards automatically</li>
                    <li>Create practice quiz questions</li>
                    <li>Provide detailed explanations</li>
                    <li>Suggest optimal review schedules using spaced repetition</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="border-b border-border pb-6">
              <h2 className="text-2xl font-semibold text-gray-800 mb-3">Subscriptions & Pricing</h2>

              <div className="space-y-4 ml-4">
                <div>
                  <h3 className="text-lg font-medium text-gray-800">What are the subscription plans?</h3>
                  <p className="text-gray-800/70 mt-2">
                    Masterly offers flexible subscription options:
                  </p>
                  <ul className="list-disc pl-6 mt-2 text-gray-800/70">
                    <li><strong>Weekly Study Pass:</strong> $7.99/week - Perfect for quick exam prep</li>
                    <li><strong>Monthly Study Pro:</strong> $12.99/month - Great for semester courses</li>
                    <li><strong>Yearly Master Plan:</strong> $79.99/year - Best value for serious students</li>
                    <li><strong>Free Plan:</strong> Limited uploads and features to get started</li>
                  </ul>
                </div>

                <div>
                  <h3 className="text-lg font-medium text-gray-800">How do I cancel my subscription?</h3>
                  <p className="text-gray-800/70 mt-2">
                    You can cancel anytime through multiple methods:
                  </p>
                  <ul className="list-disc pl-6 mt-2 text-gray-800/70">
                    <li>In the Masterly app: Go to <strong>Profile → Subscription → Manage in App Store</strong></li>
                    <li>In iOS Settings: Visit <strong><a href="https://apps.apple.com/account/subscriptions" className="text-primary hover:underline" target="_blank" rel="noopener noreferrer">Apple's Manage Subscriptions page</a></strong></li>
                  </ul>
                  <p className="text-gray-800/70 mt-2">
                    You'll have access until your billing period ends.
                  </p>
                </div>

                <div>
                  <h3 className="text-lg font-medium text-gray-800">Are there refunds?</h3>
                  <p className="text-gray-800/70 mt-2">
                    Refunds are handled by Apple according to their refund policy. You can request a refund through the App Store if you're eligible. For assistance with refund requests, please contact <strong>support@masterlyapp.in</strong>.
                  </p>
                </div>
              </div>
            </div>

            <div className="border-b border-border pb-6">
              <h2 className="text-2xl font-semibold text-gray-800 mb-3">Using Masterly</h2>

              <div className="space-y-4 ml-4">
                <div>
                  <h3 className="text-lg font-medium text-gray-800">How do I upload study materials?</h3>
                  <p className="text-gray-800/70 mt-2">
                    1. Tap the <strong>+ button</strong> on the Home screen<br/>
                    2. Choose your upload method (document, image, audio, video, or text)<br/>
                    3. Give your material a title<br/>
                    4. Masterly's AI will automatically generate flashcards and quizzes<br/>
                    5. Review and customize the generated content
                  </p>
                </div>

                <div>
                  <h3 className="text-lg font-medium text-gray-800">How does spaced repetition work?</h3>
                  <p className="text-gray-800/70 mt-2">
                    Spaced repetition is a science-backed learning technique that:
                  </p>
                  <ul className="list-disc pl-6 mt-2 text-gray-800/70">
                    <li>Reviews concepts at optimal intervals for maximum retention</li>
                    <li>Adjusts based on how well you know each concept</li>
                    <li>Helps you forget less by reviewing at the right time</li>
                    <li>Proven to improve long-term memory by 50%+</li>
                  </ul>
                  <p className="text-gray-800/70 mt-2">
                    Masterly automatically schedules your reviews using a scientifically-proven algorithm.
                  </p>
                </div>

                <div>
                  <h3 className="text-lg font-medium text-gray-800">How do I track my progress?</h3>
                  <p className="text-gray-800/70 mt-2">
                    Visit your <strong>Profile</strong> to see:
                  </p>
                  <ul className="list-disc pl-6 mt-2 text-gray-800/70">
                    <li>Study streaks and daily goals</li>
                    <li>Performance analytics by subject</li>
                    <li>Achievement badges and milestones</li>
                    <li>Mastery scores for each topic</li>
                    <li>Exam countdown timers</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="border-b border-border pb-6">
              <h2 className="text-2xl font-semibold text-gray-800 mb-3">Account & Privacy</h2>

              <div className="space-y-4 ml-4">
                <div>
                  <h3 className="text-lg font-medium text-gray-800">How do I delete my account?</h3>
                  <p className="text-gray-800/70 mt-2">
                    You can delete your account anytime:
                  </p>
                  <p className="text-gray-800/70 mt-2">
                    1. Go to <strong>Profile → Settings</strong><br/>
                    2. Scroll down and tap <strong>Delete Account</strong><br/>
                    3. Confirm your choice
                  </p>
                  <p className="text-gray-800/70 mt-2">
                    All your personal data will be removed within 30 days. You can also email <strong>support@masterlyapp.in</strong> to request deletion.
                  </p>
                </div>

                <div>
                  <h3 className="text-lg font-medium text-gray-800">How is my data protected?</h3>
                  <p className="text-gray-800/70 mt-2">
                    We take security seriously:
                  </p>
                  <ul className="list-disc pl-6 mt-2 text-gray-800/70">
                    <li>All data is encrypted in transit using TLS</li>
                    <li>Your data is stored securely in Supabase</li>
                    <li>We never sell your personal information</li>
                    <li>You can view and update your data anytime</li>
                    <li>We comply with COPPA, CCPA, and GDPR regulations</li>
                  </ul>
                </div>

                <div>
                  <h3 className="text-lg font-medium text-gray-800">Where can I learn more?</h3>
                  <p className="text-gray-800/70 mt-2">
                    Read our full policies:
                  </p>
                  <ul className="list-disc pl-6 mt-2 text-gray-800/70">
                    <li><a href="/privacy" className="text-primary hover:underline">Privacy Policy</a></li>
                    <li><a href="/terms" className="text-primary hover:underline">Terms of Service</a></li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="bg-primary/5 border border-primary/20 rounded-lg p-6">
              <h2 className="text-2xl font-semibold text-gray-800 mb-3">Still Need Help?</h2>
              <p className="text-gray-800/80 mb-4">
                Can't find what you're looking for? Our support team is ready to help!
              </p>
              <div className="space-y-2">
                <p className="text-gray-800/80">
                  <strong>Email:</strong> <a href="mailto:support@masterlyapp.in" className="text-primary hover:underline">support@masterlyapp.in</a>
                </p>
                <p className="text-gray-800/70 text-sm">
                  Response time: Within 24 hours
                </p>
              </div>
            </div>

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
