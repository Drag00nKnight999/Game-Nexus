import { Link } from "react-router-dom";
import { ArrowLeft, FileText } from "lucide-react";

export default function TermsOfUse() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      <header className="bg-gray-800 border-b border-gray-700 py-4 px-4">
        <div className="max-w-4xl mx-auto flex items-center gap-4">
          <Link to="/" className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors">
            <ArrowLeft size={20} />
            Back to Home
          </Link>
          <div className="flex items-center gap-2">
            <FileText size={24} className="text-purple-400" />
            <h1 className="text-2xl font-bold text-white">Terms of Use</h1>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-10 text-gray-300 space-y-8">
        <p className="text-gray-500 text-sm">Last updated: April 17, 2026</p>

        <p>By accessing and using GameNexus, you agree to be bound by these Terms of Use. If you do not agree with any part of these terms, please do not use the platform.</p>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-white">1. Eligibility</h2>
          <p>GameNexus is available to users of all ages. By registering an account, you confirm that the information you provide is accurate and that you will comply with these Terms.</p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-white">2. Account Responsibility</h2>
          <p>You are responsible for maintaining the confidentiality of your account credentials. You are fully responsible for all activity that occurs under your account. Notify a Developer immediately if you suspect unauthorized use of your account.</p>
          <p>Accounts are non-transferable. Sharing your account with others is not permitted.</p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-white">3. Acceptable Use</h2>
          <p>You agree not to use GameNexus to:</p>
          <ul className="list-disc list-inside space-y-1 pl-4">
            <li>Post content that is offensive, threatening, harassing, or hateful.</li>
            <li>Impersonate other users, platform staff, or any person or entity.</li>
            <li>Attempt to gain unauthorized access to other accounts or platform systems.</li>
            <li>Distribute spam, malware, or any harmful content.</li>
            <li>Engage in any activity that disrupts the experience of other users.</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-white">4. Community Chat</h2>
          <p>The Community Chat is a shared space. All users are expected to follow our Community Guidelines when using the chat. Violations may result in your account being banned from chat or removed from the platform entirely.</p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-white">5. Intellectual Property</h2>
          <p>All games, graphics, and platform code are owned by GameNexus or their respective rights holders. You may not copy, reproduce, or redistribute any portion of the platform without prior written permission.</p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-white">6. Rank System & Permissions</h2>
          <p>GameNexus operates a rank system with varying levels of permissions:</p>
          <ul className="list-disc list-inside space-y-1 pl-4">
            <li><span className="text-white font-medium">User:</span> Standard access to games and community chat.</li>
            <li><span className="text-yellow-400 font-medium">Admin:</span> Additional moderation tools and access to the admin panel.</li>
            <li><span className="text-purple-400 font-medium">Developer:</span> Full platform access including chat moderation, all admin capabilities, and exclusive developer tools.</li>
          </ul>
          <p>Ranks are assigned at the sole discretion of platform developers and may be revoked at any time.</p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-white">7. Termination</h2>
          <p>We reserve the right to suspend or terminate your account at any time, with or without notice, for violations of these Terms or for any other reason at our discretion.</p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-white">8. Disclaimer of Warranties</h2>
          <p>GameNexus is provided "as is" without warranties of any kind. We do not guarantee uninterrupted access or that the platform will be free of errors.</p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-white">9. Changes to Terms</h2>
          <p>These Terms may be updated at any time. The date at the top of this page indicates when the Terms were last revised. Continued use of GameNexus after changes constitutes acceptance of the new Terms.</p>
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
