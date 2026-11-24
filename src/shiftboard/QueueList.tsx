import { memo } from 'react'
import { Activity, ChevronRight, CircleDot, Search, Wrench } from 'lucide-react'
import { statusLabel, type CaseRecord } from './logic'

type Props = {
  records: CaseRecord[]
  loadState: 'loading' | 'error' | 'ready'
  selectedId: string | undefined
  search: string
  onSearch: (value: string) => void
  onSelect: (recordId: string) => void
}

export const QueueList = memo(function QueueList({ records, loadState, selectedId, search, onSearch, onSelect }: Props) {
  return (
    <article className="surface queue-panel">
      <div className="surface-heading">
        <div><div className="surface-kicker">INTAKE & TRIAGE</div><h2>Repair queue</h2></div>
        <span className="record-count">{records.length} shown</span>
      </div>
      <label className="search-box"><Search size={15} /><input value={search} onChange={event => onSearch(event.target.value)} placeholder="Search item, case, or bench" aria-label="Search repair queue" /></label>
      <div className="case-list">
        {loadState === 'loading' ? (
          <div className="empty-queue"><CircleDot size={20} /><b>Loading the shared repair queue</b><span>Connecting to the workshop records.</span></div>
        ) : loadState === 'error' ? (
          <div className="empty-queue"><Activity size={20} /><b>Queue couldn’t load</b><span>Try refreshing the page after the connection returns.</span></div>
        ) : records.length === 0 ? (
          <div className="empty-queue"><Wrench size={20} /><b>No repairs in this view</b><span>Add a repair or choose another queue filter.</span></div>
        ) : records.map(record => (
          <button
            type="button"
            key={record.recordId}
            className={'case-row' + (selectedId === record.recordId ? ' selected' : '')}
            onClick={() => onSelect(record.recordId)}
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
  )
})
