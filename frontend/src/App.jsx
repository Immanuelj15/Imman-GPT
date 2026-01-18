import { useState, useEffect, useRef } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useAuth } from "./context/AuthContext";
import {
  Bot,
  Code2,
  GraduationCap,
  Briefcase,
  MessageSquarePlus,
  Search,
  PanelLeftClose,
  PanelLeftOpen,
  Trash2,
  Sparkles,
  User,
  LogOut,
  Lightbulb,
  Pencil,
  Paperclip,
  X,
  Mic,
  Copy,
  Check,
  Volume2,
  VolumeX,
  Settings
} from "lucide-react";
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import "./App.css";
import { API_URL } from "./config";


// Custom Code Block Component
const CodeBlock = ({ node, inline, className, children, ...props }) => {
  const match = /language-(\w+)/.exec(className || '');
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(String(children));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!inline && match && SyntaxHighlighter) {
    try {
      return (
        <div className="rounded-md overflow-hidden my-2 border border-gray-700 bg-[#1e1e1e]">
          <div className="flex justify-between items-center px-3 py-1.5 bg-[#2d2d2d] border-b border-gray-700">
            <span className="text-xs text-gray-400 font-mono">{match[1]}</span>
            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-white transition-colors"
            >
              {copied ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
              {copied ? "Copied!" : "Copy"}
            </button>
          </div>
          <SyntaxHighlighter
            style={vscDarkPlus}
            language={match[1]}
            PreTag="div"
            customStyle={{ margin: 0, padding: '1rem', background: 'transparent' }}
            {...props}
          >
            {String(children).replace(/\n$/, '')}
          </SyntaxHighlighter>
        </div>
      );
    } catch (e) {
      console.error("SyntaxHighlighter Error:", e);
    }
  }

  return (
    <code className={`${className} bg-gray-800 px-1 py-0.5 rounded text-sm`} {...props}>
      {children}
    </code>
  );
};

