import { useState, useEffect, useRef } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Send, MessageSquare, User } from "lucide-react";
import { useAuth } from "../hooks/useAuth";

interface DM {
  id: number;
  fromUserId: number;
  toUserId: number;
  fromUsername: string;
  toUsername: string;
  text: string;
  read: boolean;
  createdAt: string;
}

interface InboxItem {
  id: number;
  fromUsername: string;
  toUsername: string;
  text: string;
  read: boolean;
  createdAt: string;
}

export default function Messages() {
  const { username: myUsername } = useAuth();
  const { username: targetParam } = useParams<{ username?: string }>();
  const navigate = useNavigate();

  const [inbox, setInbox] = useState<InboxItem[]>([]);
  const [conversation, setConversation] = useState<DM[]>([]);
  const [activeUser, setActiveUser] = useState<string | null>(targetParam || null);
  const [inputText, setInputText] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [newUsername, setNewUsername] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchInbox();
  }, []);

  useEffect(() => {
    if (activeUser) {
      fetchConversation(activeUser);
    }
  }, [activeUser]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [conversation]);

  const fetchInbox = async () => {
    try {
      const res = await fetch("/api/messages");
      if (res.ok) {
        const data = await res.json();
        setInbox(data.inbox || []);
      }
    } catch {}
    setLoading(false);
  };

  const fetchConversation = async (username: string) => {
    try {
      const res = await fetch(`/api/messages/${encodeURIComponent(username)}`);
      if (res.ok) {
        const data = await res.json();
        setConversation(data.messages || []);
      }
    } catch {}
  };

  const handleSend = async () => {
    if (!activeUser || !inputText.trim() || sending) return;
    setSending(true);
    try {
      const res = await fetch(`/api/messages/${encodeURIComponent(activeUser)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: inputText.trim() }),
      });
      if (res.ok) {
        const data = await res.json();
        setConversation((prev) => [...prev, data.message]);
        setInputText("");
        fetchInbox();
      }
    } finally {
      setSending(false);
    }
  };

  const openConversation = (username: string) => {
    setActiveUser(username);
    navigate(`/messages/${encodeURIComponent(username)}`, { replace: true });
  };

  const getOtherUser = (item: InboxItem) =>
    item.fromUsername === myUsername ? item.toUsername : item.fromUsername;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex flex-col">
      <header className="bg-gray-800 border-b border-gray-700 px-4 py-3">
        <div className="max-w-5xl mx-auto flex items-center gap-4">
          <Link to="/" className="text-gray-400 hover:text-white transition-colors">
            <ArrowLeft size={20} />
          </Link>
          <h1 className="text-white font-bold text-lg flex items-center gap-2">
            <MessageSquare size={20} className="text-purple-400" />
            Direct Messages
          </h1>
        </div>
      </header>

      <div className="max-w-5xl mx-auto w-full flex flex-1 gap-0 border-x border-gray-700">
        {/* Sidebar */}
        <div className="w-72 border-r border-gray-700 flex flex-col flex-shrink-0">
          {/* New conversation */}
          <div className="p-3 border-b border-gray-700">
            <div className="flex gap-2">
              <input
                type="text"
                value={newUsername}
                onChange={(e) => setNewUsername(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && newUsername.trim()) { openConversation(newUsername.trim()); setNewUsername(""); } }}
                placeholder="Message a user..."
                className="flex-1 px-3 py-1.5 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm placeholder-gray-500 focus:outline-none focus:border-purple-500"
              />
              <button
                onClick={() => { if (newUsername.trim()) { openConversation(newUsername.trim()); setNewUsername(""); } }}
                className="px-3 py-1.5 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-sm transition-colors"
              >
                <Send size={14} />
              </button>
            </div>
          </div>

          {/* Inbox list */}
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <p className="text-gray-500 text-sm text-center py-8">Loading...</p>
            ) : inbox.length === 0 ? (
              <p className="text-gray-500 text-sm text-center py-8">No messages yet</p>
            ) : (
              inbox.map((item) => {
                const other = getOtherUser(item);
                const isActive = activeUser === other;
                return (
                  <button
                    key={item.id}
                    onClick={() => openConversation(other)}
                    className={`w-full text-left px-4 py-3 border-b border-gray-700 hover:bg-gray-700/50 transition-colors ${isActive ? "bg-gray-700/70" : ""}`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-purple-600 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                        {other.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between">
                          <span className={`text-sm font-medium ${!item.read && item.fromUsername !== myUsername ? "text-white" : "text-gray-300"}`}>{other}</span>
                          {!item.read && item.fromUsername !== myUsername && (
                            <span className="w-2 h-2 bg-purple-400 rounded-full flex-shrink-0" />
                          )}
                        </div>
                        <p className="text-gray-500 text-xs truncate">{item.text}</p>
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Conversation panel */}
        <div className="flex-1 flex flex-col min-h-96">
          {activeUser ? (
            <>
              <div className="px-4 py-3 border-b border-gray-700 bg-gray-800 flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-purple-600 flex items-center justify-center text-white text-sm font-bold">
                  {activeUser.charAt(0).toUpperCase()}
                </div>
                <Link to={`/profile/${encodeURIComponent(activeUser)}`} className="text-white font-semibold hover:text-purple-300 transition-colors">
                  {activeUser}
                </Link>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {conversation.length === 0 ? (
                  <p className="text-gray-500 text-sm text-center py-8">No messages yet. Say hi!</p>
                ) : (
                  conversation.map((msg) => {
                    const isMine = msg.fromUsername === myUsername;
                    return (
                      <div key={msg.id} className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
                        <div className={`max-w-xs lg:max-w-md px-4 py-2 rounded-2xl text-sm ${isMine ? "bg-purple-600 text-white" : "bg-gray-700 text-gray-200"}`}>
                          <p className="break-words">{msg.text}</p>
                          <p className={`text-xs mt-1 ${isMine ? "text-purple-300" : "text-gray-500"}`}>
                            {new Date(msg.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </p>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              <div className="p-3 border-t border-gray-700 bg-gray-800">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                    placeholder={`Message ${activeUser}...`}
                    maxLength={1000}
                    className="flex-1 px-4 py-2 bg-gray-700 border border-gray-600 rounded-xl text-white text-sm placeholder-gray-500 focus:outline-none focus:border-purple-500 transition-colors"
                  />
                  <button
                    onClick={handleSend}
                    disabled={!inputText.trim() || sending}
                    className="px-4 py-2 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white rounded-xl transition-colors"
                  >
                    <Send size={16} />
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8 gap-4">
              <User size={48} className="text-gray-600" />
              <p className="text-gray-400">Select a conversation or start a new one</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
