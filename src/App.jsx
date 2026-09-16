import { useEffect, useRef, useState } from 'react'
import './App.css'

function getMockResponse() {
  return 'This is a canned SunGPT response. Ask me anything and I will act like a real assistant soon!'
}

function App() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const idRef = useRef(0)
  const messagesEndRef = useRef(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSend = () => {
    const text = input.trim()
    if (!text) return

    idRef.current += 1
    setMessages((prev) => [
      ...prev,
      { id: idRef.current, role: 'user', content: text },
    ])
    setInput('')

    const assistantId = idRef.current + 1
    idRef.current += 1
    setMessages((prev) => [
      ...prev,
      { id: assistantId, role: 'assistant', content: getMockResponse() },
    ])
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
        <nav className="sidebar-nav">
          <button className="nav-item active">New Chat</button>
        </nav>
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