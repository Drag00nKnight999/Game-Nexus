import { Link } from "react-router-dom";
import { ArrowLeft, Shield } from "lucide-react";

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      <header className="bg-gray-800 border-b border-gray-700 py-4 px-4">
        <div className="max-w-4xl mx-auto flex items-center gap-4">
          <Link to="/" className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors">
            <ArrowLeft size={20} />
            Back to Home
          </Link>
          <div className="flex items-center gap-2">
            <Shield size={24} className="text-purple-400" />
            <h1 className="text-2xl font-bold text-white">Privacy Policy</h1>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-10 text-gray-300 space-y-8">
        <p className="text-gray-500 text-sm">Last updated: April 17, 2026</p>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-white">1. Information We Collect</h2>
          <p>When you create a GameNexus account, we collect your username and a securely hashed version of your password. We do not collect your real name, email address, or any personally identifiable information beyond what you voluntarily provide in chat messages.</p>
          <p>We may also collect basic technical information such as browser type and session identifiers for authentication purposes.</p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-white">2. How We Use Your Information</h2>
          <p>Information collected is used solely to:</p>
          <ul className="list-disc list-inside space-y-1 pl-4">
            <li>Authenticate your account and maintain your session.</li>
            <li>Display your username and rank in community features such as the chat room.</li>
            <li>Enforce community guidelines and maintain platform safety.</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-white">3. Data Storage & Security</h2>
          <p>Account data is stored in memory on our servers. All passwords are hashed using industry-standard bcrypt hashing and are never stored in plain text. Sessions are secured with HttpOnly cookies and expire automatically after 7 days of inactivity.</p>
          <p>Please be aware that because we use in-memory storage, account data is not permanently persisted across server restarts.</p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-white">4. Chat Messages</h2>
          <p>Messages you send in the Community Chat are visible to all users of the platform. Do not share personal information such as your real name, address, phone number, or financial details in the chat.</p>
          <p>Messages may be reviewed by platform staff and may be removed for violations of our Community Guidelines.</p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-white">5. Third-Party Services</h2>
          <p>GameNexus does not sell, trade, or share your information with third parties. The Bloxd.io game is loaded from an external source via iframe; please refer to the respective platform's privacy policy for data handling within that game.</p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-white">6. Children's Privacy</h2>
          <p>GameNexus is designed to be appropriate for all ages. We do not knowingly collect information from children under 13. If you are a parent or guardian and believe your child has provided us with personal information, please contact us.</p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-white">7. Changes to This Policy</h2>
          <p>We may update this Privacy Policy from time to time. Changes will be reflected with an updated date at the top of this page. Continued use of the platform constitutes acceptance of the updated policy.</p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-white">8. Contact</h2>
          <p>If you have questions about this Privacy Policy, please reach out through the Community Chat or contact a Developer directly on the platform.</p>
        </section>
      </main>

      <footer className="py-6 border-t border-gray-800 mt-12">
        <div className="max-w-4xl mx-auto px-4 flex flex-wrap gap-4 justify-center text-gray-500 text-sm">
          <Link to="/privacy" className="hover:text-gray-300 transition-colors">Privacy Policy</Link>
          <span>·</span>
          <Link to="/terms" className="hover:text-gray-300 transition-colors">Terms of Use</Link>
          <span>·</span>
          <Link to="/guidelines" className="hover:text-gray-300 transition-colors">Community Guidelines</Link>
          <span>·</span>
          <Link to="/" className="hover:text-gray-300 transition-colors">GameNexus</Link>
        </div>
      </footer>
    </div>
  );
}
