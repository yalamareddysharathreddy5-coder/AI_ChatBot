import { useEffect, useRef, useState } from 'react'
import './App.css'

const STORAGE_KEY = 'sungpt-chats'

function getMockResponse() {
  return 'This is a canned SunGPT response. Ask me anything and I will act like a real assistant soon!'
}

function formatTime(timestamp) {
  const date = new Date(timestamp)
  const now = new Date()
  const diffDays = Math.floor((now - date) / 86400000)
  if (diffDays === 0) return 'Today'
  if (diffDays === 1) return 'Yesterday'
  if (diffDays < 7) return `${diffDays}d ago`
  return date.toLocaleDateString()
}

function App() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [chats, setChats] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY)) || []
    } catch {
      return []
    }
  })
  const [activeChatId, setActiveChatId] = useState(null)
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const idRef = useRef(0)
  const messagesEndRef = useRef(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const persistChat = (msgs, chatId) => {
    if (msgs.length === 0) return chatId

    const firstUserMsg = msgs.find((m) => m.role === 'user')?.content || 'New Chat'
    let id = chatId
    if (!id) id = crypto.randomUUID()

    setChats((prev) => {
      const existing = prev.find((c) => c.id === id)
      const updated = existing
        ? prev.map((c) => (c.id === id ? { ...c, title: firstUserMsg, messages: msgs } : c))
        : [...prev, { id, title: firstUserMsg, timestamp: Date.now(), messages: msgs }]
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
      return updated
    })

    return id
  }

  const handleSend = () => {
    const text = input.trim()
    if (!text) return

    const userMsg = { id: ++idRef.current, role: 'user', content: text }
    const assistantMsg = { id: ++idRef.current, role: 'assistant', content: getMockResponse() }
    const newMessages = [...messages, userMsg, assistantMsg]

    setMessages(newMessages)
    setInput('')

    const newId = persistChat(newMessages, activeChatId)
    if (newId !== activeChatId) setActiveChatId(newId)
  }

  const handleNewChat = () => {
    if (messages.length > 0) persistChat(messages, activeChatId)
    setMessages([])
    setInput('')
    setActiveChatId(null)
    idRef.current = 0
    setSidebarOpen(false)
  }

  const handleLoadChat = (chatId) => {
    if (messages.length > 0 && chatId !== activeChatId) {
      persistChat(messages, activeChatId)
    }
    const chat = chats.find((c) => c.id === chatId)
    if (chat) {
      setMessages(chat.messages)
      setActiveChatId(chatId)
      idRef.current = Math.max(0, ...chat.messages.map((m) => m.id))
    }
    setSidebarOpen(false)
  }

  const handleClearHistory = () => {
    if (!window.confirm('Delete all saved chats? This cannot be undone.')) return
    setChats([])
    setMessages([])
    setInput('')
    setActiveChatId(null)
    idRef.current = 0
    localStorage.removeItem(STORAGE_KEY)
  }

  return (
    <div className="app-layout">
      <button
        className="menu-toggle"
        onClick={() => setSidebarOpen(!sidebarOpen)}
        aria-label="Toggle sidebar"
      >
        &#9776;
      </button>

      {sidebarOpen && (
        <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} />
      )}

      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <span className="logo-icon">&#9728;</span>
          <h1 className="logo-text">SunGPT</h1>
        </div>

        <button className="new-chat-btn" onClick={handleNewChat}>+ New Chat</button>

        <div className="history-list">
          {chats.length === 0 ? (
            <p className="history-empty">No saved chats yet</p>
          ) : (
            [...chats]
              .reverse()
              .map((chat) => (
                <button
                  key={chat.id}
                  className={`history-item${chat.id === activeChatId ? ' active' : ''}`}
                  onClick={() => handleLoadChat(chat.id)}
                >
                  <span className="history-item-title">{chat.title}</span>
                  <span className="history-item-time">{formatTime(chat.timestamp)}</span>
                </button>
              ))
          )}
        </div>

        {chats.length > 0 && (
          <button className="clear-history-btn" onClick={handleClearHistory}>
            Clear History
          </button>
        )}
      </aside>

      <main className="chat-area">
        <div className="chat-window">
          <div className="messages">
            {messages.length === 0 ? (
              <div className="empty-state">
                <span className="empty-icon">&#9728;</span>
                <p>Start a conversation with SunGPT</p>
              </div>
            ) : (
              messages.map((message) => (
                <div
                  key={message.id}
                  className={`message ${message.role}`}
                >
                  {message.role === 'assistant' && (
                    <span className="message-label">SunGPT</span>
                  )}
                  <div className="bubble">{message.content}</div>
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>
          <div className="input-bar">
            <input
              type="text"
              className="chat-input"
              placeholder="Type a message..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSend()
              }}
            />
            <button className="send-btn" aria-label="Send" onClick={handleSend}>
              &#9654;
            </button>
          </div>
        </div>
      </main>
    </div>
  )
}

export default App
