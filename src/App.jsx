import { useEffect, useRef, useState } from 'react'
import './App.css'

const CHATS_KEY = 'sungpt-chats'
const PROJECTS_KEY = 'sungpt-projects'
const REPLY_DELAY = 1500
const RAY_COUNT = 8

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

function getTimeOfDay(date = new Date()) {
  const hour = date.getHours()
  if (hour >= 5 && hour < 11) return 'morning'
  if (hour >= 11 && hour < 17) return 'afternoon'
  if (hour >= 17 && hour < 20) return 'evening'
  return 'night'
}

function SunLoader() {
  return (
    <div className="sun-loader" role="status" aria-label="SunGPT is thinking">
      <div className="sun-halo" />
      <div className="sun-core" />
      <div className="sun-rays">
        {Array.from({ length: RAY_COUNT }, (_, i) => (
          <span
            key={i}
            className="ray"
            style={{ '--i': i, '--angle': `${i * (360 / RAY_COUNT)}deg` }}
          />
        ))}
      </div>
    </div>
  )
}

const THEME_COPY = {
  morning: 'Good morning',
  afternoon: 'Good afternoon',
  evening: 'Good evening',
  night: 'Good night',
}

function SkyScene({ theme }) {
  const stars = Array.from({ length: 36 }, (_, i) => ({
    left: `${(i * 37) % 100}%`,
    top: `${((i * 53) % 46) + 2}%`,
    delay: `${((i * 0.13) % 1) * 2.4}s`,
    size: i % 5 === 0 ? 4 : 2.5,
  }))

  return (
    <div className={`welcome-sky ${theme}`}>
      <div className="sky-gradient" />
      <div className="horizon" />
      {theme === 'night' ? (
        <>
          <div className="stars">
            {stars.map((s, i) => (
              <span
                key={i}
                className="star"
                style={{
                  left: s.left,
                  top: s.top,
                  width: `${s.size}px`,
                  height: `${s.size}px`,
                  animationDelay: s.delay,
                }}
              />
            ))}
          </div>
          <div className="moon" />
        </>
      ) : (
        <div className="sky-sun">
          <div className="sun-rays" />
          <div className="sun" />
        </div>
      )}
      <div className="cloud cloud-one" />
      <div className="cloud cloud-two" />
      <div className="welcome-copy">
        <span className="welcome-logo">{theme === 'night' ? '\u263E' : '\u2600'}</span>
        <p className="welcome-title">Start a conversation with SunGPT</p>
        <p className="welcome-sub">{THEME_COPY[theme]}</p>
      </div>
    </div>
  )
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
  const [isThinking, setIsThinking] = useState(false)
  const [timeOfDay] = useState(() => getTimeOfDay())
  const idRef = useRef(0)
  const messagesRef = useRef([])
  const messagesEndRef = useRef(null)
  const replyTimerRef = useRef(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isThinking])

  useEffect(
    () => () => {
      if (replyTimerRef.current) clearTimeout(replyTimerRef.current)
    },
    [],
  )

  useEffect(() => {
    document.body.dataset.theme = timeOfDay
  }, [timeOfDay])

  const updateMessages = (msgs) => {
    messagesRef.current = msgs
    setMessages(msgs)
  }

  const clearPendingReply = () => {
    if (replyTimerRef.current) {
      clearTimeout(replyTimerRef.current)
      replyTimerRef.current = null
    }
    setIsThinking(false)
  }

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

    clearPendingReply()

    const userMsg = { id: ++idRef.current, role: 'user', content: text }
    const newMessages = [...messagesRef.current, userMsg]

    updateMessages(newMessages)
    setInput('')

    const chatId = persistChat(newMessages, activeChatId)
    if (chatId !== activeChatId) setActiveChatId(chatId)

    setIsThinking(true)
    replyTimerRef.current = setTimeout(() => {
      const assistantMsg = { id: ++idRef.current, role: 'assistant', content: getMockResponse() }
      const updated = [...messagesRef.current, assistantMsg]
      updateMessages(updated)
      persistChat(updated, chatId)
      setIsThinking(false)
      replyTimerRef.current = null
    }, REPLY_DELAY)
  }

  const handleNewChat = () => {
    clearPendingReply()
    if (messagesRef.current.length > 0) persistChat(messagesRef.current, activeChatId)
    updateMessages([])
    setInput('')
    setActiveChatId(null)
    idRef.current = 0
    setSidebarOpen(false)
  }

  const handleLoadChat = (chatId) => {
    clearPendingReply()
    if (messagesRef.current.length > 0 && chatId !== activeChatId) {
      persistChat(messagesRef.current, activeChatId)
    }
    const chat = chats.find((c) => c.id === chatId)
    if (chat) {
      updateMessages(chat.messages)
      setActiveChatId(chatId)
      idRef.current = Math.max(0, ...chat.messages.map((m) => m.id))
    }
    setSidebarOpen(false)
  }

  const handleClearHistory = () => {
    if (!window.confirm('Delete all saved chats? This cannot be undone.')) return
    clearPendingReply()
    setChats([])
    updateMessages([])
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
              <SkyScene theme={timeOfDay} />
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
            {isThinking && (
              <div className="message assistant">
                <span className="message-label">SunGPT</span>
                <SunLoader />
              </div>
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