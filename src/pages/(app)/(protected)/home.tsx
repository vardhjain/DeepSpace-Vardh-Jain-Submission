import { useEffect, useRef, useState, type CSSProperties, type FormEvent } from 'react'
import {
  AuthGate, AuthOverlay, useAuthProfileReady, useChannels, useMessages,
  useMutations, usePresenceRoom, useQuery,
} from 'deepspace'
import { Activity, ArrowDown, ArrowUpRight, Check, ChevronDown, ChevronRight, Clock3, Crosshair, Fuel, Gauge, Globe2, LifeBuoy, Menu, Orbit, Radio, Rocket, Satellite, ShieldCheck, Target, Thermometer, Wind, X } from 'lucide-react'
import '../../../orbit.css'

type Mission = { callsign: string; destination: string; active: boolean }
type Task = { taskKey: string; title: string; groupName: string; done: boolean }
type FlightEvent = { message: string; tone: string }

const starterTasks: Task[] = [
  { taskKey: 'trajectory', title: 'Trajectory window verified', groupName: 'NAVIGATION', done: true },
  { taskKey: 'sleep-cycle', title: 'Crew sleep cycle aligned', groupName: 'CREW SYSTEMS', done: true },
  { taskKey: 'radiation', title: 'Radiation shelter inspection', groupName: 'HABITAT', done: false },
  { taskKey: 'relay', title: 'Comms relay handshake', groupName: 'COMMS', done: false },
  { taskKey: 'descent', title: 'Descent burn simulation', groupName: 'PROPULSION', done: false },
]
const telemetry = [
  { label: 'VELOCITY', value: '18.42', unit: 'km/s', icon: Gauge, delta: '+0.08', tone: 'mint' },
  { label: 'FUEL RESERVE', value: '87.6', unit: '%', icon: Fuel, delta: 'Nominal', tone: 'gold' },
  { label: 'CABIN PRESSURE', value: '101.3', unit: 'kPa', icon: Wind, delta: 'Stable', tone: 'blue' },
  { label: 'HULL TEMP', value: '−42', unit: '°C', icon: Thermometer, delta: '−2.1°', tone: 'gold' },
]

export default function HomePage() {
  return <AuthGate fallback={<SignedOut/>}><MissionDesk/></AuthGate>
}

function SignedOut() {
  const [showAuth, setShowAuth] = useState(false)
  return <div className="signin-screen"><div className="signin-card"><div className="brand-mark"><Orbit size={20}/></div><p className="eyebrow">ORBIT OPS · FLIGHT CONTROL</p><h1>Welcome to the flight deck</h1><p>Sign in to join the crew, sync mission plans, and leave handoff notes.</p><button className="primary-button" onClick={() => setShowAuth(true)}>Sign in to continue <ArrowUpRight size={15}/></button></div>{showAuth&&<AuthOverlay onClose={()=>setShowAuth(false)}/>}</div>
}

