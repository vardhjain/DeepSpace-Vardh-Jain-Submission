import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { isWriterRole, useAuthProfileReady, usePresenceRoom, useQuery, useUser } from 'deepspace'
import { ChevronRight, ClipboardList, CheckCircle2, Package, Plus, Sparkles, UserRound, Wrench, Check } from 'lucide-react'
import '../../../benchline.css'
import type { RepairCase } from '../../../repair-examples'
import { ActivityFeed, type RepairEvent } from '../../../shiftboard/ActivityFeed'
import { callAction } from '../../../shiftboard/call-action'
import { CaseDetail } from '../../../shiftboard/CaseDetail'
import { HandoffChat } from '../../../shiftboard/HandoffChat'
import { countCases, filterCases, pickSelected, type QueueFilter } from '../../../shiftboard/logic'
import { NewRepairDialog, type NewRepair } from '../../../shiftboard/NewRepairDialog'
import { QueueList } from '../../../shiftboard/QueueList'

export default function ShiftboardPage() {
  const { user } = useAuthProfileReady({ requireUser: true })
  const { user: roomUser } = useUser()
  // Viewers are read-only in the schema; hide write controls instead of
  // letting them click into a permission error.
  const canWrite = roomUser ? isWriterRole(roomUser.role) : false
  const casesQuery = useQuery<RepairCase>('repair-cases', { orderBy: 'createdAt', orderDir: 'desc' })
  const eventsQuery = useQuery<RepairEvent>('repair-events', { orderBy: 'createdAt', orderDir: 'desc', limit: 6 })
  const { peers, updateState, connected } = usePresenceRoom('repair-cafe:main-hall')
  const [selectedId, setSelectedId] = useState('')
  const [filter, setFilter] = useState<QueueFilter>('open')
  const [search, setSearch] = useState('')
  const [newRepairOpen, setNewRepairOpen] = useState(false)
  const [toast, setToast] = useState('')
  const seedStarted = useRef(false)
  const toastTimer = useRef<number | undefined>(undefined)

  const userName = user?.name?.trim().split(/\s+/)[0] || 'Volunteer'
  const initials = userName.slice(0, 2).toUpperCase()
  const records = casesQuery.records
  const counts = useMemo(() => countCases(records), [records])
  const visible = useMemo(() => filterCases(records, filter, search), [records, filter, search])
  // Keep the detail panel on a case the current filter actually shows.
  const selected = pickSelected(visible, selectedId)
  const hasLiveCase = records.some(item => !item.data.demo)

  useEffect(() => {
    updateState({ onShift: true, location: 'main hall' })
  }, [updateState])

  // Public display name for chat. A fixed record id makes this an upsert, so
  // two tabs cannot create two rows for one volunteer.
  useEffect(() => {
    if (user?.id) void callAction('register-volunteer', { name: userName })
  }, [user?.id, userName])

  useEffect(() => {
    if (seedStarted.current || !canWrite || casesQuery.status !== 'ready') return
    seedStarted.current = true
    if (records.length) return
    // Seeding runs server-side (src/actions) so racing first visitors can't
    // duplicate the example queue.
    void callAction('seed-examples').then(result => {
      if (!result.success) console.error('Could not initialize the example repair queue', result.error)
    })
  }, [canWrite, casesQuery.status, records.length])

  const notify = useCallback((message: string) => {
    setToast(message)
    window.clearTimeout(toastTimer.current)
    toastTimer.current = window.setTimeout(() => setToast(''), 2800)
  }, [])

  const addRepair = async (repair: NewRepair) => {
    const result = await callAction<{ recordId: string }>('add-repair', repair)
    if (!result.success) {
      notify(result.error)
      return false
    }
    setSelectedId(result.data.recordId)
    setNewRepairOpen(false)
    notify('Repair added to the shift queue')
    return true
  }

  const filters: { value: QueueFilter; label: string; count: number }[] = [
    { value: 'open', label: 'Open', count: counts.open },
    { value: 'parts', label: 'Waiting on parts', count: counts.parts },
    { value: 'ready', label: 'Ready for pickup', count: counts.ready },
    { value: 'all', label: 'All cases', count: counts.all },
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
            <button className="primary-action" type="button" disabled={!canWrite} title={canWrite ? undefined : 'Viewers can read the queue but not change it'} onClick={() => setNewRepairOpen(true)}>
              <Plus size={16} /> New repair
            </button>
          </section>

          {!hasLiveCase && records.length > 0 && (
            <div className="sample-note"><Sparkles size={15} /><span>Example cases are loaded for the demo. Add a repair to start your own queue.</span></div>
          )}

          <section className="summary-grid" aria-label="Shift summary">
            <article className="summary-card"><div className="summary-icon open-icon"><ClipboardList size={17} /></div><span>OPEN REPAIRS</span><strong>{counts.open}</strong><small>Items still in the workshop</small></article>
            <article className="summary-card"><div className="summary-icon parts-icon"><Package size={17} /></div><span>WAITING ON PARTS</span><strong>{counts.parts}</strong><small>Follow up when supplies arrive</small></article>
            <article className="summary-card"><div className="summary-icon ready-icon"><CheckCircle2 size={17} /></div><span>READY FOR PICKUP</span><strong>{counts.ready}</strong><small>Repairs waiting for their owners</small></article>
            <article className="summary-card"><div className="summary-icon crew-icon"><UserRound size={17} /></div><span>VOLUNTEERS ON SHIFT</span><strong>{peers.length + 1}</strong><small>Live presence in the main hall</small></article>
          </section>

          <section className="work-grid">
            <QueueList
              records={visible}
              loadState={casesQuery.status}
              selectedId={selected?.recordId}
              search={search}
              onSearch={setSearch}
              onSelect={setSelectedId}
            />

            {selected ? (
              <CaseDetail
                key={selected.recordId}
                record={selected}
                canWrite={canWrite}
                userId={user?.id ?? ''}
                userName={userName}
                notify={notify}
              />
            ) : (
              <article className="surface detail-panel empty-detail"><Wrench size={24} /><h2>Select a repair</h2><p>Choose a case from the queue to update its status and leave a handoff.</p></article>
            )}

            <ActivityFeed events={eventsQuery.records} />
            <HandoffChat userId={user?.id ?? ''} initials={initials} notify={notify} />
          </section>

          <footer className="bench-footer"><span><Wrench size={13} /> Small fixes, shared knowledge.</span><span>BENCHLINE <i>·</i> REPAIR CAFÉ SHIFTBOARD</span></footer>
        </div>
      </main>

      {newRepairOpen && <NewRepairDialog onClose={() => setNewRepairOpen(false)} onSubmit={addRepair} />}
      {toast && <div className="bench-toast"><Check size={15} />{toast}</div>}
    </div>
  )
}
