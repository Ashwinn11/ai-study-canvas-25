import { Mail } from "lucide-react";

export const Footer = () => {
  return (
    <footer className="bg-dark-surface text-white py-16">
      <div className="container mx-auto px-4">
        <div className="grid md:grid-cols-3 gap-12 mb-12">
          {/* Brand */}
          <div>
            <h3 className="text-2xl font-bold mb-4 text-white">Masterly</h3>
            <p className="text-white/70 mb-4">
              Your AI-powered study coach for mastering any exam with smart flashcards and quizzes that work together with spaced repetition.
            </p>
            <a 
              href="https://apps.apple.com/app/idXXXXXXXXX"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block"
            >
              <img 
                src="https://developer.apple.com/assets/elements/badges/download-on-the-app-store.svg"
                alt="Download on the App Store"
                className="h-12"
              />
            </a>
          </div>

          {/* Links */}
          <div>
            <h4 className="font-semibold mb-4">Legal</h4>
            <ul className="space-y-3">
              <li>
                <a 
                  href="/terms" 
                  className="text-white/70 hover:text-white transition-colors"
                >
                  Terms & Conditions
                </a>
              </li>
              <li>
                <a 
                  href="/privacy" 
                  className="text-white/70 hover:text-white transition-colors"
                >
                  Privacy Policy
                </a>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="font-semibold mb-4">Contact</h4>
            <a 
              href="mailto:support@masterlyapp.in"
              className="flex items-center gap-2 text-white/70 hover:text-white transition-colors"
            >
              <Mail className="h-4 w-4" />
              support@masterlyapp.in
            </a>
          </div>
        </div>

        <div className="border-t border-white/10 pt-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-white/50">
            <p>© 2025 Masterly. All rights reserved.</p>
            <p className="text-center md:text-right max-w-2xl">
              Apple, the Apple logo, and App Store are trademarks of Apple Inc., registered in the U.S. and other countries.
            </p>
          </div>
        </div>

        {/* App Store Requirements Legal Text */}
        <div className="mt-8 text-xs text-white/40 text-center max-w-4xl mx-auto">
          <p>
            Subscriptions will be charged to your credit card through your App Store account. 
            Your subscription will automatically renew unless canceled at least 24 hours before the end of the current period. 
            Manage your subscription in Account Settings after purchase. Any unused portion of a free trial will be forfeited when purchasing a subscription.
          </p>
        </div>
      </div>
    </footer>
  );
};