function MissionDesk() {
  const { user } = useAuthProfileReady({ requireUser: true })
  const missionsQ = useQuery<Mission>('missions', { orderBy: 'createdAt', orderDir: 'asc' })
  const tasksQ = useQuery<Task>('mission-tasks', { orderBy: 'createdAt', orderDir: 'asc' })
  const eventsQ = useQuery<FlightEvent>('flight-events', { orderBy: 'createdAt', orderDir: 'desc', limit: 6 })
  const missions = useMutations<Mission>('missions')
  const tasks = useMutations<Task>('mission-tasks')
  const events = useMutations<FlightEvent>('flight-events')
  const { peers, updateState, connected } = usePresenceRoom('mission:kepler-186f')
  const { channels, create: createChannel } = useChannels()
  const [channelId, setChannelId] = useState<string>()
  const [draft, setDraft] = useState('')
  const [newTask, setNewTask] = useState('')
  const [missionInput, setMissionInput] = useState('')
  const [modal, setModal] = useState(false)
  const [toast, setToast] = useState('')
  const seedStarted = useRef(false)
  const { messages, send } = useMessages(channelId)
  const currentMission = missionsQ.records[0]
  const missionName = currentMission?.data.callsign ?? 'KEPLER-186F'
  const taskRows = tasksQ.records
  const doneCount = taskRows.filter(t => t.data.done).length
  const readiness = Math.min(100, Math.round(68 + doneCount * 6.4))
  const activeChannels = channels
  const latestMessages = messages.slice(-5)
  const activityRows = eventsQ.records.slice(0, 5)
  const displayName = user?.name || user?.email || 'Flight controller'
  const initials = displayName.split(/[ @._-]/).filter(Boolean).slice(0, 2).map(part => part[0]?.toUpperCase()).join('') || 'FC'

  useEffect(() => { updateState({ onConsole: true }) }, [updateState])
  useEffect(() => { if (!channelId && activeChannels.length) setChannelId(activeChannels[0].recordId) }, [channelId, activeChannels])
  useEffect(() => {
    if (seedStarted.current || missionsQ.status !== 'ready' || tasksQ.status !== 'ready' || eventsQ.status !== 'ready') return
    seedStarted.current = true
    void (async () => {
      if (!missionsQ.records.length) await missions.createConfirmed({ callsign: 'KEPLER-186F', destination: 'Kepler-186 system · 582 light-years', active: true })
      if (!tasksQ.records.length) for (const task of starterTasks) await tasks.createConfirmed(task)
      if (!eventsQ.records.length) await events.createConfirmed({ message: 'Flight deck synchronized for first review', tone: 'blue' })
    })().catch(error => console.error('Could not initialize mission data', error))
  }, [missionsQ.status, tasksQ.status, eventsQ.status, missionsQ.records.length, tasksQ.records.length, eventsQ.records.length, missions.createConfirmed, tasks.createConfirmed, events.createConfirmed])

  const notify = (message: string) => { setToast(message); window.setTimeout(() => setToast(''), 2600) }
  const addEvent = async (message: string, tone: string) => { await events.createConfirmed({ message, tone }) }
  const toggleTask = async (recordId: string, task: Task) => {
    try {
      await tasks.putConfirmed(recordId, { done: !task.done })
      await addEvent(`${task.done ? 'Reopened' : 'Completed'}: ${task.title}`, task.done ? 'amber' : 'green')
    } catch (error) { notify(error instanceof Error ? error.message : 'Could not update checklist') }
  }
  const addChecklistTask = async (event: FormEvent) => {
    event.preventDefault()
    const title = newTask.trim()
    if (!title) return
    try {
      await tasks.createConfirmed({ taskKey: `task-${Date.now()}`, title, groupName: 'FLIGHT OPERATIONS', done: false })
      await addEvent(`Added checklist item: ${title}`, 'blue')
      setNewTask('')
      notify('Checklist item added')
    } catch (error) { notify(error instanceof Error ? error.message : 'Could not add checklist item') }
  }
  const addMission = async (event: FormEvent) => {
    event.preventDefault()
    const callsign = missionInput.trim().toUpperCase()
    if (!callsign) return
    try {
      await missions.createConfirmed({ callsign, destination: 'Watchlist mission', active: false })
      setMissionInput('')
      setModal(false)
      notify(`Mission ${callsign} added to the watchlist`)
    } catch (error) { notify(error instanceof Error ? error.message : 'Could not add mission') }
  }
  const openFlightDeck = async () => {
    const existing = channels.find(channel => channel.data.name === 'kepler-186f-flight-deck')
    try {
      const id = existing?.recordId ?? await createChannel({ name: 'kepler-186f-flight-deck', description: 'Flight deck handoffs for the active mission' })
      setChannelId(id)
    } catch (error) { notify(error instanceof Error ? error.message : 'Could not open flight deck') }
  }
  const sendMessage = (event: FormEvent) => {
    event.preventDefault()
    const content = draft.trim()
    if (!content || !channelId) return
    void send(content)
    setDraft('')
  }

  return <div className="app-shell">
    <aside className="sidebar">
      <div className="brand"><div className="brand-mark"><Orbit size={20}/></div><div><strong>ORBIT<span>OPS</span></strong><small>MISSION CONTROL</small></div></div>
      <div className="workspace"><div className="workspace-badge">A</div><div><b>Atlas Expedition</b><small>FLIGHT TEAM · {String(peers.length + 1).padStart(2, '0')}</small></div><ChevronDown size={15}/></div>
      <div className="nav-label">WORKSPACE</div><nav><a className="nav-item active"><Globe2 size={17}/><span>Overview</span></a><a className="nav-item"><Target size={17}/><span>Mission plan</span><small>{String(taskRows.length).padStart(2, '0')}</small></a><a className="nav-item"><Activity size={17}/><span>Telemetry</span></a><a className="nav-item"><Satellite size={17}/><span>Crew & roles</span></a></nav>
      <div className="nav-label section-label">MISSIONS <button onClick={()=>setModal(true)} aria-label="Add mission">+</button></div><div className="mission-nav active-mission"><span className="mission-dot"/><span>{missionName}</span><span className="mission-state">ACTIVE</span></div>{missionsQ.records.slice(1).map(m=><div className="mission-nav muted" key={m.recordId}><span className="mission-dot idle"/><span>{m.data.callsign}</span></div>)}
      <div className="sidebar-bottom"><div className="help-card"><div className="help-icon"><LifeBuoy size={16}/></div><div><b>Need a hand?</b><small>Flight deck handbook</small></div><ArrowUpRight size={14}/></div><div className="profile"><div className="avatar">{initials}</div><div><b>{displayName}</b><small>MISSION CREW</small></div><Menu size={17}/></div></div>
    </aside>
    <main className="main-area"><header className="topbar"><div className="crumb"><span>Atlas Expedition</span><ChevronRight size={14}/><b>Overview</b></div><div className="top-actions"><div className="live"><i className={connected?'':'offline'}/> {connected?'LIVE SYSTEMS':'RECONNECTING'}</div><span className="top-divider"/><span className="crew-presence"><span className="pulse-dot"/>{peers.length + 1} on console</span><span className="avatar small-avatar">{initials}</span></div></header>
      <div className="content"><section className="page-head"><div><div className="eyebrow"><span className="tiny-orbit"><Orbit size={11}/></span> FLIGHT OPERATIONS <span className="slash">/</span> SOL 142</div><h1>Mission overview</h1><p>Your mission, at a glance. Shared live with the flight team.</p></div><button className="outline-button" onClick={()=>notify('Flight report is ready to export')}><ArrowDown size={15}/> Export report</button></section>
        <section className="hero-card"><div className="hero-copy"><div className="mission-kicker"><span className="pulse-dot"/> ACTIVE MISSION <span className="kicker-line"/></div><h2>{missionName}</h2><p>{currentMission?.data.destination ?? 'Kepler-186 system · 582 light-years from Earth'}</p><div className="hero-meta"><div><span className="meta-icon"><Clock3 size={15}/></span><span><small>MISSION ELAPSED</small><b>142d 06h 18m</b></span></div><div><span className="meta-icon"><Crosshair size={15}/></span><span><small>NEXT MANEUVER</small><b>Course correction <i>in 04:32:18</i></b></span></div></div></div><div className="hero-art"><div className="orbit-line orbit-one"/><div className="orbit-line orbit-two"/><div className="star star-a"/><div className="star star-b"/><div className="star star-c"/><div className="planet"><div className="planet-shade"/></div><div className="planet-ring"/><div className="moon"/><div className="ship"><Rocket size={16}/></div><div className="art-label">KEPLER SYSTEM <span>· 582 LY</span></div></div><div className="hero-index"><span>01</span><div/></div></section>
        <section className="telemetry-grid">{telemetry.map(({label,value,unit,icon:Icon,delta,tone})=><article className="metric-card" key={label}><div className="metric-top"><span>{label}</span><Icon size={15}/></div><div className="metric-value">{value}<small>{unit}</small></div><div className={`metric-delta ${tone}`}>{tone==='mint'?<ArrowUpRight size={12}/>:<span className="delta-dash"/>}{delta}</div><div className={`sparkline ${tone}`}><svg viewBox="0 0 160 30" preserveAspectRatio="none"><path d="M0 22 C17 17 25 21 39 15 S58 16 74 12 S93 17 108 9 S137 13 160 4"/></svg></div></article>)}</section>
        <section className="lower-grid"><article className="panel checklist-panel"><div className="panel-head"><div><div className="eyebrow">FLIGHT PLAN · LIVE RECORDS</div><h3>Mission checklist</h3></div><span className="sync-badge">{tasksQ.status==='ready'?'SYNCED':'SYNCING'}</span></div><div className="progress-row"><span>{doneCount} of {taskRows.length} complete</span><span>{taskRows.length?Math.round(doneCount/taskRows.length*100):0}%</span></div><div className="progress-track"><div style={{width:`${taskRows.length?doneCount/taskRows.length*100:0}%`}}/></div><div className="task-list">{taskRows.map(record=><button className={`task-row ${record.data.done?'task-done':''}`} key={record.recordId} onClick={()=>void toggleTask(record.recordId,record.data)}><span className="task-check">{record.data.done&&<Check size={12}/>}</span><span className="task-info"><b>{record.data.title}</b><small>{record.data.groupName}</small></span><ChevronRight size={15}/></button>)}</div><form className="add-task-form" onSubmit={addChecklistTask}><input value={newTask} onChange={e=>setNewTask(e.target.value)} placeholder="Add a flight checklist item" aria-label="New checklist item"/><button type="submit">+ Add</button></form></article>
        <article className="panel readiness-panel"><div className="panel-head"><div><div className="eyebrow">PRE-LAUNCH</div><h3>Readiness score</h3></div><span className="system-status"><ShieldCheck size={14}/> LIVE</span></div><div className="readiness-center"><div className="score-ring" style={{'--score':`${readiness}%`} as CSSProperties}><div className="score-inner"><strong>{readiness}</strong><small>/ 100</small></div></div><div className="readiness-caption"><span className="ready-mark"><ShieldCheck size={15}/></span><b>{readiness>=90?'Ready for launch':readiness>=80?'On track':'Needs attention'}</b><small>{Math.max(taskRows.length-doneCount,0)} checklist items remaining</small></div></div><div className="system-list">{[{label:'Propulsion',value:98},{label:'Navigation',value:100},{label:'Life support',value:84},{label:'Communications',value:92}].map(s=><div className="system-row" key={s.label}><span>{s.label}</span><div className="system-bar"><i className={s.value<90?'gold':'mint'} style={{width:`${s.value}%`}}/></div><b>{s.value}%</b></div>)}</div><div className="readiness-link"><span>Readiness recalculates from shared checks</span><ShieldCheck size={14}/></div></article>
        <article className="panel events-panel"><div className="panel-head"><div><div className="eyebrow">FLIGHT DECK</div><h3>Handoff channel</h3></div><span className="channel-live"><span className="pulse-dot"/> REAL TIME</span></div>{channelId?<><div className="message-list">{latestMessages.length?latestMessages.map(message=><div className="message-row" key={message.recordId}><div className="message-avatar">{message.data.authorId.slice(0,2).toUpperCase()}</div><div><b>{message.data.authorId===user?.id?'You':`Crew ${message.data.authorId.slice(0,5)}`}</b><p>{message.data.deleted?'Message removed':message.data.content}</p></div></div>):<p className="empty-message">No handoffs yet. Leave the first note for the next shift.</p>}</div><form className="message-compose" onSubmit={sendMessage}><input value={draft} onChange={e=>setDraft(e.target.value)} placeholder="Write a handoff note…" aria-label="Handoff message"/><button type="submit" disabled={!draft.trim()}><ArrowUpRight size={15}/></button></form></>:<div className="channel-empty"><div className="event-indicator blue"><Radio size={14}/></div><p>Open a shared channel for crew handoffs and mission notes.</p><button onClick={()=>void openFlightDeck()}>Open flight deck <ArrowUpRight size={14}/></button></div>}</article>
        <article className="panel activity-panel"><div className="panel-head"><div><div className="eyebrow">AUDIT TRAIL</div><h3>Recent activity</h3></div><span className="sync-badge">SHARED</span></div><div className="event-list">{activityRows.map(event=><div className="event-row" key={event.recordId}><div className={`event-indicator ${event.data.tone==='green'?'green':event.data.tone==='amber'?'amber':'blue'}`}>{event.data.tone==='green'?<Check size={13}/>:event.data.tone==='amber'?<Clock3 size={13}/>:<Activity size={13}/>}</div><div className="event-text"><b>{event.data.message}</b><small>{new Date(event.createdAt).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})} <span>·</span> Flight deck</small></div></div>)}{!activityRows.length&&<p className="empty-message">Checklist updates will appear here.</p>}</div><div className="activity-link"><span>Recent changes are shared across the crew</span><ChevronRight size={14}/></div></article></section><footer><span><Orbit size={12}/> Built for the long way out.</span><span>DEEPSPACE MISSION CONTROL <i>·</i> V 1.0.4</span></footer></div></main>
    {modal&&<div className="modal-backdrop" onClick={()=>setModal(false)}><form className="modal" onClick={e=>e.stopPropagation()} onSubmit={addMission}><button type="button" className="modal-close" onClick={()=>setModal(false)}><X size={17}/></button><div className="modal-icon"><Satellite size={19}/></div><div className="eyebrow">MISSION WATCHLIST</div><h3>Add a mission</h3><p>Give your next expedition a callsign to track from this desk.</p><label>MISSION CALLSIGN<input autoFocus value={missionInput} onChange={e=>setMissionInput(e.target.value)} placeholder="e.g. TITAN-03" maxLength={24}/></label><button className="primary-button" type="submit">Add to watchlist <ArrowUpRight size={15}/></button></form></div>}
    {toast&&<div className="toast"><Check size={15}/>{toast}</div>}
  </div>
}



