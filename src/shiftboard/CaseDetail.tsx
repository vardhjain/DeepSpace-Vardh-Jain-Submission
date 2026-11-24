import { memo, useEffect, useRef, useState, type FormEvent } from 'react'
import { ArrowUpRight, Check, MapPin, UserRound, Wrench } from 'lucide-react'
import { callAction } from './call-action'
import { handoffIsStale, statusLabel, statuses, type CaseRecord } from './logic'

type Props = {
  record: CaseRecord
  canWrite: boolean
  userId: string
  userName: string
  notify: (message: string) => void
}

/**
 * Detail panel for one case. It owns the handoff draft so typing here does not
 * re-render the rest of the board. The parent keys it by record id, so
 * switching cases starts a fresh draft.
 */
export const CaseDetail = memo(function CaseDetail({ record, canWrite, userId, userName, notify }: Props) {
  const { data } = record
  const [nextStep, setNextStep] = useState(data.nextStep)
  const [partsNeeded, setPartsNeeded] = useState(data.partsNeeded)
  const [dirty, setDirty] = useState(false)
  const [stale, setStale] = useState(false)
  // The saved text the draft started from; the server compares against it.
  const base = useRef({ nextStep: data.nextStep, partsNeeded: data.partsNeeded })

  useEffect(() => {
    const saved = { nextStep: data.nextStep, partsNeeded: data.partsNeeded }
    if (dirty) {
      // Someone else saved while we were typing: keep the draft and say so.
      if (handoffIsStale(base.current, saved, true)) setStale(true)
      return
    }
    base.current = saved
    setNextStep(saved.nextStep)
    setPartsNeeded(saved.partsNeeded)
    setStale(false)
  }, [data.nextStep, data.partsNeeded, dirty])

  const run = async (name: string, params: Record<string, unknown>, success: string) => {
    const result = await callAction(name, { recordId: record.recordId, name: userName, ...params })
    if (result.success) {
      notify(success)
      return true
    }
    notify(result.error)
    return false
  }

  const holder = data.assigneeId
  const claim = () => {
    if (holder && holder !== userId && !window.confirm(data.assigneeName + ' is working on this repair. Take it over?')) return
    void run('claim-case', { expectedHolderId: holder }, 'Repair assigned to you')
  }

  const saveHandoff = async (event: FormEvent) => {
    event.preventDefault()
    const result = await callAction('save-handoff', {
      recordId: record.recordId,
      nextStep,
      partsNeeded,
      baseNextStep: base.current.nextStep,
      basePartsNeeded: base.current.partsNeeded,
      // Saving over a handoff the volunteer was already warned about is a choice.
      force: stale,
    })
    if (result.success) {
      const saved = { nextStep: nextStep.trim(), partsNeeded: partsNeeded.trim() || 'None' }
      base.current = saved
      setNextStep(saved.nextStep)
      setPartsNeeded(saved.partsNeeded)
      setDirty(false)
      setStale(false)
      notify('Next step saved for the next volunteer')
    } else {
      if (result.code === 'conflict') setStale(true)
      notify(result.error)
    }
  }

  const activeIndex = statuses.findIndex(status => status.value === data.status)

  return (
    <article className="surface detail-panel">
      <div className="surface-heading detail-heading">
        <div><div className="surface-kicker">CASE {data.caseNumber}</div><h2>{data.itemName}</h2></div>
        <span className={'status-pill status-' + data.status}>{statusLabel(data.status)}</span>
      </div>
      <div className="case-meta"><span><Wrench size={14} />{data.category}</span><span><MapPin size={14} />{data.station}</span></div>
      <div className="problem-card"><span>REPORTED ISSUE</span><p>{data.problem}</p></div>

      <div className="status-section">
        <div className="field-label">REPAIR STATUS</div>
        <div className="status-steps">
          {statuses.map((item, index) => {
            const complete = index < activeIndex
            const current = index === activeIndex
            return (
              <button
                type="button"
                key={item.value}
                className={'status-step' + (complete ? ' complete' : '') + (current ? ' current' : '')}
                aria-label={'Set status: ' + item.label}
                disabled={!canWrite}
                title={item.label}
                onClick={() => void run('update-status', { status: item.value }, data.caseNumber + ' · ' + item.label)}
              >
                <span>{complete ? <Check size={12} /> : index + 1}</span><small>{item.label}</small>
              </button>
            )
          })}
        </div>
      </div>

      <div className="assignee-row">
        <div className="assignee-avatar"><UserRound size={15} /></div>
        <div><span>VOLUNTEER</span><b>{data.assigneeName || 'Available to claim'}</b></div>
        {holder === userId ? (
          <>
            <span className="assigned-badge">ASSIGNED TO YOU</span>
            {canWrite && <button type="button" className="text-action" onClick={() => void run('release-case', {}, 'Repair is available for another volunteer')}>Release</button>}
          </>
        ) : canWrite ? (
          <button type="button" className="text-action" onClick={claim}>
            {holder ? 'Take over' : 'Take this case'}
          </button>
        ) : null}
      </div>

      <form className="handoff-form" onSubmit={saveHandoff}>
        <label><span className="field-label">PARTS & SUPPLIES</span><input value={partsNeeded} readOnly={!canWrite} onChange={event => { setPartsNeeded(event.target.value); setDirty(true) }} placeholder="What part is needed, if any?" /></label>
        <label><span className="field-label">NEXT STEP FOR THE NEXT VOLUNTEER</span><textarea value={nextStep} readOnly={!canWrite} onChange={event => { setNextStep(event.target.value); setDirty(true) }} placeholder="Leave a clear action or pickup note" rows={3} /></label>
        {stale && <p className="handoff-stale" role="status">Another volunteer updated this handoff. Saving will replace their version.</p>}
        {canWrite && <button className="secondary-action" type="submit"><ArrowUpRight size={15} /> Save handoff</button>}
      </form>
    </article>
  )
})
