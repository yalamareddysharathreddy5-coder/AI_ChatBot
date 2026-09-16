import { useState } from 'react'
import './App.css'

function App() {
  const [sidebarOpen, setSidebarOpen] = useState(false)

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
            <div className="empty-state">
              <span className="empty-icon">&#9728;</span>
              <p>Start a conversation with SunGPT</p>
            </div>
          </div>
          <div className="input-bar">
            <input
              type="text"
              className="chat-input"
              placeholder="Type a message..."
            />
            <button className="send-btn" aria-label="Send">&#9654;</button>
          </div>
        </div>
      </main>
    </div>
  )
}

export default App
