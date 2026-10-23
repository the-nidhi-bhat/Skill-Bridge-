import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import {
  ArrowDownRight, ArrowRight, ArrowUpRight, Bookmark, BriefcaseBusiness,
  Check, CheckCircle2, ChevronDown, CircleHelp, Clock3, Code2, Compass,
  Copy, FileText, Filter, GraduationCap, Heart, LayoutDashboard, LogOut, Map,
  Menu, Search, Settings2, Sparkles, X, MessageCircle, Moon, Sun, Upload, FileCheck2,
} from 'lucide-react'
import { calculateMatch, extractSkills, parseSkillList } from '../machineEngine.js'
import { generateRoadmap } from '../roadMap.js'
import { extractResumeText } from '../resumeParser.js'
import './App.css'

const API_BASE = import.meta.env.VITE_API_BASE || ''
const STORAGE = {
  token: 'skillbridge-token',
  demoSaved: 'skillbridge-demo-saved',
  previewAccounts: 'skillbridge-preview-accounts',
  profilePhotos: 'skillbridge-profile-photos',
}
const PREVIEW_DEMO = {
  email: 'demo@skillbridge.local',
  password: 'SkillBridgeDemo123!',
  name: 'Aarav Mehta',
  education: 'BCA student · second year',
  skills: ['Excel', 'SQL', 'Communication'],
}
const demoJobs = [
  {
    _id: 'preview-frontend', title: 'Frontend Developer Intern', company: 'WebWorks Studio',
    location: 'Remote', employmentType: 'Internship', experienceLevel: 'Fresher',
    description: 'Work with a small product team to turn thoughtful ideas into fast, accessible web experiences.',
    requiredSkills: ['HTML', 'CSS', 'JavaScript'], preferredSkills: ['React', 'Git'],
    minSalary: null, maxSalary: null, applicationUrl: '',
  },
  {
    _id: 'preview-analyst', title: 'Junior Data Analyst', company: 'Northstar Insights',
    location: 'Bengaluru', employmentType: 'Full-time', experienceLevel: 'Fresher',
    description: 'Help a friendly analytics team make everyday decisions easier with clear, reliable data.',
    requiredSkills: ['SQL', 'Excel', 'Statistics'], preferredSkills: ['Python', 'Power BI'],
    minSalary: 300000, maxSalary: 500000, applicationUrl: '',
  },
  {
    _id: 'preview-python', title: 'Associate Python Developer', company: 'Common Ground Tech',
    location: 'Hyderabad', employmentType: 'Full-time', experienceLevel: 'Entry-level',
    description: 'Build useful backend tools, learn from experienced engineers, and ship improvements in small steps.',
    requiredSkills: ['Python', 'SQL', 'Git'], preferredSkills: ['Node.js', 'MongoDB'],
    minSalary: 350000, maxSalary: 600000, applicationUrl: '',
  },
  {
    _id: 'preview-design', title: 'Product Design Intern', company: 'Little Signal',
    location: 'Pune', employmentType: 'Internship', experienceLevel: 'Fresher',
    description: 'Explore user needs, sketch options, and help make a useful product feel simple and welcoming.',
    requiredSkills: ['Communication', 'Figma'], preferredSkills: ['Research', 'Prototyping'],
    minSalary: null, maxSalary: null, applicationUrl: '',
  },
]

const navItems = [
  { id: 'home', label: 'Overview', icon: LayoutDashboard },
  { id: 'jobs', label: 'Find a role', icon: Compass },
  { id: 'saved', label: 'Saved roles', icon: Bookmark },
  { id: 'applications', label: 'Applications', icon: BriefcaseBusiness },
  { id: 'roadmap', label: 'Skill plan', icon: Map },
  { id: 'coach', label: 'Career coach', icon: MessageCircle },
]

const pageCopy = {
  home: { eyebrow: 'YOUR CAREER SPACE', title: 'A good next step starts here.', description: 'A little progress adds up. Let’s find work that fits where you are and where you want to go.' },
  jobs: { eyebrow: 'OPEN OPPORTUNITIES', title: 'Find a role that feels right.', description: 'Search at your pace. Start with what you know, and stay curious about what comes next.' },
  saved: { eyebrow: 'YOUR SHORTLIST', title: 'Keep the good ones close.', description: 'The roles you save stay here while you decide what feels like a fit.' },
  applications: { eyebrow: 'YOUR PROGRESS', title: 'Every application is a step.', description: 'See where things stand and keep your next move in view.' },
  roadmap: { eyebrow: 'GROW AT YOUR PACE', title: 'Build skills one step at a time.', description: 'A short, practical learning plan based on roles you’re interested in.' },
  coach: { eyebrow: 'A HELPFUL VOICE, WHEN YOU NEED ONE', title: 'Think it through with a coach.', description: 'Ask about a role, a skill, or what to do next. You stay in charge.' },
}

function readStorage(key, fallback) {
  try {
    const value = JSON.parse(localStorage.getItem(key))
    return value ?? fallback
  } catch {
    return fallback
  }
}

async function api(path, { token, ...options } = {}) {
  const method = options.method || 'GET'
  if (token?.startsWith('preview:')) return localPreviewAuth(path, { method, body: options.body, token })
  let response
  try {
    response = await fetch(`${API_BASE}/api${path}`, {
      ...options,
      headers: {
        ...(options.body ? { 'Content-Type': 'application/json' } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options.headers,
      },
      body: options.body ? JSON.stringify(options.body) : undefined,
    })
  } catch {
    if (path === '/auth/login' || path === '/auth/register') {
      return localPreviewAuth(path, { method, body: options.body })
    }
    throw new Error('Couldn’t reach SkillBridge. Check that the API is running, or keep exploring the preview.')
  }
  const contentType = response.headers.get('content-type') || ''
  const isAuthRequest = path === '/auth/login' || path === '/auth/register'
  if (!contentType.includes('application/json')) {
    // A static Vite deployment can rewrite unknown paths, including /api/*,
    // to index.html. Treat that response like an unavailable API so preview
    // sign-in and sign-up still use the browser-only account store.
    if (response.ok && isAuthRequest) {
      return localPreviewAuth(path, { method, body: options.body })
    }
    if (response.ok) {
      throw new Error('The SkillBridge API is not connected yet. You can keep exploring in preview mode.')
    }
  }
  const data = await response.json().catch(() => ({}))
  if (!response.ok && response.status >= 500 && (path === '/auth/login' || path === '/auth/register')) {
    return localPreviewAuth(path, { method, body: options.body })
  }
  if (!response.ok && response.status === 401 && path === '/auth/login' && hasPreviewAccount(options.body?.email)) {
    return localPreviewAuth(path, { method, body: options.body })
  }
  if (!response.ok) throw new Error(data.message || 'That didn’t work just now. Please try again.')
  return data
}

function readPreviewAccounts() {
  try { return JSON.parse(localStorage.getItem(STORAGE.previewAccounts) || '{}') }
  catch { return {} }
}

function hasPreviewAccount(email) {
  return Boolean(email && readPreviewAccounts()[email.trim().toLowerCase()])
}

function previewUser(account) {
  return { id: account.id, name: account.name, email: account.email, role: 'student', skills: account.skills || [], education: account.education || '', targetRole: account.targetRole || '', savedJobs: account.savedJobs || [] }
}

function Avatar({ name, photo, className = '' }) {
  return <span className={`avatar ${className}`.trim()} aria-hidden="true">
    {photo ? <img className="avatar-image" src={photo} alt="" /> : name?.trim()?.slice(0, 1)?.toUpperCase() || 'S'}
  </span>
}

function toBase64(bytes) {
  let binary = ''
  bytes.forEach((byte) => { binary += String.fromCharCode(byte) })
  return btoa(binary)
}

async function passwordDigest(password, salt) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits'])
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', salt, iterations: 120000, hash: 'SHA-256' }, key, 256)
  return new Uint8Array(bits)
}

