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
  X
} from "lucide-react";
import "./App.css";

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
      const res = await fetch("http://localhost:5000/api/chats", {
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
      const res = await fetch(`http://localhost:5000/api/chats/${id}`, {
        headers: { Authorization: token }
      });
      const data = await res.json();
      setChat(data.messages);
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
      await fetch(`http://localhost:5000/api/chats/${id}`, {
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
      const res = await fetch(`http://localhost:5000/api/chats/${id}`, {
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

        const uploadRes = await fetch("http://localhost:5000/upload", {
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

        const r = await fetch("http://localhost:5000/image", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: token },
          body: JSON.stringify({ prompt })
        });
        const d = await r.json();
        if (d.image) {
          imageUrl = d.image;
          aiText = "Here is your generated image:";
        } else {
          aiText = "Sorry, image generation failed.";
        }
      } else {
        const r = await fetch("http://localhost:5000/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: token },
          body: JSON.stringify({ message: combinedMsg, mode })
        });
        const d = await r.json();
        aiText = d.reply;
      }

      const updatedMessages = [...newChat, { role: "bot", text: aiText, image: imageUrl }];
      setChat(updatedMessages);

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
      const res = await fetch("http://localhost:5000/api/chats", {
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
              {user ? user.username.charAt(0).toUpperCase() : <User size={16} />}
            </div>
            <div className="user-info">
              <span className="user-name">{user ? user.username : "User"}</span>
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
                      {c.text && <ReactMarkdown remarkPlugins={[remarkGfm]}>{c.text}</ReactMarkdown>}
                    </div>
                  ) : (
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
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
              placeholder={file ? "Ask about this file..." : `Message ${mode} assistant...`}
            />
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
