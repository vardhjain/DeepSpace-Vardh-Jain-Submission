import { useEffect, useRef, useState, type FormEvent } from 'react'
import {
  useAuthProfileReady,
  useChannels,
  useMessages,
  useMutations,
  usePresenceRoom,
  useQuery,
} from 'deepspace'
import {
  Activity,
  ArrowUpRight,
  Check,
  CheckCircle2,
  ChevronRight,
  CircleDot,
  ClipboardList,
  MapPin,
  MessageCircle,
  Package,
  Plus,
  Search,
  Send,
  Sparkles,
  UserRound,
  Wrench,
  X,
} from 'lucide-react'
import '../../../benchline.css'

type RepairStatus = 'received' | 'diagnosing' | 'waiting-parts' | 'ready' | 'returned'
type RepairCase = {
  caseNumber: string
  itemName: string
  category: string
  problem: string
  station: string
  status: RepairStatus
  nextStep: string
  partsNeeded: string
  assigneeId: string
  assigneeName: string
  demo: boolean
}
type RepairEvent = { caseNumber: string; message: string; tone: string }
type QueueFilter = 'open' | 'parts' | 'ready' | 'all'

const statuses: { value: RepairStatus; label: string }[] = [
  { value: 'received', label: 'New intake' },
  { value: 'diagnosing', label: 'On the bench' },
  { value: 'waiting-parts', label: 'Waiting on parts' },
  { value: 'ready', label: 'Ready for pickup' },
  { value: 'returned', label: 'Returned' },
]
const categories = ['Bicycle', 'Small appliance', 'Clothing & textiles', 'Electronics', 'Other']
const stations = ['Bike stand', 'Electronics bench', 'Textile table', 'General bench']
const starterCases: RepairCase[] = [
  {
    caseNumber: 'RC-024',
    itemName: 'Trek city bike',
    category: 'Bicycle',
    problem: 'Rear brake rubs after the wheel was reinstalled.',
    station: 'Bike stand',
    status: 'waiting-parts',
    nextStep: 'Fit the new cable, then test the brake under load.',
    partsNeeded: 'Universal brake cable · ordered',
    assigneeId: '',
    assigneeName: 'Available',
    demo: true,
  },
  {
    caseNumber: 'RC-023',
    itemName: 'Wool winter coat',
    category: 'Clothing & textiles',
    problem: 'Pocket seam has split, but the fabric is still sound.',
    station: 'Textile table',
    status: 'ready',
    nextStep: 'Pickup at the textile table after 11:00.',
    partsNeeded: 'Charcoal thread',
    assigneeId: '',
    assigneeName: 'Available',
    demo: true,
  },
  {
    caseNumber: 'RC-022',
    itemName: 'Four-slice toaster',
    category: 'Small appliance',
    problem: 'The right side stays cold after a few minutes.',
    station: 'Electronics bench',
    status: 'diagnosing',
    nextStep: 'Test continuity across both heating elements.',
    partsNeeded: 'Check before ordering',
    assigneeId: '',
    assigneeName: 'Available',
    demo: true,
  },
  {
    caseNumber: 'RC-021',
    itemName: 'Brass desk lamp',
    category: 'Electronics',
    problem: 'Lamp flickers when the power cord is moved.',
    station: 'General bench',
    status: 'received',
    nextStep: 'Inspect the plug and cord strain relief.',
    partsNeeded: 'None yet',
    assigneeId: '',
    assigneeName: 'Available',
    demo: true,
  },
]

function statusLabel(status: string) {
  return statuses.find(item => item.value === status)?.label ?? status
}

function shortTime(value: string) {
  return new Date(value).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
}

