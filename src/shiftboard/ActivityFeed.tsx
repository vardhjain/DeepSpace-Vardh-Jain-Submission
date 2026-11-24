import { memo } from 'react'
import { Activity } from 'lucide-react'
import { shortTime } from './logic'

export type RepairEvent = { caseNumber: string; message: string; tone: string }
type EventRecord = { recordId: string; createdAt: string; data: RepairEvent }

export const ActivityFeed = memo(function ActivityFeed({ events }: { events: EventRecord[] }) {
  return (
    <article className="surface activity-panel">
      <div className="surface-heading"><div><div className="surface-kicker">SHARED RECORDS</div><h2>Recent changes</h2></div><span className="live-tag"><span className="status-light online" />LIVE</span></div>
      <div className="activity-list">
        {events.length ? events.map(event => (
          <div className="activity-row" key={event.recordId}>
            <span className={'activity-mark tone-' + event.data.tone}><Activity size={14} /></span>
            <div><b>{event.data.message}</b><small>{event.data.caseNumber} <span>·</span> {shortTime(event.createdAt)}</small></div>
          </div>
        )) : <p className="empty-copy">Case updates and volunteer handoffs will appear here.</p>}
      </div>
    </article>
  )
})