async function localPreviewAuth(path, { method = 'GET', body = {}, token } = {}) {
  const accounts = readPreviewAccounts()
  const emailFromToken = token?.startsWith('preview:') ? decodeURIComponent(token.slice('preview:'.length)) : ''

  if (path === '/auth/register' && method === 'POST') {
    const name = body.name?.trim()
    const email = body.email?.trim().toLowerCase()
    if (!name || !email || typeof body.password !== 'string' || body.password.length < 8) {
      throw new Error('Enter your name, a valid email, and a password with at least 8 characters.')
    }
    if (accounts[email]) throw new Error('An account with this email already exists in this browser. Sign in instead.')
    const salt = crypto.getRandomValues(new Uint8Array(16))
    const digest = await passwordDigest(body.password, salt)
    const account = { id: `preview-${crypto.randomUUID()}`, name, email, salt: toBase64(salt), digest: toBase64(digest), skills: [], education: '', targetRole: body.targetRole?.trim() || '', savedJobs: [] }
    accounts[email] = account
    localStorage.setItem(STORAGE.previewAccounts, JSON.stringify(accounts))
    return { token: `preview:${encodeURIComponent(email)}`, user: previewUser(account), preview: true }
  }

  if (path === '/auth/login' && method === 'POST') {
    const email = body.email?.trim().toLowerCase()
    let account = accounts[email]
    if (email === PREVIEW_DEMO.email && body.password === PREVIEW_DEMO.password) {
      const salt = crypto.getRandomValues(new Uint8Array(16))
      const digest = await passwordDigest(PREVIEW_DEMO.password, salt)
      account = {
        id: 'preview-demo-student', name: PREVIEW_DEMO.name, email: PREVIEW_DEMO.email,
        salt: toBase64(salt), digest: toBase64(digest), education: PREVIEW_DEMO.education,
        targetRole: 'Data analyst', skills: PREVIEW_DEMO.skills, savedJobs: [],
      }
      accounts[email] = account
      localStorage.setItem(STORAGE.previewAccounts, JSON.stringify(accounts))
    }
    if (!account) throw new Error('No local preview account was found for this email. Create an account first.')
    const salt = Uint8Array.from(atob(account.salt), (character) => character.charCodeAt(0))
    const digest = await passwordDigest(body.password || '', salt)
    if (toBase64(digest) !== account.digest) throw new Error('That password doesn’t match this local preview account.')
    return { token: `preview:${encodeURIComponent(email)}`, user: previewUser(account), preview: true }
  }

  const account = accounts[emailFromToken]
  if (!account) throw new Error('This browser preview account could not be found. Please sign in again.')
  if (path === '/auth/me' && method === 'GET') return { user: previewUser(account), preview: true }
  if (path === '/auth/me' && method === 'PATCH') {
    if (typeof body.name === 'string') account.name = body.name.trim()
    if (typeof body.education === 'string') account.education = body.education.trim()
    if (typeof body.targetRole === 'string') account.targetRole = body.targetRole.trim()
    if (Array.isArray(body.skills)) account.skills = [...new Set(body.skills.map((skill) => skill.trim()).filter(Boolean))]
    accounts[account.email] = account
    localStorage.setItem(STORAGE.previewAccounts, JSON.stringify(accounts))
    return { user: previewUser(account), preview: true }
  }
  if (path === '/auth/me/saved-jobs' && method === 'PATCH') {
    account.savedJobs = body.jobIds || []
    accounts[account.email] = account
    localStorage.setItem(STORAGE.previewAccounts, JSON.stringify(accounts))
    return { user: previewUser(account), preview: true }
  }
  throw new Error('That action needs the SkillBridge API. Your local preview account is still saved in this browser.')
}

function BridgeMark() {
  const pathRef = useRef(null)
  const reduceMotion = useReducedMotion()

  useEffect(() => {
    if (!pathRef.current || reduceMotion) return undefined
    let animation
    let cancelled = false
    import('animejs').then(({ animate }) => {
      if (!cancelled && pathRef.current) animation = animate(pathRef.current, {
        strokeDashoffset: [130, 0], duration: 1150, ease: 'inOutSine',
      })
    })
    return () => { cancelled = true; animation?.pause() }
  }, [reduceMotion])

  return (
    <svg className="bridge-mark" viewBox="0 0 120 58" fill="none" aria-hidden="true">
      <path d="M7 45h24c11 0 13-29 29-29s18 29 29 29h24" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path ref={pathRef} className="bridge-trace" d="M7 45h24c11 0 13-29 29-29s18 29 29 29h24" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeDasharray="130" strokeDashoffset="130" />
      <circle cx="60" cy="16" r="4" fill="var(--accent)" />
    </svg>
  )
}