export default function ShiftboardPage() {
  const { user } = useAuthProfileReady({ requireUser: true })
  const casesQuery = useQuery<RepairCase>('repair-cases', { orderBy: 'createdAt', orderDir: 'desc' })
  const eventsQuery = useQuery<RepairEvent>('repair-events', { orderBy: 'createdAt', orderDir: 'desc', limit: 8 })
  const cases = useMutations<RepairCase>('repair-cases')
  const events = useMutations<RepairEvent>('repair-events')
  const { peers, updateState, connected } = usePresenceRoom('repair-cafe:main-hall')
  const { channels, create: createChannel } = useChannels()
  const [channelId, setChannelId] = useState<string>()
  const { messages, send } = useMessages(channelId)
  const [selectedNumber, setSelectedNumber] = useState('')
  const [filter, setFilter] = useState<QueueFilter>('open')
  const [search, setSearch] = useState('')
  const [nextStep, setNextStep] = useState('')
  const [partsNeeded, setPartsNeeded] = useState('')
  const [draft, setDraft] = useState('')
  const [newRepairOpen, setNewRepairOpen] = useState(false)
  const [toast, setToast] = useState('')
  const [newRepair, setNewRepair] = useState({
    itemName: '',
    category: 'Bicycle',
    problem: '',
    station: 'General bench',
  })
  const seedStarted = useRef(false)

  const userName = user?.name?.trim().split(/\s+/)[0] || 'Volunteer'
  const initials = userName.slice(0, 2).toUpperCase()
  const records = casesQuery.records
  const openCount = records.filter(item => item.data.status !== 'returned').length
  const waitingCount = records.filter(item => item.data.status === 'waiting-parts').length
  const readyCount = records.filter(item => item.data.status === 'ready').length
  const selected = records.find(item => item.data.caseNumber === selectedNumber) ?? records[0]
  const filteredRecords = records.filter(item => {
    const data = item.data
    const matchesFilter =
      filter === 'all' ||
      (filter === 'open' && data.status !== 'returned') ||
      (filter === 'parts' && data.status === 'waiting-parts') ||
      (filter === 'ready' && data.status === 'ready')
    const term = search.trim().toLowerCase()
    const matchesSearch =
      !term ||
      [data.caseNumber, data.itemName, data.category, data.problem, data.station].some(value =>
        value.toLowerCase().includes(term),
      )
    return matchesFilter && matchesSearch
  })
  const hasLiveCase = records.some(item => !item.data.demo)

  useEffect(() => {
    updateState({ onShift: true, location: 'main hall' })
  }, [updateState])

  useEffect(() => {
    if (!selected) return
    setSelectedNumber(selected.data.caseNumber)
    setNextStep(selected.data.nextStep)
    setPartsNeeded(selected.data.partsNeeded)
  }, [selected?.recordId, selected?.data.nextStep, selected?.data.partsNeeded])

  useEffect(() => {
    if (!channelId) {
      const channel = channels.find(item => item.data.name === 'benchline-repair-handoff')
      if (channel) setChannelId(channel.recordId)
    }
  }, [channels, channelId])

  useEffect(() => {
    if (seedStarted.current || casesQuery.status !== 'ready' || eventsQuery.status !== 'ready') return
    seedStarted.current = true
    if (records.length) return
    void (async () => {
      for (const item of starterCases) await cases.createConfirmed(item)
      await events.createConfirmed({
        caseNumber: 'RC-024',
        message: 'Example queue loaded for the repair café shift.',
        tone: 'blue',
      })
    })().catch(error => console.error('Could not initialize the example repair queue', error))
  }, [
    casesQuery.status,
    eventsQuery.status,
    records.length,
    cases.createConfirmed,
    events.createConfirmed,
  ])

  const notify = (message: string) => {
    setToast(message)
    window.setTimeout(() => setToast(''), 2800)
  }
  const logEvent = async (caseNumber: string, message: string, tone: string) => {
    await events.createConfirmed({ caseNumber, message, tone })
  }

  const updateStatus = async (recordId: string, item: RepairCase, status: RepairStatus) => {
    if (item.status === status) return
    try {
      await cases.putConfirmed(recordId, { status })
      await logEvent(item.caseNumber, 'Status moved to ' + statusLabel(status), status === 'ready' ? 'green' : 'blue')
      notify(item.caseNumber + ' · ' + statusLabel(status))
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Could not update the repair')
    }
  }

  const claimCase = async () => {
    if (!selected || !user?.id) return
    try {
      await cases.putConfirmed(selected.recordId, { assigneeId: user.id, assigneeName: userName })
      await logEvent(selected.data.caseNumber, userName + ' picked up this repair', 'green')
      notify('Repair assigned to you')
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Could not assign the repair')
    }
  }

  const saveHandoff = async (event: FormEvent) => {
    event.preventDefault()
    if (!selected) return
    try {
      await cases.putConfirmed(selected.recordId, {
        nextStep: nextStep.trim(),
        partsNeeded: partsNeeded.trim() || 'None',
      })
      await logEvent(selected.data.caseNumber, 'Handoff updated: ' + (nextStep.trim() || 'No next step added'), 'blue')
      notify('Next step saved for the next volunteer')
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Could not save the handoff')
    }
  }

  const addRepair = async (event: FormEvent) => {
    event.preventDefault()
    const itemName = newRepair.itemName.trim()
    const problem = newRepair.problem.trim()
    if (!itemName || !problem) return
    const caseNumber = 'RC-' + window.crypto.randomUUID().slice(0, 5).toUpperCase()
    try {
      await cases.createConfirmed({
        caseNumber,
        itemName,
        category: newRepair.category,
        problem,
        station: newRepair.station,
        status: 'received',
        nextStep: 'Triage the issue and agree on a safe next step.',
        partsNeeded: 'None identified',
        assigneeId: '',
        assigneeName: 'Available',
        demo: false,
      })
      await logEvent(caseNumber, 'Repair accepted into the queue', 'blue')
      setSelectedNumber(caseNumber)
      setNewRepair({ itemName: '', category: 'Bicycle', problem: '', station: 'General bench' })
      setNewRepairOpen(false)
      notify('Repair added to the shift queue')
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Could not add the repair')
    }
  }

  const openHandoffChannel = async () => {
    const existing = channels.find(item => item.data.name === 'benchline-repair-handoff')
    try {
      const id = existing?.recordId ?? await createChannel({
        name: 'benchline-repair-handoff',
        description: 'Volunteer shift handoffs for the community repair café',
      })
      setChannelId(id)
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Could not open the handoff channel')
    }
  }

  const sendHandoffMessage = async (event: FormEvent) => {
    event.preventDefault()
    const content = draft.trim()
    if (!content) return
    try {
      await send(content)
      setDraft('')
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Could not send the handoff note')
    }
  }

  const filters: { value: QueueFilter; label: string; count: number }[] = [
    { value: 'open', label: 'Open', count: openCount },
    { value: 'parts', label: 'Waiting on parts', count: waitingCount },
    { value: 'ready', label: 'Ready for pickup', count: readyCount },
    { value: 'all', label: 'All cases', count: records.length },
  ]

  return (
    <div className="benchline-shell">
      <aside className="bench-sidebar">
        <div className="bench-brand">
          <div className="bench-logo"><Wrench size={19} /></div>
          <div><strong>BENCHLINE</strong><small>REPAIR CAFÉ SHIFTBOARD</small></div>
        </div>

        <div className="event-card">
          <div className="event-card-mark"><Wrench size={15} /></div>
          <div><b>Saturday repair café</b><small>MAIN HALL · COMMUNITY WORKSHOP</small></div>
        </div>

        <div className="sidebar-label">WORK QUEUE</div>
        <nav className="queue-nav" aria-label="Repair filters">
          {filters.map(item => (
            <button
              type="button"
              key={item.value}
              className={'queue-nav-item' + (filter === item.value ? ' active' : '')}
              onClick={() => setFilter(item.value)}
            >
              <span>{item.label}</span><b>{String(item.count).padStart(2, '0')}</b>
            </button>
          ))}
        </nav>

        <div className="sidebar-bottom">
          <div className="shift-status">
            <span className={'status-light' + (connected ? ' online' : '')} />
            <span><b>{connected ? 'Live shift' : 'Connecting to shift'}</b><small>{peers.length + 1} volunteer{peers.length === 0 ? '' : 's'} on the floor</small></span>
          </div>
          <div className="volunteer-profile">
            <div className="volunteer-avatar">{initials}</div>
            <div><b>{userName}</b><small>VOLUNTEER</small></div>
            <UserRound size={16} />
          </div>
        </div>
      </aside>

      <main className="bench-main">
        <header className="bench-topbar">
          <div className="breadcrumb"><span>Community workshop</span><ChevronRight size={14} /><b>Shiftboard</b></div>
          <div className="topbar-live"><span className={'status-light' + (connected ? ' online' : '')} />{connected ? 'SYNCED LIVE' : 'CONNECTING'}</div>
        </header>

        <div className="bench-content">
          <section className="page-heading">
            <div>
              <div className="overline">SATURDAY SESSION <span>·</span> MAIN HALL</div>
              <h1>Keep good things in use.</h1>
              <p>Track each repair from intake to pickup, and leave the next volunteer a clear handoff.</p>
            </div>
            <button className="primary-action" type="button" onClick={() => setNewRepairOpen(true)}>
              <Plus size={16} /> New repair
            </button>
          </section>

          {!hasLiveCase && records.length > 0 && (
            <div className="sample-note"><Sparkles size={15} /><span>Example cases are loaded for the demo. Add a repair to start your own queue.</span></div>
          )}

          <section className="summary-grid" aria-label="Shift summary">
            <article className="summary-card"><div className="summary-icon open-icon"><ClipboardList size={17} /></div><span>OPEN REPAIRS</span><strong>{openCount}</strong><small>Items still in the workshop</small></article>
            <article className="summary-card"><div className="summary-icon parts-icon"><Package size={17} /></div><span>WAITING ON PARTS</span><strong>{waitingCount}</strong><small>Follow up when supplies arrive</small></article>
            <article className="summary-card"><div className="summary-icon ready-icon"><CheckCircle2 size={17} /></div><span>READY FOR PICKUP</span><strong>{readyCount}</strong><small>Repairs waiting for their owners</small></article>
            <article className="summary-card"><div className="summary-icon crew-icon"><UserRound size={17} /></div><span>VOLUNTEERS ON SHIFT</span><strong>{peers.length + 1}</strong><small>Live presence in the main hall</small></article>
          </section>

          <section className="work-grid">
            <article className="surface queue-panel">
              <div className="surface-heading">
                <div><div className="surface-kicker">INTAKE & TRIAGE</div><h2>Repair queue</h2></div>
                <span className="record-count">{filteredRecords.length} shown</span>
              </div>
              <label className="search-box"><Search size={15} /><input value={search} onChange={event => setSearch(event.target.value)} placeholder="Search item, case, or bench" aria-label="Search repair queue" /></label>
              <div className="case-list">
                {casesQuery.status === 'loading' ? (
                  <div className="empty-queue"><CircleDot size={20} /><b>Loading the shared repair queue</b><span>Connecting to the workshop records.</span></div>
                ) : casesQuery.status === 'error' ? (
                  <div className="empty-queue"><Activity size={20} /><b>Queue couldn’t load</b><span>Try refreshing the page after the connection returns.</span></div>
                ) : filteredRecords.length === 0 ? (
                  <div className="empty-queue"><Wrench size={20} /><b>No repairs in this view</b><span>Add a repair or choose another queue filter.</span></div>
                ) : filteredRecords.map(record => (
                  <button
                    type="button"
                    key={record.recordId}
                    className={'case-row' + (selected?.recordId === record.recordId ? ' selected' : '')}
                    onClick={() => setSelectedNumber(record.data.caseNumber)}
                  >
                    <span className="case-row-icon"><Wrench size={16} /></span>
                    <span className="case-row-main">
                      <span className="case-row-title"><b>{record.data.itemName}</b>{record.data.demo && <i>EXAMPLE</i>}</span>
                      <small>{record.data.caseNumber} <span>·</span> {record.data.category}</small>
                      <span className={'status-pill status-' + record.data.status}>{statusLabel(record.data.status)}</span>
                    </span>
                    <ChevronRight size={15} />
                  </button>
                ))}
              </div>
            </article>

            {selected ? (
              <article className="surface detail-panel">
                <div className="surface-heading detail-heading">
                  <div><div className="surface-kicker">CASE {selected.data.caseNumber}</div><h2>{selected.data.itemName}</h2></div>
                  <span className={'status-pill status-' + selected.data.status}>{statusLabel(selected.data.status)}</span>
                </div>
                <div className="case-meta"><span><Wrench size={14} />{selected.data.category}</span><span><MapPin size={14} />{selected.data.station}</span></div>
                <div className="problem-card"><span>REPORTED ISSUE</span><p>{selected.data.problem}</p></div>

                <div className="status-section">
                  <div className="field-label">REPAIR STATUS</div>
                  <div className="status-steps">
                    {statuses.map((item, index) => {
                      const activeIndex = statuses.findIndex(status => status.value === selected.data.status)
                      const complete = index < activeIndex
                      const current = index === activeIndex
                      return (
                        <button
                          type="button"
                          key={item.value}
                          className={'status-step' + (complete ? ' complete' : '') + (current ? ' current' : '')}
                          aria-label={'Set status: ' + item.label}
                          title={item.label}
                          onClick={() => void updateStatus(selected.recordId, selected.data, item.value)}
                        >
                          <span>{complete ? <Check size={12} /> : index + 1}</span><small>{item.label}</small>
                        </button>
                      )
                    })}
                  </div>
                </div>

                <div className="assignee-row">
                  <div className="assignee-avatar"><UserRound size={15} /></div>
                  <div><span>VOLUNTEER</span><b>{selected.data.assigneeName || 'Available to claim'}</b></div>
                  {selected.data.assigneeId === user?.id ? (
                    <span className="assigned-badge">ASSIGNED TO YOU</span>
                  ) : (
                    <button type="button" className="text-action" onClick={() => void claimCase()}>Take this case</button>
                  )}
                </div>

                <form className="handoff-form" onSubmit={saveHandoff}>
                  <label><span className="field-label">PARTS & SUPPLIES</span><input value={partsNeeded} onChange={event => setPartsNeeded(event.target.value)} placeholder="What part is needed, if any?" /></label>
                  <label><span className="field-label">NEXT STEP FOR THE NEXT VOLUNTEER</span><textarea value={nextStep} onChange={event => setNextStep(event.target.value)} placeholder="Leave a clear action or pickup note" rows={3} /></label>
                  <button className="secondary-action" type="submit"><ArrowUpRight size={15} /> Save handoff</button>
                </form>
              </article>
            ) : (
              <article className="surface detail-panel empty-detail"><Wrench size={24} /><h2>Select a repair</h2><p>Choose a case from the queue to update its status and leave a handoff.</p></article>
            )}

            <article className="surface activity-panel">
              <div className="surface-heading"><div><div className="surface-kicker">SHARED RECORDS</div><h2>Recent changes</h2></div><span className="live-tag"><span className="status-light online" />LIVE</span></div>
              <div className="activity-list">
                {eventsQuery.records.length ? eventsQuery.records.slice(0, 6).map(event => (
                  <div className="activity-row" key={event.recordId}>
                    <span className={'activity-mark tone-' + event.data.tone}><Activity size={14} /></span>
                    <div><b>{event.data.message}</b><small>{event.data.caseNumber} <span>·</span> {shortTime(event.createdAt)}</small></div>
                  </div>
                )) : <p className="empty-copy">Case updates and volunteer handoffs will appear here.</p>}
              </div>
            </article>

            <article className="surface handoff-panel">
              <div className="surface-heading"><div><div className="surface-kicker">VOLUNTEER CHAT</div><h2>Shift handoff</h2></div><span className="live-tag"><span className="status-light online" />TEAM</span></div>
              {channelId ? (
                <>
                  <div className="message-list">
                    {messages.slice(-5).length ? messages.slice(-5).map(message => (
                      <div className="message-row" key={message.recordId}>
                        <span className="message-avatar">{message.data.authorId === user?.id ? initials : 'VC'}</span>
                        <div><b>{message.data.authorId === user?.id ? 'You' : 'Volunteer'}</b><p>{message.data.deleted ? 'Message removed' : message.data.content}</p></div>
                      </div>
                    )) : <p className="empty-copy">No handoffs yet. Leave a note for the next volunteer.</p>}
                  </div>
                  <form className="message-compose" onSubmit={sendHandoffMessage}>
                    <input value={draft} onChange={event => setDraft(event.target.value)} placeholder="Share a shift note…" aria-label="Shift handoff note" />
                    <button type="submit" aria-label="Send handoff note" disabled={!draft.trim()}><Send size={15} /></button>
                  </form>
                </>
              ) : (
                <div className="channel-empty">
                  <div className="chat-mark"><MessageCircle size={18} /></div>
                  <p>Keep repair notes and shift changes in one shared place.</p>
                  <button type="button" className="secondary-action" onClick={() => void openHandoffChannel()}>Open team handoff <ArrowUpRight size={14} /></button>
                </div>
              )}
            </article>
          </section>

          <footer className="bench-footer"><span><Wrench size={13} /> Small fixes, shared knowledge.</span><span>BENCHLINE <i>·</i> REPAIR CAFÉ SHIFTBOARD</span></footer>
        </div>
      </main>

      {newRepairOpen && (
        <div className="dialog-backdrop" onClick={() => setNewRepairOpen(false)}>
          <form className="repair-dialog" onClick={event => event.stopPropagation()} onSubmit={addRepair}>
            <button type="button" className="dialog-close" aria-label="Close" onClick={() => setNewRepairOpen(false)}><X size={17} /></button>
            <div className="dialog-icon"><Wrench size={18} /></div>
            <div className="surface-kicker">NEW INTAKE</div>
            <h2>Take in a repair</h2>
            <p>Record the item and issue so a volunteer can triage it at the right bench.</p>
            <label>ITEM<input autoFocus required maxLength={80} value={newRepair.itemName} onChange={event => setNewRepair({ ...newRepair, itemName: event.target.value })} placeholder="e.g. Handheld vacuum" /></label>
            <label>CATEGORY<select value={newRepair.category} onChange={event => setNewRepair({ ...newRepair, category: event.target.value })}>{categories.map(category => <option key={category}>{category}</option>)}</select></label>
            <label>WHAT’S WRONG?<textarea required maxLength={500} rows={3} value={newRepair.problem} onChange={event => setNewRepair({ ...newRepair, problem: event.target.value })} placeholder="Describe the symptom and what the owner has tried." /></label>
            <label>BEST BENCH<select value={newRepair.station} onChange={event => setNewRepair({ ...newRepair, station: event.target.value })}>{stations.map(station => <option key={station}>{station}</option>)}</select></label>
            <button className="primary-action dialog-submit" type="submit"><Plus size={15} /> Add to repair queue</button>
          </form>
        </div>
      )}
      {toast && <div className="bench-toast"><Check size={15} />{toast}</div>}
    </div>
  )
}