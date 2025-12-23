import { useState, useEffect, useRef } from "react";
import { Send, ArrowLeft, Flag, X, LogOut } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

interface Message {
  id: string;
  username: string;
  text: string;
  timestamp: string;
  flagged: boolean;
  reported?: boolean;
  reportCount?: number;
}

interface Report {
  id: string;
  messageId: string;
  username: string;
  reason: string;
  timestamp: string;
}

export default function ChatRoom() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState("");
  const [loading, setLoading] = useState(true);
  const [reportingMessageId, setReportingMessageId] = useState<string | null>(null);
  const [reportReason, setReportReason] = useState("");
  const [reportedMessages, setReportedMessages] = useState<Set<string>>(new Set());
  const [isBanned, setIsBanned] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { username, logout } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    fetchMessages();
    setLoading(false);
    checkBanStatus();
  }, []);

  const checkBanStatus = async () => {
    try {
      const response = await fetch("/api/admin/banned-users");
      if (response.ok) {
        const data = await response.json();
        const banned = data.bannedUsers.find(
          (u: any) => u.username.toLowerCase() === username?.toLowerCase()
        );
        if (banned) {
          setIsBanned(true);
        }
      }
    } catch (err) {
      console.error("Failed to check ban status:", err);
    }
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const fetchMessages = async () => {
    try {
      const response = await fetch("/api/chat/messages");
      if (response.ok) {
        const data = await response.json();
        setMessages(data.messages || []);
      }
    } catch (err) {
      console.error("Failed to fetch messages:", err);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || !username.trim()) return;

    try {
      const response = await fetch("/api/chat/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, text: inputText }),
      });

      if (response.ok) {
        const data = await response.json();
        setMessages([...messages, data.message]);
        setInputText("");
      } else if (response.status === 403) {
        setIsBanned(true);
      } else {
        alert("Failed to send message");
      }
    } catch (err) {
      console.error("Failed to send message:", err);
    }
  };

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  const handleReportMessage = async (messageId: string) => {
    if (!reportReason.trim()) {
      alert("Please provide a reason for reporting");
      return;
    }

    try {
      const response = await fetch("/api/chat/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messageId, reason: reportReason, reportedBy: username }),
      });

      if (response.ok) {
        setReportedMessages(new Set([...reportedMessages, messageId]));
        setMessages(
          messages.map((msg) =>
            msg.id === messageId
              ? { ...msg, reported: true, reportCount: (msg.reportCount || 0) + 1 }
              : msg
          )
        );
        setReportingMessageId(null);
        setReportReason("");
        alert("Message reported successfully!");
      }
    } catch (err) {
      console.error("Failed to report message:", err);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center">
        <p className="text-gray-400">Loading chat...</p>
      </div>
    );
  }

  if (isBanned) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="bg-red-900/20 border border-red-500/50 rounded-lg p-8">
            <h1 className="text-2xl font-bold text-red-400 mb-4">Access Denied</h1>
            <p className="text-gray-300 mb-6">
              Your account has been banned from the chat for violating community guidelines. If you believe this is a mistake, please contact an administrator.
            </p>
            <Link
              to="/"
              className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg transition-colors"
            >
              <ArrowLeft size={20} />
              Back to Home
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex flex-col">
      <header className="bg-gray-800 border-b border-gray-700 p-4">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <h1 className="text-2xl font-bold text-white">GameNexus Chat</h1>
          <div className="flex items-center gap-4">
            <span className="text-gray-400">
              Welcome, <span className="text-purple-400">{username}</span>
            </span>
            <Link
              to="/"
              className="flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
            >
              <ArrowLeft size={20} />
              Home
            </Link>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg transition-colors"
            >
              <LogOut size={20} />
              Logout
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-hidden flex flex-col max-w-6xl w-full mx-auto">
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 ? (
            <div className="flex items-center justify-center h-full text-gray-400">
              <p>No messages yet. Start a conversation!</p>
            </div>
          ) : (
            messages.map((msg) => (
              <div
                key={msg.id}
                className={`rounded-lg p-3 ${
                  msg.flagged
                    ? "bg-red-500/20 border border-red-500/30"
                    : msg.reported
                    ? "bg-orange-500/20 border border-orange-500/30"
                    : "bg-gray-800 border border-gray-700"
                }`}
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <h4 className="text-white font-medium">{msg.username}</h4>
                    <p className={`mt-1 ${msg.flagged ? "text-red-300 line-through" : "text-gray-300"}`}>
                      {msg.text}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 ml-2">
                    <button
                      onClick={() => setReportingMessageId(msg.id)}
                      className="p-1 text-gray-400 hover:text-orange-400 transition-colors"
                      title="Report message"
                    >
                      <Flag size={16} />
                    </button>
                    <span className="text-gray-500 text-xs whitespace-nowrap">
                      {new Date(msg.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                </div>

                {msg.flagged && (
                  <p className="text-red-400 text-xs mt-2">⚠️ Message flagged for inappropriate content</p>
                )}

                {msg.reported && (
                  <p className="text-orange-400 text-xs mt-2">🚩 Message reported by community ({msg.reportCount} reports)</p>
                )}

                {reportingMessageId === msg.id && (
                  <div className="mt-3 p-3 bg-gray-700 rounded border border-gray-600">
                    <div className="flex justify-between items-center mb-2">
                      <label className="text-sm text-gray-300">Report reason:</label>
                      <button
                        onClick={() => setReportingMessageId(null)}
                        className="text-gray-400 hover:text-white"
                      >
                        <X size={16} />
                      </button>
                    </div>
                    <select
                      value={reportReason}
                      onChange={(e) => setReportReason(e.target.value)}
                      className="w-full px-2 py-1 bg-gray-600 border border-gray-500 rounded text-sm text-white mb-2"
                    >
                      <option value="">Select a reason...</option>
                      <option value="harassment">Harassment or bullying</option>
                      <option value="spam">Spam</option>
                      <option value="inappropriate">Inappropriate content</option>
                      <option value="advertising">Advertising or self-promotion</option>
                      <option value="other">Other</option>
                    </select>
                    <button
                      onClick={() => handleReportMessage(msg.id)}
                      className="w-full px-2 py-1 bg-orange-600 hover:bg-orange-500 text-white text-sm rounded transition-colors"
                    >
                      Submit Report
                    </button>
                  </div>
                )}
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>

        <form onSubmit={handleSendMessage} className="border-t border-gray-700 p-4 bg-gray-800">
          <div className="flex gap-2">
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Type a message..."
              className="flex-1 px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 transition-colors"
              maxLength={500}
            />
            <button
              type="submit"
              className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg flex items-center gap-2 transition-colors"
            >
              <Send size={20} />
            </button>
          </div>
        </form>

        {isBanned && (
          <div className="bg-red-500/20 border-t border-red-500/30 p-3">
            <p className="text-red-300 text-sm text-center">⚠️ You have been banned from chat and cannot send messages.</p>
          </div>
        )}
      </main>
    </div>
  );
}