export default function App() {
  const { user, token, logout } = useAuth(); // Ensure token is available
  const [mode, setMode] = useState("normal");
  const [msg, setMsg] = useState("");
  const [chat, setChat] = useState([]); // Current chat messages
  const [chats, setChats] = useState([]); // List of chats for sidebar
  const [currentChatId, setCurrentChatId] = useState(null); // Active chat session
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const bottomRef = useRef(null);
  const [file, setFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);

  const [contextMenu, setContextMenu] = useState({ visible: false, x: 0, y: 0, chatId: null });
  const [isListening, setIsListening] = useState(false);
  const [isTTSActive, setIsTTSActive] = useState(true);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [customRules, setCustomRules] = useState(localStorage.getItem("imman_custom_rules") || "");
  const recognitionRef = useRef(null);

  // Save rules
  useEffect(() => {
    localStorage.setItem("imman_custom_rules", customRules);
  }, [customRules]);

  // TTS Function
  const speak = (text) => {
    if (!isTTSActive || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    const voices = window.speechSynthesis.getVoices();
    // Prefer Google US English, fall back to first available
    const googleVoice = voices.find(v => v.name.includes("Google US English")) || voices[0];
    if (googleVoice) utterance.voice = googleVoice;
    window.speechSynthesis.speak(utterance);
  };


  // Load chat history list on mount
  useEffect(() => {
    if (token) fetchChats();
    const handleClick = () => setContextMenu({ ...contextMenu, visible: false });
    document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, [token]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chat]);

  async function fetchChats() {
    try {
      const res = await fetch(`${API_URL}/api/chats`, {
        headers: { Authorization: token }
      });
      const data = await res.json();
      setChats(data);
    } catch (e) {
      console.error("Failed to fetch chats");
    }
  }

  async function loadChat(id) {
    try {
      const res = await fetch(`${API_URL}/api/chats/${id}`, {
        headers: { Authorization: token }
      });
      const data = await res.json();
      setChat(data.messages || []);
      setCurrentChatId(id);
    } catch (e) {
      console.error("Failed to load chat");
    }
  }

  async function deleteChat(e) {
    e.stopPropagation(); // Prevent menu from closing immediately
    const id = contextMenu.chatId;
    if (!id) return;

    if (!window.confirm("Delete this chat?")) return;

    try {
      await fetch(`${API_URL}/api/chats/${id}`, {
        method: "DELETE",
        headers: { Authorization: token }
      });

      setChats(chats.filter(c => c._id !== id));
      if (currentChatId === id) startNewChat();
      setContextMenu({ ...contextMenu, visible: false });
    } catch (e) {
      console.error("Failed to delete chat");
    }
  }

  async function renameChat(e) {
    e.stopPropagation();
    const id = contextMenu.chatId;
    if (!id) return;

    const newTitle = window.prompt("Enter new chat name:");
    if (!newTitle || !newTitle.trim()) return;

    try {
      const res = await fetch(`${API_URL}/api/chats/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: token },
        body: JSON.stringify({ title: newTitle.trim() })
      });

      if (res.ok) {
        setChats(chats.map(c => c._id === id ? { ...c, title: newTitle.trim() } : c));
      }
      setContextMenu({ ...contextMenu, visible: false });
    } catch (e) {
      console.error("Failed to rename chat");
    }
  }

  function handleContextMenu(e, id) {
    e.preventDefault();
    setContextMenu({
      visible: true,
      x: e.clientX,
      y: e.clientY,
      chatId: id
    });
  }

  function startNewChat() {
    setChat([]);
    setCurrentChatId(null);
    setFile(null);
  }

  function handleFileChange(e) {
    if (e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  }

  function removeFile() {
    setFile(null);
  }

  async function send() {
    if (!msg.trim() && !file) return;
    const userMsg = msg;
    setMsg("");
    let fileData = null;

    // Optimistic UI
    const tempMsg = { role: "user", text: userMsg };
    if (file) {
      tempMsg.file = { name: file.name, type: file.type.startsWith("image") ? "image" : "document" };
      if (file.type.startsWith("image")) {
        tempMsg.file.url = URL.createObjectURL(file);
      }
    }
    const newChat = [...chat, tempMsg];
    setChat(newChat);

    setIsUploading(true);

    try {
      let uploadedContent = "";

      // 1. Upload File if selected
      if (file) {
        const formData = new FormData();
        formData.append("file", file);

        const uploadRes = await fetch(`${API_URL}/upload`, {
          method: "POST",
          body: formData
        });
        const uploadJson = await uploadRes.json();

        if (uploadJson.type === "document") {
          uploadedContent = `\n\n[Analyzed Document Content]:\n${uploadJson.url}\n\n`;
        } else if (uploadJson.type === "image") {
          uploadedContent = ` [Image Uploaded: ${uploadJson.url}]`;
          fileData = uploadJson.url;
        }
      }

      setFile(null);
      setIsUploading(false);

      // 2. Determine Action
      const combinedMsg = userMsg + uploadedContent;
      let aiText = "Thinking...";
      let imageUrl = null;

      const lowerMsg = userMsg.toLowerCase();
      // Smarter Detection logic
      const imageRegex = /(generate|create|make|give|draw).*(image|picture|photo|art|img)/i;
      const isImageGen = lowerMsg.startsWith("/image") || imageRegex.test(lowerMsg);

      if (isImageGen) {
        // Cleaning prompt: Only remove the explicit slash command
        // We leave natural language (e.g., "draw a village") because FLUX understands it
        let prompt = userMsg.replace(/^\/image/i, "").trim();

        // If prompt implies a command without a slash, we just use the whole message
        // This prevents deleting keywords like "village" in "generate a village image"
        if (!prompt) prompt = userMsg;

        const r = await fetch(`${API_URL}/image`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: token },
          body: JSON.stringify({ prompt })
        });
        const d = await r.json();
        if (d.image) {
          imageUrl = d.image;
          aiText = "Here is your generated image:";
          speak("I have generated an image for you.");
        } else {
          aiText = "Sorry, image generation failed.";
          speak("Sorry, I could not generate the image.");
        }
      }
      // Image Editing Logic
      else if (file && /(make|turn|change|edit|transform|add|remove|convert)/i.test(userMsg)) {
        speak("Editing your image...");
        setChat(prev => [...prev, { role: "bot", text: "Editing image..." }]);

        const r = await fetch(`${API_URL}/edit-image`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: token },
          body: JSON.stringify({ image: fileData, prompt: userMsg })
        });
        const d = await r.json();

        if (d.image) {
          imageUrl = d.image;
          aiText = "Here is your edited image:";
          speak("I have applied your changes.");
          // Remove "Editing image..." loading msg
          setChat(prev => prev.slice(0, -1));
        } else {
          aiText = "Sorry, image editing failed.";
          speak("Sorry, I could not edit the image.");
          setChat(prev => prev.slice(0, -1));
        }

      } else {
        const response = await fetch(`${API_URL}/chat`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: token },
          body: JSON.stringify({ message: combinedMsg, mode, chatId: currentChatId, image: fileData, customRules })
        });

        // Streaming Logic
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let aiText = "";

        // Add empty bot message first
        setChat(prev => [...prev, { role: "bot", text: "" }]);

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value);
          const lines = chunk.split("\n");

          for (const line of lines) {
            if (line.startsWith("data: ")) {
              const dataStr = line.replace("data: ", "").trim();
              if (dataStr === "[DONE]") break;
              try {
                const data = JSON.parse(dataStr);
                const content = data.choices?.[0]?.delta?.content || "";
                if (content) {
                  aiText += content;
                  // Live Update
                  setChat(prev => {
                    const newChat = [...prev];
                    const lastMsg = newChat[newChat.length - 1];
                    if (lastMsg.role === "bot") {
                      lastMsg.text = aiText;
                    }
                    return newChat;
                  });
                }
              } catch (e) {
                // Ignore parse errors for partial chunks
              }
            }
          }
        }
        // Speak Result (Typewriter finished)
        speak(aiText);
      }

      // Streaming handles the setChat updates already.
      // We just need to save to history at the end.

      const updatedMessages = [...newChat, { role: "bot", text: aiText, image: imageUrl }]; // Wait, we can't use newChat here cleanly due to closure.
      // Let's rely on the final state of aiText for history saving.


      const savedUserMsg = await saveToHistory(userMsg + (file ? ` [Attached: ${file.name}]` : ""), "user", fileData, currentChatId);

      const activeId = currentChatId || savedUserMsg._id;
      if (activeId && !currentChatId) {
        setCurrentChatId(activeId);
        fetchChats();
      }
      await saveToHistory(aiText, "bot", imageUrl, activeId);

    } catch (e) {
      console.error(e);
      setChat((c) => [...c, { role: "bot", text: "Error: Could not connect to backend." }]);
      setIsUploading(false);
    }
  }

  async function saveToHistory(text, role, image = null, forceChatId = null) {
    try {
      const res = await fetch(`${API_URL}/api/chats`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: token },
        body: JSON.stringify({
          chatId: forceChatId,
          role,
          text,
          image
        })
      });
      return await res.json();
    } catch (e) {
      console.error("Failed to save chat");
      return {};
    }
  }

  const getThemeColor = (m) => {
    switch (m) {
      case "coding": return "#2563eb";
      case "idea": return "#eab308";
      case "placement": return "#9333ea";
      default: return "#10a37f";
    }
  };

  const themeColor = getThemeColor(mode);

  // Voice Mode Logic

  useEffect(() => {
    if ("webkitSpeechRecognition" in window || "SpeechRecognition" in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;

      recognitionRef.current.onresult = (event) => {
        let transcript = "";
        for (let i = event.resultIndex; i < event.results.length; i++) {
          transcript += event.results[i][0].transcript;
        }
        setMsg(prev => prev ? prev + " " + transcript : transcript);
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
      };
    }
  }, []);

  const toggleListening = () => {
    if (!recognitionRef.current) {
      alert("Voice input is not supported in this browser.");
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      recognitionRef.current.start();
      setIsListening(true);
      setMsg(""); // Clear input when starting fresh voice command? Or keep? Let's keep empty or append.
    }
  };

  return (
    <div className="app-container">
      {/* Context Menu */}
      {contextMenu.visible && (
        <div
          className="context-menu"
          style={{ top: contextMenu.y, left: contextMenu.x }}
        >
          <button className="context-item" onClick={renameChat}>
            <Pencil size={16} />
            <span>Rename</span>
          </button>
          <button className="context-item delete" onClick={deleteChat}>
            <Trash2 size={16} />
            <span>Delete Chat</span>
          </button>
        </div>
      )}

      {/* Settings Modal */}
      {isSettingsOpen && (
        <div className="modal-overlay" onClick={() => setIsSettingsOpen(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2><Settings size={20} /> Brain Settings</h2>
              <button className="close-btn" onClick={() => setIsSettingsOpen(false)}><X size={20} /></button>
            </div>
            <div className="modal-body">
              <label>Custom Instructions (System Rules)</label>
              <textarea
                placeholder='e.g., "Always speak in pirate style", "Be concise", "Explain like I am 5"'
                value={customRules}
                onChange={(e) => setCustomRules(e.target.value)}
                rows={6}
              />
              <p className="hint">These rules apply to all new messages.</p>
            </div>
          </div>
        </div>
      )}

      {/* Mobile/Toggle Button */}
      {!isSidebarOpen && (
        <button
          className="sidebar-toggle fixed"
          onClick={() => setIsSidebarOpen(true)}
          title="Open Sidebar"
        >
          <PanelLeftOpen size={20} />
        </button>
      )}

      {/* Sidebar */}
      <aside className={`sidebar ${isSidebarOpen ? 'open' : 'closed'}`}>
        <div className="sidebar-header">
          <button className="nav-item new-chat" onClick={startNewChat}>
            <MessageSquarePlus size={18} />
            <span>New chat</span>
          </button>
          <button
            className="sidebar-toggle"
            onClick={() => setIsSidebarOpen(false)}
            title="Close Sidebar"
          >
            <PanelLeftClose size={20} />
          </button>
        </div>

        <div className="sidebar-content">
          <div className="nav-group">
            <button className="nav-item">
              <Search size={18} />
              <span>Search chats</span>
            </button>
          </div>

          <div className="nav-group-header">Assistants</div>
          <div className="nav-group">
            {[
              { id: "normal", icon: Bot, label: "Normal Chat" },
              { id: "coding", icon: Code2, label: "Coding Chat" },
              { id: "idea", icon: Lightbulb, label: "Idea Chat" },
              { id: "placement", icon: Briefcase, label: "Placement Chat" }
            ].map((item) => (
              <button
                key={item.id}
                className={`nav-item ${mode === item.id ? "active" : ""}`}
                onClick={() => setMode(item.id)}
                style={mode === item.id ? { backgroundColor: "#2f2f2f", color: getThemeColor(item.id) } : {}}
              >
                <item.icon size={18} color={mode === item.id ? getThemeColor(item.id) : "currentColor"} />
                <span>{item.label}</span>
              </button>
            ))}
          </div>

          <div className="nav-group-header">Your Chats</div>
          <div className="nav-group history-list">
            {chats.length === 0 ? (
              <div style={{ padding: "0.5rem 0.75rem", color: "#666", fontSize: "0.85rem" }}>
                No history yet.
              </div>
            ) : (
              chats.map((c) => (
                <button
                  key={c._id}
                  className={`nav-item history-item ${currentChatId === c._id ? "active" : ""}`}
                  onClick={() => loadChat(c._id)}
                  onContextMenu={(e) => handleContextMenu(e, c._id)}
                >
                  <span className="history-title">{c.title}</span>
                </button>
              ))
            )}
          </div>
        </div>

        <div className="sidebar-footer">
          {isProfileOpen && (
            <div className="profile-menu">
              <button className="menu-item" onClick={() => { setIsSettingsOpen(true); setIsProfileOpen(false); }}>
                <Settings size={16} />
                <span>Custom Instructions</span>
              </button>
              <button className="menu-item" onClick={logout}>
                <LogOut size={16} />
                <span>Log out</span>
              </button>
            </div>
          )}
          <button
            className="nav-item user-profile"
            onClick={() => setIsProfileOpen(!isProfileOpen)}
          >
            <div className="user-avatar-sm">
              {user && user.username ? user.username.charAt(0).toUpperCase() : <User size={16} />}
            </div>
            <div className="user-info">
              <span className="user-name">{user && user.username ? user.username : "User"}</span>
              <span className="user-plan">Free Plan</span>
            </div>
          </button>
        </div>
      </aside>

      <main className="chat-area">
        <div className="messages-container">
          {chat.length === 0 ? (
            <div className="welcome-screen">
              <div className="logo-large" style={{ color: themeColor }}>
                {mode === "coding" && <Code2 size={48} />}
                {mode === "idea" && <Lightbulb size={48} />}
                {mode === "placement" && <Briefcase size={48} />}
                {mode === "normal" && <Sparkles size={48} />}
              </div>
              <h1>How can I help you with {mode === "normal" ? "anything" : mode}?</h1>
            </div>
          ) : (
            chat.map((c, i) => (
              <div key={i} className={`message ${c.role}`}>
                <div className="message-avatar">
                  {c.role === "user" ? (
                    <User size={20} />
                  ) : (
                    <Bot size={20} color={themeColor} />
                  )}
                </div>
                <div className="message-content">
                  {c.image ? (
                    <div className="image-result">
                      <img src={c.image} alt="Generated Art" />
                    </div>
                  ) : c.file ? (
                    <div className="file-display">
                      {c.file.type === "image" && c.file.url && <img src={c.file.url} alt={c.file.name} />}
                      <p>Attached: {c.file.name}</p>
                      {c.text && (
                        <ReactMarkdown
                          remarkPlugins={[remarkGfm]}
                          components={{ code: CodeBlock }}
                        >
                          {c.text}
                        </ReactMarkdown>
                      )}
                    </div>
                  ) : (
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm]}
                      components={{ code: CodeBlock }}
                    >
                      {c.text}
                    </ReactMarkdown>
                  )}
                </div>
              </div>
            ))
          )}
          <div ref={bottomRef} />
        </div>

        <div className="input-area">
          {/* File Preview */}
          {file && (
            <div className="file-preview">
              <span className="file-name">{file.name}</span>
              <button className="remove-file" onClick={removeFile}><X size={14} /></button>
            </div>
          )}

          <div className="input-container" style={{ borderColor: isSidebarOpen ? "" : themeColor }}>
            <label className="attach-btn" title="Upload Document or Image">
              <Paperclip size={20} />
              <input type="file" onChange={handleFileChange} style={{ display: "none" }} />
            </label>
            <input
              className="chat-input"
              value={msg}
              onKeyDown={(e) => e.key === "Enter" && send()}
              onChange={(e) => setMsg(e.target.value)}
              placeholder={isListening ? "Listening..." : (file ? "Ask about this file..." : `Message ${mode} assistant...`)}
            />
            {/* Voice Button */}
            <button
              className="attach-btn"
              onClick={toggleListening}
              style={{ color: isListening ? "#ff4b4b" : "#aaa", marginRight: "8px" }}
              title="Voice Input"
            >
              <Mic size={20} />
            </button>
            {/* TTS Toggle Button */}
            <button
              className="attach-btn"
              onClick={() => {
                const newState = !isTTSActive;
                if (!newState) window.speechSynthesis.cancel();
                setIsTTSActive(newState);
              }}
              style={{ color: isTTSActive ? themeColor : "#aaa", marginRight: "8px" }}
              title={isTTSActive ? "Mute Voice" : "Enable Voice"}
            >
              {isTTSActive ? <Volume2 size={20} /> : <VolumeX size={20} />}
            </button>

            <button
              className="send-btn"
              onClick={send}
              disabled={(!msg.trim() && !file) || isUploading}
              style={{ backgroundColor: themeColor }}
            >
              {isUploading ? "..." : "➤"}
            </button>
          </div>
          <div className="footer-text">
            Imman-GPT can make mistakes. Check important info.
          </div>
        </div>
      </main>
    </div>
  );
}
