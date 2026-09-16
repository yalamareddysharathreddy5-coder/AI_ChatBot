import { useEffect, useRef, useState } from 'react'
import './App.css'

const CHATS_KEY = 'sungpt-chats'
const PROJECTS_KEY = 'sungpt-projects'

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

function loadFromStorage(key) {
  try {
    return JSON.parse(localStorage.getItem(key)) || []
  } catch {
    return []
  }
}

function App() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [sidebarView, setSidebarView] = useState('chats')
  const [selectedProjectId, setSelectedProjectId] = useState(null)
  const [chats, setChats] = useState(() => loadFromStorage(CHATS_KEY))
  const [projects, setProjects] = useState(() => loadFromStorage(PROJECTS_KEY))
  const [newProjectName, setNewProjectName] = useState('')
  const [assignMenuFor, setAssignMenuFor] = useState(null)
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
      localStorage.setItem(CHATS_KEY, JSON.stringify(updated))
      return updated
    })

    return id
  }

  const persistProjects = (updated) => {
    localStorage.setItem(PROJECTS_KEY, JSON.stringify(updated))
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
    localStorage.removeItem(CHATS_KEY)
  }

  const handleOpenProjects = () => {
    setSidebarView('projects')
    setSelectedProjectId(null)
    setAssignMenuFor(null)
  }

  const handleBackToProjects = () => {
    setSelectedProjectId(null)
  }

  const handleBackToChats = () => {
    setSidebarView('chats')
  }

  const handleCreateProject = () => {
    const name = newProjectName.trim()
    if (!name) return
    const project = { id: crypto.randomUUID(), name, chatIds: [] }
    setProjects((prev) => {
      const updated = [...prev, project]
      persistProjects(updated)
      return updated
    })
    setNewProjectName('')
  }

  const toggleChatInProject = (chatId, projectId) => {
    setProjects((prev) => {
      const updated = prev.map((p) => {
        if (p.id !== projectId) return p
        const assigned = p.chatIds.includes(chatId)
        return {
          ...p,
          chatIds: assigned
            ? p.chatIds.filter((c) => c !== chatId)
            : [...p.chatIds, chatId],
        }
      })
      persistProjects(updated)
      return updated
    })
  }

  const getProjectById = (projectId) => projects.find((p) => p.id === projectId)
  const getChatById = (chatId) => chats.find((c) => c.id === chatId)

  const selectedProject = getProjectById(selectedProjectId)
  const projectChats = selectedProject
    ? selectedProject.chatIds.map(getChatById).filter(Boolean)
    : []

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

      {assignMenuFor && (
        <div className="menu-backdrop" onClick={() => setAssignMenuFor(null)} />
      )}

      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <span className="logo-icon">&#9728;</span>
          <h1 className="logo-text">SunGPT</h1>
        </div>

        {sidebarView === 'chats' && (
          <>
            <div className="sidebar-actions">
              <button className="new-chat-btn" onClick={handleNewChat}>
                + New Chat
              </button>
              <button className="projects-btn" onClick={handleOpenProjects}>
                Projects
              </button>
            </div>

            <div className="history-list">
              {chats.length === 0 ? (
                <p className="history-empty">No saved chats yet</p>
              ) : (
                [...chats].reverse().map((chat) => (
                  <div
                    key={chat.id}
                    className={`history-item${chat.id === activeChatId ? ' active' : ''}`}
                  >
                    <button
                      className="history-item-load"
                      onClick={() => handleLoadChat(chat.id)}
                    >
                      <span className="history-item-title">{chat.title}</span>
                      <span className="history-item-time">
                        {formatTime(chat.timestamp)}
                      </span>
                    </button>
                    <button
                      className="history-item-assign"
                      aria-label="Add to project"
                      onClick={() =>
                        setAssignMenuFor(assignMenuFor === chat.id ? null : chat.id)
                      }
                    >
                      +
                    </button>
                    {assignMenuFor === chat.id && (
                      <div className="assign-menu">
                        {projects.length === 0 ? (
                          <span className="assign-empty">No projects yet</span>
                        ) : (
                          projects.map((p) => (
                            <button
                              key={p.id}
                              className="assign-option"
                              onClick={() => toggleChatInProject(chat.id, p.id)}
                            >
                              <span className="assign-check">
                                {p.chatIds.includes(chat.id) ? '✓' : ''}
                              </span>
                              {p.name}
                            </button>
                          ))
                        )}
                        <button
                          className="assign-option"
                          onClick={() => {
                            setAssignMenuFor(null)
                            handleOpenProjects()
                          }}
                        >
                          + Create project
                        </button>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>

            {chats.length > 0 && (
              <button className="clear-history-btn" onClick={handleClearHistory}>
                Clear History
              </button>
            )}
          </>
        )}

        {sidebarView === 'projects' && !selectedProjectId && (
          <>
            <button className="back-btn" onClick={handleBackToChats}>
              &larr; Back to Chats
            </button>

            <div className="create-project-bar">
              <input
                type="text"
                className="create-project-input"
                placeholder="Project name..."
                value={newProjectName}
                onChange={(e) => setNewProjectName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleCreateProject()
                }}
              />
              <button className="create-project-btn" onClick={handleCreateProject}>
                Create
              </button>
            </div>

            <div className="project-list">
              {projects.length === 0 ? (
                <p className="project-empty">No projects yet</p>
              ) : (
                projects.map((p) => (
                  <button
                    key={p.id}
                    className="project-item"
                    onClick={() => setSelectedProjectId(p.id)}
                  >
                    <span className="project-item-name">{p.name}</span>
                    <span className="project-item-count">
                      {p.chatIds.length} chats
                    </span>
                  </button>
                ))
              )}
            </div>
          </>
        )}

        {sidebarView === 'projects' && selectedProject && (
          <>
            <button className="back-btn" onClick={handleBackToProjects}>
              &larr; All Projects
            </button>

            <h3 className="project-detail-header">{selectedProject.name}</h3>

            <div className="project-chat-list">
              {projectChats.length === 0 ? (
                <p className="project-empty">
                  No chats assigned. Use &ldquo;+&rdquo; on a history item to add one.
                </p>
              ) : (
                [...projectChats]
                  .reverse()
                  .map((chat) => (
                    <button
                      key={chat.id}
                      className="project-chat-item"
                      onClick={() => handleLoadChat(chat.id)}
                    >
                      <span className="history-item-title">{chat.title}</span>
                      <span className="history-item-time">
                        {formatTime(chat.timestamp)}
                      </span>
                    </button>
                  ))
              )}
            </div>
          </>
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
                <div key={message.id} className={`message ${message.role}`}>
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