function Dialog({ title, children, onClose, size = 'normal' }) {
  const closeRef = useRef(null)
  const closeHandlerRef = useRef(onClose)
  useEffect(() => { closeHandlerRef.current = onClose }, [onClose])
  useEffect(() => {
    closeRef.current?.focus()
    const onKeyDown = (event) => {
      if (event.key === 'Escape') { closeHandlerRef.current(); return }
      if (event.key !== 'Tab') return
      const dialog = closeRef.current?.closest('[role="dialog"]')
      const focusable = [...(dialog?.querySelectorAll('a[href], button:not(:disabled), input:not(:disabled), textarea:not(:disabled), select:not(:disabled), [tabindex]:not([tabindex="-1"])') || [])]
        .filter((element) => element.offsetParent !== null)
      if (!focusable.length) return
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus() }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus() }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  return (
    <motion.div className="dialog-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <motion.section className={`dialog dialog-${size}`} role="dialog" aria-modal="true" aria-labelledby="dialog-title" initial={{ opacity: 0, y: 14, scale: 0.985 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 8 }} transition={{ duration: 0.2 }}>
        <div className="dialog-heading">
          <div><span className="section-kicker">SKILLBRIDGE</span><h2 id="dialog-title">{title}</h2></div>
          <button ref={closeRef} className="icon-button" aria-label="Close dialog" onClick={onClose}><X size={19} /></button>
        </div>
        {children}
      </motion.section>
    </motion.div>
  )
}

function AuthDialog({ onClose, onAuthenticated, announce, initialMode = 'login' }) {
  const [mode, setMode] = useState(initialMode)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [copiedField, setCopiedField] = useState('')
  const [form, setForm] = useState({ name: '', email: '', password: '', targetRole: '' })

  async function copyDemoField(field, value) {
    try {
      await navigator.clipboard.writeText(value)
      setCopiedField(field)
      window.setTimeout(() => setCopiedField(''), 1800)
    } catch {
      setForm((current) => ({ ...current, email: PREVIEW_DEMO.email, password: PREVIEW_DEMO.password }))
      announce('Demo details filled in. Select the fields to copy them.')
    }
  }

  async function submit(event) {
    event.preventDefault()
    setError('')
    setBusy(true)
    try {
      const authPath = `/auth/${mode === 'login' ? 'login' : 'register'}`
      const body = mode === 'login' ? { email: form.email, password: form.password } : { ...form, role: 'student' }
      const isDemoLogin = mode === 'login' && body.email.trim().toLowerCase() === PREVIEW_DEMO.email && body.password === PREVIEW_DEMO.password
      const data = isDemoLogin
        ? await localPreviewAuth(authPath, { method: 'POST', body })
        : await api(authPath, { method: 'POST', body })
      if (data.user.role !== 'student') {
        setError('This workspace is for student accounts. Recruiter tools are managed separately.')
        return
      }
      onAuthenticated(data.token, data.user)
      announce(`Welcome, ${data.user.name.split(' ')[0]}. You’re signed in.`)
      if (data.preview) announce('This preview account is saved in this browser only. Connect the API and database to sync it across devices.')
      onClose({ authenticated: true })
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog title={mode === 'login' ? 'Welcome back' : 'Make this space yours'} onClose={onClose}>
      <div className="auth-mode-switch" role="tablist" aria-label="Choose sign-in or sign-up">
        <button type="button" role="tab" aria-selected={mode === 'login'} className={mode === 'login' ? 'is-active' : ''} onClick={() => { setMode('login'); setError('') }}>Sign in</button>
        <button type="button" role="tab" aria-selected={mode === 'register'} className={mode === 'register' ? 'is-active' : ''} onClick={() => { setMode('register'); setError('') }}>Create account</button>
      </div>
      <p className="dialog-intro">{mode === 'login' ? 'Welcome back. Your next step is right where you left it.' : 'Create a free student account to save roles and shape your career plan.'}</p>
      <form className="form-stack" onSubmit={submit}>
        {mode === 'register' && <label>Your name<input name="name" autoComplete="name" required maxLength={100} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="What should we call you?" /></label>}
        {mode === 'register' && <label>Role you’re curious about <span className="optional-label">Optional</span><input name="targetRole" maxLength={160} value={form.targetRole} onChange={(e) => setForm({ ...form, targetRole: e.target.value })} placeholder="e.g. Data analyst, UX designer" /></label>}
        <label>Email address<input name="email" type="email" autoComplete="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="you@example.com" /></label>
        <label>Password<input name="password" type="password" autoComplete={mode === 'login' ? 'current-password' : 'new-password'} minLength={8} required value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="At least 8 characters" /></label>
        {mode === 'register' && <p className="auth-field-hint">Use at least 8 characters. You can add skills and your target role after signing up.</p>}
        {error && <p className="form-error" role="alert">{error}</p>}
        <button className="button button-primary button-full" disabled={busy}>{busy ? 'One moment…' : mode === 'login' ? 'Sign in' : 'Create my account'}<ArrowRight size={17} /></button>
      </form>
      {mode === 'login' && <aside className="demo-login-card" aria-label="Student demo account">
        <div className="demo-login-heading"><span className="demo-login-mark"><Sparkles size={16} /></span><div><strong>Want to look around first?</strong><span>Try the student demo workspace.</span></div></div>
        <div className="demo-credential-row"><span>Email</span><code>{PREVIEW_DEMO.email}</code><button type="button" aria-label="Copy demo email" onClick={() => copyDemoField('email', PREVIEW_DEMO.email)}>{copiedField === 'email' ? 'Copied' : <Copy size={14} />}</button></div>
        <div className="demo-credential-row"><span>Password</span><code>{PREVIEW_DEMO.password}</code><button type="button" aria-label="Copy demo password" onClick={() => copyDemoField('password', PREVIEW_DEMO.password)}>{copiedField === 'password' ? 'Copied' : <Copy size={14} />}</button></div>
        <button className="demo-account-button" type="button" onClick={() => { setForm({ name: '', email: PREVIEW_DEMO.email, password: PREVIEW_DEMO.password }); setError('') }}>Fill sign-in details <ArrowRight size={14} /></button>
        <p>Preview data stays in this browser. Applications need a connected account.</p>
      </aside>}
      {mode === 'register' && <p className="auth-signup-note"><CheckCircle2 size={15} /> No resume required. Start with what you know and update your profile any time.</p>}
      <p className="privacy-note"><CircleHelp size={14} /> Your profile is used to personalize your role matches and skill plan.</p>
    </Dialog>
  )
}

function ProfileDialog({ user, token, photo, onPhotoChange, onClose, onUpdated }) {
  const [name, setName] = useState(user.name || '')
  const [education, setEducation] = useState(user.education || '')
  const [targetRole, setTargetRole] = useState(user.targetRole || '')
  const [skills, setSkills] = useState((user.skills || []).join(', '))
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [resumeMessage, setResumeMessage] = useState('')
  const [resumeFileName, setResumeFileName] = useState('')
  const [resumeBusy, setResumeBusy] = useState(false)
  const [photoError, setPhotoError] = useState('')
  const [photoBusy, setPhotoBusy] = useState(false)
  const chosenSkills = parseSkillList(skills)
  const checklist = [Boolean(name.trim()), Boolean(targetRole.trim()), Boolean(education.trim()), chosenSkills.length > 0]
  const completion = Math.round(checklist.filter(Boolean).length / checklist.length * 100)

  async function readPhoto(file) {
    setPhotoError('')
    if (!file.type.startsWith('image/')) { setPhotoError('Choose an image file such as JPG, PNG, or WebP.'); return }
    if (file.size > 5 * 1024 * 1024) { setPhotoError('Choose an image smaller than 5 MB.'); return }
    setPhotoBusy(true)
    let imageUrl
    try {
      imageUrl = URL.createObjectURL(file)
      const image = new Image()
      await new Promise((resolve, reject) => {
        image.onload = resolve
        image.onerror = () => reject(new Error('This image could not be opened. Try another one.'))
        image.src = imageUrl
      })
      const size = 360
      const scale = Math.min(size / image.naturalWidth, size / image.naturalHeight, 1)
      const canvas = document.createElement('canvas')
      canvas.width = Math.max(1, Math.round(image.naturalWidth * scale))
      canvas.height = Math.max(1, Math.round(image.naturalHeight * scale))
      canvas.getContext('2d').drawImage(image, 0, 0, canvas.width, canvas.height)
      const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.82))
      if (!blob) throw new Error('This image could not be prepared. Try another one.')
      const reader = new FileReader()
      const dataUrl = await new Promise((resolve, reject) => {
        reader.onload = () => resolve(reader.result)
        reader.onerror = () => reject(new Error('This image could not be saved. Try another one.'))
        reader.readAsDataURL(blob)
      })
      onPhotoChange(dataUrl)
    } catch (readError) { setPhotoError(readError.message) }
    finally { if (imageUrl) URL.revokeObjectURL(imageUrl); setPhotoBusy(false) }
  }

  async function readResume(file) {
    setError('')
    setResumeMessage('')
    setResumeFileName(file.name)
    setResumeBusy(true)
    try {
      const text = await extractResumeText(file)
      const detected = extractSkills(text)
      if (!detected.length) {
        setResumeFileName('')
        setError('I couldn’t find a supported skill in that file. You can still enter skills yourself.')
        return
      }
      setSkills([...new Set([...parseSkillList(skills), ...detected])].join(', '))
      setResumeMessage(`${detected.length} ${detected.length === 1 ? 'skill' : 'skills'} found. Review them before saving.`)
    } catch (readError) { setResumeFileName(''); setError(readError.message) }
    finally { setResumeBusy(false) }
  }

  async function submit(event) {
    event.preventDefault()
    setBusy(true)
    setError('')
    try {
      const data = await api('/auth/me', { token, method: 'PATCH', body: { name, education, targetRole, skills: chosenSkills } })
      onUpdated(data.user)
      onClose()
    } catch (requestError) { setError(requestError.message) } finally { setBusy(false) }
  }

  return <Dialog title="Build your career profile" onClose={onClose} size="wide">
    <div className="profile-editor-summary">
      <Avatar name={name} photo={photo} className="profile-editor-avatar" />
      <div className="profile-editor-summary-copy"><strong>{name.trim() || 'Your profile'}</strong><span>{targetRole.trim() || 'Add a role you’re curious about'}</span></div>
      <div className="profile-editor-score"><strong>{completion}%</strong><span>complete</span></div>
      <div className="profile-editor-track" role="progressbar" aria-valuenow={completion} aria-valuemin="0" aria-valuemax="100" aria-label="Profile completion"><span style={{ width: `${completion}%` }} /></div>
    </div>
    <div className="profile-photo-control">
      <Avatar name={name} photo={photo} className="profile-photo-preview" />
      <div className="profile-photo-copy"><strong>Make this space yours</strong><span>Your photo stays in this browser and is resized before saving.</span><div className="profile-photo-actions"><label className="photo-upload-button">{photoBusy ? 'Preparing photo…' : 'Choose a photo'}<input type="file" accept="image/*" aria-label="Choose a profile photo" disabled={photoBusy} onChange={(event) => { const file = event.target.files?.[0]; if (file) readPhoto(file); event.target.value = '' }} /></label>{photo && <button type="button" className="photo-remove-button" onClick={() => { onPhotoChange(''); setPhotoError('') }}>Remove</button>}</div></div>
      {photoError && <p className="form-error" role="alert">{photoError}</p>}
    </div>
    <p className="dialog-intro">A little context helps SkillBridge connect your strengths to roles and suggest a useful next step. You can change this any time.</p>
    <form className="form-stack profile-form" onSubmit={submit}>
      <div className="profile-form-grid">
        <label>Your name<input name="name" autoComplete="name" required maxLength={100} value={name} onChange={(e) => setName(e.target.value)} placeholder="What should we call you?" /></label>
        <label>Current study or focus<input name="education" value={education} onChange={(e) => setEducation(e.target.value)} placeholder="e.g. BCA, second year" /></label>
      </div>
      <label>What kind of role interests you?<input name="targetRole" maxLength={160} value={targetRole} onChange={(e) => setTargetRole(e.target.value)} placeholder="e.g. Data analyst, product designer" /><span className="field-hint">This helps tailor your coach conversations and career direction.</span></label>
      <label>Skills you can build on<textarea name="skills" rows="3" value={skills} onChange={(e) => setSkills(e.target.value)} placeholder="Try SQL, Excel, communication, or JavaScript" /><span className="field-hint">Separate skills with commas. Add what you know today, even if you’re still learning.</span></label>
      {chosenSkills.length > 0 && <div className="profile-skill-preview" aria-label="Skills added to your profile">{chosenSkills.map((skill) => <span key={skill}>{skill}</span>)}</div>}
      <div className="resume-upload-field">
        <span className="resume-upload-label">Find skills in a resume <span className="optional-label">Optional</span></span>
        <label className={`resume-picker ${resumeBusy ? 'is-reading' : ''}`} htmlFor="resume-file">
          <span className="resume-picker-icon">{resumeBusy ? <Sparkles size={19} /> : resumeFileName ? <FileCheck2 size={19} /> : <Upload size={19} />}</span>
          <span className="resume-picker-copy" aria-live="polite" aria-atomic="true"><strong>{resumeBusy ? 'Reading your resume…' : resumeFileName || 'Choose a resume'}</strong><small>{resumeBusy ? 'Looking for skills on this device' : 'PDF or text file · up to 5 MB · scanned PDFs need OCR'}</small></span>
          <span className="resume-browse">Browse</span>
          <input id="resume-file" className="resume-file-input" type="file" accept=".txt,.pdf,application/pdf,text/plain" aria-label="Choose a PDF or text resume" disabled={resumeBusy} onChange={(event) => { const file = event.target.files?.[0]; if (file) readResume(file); event.target.value = '' }} />
        </label>
        <p className="resume-privacy-note">Your resume is read in this browser and isn’t uploaded. Check detected skills before saving your profile.</p>
      </div>
      {resumeMessage && <p className="resume-message" role="status">{resumeMessage}</p>}
      {error && <p className="form-error" role="alert">{error}</p>}
      <div className="profile-form-footer"><span><CheckCircle2 size={15} /> Add just what you’re comfortable sharing.</span><button className="button button-primary" disabled={busy || resumeBusy}>{busy ? 'Saving…' : resumeBusy ? 'Reading resume…' : 'Save profile'}<Check size={17} /></button></div>
    </form>
  </Dialog>
}

