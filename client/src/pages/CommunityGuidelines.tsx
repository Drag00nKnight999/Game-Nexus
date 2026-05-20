import { Link } from "react-router-dom";
import { ArrowLeft, Users } from "lucide-react";

export default function CommunityGuidelines() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      <header className="bg-gray-800 border-b border-gray-700 py-4 px-4">
        <div className="max-w-4xl mx-auto flex items-center gap-4">
          <Link to="/" className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors">
            <ArrowLeft size={20} />
            Back to Home
          </Link>
          <div className="flex items-center gap-2">
            <Users size={24} className="text-purple-400" />
            <h1 className="text-2xl font-bold text-white">Community Guidelines</h1>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-10 text-gray-300 space-y-8">
        <p className="text-gray-500 text-sm">Last updated: April 17, 2026</p>

        <div className="bg-purple-600/10 border border-purple-500/30 rounded-xl p-6">
          <p className="text-purple-300 font-medium text-lg">GameNexus is a place for everyone to play, connect, and have fun. These guidelines keep our community safe and welcoming for all players.</p>
        </div>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-white">✅ Be Respectful</h2>
          <p>Treat all players with kindness and respect, regardless of their skill level, background, or opinions. Constructive feedback is welcome; personal attacks are not.</p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-white">🚫 No Harassment or Bullying</h2>
          <p>Harassment, bullying, intimidation, and targeted abuse are strictly prohibited. This includes repeated unwanted contact, threats of any kind, and any behavior intended to make another person feel unsafe or unwelcome.</p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-white">🔞 Keep It Appropriate</h2>
          <p>GameNexus is for all ages. Do not share content that is sexually explicit, graphically violent, or otherwise inappropriate for a general audience. This applies to chat messages, usernames, and any user-generated content.</p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-white">🚷 No Hate Speech</h2>
          <p>Content that promotes discrimination, hatred, or violence based on race, ethnicity, gender, religion, sexual orientation, disability, or any other characteristic is strictly forbidden and will result in an immediate permanent ban.</p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-white">📢 No Spam or Self-Promotion</h2>
          <p>Avoid flooding the chat with repeated messages, uninvited advertisements, referral links, or promotions for other platforms. Keep conversation relevant and enjoyable for all members.</p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-white">🔒 Protect Privacy</h2>
          <p>Do not share your own or anyone else's personal information (real name, address, phone number, school, etc.) in the chat or elsewhere on the platform. Sharing others' personal information without consent ("doxxing") is a serious violation.</p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-white">🎭 No Impersonation</h2>
          <p>Do not impersonate other users, platform staff (Admins or Developers), or public figures. Developer and Admin accounts are clearly marked with badges — be wary of anyone claiming authority without a visible badge.</p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-white">⚙️ No Malicious Game Code</h2>
          <p>Games published on GameNexus must not contain code that mines cryptocurrency, performs unauthorized network requests, attempts to access user data outside the game, or is otherwise designed to harm, exploit, or deceive players. Violations will result in immediate game removal and account ban.</p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-white">🐛 Report, Don't Retaliate</h2>
          <p>If you see someone breaking the rules, use the report button on their message. Do not engage in arguments or retaliate — let the moderation team handle it. False or malicious reports are also a violation of these guidelines.</p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-white">⚖️ Enforcement</h2>
          <p>Violations of these guidelines may result in:</p>
          <ul className="list-disc list-inside space-y-1 pl-4">
            <li>A warning from a Developer or Admin.</li>
            <li>Temporary or permanent ban from the Community Chat.</li>
            <li>Permanent removal of your account from GameNexus.</li>
          </ul>
          <p>Decisions made by Developers are final. If you believe a moderation action was applied in error, you may respectfully reach out to a Developer via the Community Chat.</p>
        </section>

        <div className="bg-gray-800 border border-gray-700 rounded-xl p-6 text-center">
          <p className="text-white font-semibold text-lg mb-2">Remember: Play fair, be kind, have fun.</p>
          <p className="text-gray-400">The GameNexus community is what we all make it. Help us keep it great.</p>
        </div>
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