function ApplyDialog({ job, onClose, onApply, busy, error }) {
  const [coverLetter, setCoverLetter] = useState('')
  return <Dialog title="Take the next step" onClose={onClose}><p className="dialog-intro">You’re applying for <strong>{job.title}</strong> at {job.company}. Add a short note if you’d like; you can keep it simple.</p><form className="form-stack" onSubmit={(event) => { event.preventDefault(); onApply(coverLetter) }}><label>Note to the hiring team <span className="optional-label">Optional</span><textarea rows="5" maxLength={2000} value={coverLetter} onChange={(e) => setCoverLetter(e.target.value)} placeholder="What interested you about this role?" /></label>{error && <p className="form-error" role="alert">{error}</p>}<button className="button button-primary button-full" disabled={busy}>{busy ? 'Sending your application…' : 'Send application'}<ArrowUpRight size={17} /></button></form><p className="privacy-note"><FileText size={14} /> Your application is saved to your SkillBridge account.</p></Dialog>
}

function DashboardApp({ theme, setTheme }) {
  const reduceMotion = useReducedMotion()
  const appRef = useRef(null)
  const scrollBarRef = useRef(null)
  const mobileNavRef = useRef(null)
  const mobileNavButtonRef = useRef(null)
  const mobileNavWasOpen = useRef(false)
const [page, setPage] = useState(() => {
    const requested = new URLSearchParams(window.location.search).get('view')
    return pageCopy[requested] ? requested : 'home'
  })
  const [jobs, setJobs] = useState([])
  const [applications, setApplications] = useState([])
  const [user, setUser] = useState(null)
  const [profilePhoto, setProfilePhoto] = useState('')
  const [token, setToken] = useState(() => sessionStorage.getItem(STORAGE.token) || '')
  const [savedIds, setSavedIds] = useState(() => readStorage(STORAGE.demoSaved, []))
  const [demoMode, setDemoMode] = useState(false)
  const [jobsLoading, setJobsLoading] = useState(true)
  const [authChecking, setAuthChecking] = useState(Boolean(sessionStorage.getItem(STORAGE.token)))
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('All types')
  const [locationFilter, setLocationFilter] = useState('')
  const [sortOrder, setSortOrder] = useState('Best fit')
  const [mobileNav, setMobileNav] = useState(false)
  const [smallScreen, setSmallScreen] = useState(() => window.matchMedia('(max-width: 820px)').matches)
  const [dialog, setDialog] = useState(() => new URLSearchParams(window.location.search).has('auth') ? 'auth' : '')
  const [selectedJob, setSelectedJob] = useState(null)
  const [pendingJob, setPendingJob] = useState(null)
  const [applyBusy, setApplyBusy] = useState(false)
  const [dialogError, setDialogError] = useState('')
  const [notice, setNotice] = useState('')
  const [noticeKind, setNoticeKind] = useState('success')
  const [coachQuestion, setCoachQuestion] = useState('')
  const [coachAnswer, setCoachAnswer] = useState('')
  const [coachBusy, setCoachBusy] = useState(false)
  const [coachError, setCoachError] = useState('')
  const profilePhotoKey = user?.id || user?._id || user?.email || ''

  useEffect(() => {
    const photos = readStorage(STORAGE.profilePhotos, {})
    setProfilePhoto(profilePhotoKey ? photos[profilePhotoKey] || '' : '')
  }, [profilePhotoKey])

  const announce = useCallback((message, kind = 'success') => {
    setNotice(message)
    setNoticeKind(kind)
    window.clearTimeout(announce.timeout)
    announce.timeout = window.setTimeout(() => setNotice(''), 5000)
  }, [])

  const loadJobs = useCallback(async () => {
    setJobsLoading(true)
    try {
      const data = await api('/jobs?limit=50')
      if (!Array.isArray(data.jobs)) throw new Error('The jobs service returned an unexpected response.')
      setJobs(data.jobs || [])
      setDemoMode(false)
    } catch {
      setJobs(demoJobs)
      setDemoMode(true)
    } finally { setJobsLoading(false) }
  }, [])

  const loadApplications = useCallback(async (activeToken) => {
    if (!activeToken) { setApplications([]); return }
    if (activeToken.startsWith('preview:')) { setApplications([]); return }
    try {
      const data = await api('/applications/mine', { token: activeToken })
      setApplications(data.applications || [])
    } catch (error) { announce(error.message, 'error') }
  }, [announce])

  useEffect(() => { loadJobs() }, [loadJobs])

  useEffect(() => {
    if (!token) { setUser(null); setAuthChecking(false); return }
    let cancelled = false
    api('/auth/me', { token }).then(({ user: currentUser }) => {
      if (cancelled) return
      setUser(currentUser)
      setSavedIds(currentUser.savedJobs || [])
      loadApplications(token)
    }).catch(() => {
      sessionStorage.removeItem(STORAGE.token)
      if (!cancelled) { setToken(''); setUser(null); announce('Your session ended. Sign in again when you’re ready.', 'error') }
    }).finally(() => { if (!cancelled) setAuthChecking(false) })
    return () => { cancelled = true }
  }, [token, loadApplications, announce])

  useEffect(() => {
    const onPopState = () => {
      const nextPage = new URLSearchParams(window.location.search).get('view') || 'home'
      if (pageCopy[nextPage]) setPage(nextPage)
    }
    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }, [])

  useEffect(() => {
    const media = window.matchMedia('(max-width: 820px)')
    const update = () => setSmallScreen(media.matches)
    media.addEventListener('change', update)
    return () => media.removeEventListener('change', update)
  }, [])

  useEffect(() => {
    if (!appRef.current || !scrollBarRef.current) return undefined
    if (reduceMotion) { scrollBarRef.current.style.transform = 'scaleX(0)'; return undefined }
    let context
    let cancelled = false
    Promise.all([import('gsap'), import('gsap/ScrollTrigger')]).then(([gsapModule, triggerModule]) => {
      if (cancelled || !scrollBarRef.current) return
      const gsap = gsapModule.gsap
      gsap.registerPlugin(triggerModule.ScrollTrigger)
      context = gsap.context(() => {
        gsap.to(scrollBarRef.current, {
          scaleX: 1, ease: 'none',
          scrollTrigger: { trigger: document.documentElement, start: 'top top', end: 'bottom bottom', scrub: 0.25 },
        })
      }, appRef)
    })
    return () => { cancelled = true; context?.revert() }
  }, [reduceMotion, jobs.length, page])

  useEffect(() => {
    if (!mobileNav) {
      if (mobileNavWasOpen.current) {
        mobileNavWasOpen.current = false
        mobileNavButtonRef.current?.focus()
      }
      return undefined
    }
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    mobileNavWasOpen.current = true
    const frame = window.requestAnimationFrame(() => mobileNavRef.current?.querySelector('a, button')?.focus())
    const onKeyDown = (event) => {
      if (event.key === 'Escape') { setMobileNav(false); return }
      if (event.key !== 'Tab') return
      const focusable = [...(mobileNavRef.current?.querySelectorAll('a[href], button:not(:disabled)') || [])]
      if (!focusable.length) return
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus() }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus() }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => {
      window.cancelAnimationFrame(frame)
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [mobileNav])

  const currentSavedIds = user ? (user.savedJobs || savedIds) : savedIds
  const studentSkills = user?.skills || []
  const matchedJobs = useMemo(() => jobs.map((job) => ({ job, match: calculateMatch(studentSkills, job.requiredSkills || []) }))
    .sort((a, b) => b.match.score - a.match.score), [jobs, studentSkills])

  const visibleJobs = useMemo(() => {
    const query = search.trim().toLowerCase()
    let list = matchedJobs.filter(({ job }) => {
      if (page === 'saved' && !currentSavedIds.includes(job._id)) return false
      const searchable = [job.title, job.company, job.location, job.description, ...(job.requiredSkills || []), ...(job.preferredSkills || [])].join(' ').toLowerCase()
      const matchesQuery = !query || searchable.includes(query)
      const matchesType = typeFilter === 'All types' || job.employmentType === typeFilter
      const matchesLocation = !locationFilter.trim() || (job.location || '').toLowerCase().includes(locationFilter.trim().toLowerCase())
      return matchesQuery && matchesType && matchesLocation
    })
    if (query) {
      const relevance = (job) => job.title?.toLowerCase().includes(query) ? 0 : job.company?.toLowerCase().includes(query) ? 1 : 2
      list = [...list].sort((a, b) => relevance(a.job) - relevance(b.job) || b.match.score - a.match.score)
    }
    if (sortOrder === 'Newest') list = [...list].sort((a, b) => Date.parse(b.job.createdAt || 0) - Date.parse(a.job.createdAt || 0))
    return list
  }, [matchedJobs, page, currentSavedIds, search, typeFilter, locationFilter, sortOrder])

  const missingSkills = useMemo(() => {
    const top = matchedJobs[0]
    if (!top || !studentSkills.length) return []
    return top.match.missingSkills.slice(0, 5)
  }, [matchedJobs, studentSkills])
  const roadmap = useMemo(() => generateRoadmap(missingSkills), [missingSkills])
  const profileFields = [Boolean(user?.name), Boolean(user?.targetRole), Boolean(user?.education), studentSkills.length > 0]
  const profilePercent = Math.round(profileFields.filter(Boolean).length / profileFields.length * 100)

  function navigate(nextPage) {
    if (!pageCopy[nextPage]) return
    setPage(nextPage)
    setMobileNav(false)
    const url = new URL(window.location.href)
    nextPage === 'home' ? url.searchParams.delete('view') : url.searchParams.set('view', nextPage)
    window.history.pushState({ page: nextPage }, '', url)
    window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' })
  }

  function saveSession(nextToken, nextUser) {
    sessionStorage.setItem(STORAGE.token, nextToken)
    setToken(nextToken)
    setUser(nextUser)
    setSavedIds(nextUser.savedJobs || [])
    if (nextToken.startsWith('preview:')) setApplications([])
    else loadApplications(nextToken)
  }

  async function toggleSave(job) {
    if (token.startsWith('preview:') && user) {
      const next = currentSavedIds.includes(job._id) ? currentSavedIds.filter((id) => id !== job._id) : [...currentSavedIds, job._id]
      try {
        const data = await api('/auth/me/saved-jobs', { token, method: 'PATCH', body: { jobIds: next } })
        setUser(data.user)
        setSavedIds(data.user.savedJobs || [])
        announce(next.includes(job._id) ? 'Saved for later.' : 'Removed from your saved roles.')
      } catch (error) { announce(error.message, 'error') }
      return
    }
    if (demoMode || !user) {
      const next = currentSavedIds.includes(job._id) ? currentSavedIds.filter((id) => id !== job._id) : [...currentSavedIds, job._id]
      setSavedIds(next)
      localStorage.setItem(STORAGE.demoSaved, JSON.stringify(next))
      announce(next.includes(job._id) ? 'Saved for later.' : 'Removed from your saved roles.')
      return
    }
    const next = currentSavedIds.includes(job._id) ? currentSavedIds.filter((id) => id !== job._id) : [...currentSavedIds, job._id]
    try {
      const data = await api('/auth/me/saved-jobs', { token, method: 'PATCH', body: { jobIds: next } })
      setUser(data.user)
      setSavedIds(data.user.savedJobs || [])
      announce(next.includes(job._id) ? 'Saved for later.' : 'Removed from your saved roles.')
    } catch (error) { announce(error.message, 'error') }
  }

  function startApply(job) {
    if (!user) { setPendingJob(job); setSelectedJob(null); setDialog('auth'); return }
    setDialogError('')
    setSelectedJob(job)
    setDialog('apply')
  }

  async function submitApplication(coverLetter) {
    setApplyBusy(true)
    setDialogError('')
    try {
      await api('/applications', { token, method: 'POST', body: { jobId: selectedJob._id, coverLetter } })
      await loadApplications(token)
      setDialog('')
      setSelectedJob(null)
      announce('Your application is in. Good luck — you’ve got this.')
    } catch (error) { setDialogError(error.message) } finally { setApplyBusy(false) }
  }

  async function askCoach(event) {
    event.preventDefault()
    if (!coachQuestion.trim()) return
    setCoachBusy(true)
    setCoachError('')
    setCoachAnswer('')
    try {
      const data = await api('/ai/mentor', { method: 'POST', body: { question: coachQuestion.trim(), skills: studentSkills, targetRole: search || user?.targetRole || 'early-career role' } })
      setCoachAnswer(data.answer || 'I couldn’t find an answer just now. Try asking in another way.')
    } catch (error) {
      setCoachError(error.message.includes('not configured') ? 'Your career coach is ready, but Gemini has not been connected yet. Add GEMINI_API_KEY to the server .env file to turn on replies.' : error.message)
    } finally { setCoachBusy(false) }
  }

  function signOut() {
    sessionStorage.removeItem(STORAGE.token)
    setToken(''); setUser(null); setApplications([]); setSavedIds(readStorage(STORAGE.demoSaved, []))
    announce('You’re signed out. Your demo shortlist is still here.')
  }

  function saveProfilePhoto(nextPhoto) {
    if (!profilePhotoKey) return
    const photos = readStorage(STORAGE.profilePhotos, {})
    try {
      if (nextPhoto) photos[profilePhotoKey] = nextPhoto
      else delete photos[profilePhotoKey]
      localStorage.setItem(STORAGE.profilePhotos, JSON.stringify(photos))
      setProfilePhoto(nextPhoto)
      announce(nextPhoto ? 'Your profile photo is saved on this device.' : 'Your profile photo was removed.')
    } catch {
      announce('This browser is out of storage space. Remove an older photo and try again.', 'error')
    }
  }

  const title = pageCopy[page] || pageCopy.home
  const stats = [
    { label: 'Roles to explore', value: jobs.length, icon: Compass, note: demoMode ? 'Preview listings' : 'Open right now' },
    { label: 'In your shortlist', value: currentSavedIds.length, icon: Bookmark, note: 'Take your time' },
    { label: 'Applications sent', value: applications.length, icon: FileText, note: 'One step at a time' },
  ]
  const momentumSteps = [
    { title: 'Add your strengths', detail: studentSkills.length ? `${studentSkills.length} skills in your profile` : 'Start with skills you already use', done: studentSkills.length > 0, icon: GraduationCap, action: () => user ? setDialog('profile') : setDialog('auth') },
    { title: 'Save a role that feels right', detail: currentSavedIds.length ? `${currentSavedIds.length} role${currentSavedIds.length === 1 ? '' : 's'} in your shortlist` : 'Keep a possibility close for later', done: currentSavedIds.length > 0, icon: Bookmark, action: () => navigate('jobs') },
    { title: 'Explore one skill to grow', detail: roadmap.length ? `${roadmap.length} practical next step${roadmap.length === 1 ? '' : 's'} ready` : 'Find a gentle next step from open roles', done: false, icon: Map, action: () => navigate('roadmap') },
  ]

  return (
    <div className="app-shell" ref={appRef}>
      <div className="scroll-progress" aria-hidden="true"><span ref={scrollBarRef} /></div>
      <a className="skip-link" href="#main-content">Skip to content</a>
      <div className="workspace">
        <AnimatePresence>{mobileNav && <motion.button className="mobile-scrim" aria-label="Close navigation" onClick={() => setMobileNav(false)} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} />}</AnimatePresence>
        <motion.aside ref={mobileNavRef} className={`sidebar ${mobileNav ? 'sidebar-open' : ''}`} aria-label="Main navigation" inert={smallScreen && !mobileNav} initial={false}>
          <a className="brand" href="/dashboard" onClick={(event) => { event.preventDefault(); navigate('home') }}><span className="brand-icon"><BridgeMark /></span><span>skillbridge<span className="brand-period">.</span></span></a>
          <div className="sidebar-intro"><p>A little direction<br />goes a long way.</p><span>Find your next step, not just your next job.</span></div>
          <p className="nav-heading">YOUR SPACE</p>
          <nav className="nav-list">
            {navItems.map(({ id, label, icon: Icon }) => (
              <a key={id} href={id === 'home' ? '/' : `/?view=${id}`} className={`nav-item ${page === id ? 'active' : ''}`} aria-current={page === id ? 'page' : undefined} onClick={(event) => { event.preventDefault(); navigate(id) }}>
                <Icon size={18} strokeWidth={1.8} /><span>{label}</span>{id === 'saved' && currentSavedIds.length > 0 && <span className="nav-count">{currentSavedIds.length}</span>}
              </a>
            ))}
          </nav>
          <div className="sidebar-note"><span className="note-icon"><Heart size={17} /></span><p>There’s no perfect path.<br /><strong>Just your next one.</strong></p><ArrowDownRight size={17} className="note-arrow" /></div>
          <div className="sidebar-account">
            <Avatar name={user?.name} photo={profilePhoto} className="avatar-small" />
            <div className="account-copy"><strong>{user?.name || 'Your workspace'}</strong><span>{user ? 'Student account' : demoMode ? 'Preview mode' : 'Getting your space ready'}</span></div>
            {user ? <button className="account-action" aria-label="Sign out" title="Sign out" onClick={signOut}><LogOut size={16} /></button> : <button className="account-action" aria-label="Sign in" title="Sign in" onClick={() => setDialog('auth')}><ArrowUpRight size={17} /></button>}
          </div>
        </motion.aside>

        <main id="main-content" className="main-content" inert={mobileNav}>
          <header className="topbar">
            <button ref={mobileNavButtonRef} className="mobile-menu-button" aria-label="Open navigation" aria-expanded={mobileNav} onClick={() => setMobileNav(true)}><Menu size={21} /></button>
            <div className="breadcrumb"><span>Workspace</span><span className="breadcrumb-mark">/</span><strong>{navItems.find((item) => item.id === page)?.label || 'Overview'}</strong></div>
            <div className="topbar-actions">
              <span className={`connection-state ${demoMode ? 'preview-state' : ''}`}><span />{demoMode ? 'Preview data' : jobsLoading ? 'Loading roles' : 'Opportunities updated'}</span>
              <button className="theme-toggle" aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} theme`} onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}>{theme === 'light' ? <Moon size={16} /> : <Sun size={16} />}</button>
              {user ? <button className="profile-button" onClick={() => setDialog('profile')}><Avatar name={user.name} photo={profilePhoto} /><span className="profile-button-name">{user.name?.split(' ')[0]}</span><Settings2 size={15} /></button> : <button className="button button-outline top-signin" onClick={() => setDialog('auth')}>Sign in <ArrowUpRight size={15} /></button>}
            </div>
          </header>

          {demoMode && <div className="preview-banner"><Sparkles size={16} /><span><strong>Preview mode</strong> Sample roles are fictional. Profile and saved-role changes stay in this browser; applications and account sync need the connected service.</span><button onClick={loadJobs}>Retry connection</button></div>}

          <AnimatePresence mode="wait" initial={false}>
            <motion.div key={page} className="page-content" initial={reduceMotion ? false : { opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={reduceMotion ? undefined : { opacity: 0, y: -6 }} transition={{ duration: reduceMotion ? 0 : 0.24, ease: 'easeOut' }}>
              <section className="page-heading">
                <div><p className="section-kicker">{title.eyebrow}</p><h1>{page === 'home' && user ? `Good to see you, ${user.name.split(' ')[0]}.` : title.title}</h1><p className="page-description">{page === 'home' && user ? 'Let’s make today a little more useful than yesterday.' : title.description}</p></div>
                {page === 'home' && <div className="heading-aside"><span className="heading-date">{new Intl.DateTimeFormat(undefined, { weekday: 'long', month: 'long', day: 'numeric' }).format(new Date())}</span><span className="heading-aside-note">A fresh start, whenever you need one.</span></div>}
              </section>

              {page === 'home' && <>
                <section className="next-step-band" aria-labelledby="next-step-title">
                  <div className="next-step-copy"><span className="next-step-label"><span className="signal-dot" /> YOUR NEXT STEP</span><h2 id="next-step-title">{!user ? 'Start with the work that interests you.' : studentSkills.length ? 'You already have something to build on.' : 'Tell us a little about what you can do.'}</h2><p>{!user ? 'Explore a few sample roles, save the ones you like, and make this space yours when you’re ready.' : studentSkills.length ? `We’re comparing your ${studentSkills.slice(0, 3).join(', ')} experience with open roles. Add a skill or two to sharpen your matches.` : 'Add a few skills and we’ll show you roles that connect with what you know.'}</p><div className="next-step-actions"><button className="button button-primary" onClick={() => user ? setDialog('profile') : navigate('jobs')}>{user ? 'Update my profile' : 'Explore roles'}<ArrowRight size={16} /></button>{user && <button className="text-button" onClick={() => navigate('roadmap')}>See a skill plan <ArrowUpRight size={15} /></button>}</div></div>
                  <div className="next-step-art"><div className="art-note">A GOOD FIT<br /><strong>takes shape</strong></div><BridgeMark /><span className="art-caption">your experience <i /> what’s next</span></div>
                </section>
                <section className="stats-row" aria-label="Your career activity">{stats.map(({ label, value, icon: Icon, note }) => <article className="stat-item" key={label}><div className="stat-icon"><Icon size={17} /></div><div><span className="stat-label">{label}</span><strong className="stat-value">{value}</strong><span className="stat-note">{note}</span></div></article>)}</section>
                <motion.section className="momentum-panel" aria-labelledby="momentum-title" initial={reduceMotion ? false : { opacity: 0, y: 18 }} whileInView={reduceMotion ? undefined : { opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.12 }} transition={{ duration: 0.5, ease: 'easeOut' }}>
                  <div className="momentum-scene">
                    <img src="https://images.unsplash.com/photo-1523240795612-9a054b0db644?auto=format&fit=crop&w=1000&q=82" alt="Students sharing ideas around a table" loading="lazy" decoding="async" />
                    <div className="momentum-scene-shade" />
                    <div className="momentum-scene-copy"><span>YOUR SEARCH, YOUR PACE</span><h2 id="momentum-title">Build a path that feels like yours.</h2><p>One thoughtful step is enough to get moving.</p><button className="momentum-browse" onClick={() => navigate('jobs')}>Find a place to begin <ArrowRight size={16} /></button></div>
                    <span className="momentum-photo-note"><Sparkles size={14} /> Small steps count</span>
                  </div>
                  <div className="momentum-checklist"><div className="momentum-list-heading"><span className="section-kicker">A LITTLE MOMENTUM</span><h2>Your next few steps</h2><p>Choose whichever feels useful today.</p></div>
                    {momentumSteps.map(({ title: stepTitle, detail, done, icon: Icon, action }, index) => <button className="momentum-step" key={stepTitle} onClick={action}><span className="momentum-step-icon"><Icon size={17} /></span><span className="momentum-step-copy"><strong>{stepTitle}</strong><small>{detail}</small></span><span className={`momentum-step-status ${done ? 'is-done' : ''}`} aria-label={done ? 'Done' : 'Open'}>{done ? <Check size={15} /> : <ArrowUpRight size={15} />}</span><span className="sr-only">Step {index + 1}</span></button>)}
                  </div>
                </motion.section>
                <div className="dashboard-grid">
                  <section className="content-section recommended-section">
                    <div className="section-heading"><div><span className="section-kicker">A PLACE TO BEGIN</span><h2>Roles worth a look</h2></div><button className="text-button" onClick={() => navigate('jobs')}>See all roles <ArrowRight size={15} /></button></div>
                    {jobsLoading ? <LoadingState label="Finding a few roles…" /> : <JobList jobs={matchedJobs.slice(0, 3)} savedIds={currentSavedIds} onSave={toggleSave} onApply={startApply} onDetails={setSelectedJob} onSignIn={() => setDialog('auth')} user={user} />}
                  </section>
                  <aside className="dashboard-rail">
                    <section className="profile-progress">
                      <div className="section-heading compact"><div><span className="section-kicker">YOUR PROFILE</span><h2>Getting to know you</h2></div><span className="progress-number">{profilePercent}%</span></div>
                      <div className="progress-track" role="progressbar" aria-valuenow={profilePercent} aria-valuemin="0" aria-valuemax="100" aria-label="Profile completion"><span style={{ width: `${profilePercent}%` }} /></div>
                      <p>{user ? profilePercent === 100 ? 'You’ve given us a good starting point.' : 'A little more detail helps us find a better fit.' : 'Sign in to save your details and keep your search in one place.'}</p>
                      <button className="inline-action" onClick={() => user ? setDialog('profile') : setDialog('auth')}>{user ? 'Add a little more' : 'Set up my profile'}<ArrowRight size={15} /></button>
                    </section>
                    <section className="roadmap-peek"><span className="roadmap-icon"><GraduationCap size={19} /></span><span className="section-kicker">A SMALL NEXT STEP</span><h3>{missingSkills.length ? `Explore ${missingSkills[0]}` : 'Build from what you know'}</h3><p>{missingSkills.length ? 'A skill gap is just a place to start learning.' : 'Tell us what you know to shape a useful skill plan.'}</p><button className="inline-action" onClick={() => navigate('roadmap')}>Open skill plan<ArrowRight size={15} /></button></section>
                  </aside>
                </div>
              </>}

              {page === 'jobs' && <section className="content-section jobs-explorer">
                <div className="section-heading jobs-heading"><div><span className="section-kicker">MAKE IT YOUR SEARCH</span><h2>What are you looking for?</h2></div><label className="sort-control"><span>Sort by</span><select value={sortOrder} onChange={(e) => setSortOrder(e.target.value)}><option>Best fit</option><option>Newest</option></select><ChevronDown size={14} /></label></div>
                <div className="filter-row"><label className="search-box"><Search size={18} /><span className="sr-only">Search jobs, companies, or skills</span><input type="search" name="job-search" autoComplete="off" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Try ‘design’, ‘SQL’, or a company…" />{search && <button className="clear-search" aria-label="Clear search" onClick={() => setSearch('')}><X size={16} /></button>}</label><label className="filter-control"><Filter size={16} /><span className="sr-only">Filter by job type</span><select value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)}><option>All types</option><option>Full-time</option><option>Part-time</option><option>Internship</option><option>Contract</option></select><ChevronDown size={14} /></label><label className="location-control"><span className="sr-only">Filter by location</span><input name="location" value={locationFilter} onChange={(event) => setLocationFilter(event.target.value)} placeholder="Any location" /><ChevronDown size={14} aria-hidden="true" /></label></div>
                <p className="results-count">{jobsLoading ? 'Looking for roles…' : `${visibleJobs.length} ${visibleJobs.length === 1 ? 'role' : 'roles'} to explore`}{search && ` for “${search}”`}</p>
                {jobsLoading ? <LoadingState label="Finding roles that might suit you…" /> : <JobList jobs={visibleJobs} savedIds={currentSavedIds} onSave={toggleSave} onApply={startApply} onDetails={setSelectedJob} onSignIn={() => setDialog('auth')} user={user} emptyTitle={page === 'saved' ? 'Your shortlist is open' : 'No roles match that search'} emptyDescription={page === 'saved' ? 'Save a role that catches your eye and it’ll be waiting here.' : 'Try another skill, job title, or location.'} onClear={() => { setSearch(''); setTypeFilter('All types'); setLocationFilter('') }} />}
              </section>}

              {page === 'saved' && <section className="content-section jobs-explorer"><div className="section-heading"><div><span className="section-kicker">YOUR SHORTLIST</span><h2>{visibleJobs.length ? 'Take a closer look' : 'Room for a possibility'}</h2></div><button className="text-button" onClick={() => navigate('jobs')}>Find more roles <ArrowRight size={15} /></button></div>{jobsLoading ? <LoadingState label="Opening your shortlist…" /> : <JobList jobs={visibleJobs} savedIds={currentSavedIds} onSave={toggleSave} onApply={startApply} onDetails={setSelectedJob} onSignIn={() => setDialog('auth')} user={user} emptyTitle="Nothing saved just yet" emptyDescription="When a role feels promising, save it here and come back when you’re ready." onClear={() => navigate('jobs')} />}</section>}

              {page === 'applications' && <section className="content-section application-section"><div className="section-heading"><div><span className="section-kicker">APPLICATION TRACKER</span><h2>{applications.length ? 'Your recent applications' : 'Your next chapter starts with one'}</h2></div>{user && <span className="tracker-count">{applications.length} sent</span>}</div>{!user ? <EmptyState icon={FileText} title="Sign in to see your applications" description="Your application history stays connected to your account, so it’s here when you need it." action="Sign in" onAction={() => setDialog('auth')} /> : applications.length ? <div className="application-list">{applications.map((application) => <article className="application-row" key={application._id}><div className="application-mark"><BriefcaseBusiness size={19} /></div><div className="application-copy"><h3>{application.job?.title || 'Role no longer available'}</h3><p>{application.job?.company || 'Company details unavailable'} <span>·</span> Applied {new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' }).format(new Date(application.createdAt))}</p></div><span className={`status-pill status-${application.status?.toLowerCase().replaceAll(' ', '-')}`}>{application.status}</span></article>)}</div> : <EmptyState icon={ArrowUpRight} title="No applications yet" description="That’s okay. Take a look around, save the roles that interest you, and apply when it feels right." action="Explore roles" onAction={() => navigate('jobs')} />}</section>}

              {page === 'roadmap' && <section className="roadmap-page"><div className="roadmap-intro"><div className="roadmap-intro-icon"><GraduationCap size={24} /></div><div><span className="section-kicker">A PLAN THAT CAN CHANGE</span><h2>{roadmap.length ? `A few skills for your next step` : 'Start with the skills you have'}</h2><p>{roadmap.length ? 'These are skills listed in roles close to your current experience. Pick one that interests you; there’s no rush.' : user ? 'Add your current skills and we’ll look for common themes in open roles.' : 'Browse some roles, then create a profile to get a skill plan shaped around you.'}</p></div></div>{roadmap.length ? <ol className="roadmap-list">{roadmap.map((item, index) => <motion.li key={item.id} className="roadmap-item" initial={reduceMotion ? false : { opacity: 0, y: 8 }} whileInView={reduceMotion ? undefined : { opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.2 }} transition={{ duration: 0.3, ease: 'easeOut' }}><span className="roadmap-step">{String(index + 1).padStart(2, '0')}</span><div><span className="priority-label">{item.priority} focus</span><h3>{item.skill}</h3><p>{item.task}</p><div className="roadmap-project"><CheckCircle2 size={15} /><span>Try this: {item.project}</span></div><a href={item.resource} target="_blank" rel="noreferrer" className="text-button roadmap-link">Open a learning resource <ArrowUpRight size={14} /></a></div><span className="hours-label"><Clock3 size={14} /> about {item.estimatedHours} hrs</span></motion.li>)}</ol> : <div className="roadmap-empty"><EmptyState icon={Map} title="Your plan starts with a conversation" description="Add a few skills to your profile and we’ll compare them with the roles you’re exploring." action={user ? 'Add my skills' : 'Create my profile'} onAction={() => user ? setDialog('profile') : setDialog('auth')} /></div>}<p className="roadmap-footnote"><CircleHelp size={15} /> A match score reflects listed skills only. It’s a guide for exploring, never a measure of your potential.</p></section>}
              {page === 'coach' && <section className="coach-workspace"><div className="coach-workspace-intro"><span className="coach-workspace-mark"><Sparkles size={21} /></span><div><span className="section-kicker">YOUR CAREER COACH</span><h2>A thoughtful place to start.</h2><p>Ask about roles, skills, or how to take the next step. Suggestions are a starting point; you decide what feels right.</p></div></div><div className="coach-workspace-card"><div className="coach-response-area"><div className="coach-response-badge"><Sparkles size={15} /> SkillBridge coach</div>{coachAnswer ? <div className="coach-answer"><h3>Here’s one way to think about it</h3><p>{coachAnswer}</p></div> : <div className="coach-empty"><MessageCircle size={24} /><h3>What’s on your mind?</h3><p>Try one of these to get started.</p><div className="coach-starters">{['How can I improve my resume?', 'What should I learn for a data role?', 'Help me understand a job match.'].map((prompt) => <button key={prompt} onClick={() => setCoachQuestion(prompt)}>{prompt}<ArrowUpRight size={14} /></button>)}</div></div>}{coachError && <p className="form-error" role="alert">{coachError}</p>}</div><form className="coach-ask-form" onSubmit={askCoach}><label className="sr-only" htmlFor="coach-question">Ask your career coach</label><textarea id="coach-question" rows="3" maxLength="4000" value={coachQuestion} onChange={(event) => setCoachQuestion(event.target.value)} placeholder="Ask about a role, a skill, or what to do next…" /><div><span>Your profile skills are included to personalize replies.</span><button className="button button-primary" disabled={coachBusy || !coachQuestion.trim()}>{coachBusy ? 'Thinking…' : 'Ask coach'}<ArrowRight size={16} /></button></div></form></div><p className="coach-disclaimer"><CircleHelp size={15} /> AI guidance can make mistakes. Check important information and keep control of every application.</p></section>}
            </motion.div>
          </AnimatePresence>

          <footer className="page-footer"><span>Made for the next step, wherever it leads.</span><span>SkillBridge <i>·</i> Your career space</span></footer>
        </main>
      </div>

      <div className={`toast toast-${noticeKind}`} role="status" aria-live="polite" aria-atomic="true" data-visible={Boolean(notice)}>{notice && <><CheckCircle2 size={17} /><span>{notice}</span><button aria-label="Dismiss message" onClick={() => setNotice('')}><X size={15} /></button></>}</div>

      <AnimatePresence>{dialog === 'auth' && <AuthDialog key="auth" initialMode={new URLSearchParams(window.location.search).get('auth') === 'register' ? 'register' : 'login'} onClose={(result) => { setDialog(''); if (result?.authenticated && pendingJob) { setSelectedJob(pendingJob); setPendingJob(null); setDialog('apply') } else if (!result?.authenticated) setPendingJob(null) }} onAuthenticated={saveSession} announce={announce} />}</AnimatePresence>
      <AnimatePresence>{dialog === 'profile' && user && <ProfileDialog key="profile" user={user} token={token} photo={profilePhoto} onPhotoChange={saveProfilePhoto} onClose={() => setDialog('')} onUpdated={(nextUser) => { setUser(nextUser); announce('Your profile is up to date.') }} />}</AnimatePresence>
      <AnimatePresence>{dialog === 'apply' && selectedJob && <ApplyDialog key="apply" job={selectedJob} onClose={() => { setDialog(''); setDialogError('') }} onApply={submitApplication} busy={applyBusy} error={dialogError} />}</AnimatePresence>
      <AnimatePresence>{selectedJob && dialog !== 'apply' && <JobDetailsDialog key={`job-${selectedJob._id}`} job={selectedJob} saved={currentSavedIds.includes(selectedJob._id)} onClose={() => setSelectedJob(null)} onSave={() => toggleSave(selectedJob)} onApply={() => startApply(selectedJob)} user={user} />}</AnimatePresence>
      {authChecking && <span className="sr-only" role="status">Checking your account…</span>}
    </div>
  )
}

function JobList({ jobs, savedIds, onSave, onApply, onDetails, user, emptyTitle = 'No roles found', emptyDescription = 'Try changing your search or filters.', onClear }) {
  const reduceMotion = useReducedMotion()
  if (!jobs.length) return <EmptyState icon={Compass} title={emptyTitle} description={emptyDescription} action={onClear ? 'Clear filters' : undefined} onAction={onClear} />
  return <div className="job-list">{jobs.map(({ job, match }) => <motion.article className="job-card" key={job._id} initial={reduceMotion ? false : { opacity: 0, y: 9 }} whileInView={reduceMotion ? undefined : { opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.15 }} transition={{ duration: 0.28, ease: 'easeOut' }}>
    <button className="job-main" onClick={() => onDetails(job)} aria-label={`View ${job.title} at ${job.company}`}><span className="company-mark"><Code2 size={19} strokeWidth={1.7} /></span><span className="job-info"><span className="job-card-heading"><strong>{job.title}</strong>{match.score > 0 && <span className="match-pill"><span />{match.score}% skill match</span>}</span><span className="job-meta">{job.company}<i>·</i>{job.location || 'Location flexible'}<i>·</i>{job.employmentType}</span><span className="job-description">{job.description}</span><span className="job-tags">{(job.requiredSkills || []).slice(0, 4).map((skill) => <span className="skill-tag" key={skill}>{skill}</span>)}</span></span></button>
    <div className="job-actions"><button className={`save-button ${savedIds.includes(job._id) ? 'is-saved' : ''}`} onClick={() => onSave(job)} aria-label={savedIds.includes(job._id) ? `Remove ${job.title} from saved roles` : `Save ${job.title}`} aria-pressed={savedIds.includes(job._id)}><Bookmark size={18} fill={savedIds.includes(job._id) ? 'currentColor' : 'none'} /></button><button className="button button-small button-outline" onClick={() => onApply(job)}>{user ? 'Apply' : 'Sign in to apply'}</button></div>
  </motion.article>)}</div>
}

function EmptyState({ icon: Icon, title, description, action, onAction }) {
  return <div className="empty-state"><span className="empty-icon"><Icon size={22} /></span><h3>{title}</h3><p>{description}</p>{action && <button className="button button-outline" onClick={onAction}>{action}<ArrowRight size={15} /></button>}</div>
}

function LoadingState({ label }) { return <div className="loading-state" role="status"><span className="loading-mark"><span /><span /><span /></span>{label}</div> }

function JobDetailsDialog({ job, saved, onClose, onSave, onApply, user }) {
  return <Dialog title={job.title} onClose={onClose} size="wide"><div className="job-detail-meta"><span>{job.company}</span><i>·</i><span>{job.location || 'Location flexible'}</span><i>·</i><span>{job.employmentType}</span></div><p className="job-detail-description">{job.description}</p><div className="detail-block"><span className="section-kicker">WHAT YOU’LL BRING</span><div className="detail-skills">{(job.requiredSkills || []).map((skill) => <span className="skill-tag" key={skill}>{skill}</span>)}</div></div>{job.preferredSkills?.length > 0 && <div className="detail-block"><span className="section-kicker">NICE TO HAVE</span><div className="detail-skills">{job.preferredSkills.map((skill) => <span className="skill-tag skill-tag-soft" key={skill}>{skill}</span>)}</div></div>}{(job.minSalary || job.maxSalary) && <div className="salary-note">Salary range: {job.minSalary ? new Intl.NumberFormat(undefined, { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(job.minSalary) : 'Not listed'} – {job.maxSalary ? new Intl.NumberFormat(undefined, { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(job.maxSalary) : 'Not listed'} / year</div>}<div className="dialog-actions"><button className={`button button-outline ${saved ? 'saved-outline' : ''}`} onClick={onSave}><Bookmark size={16} fill={saved ? 'currentColor' : 'none'} />{saved ? 'Saved for later' : 'Save for later'}</button><button className="button button-primary" onClick={onApply}>{user ? 'Apply for this role' : 'Sign in to apply'}<ArrowUpRight size={16} /></button></div><p className="privacy-note">Take a moment to check the details and make sure this role feels right for you.</p></Dialog>
}

export default DashboardApp
