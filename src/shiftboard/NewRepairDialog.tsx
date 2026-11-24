import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react'
import { Plus, Wrench, X } from 'lucide-react'
import { categories, stations } from './logic'

export type NewRepair = { itemName: string; category: string; problem: string; station: string }
const empty: NewRepair = { itemName: '', category: 'Bicycle', problem: '', station: 'General bench' }

type Props = { onClose: () => void; onSubmit: (repair: NewRepair) => Promise<boolean> }

const FOCUSABLE = 'button, input, select, textarea, [href], [tabindex]:not([tabindex="-1"])'

export function NewRepairDialog({ onClose, onSubmit }: Props) {
  const [repair, setRepair] = useState(empty)
  const form = useRef<HTMLFormElement>(null)

  // Hand focus back to whatever opened the dialog once it closes.
  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null
    return () => opener?.focus()
  }, [])

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (!repair.itemName.trim() || !repair.problem.trim()) return
    if (await onSubmit(repair)) setRepair(empty)
  }

  // Escape closes; Tab wraps inside the dialog so focus cannot reach the board behind it.
  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key === 'Escape') {
      onClose()
      return
    }
    if (event.key !== 'Tab' || !form.current) return
    const items = Array.from(form.current.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(el => !el.hasAttribute('disabled'))
    const first = items[0]
    const last = items[items.length - 1]
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault()
      last.focus()
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault()
      first.focus()
    }
  }

  return (
    <div className="dialog-backdrop" onClick={onClose}>
      <form
        ref={form}
        className="repair-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="new-repair-title"
        onClick={event => event.stopPropagation()}
        onKeyDown={onKeyDown}
        onSubmit={submit}
      >
        <button type="button" className="dialog-close" aria-label="Close" onClick={onClose}><X size={17} /></button>
        <div className="dialog-icon"><Wrench size={18} /></div>
        <div className="surface-kicker">NEW INTAKE</div>
        <h2 id="new-repair-title">Take in a repair</h2>
        <p>Record the item and issue so a volunteer can triage it at the right bench.</p>
        <label>ITEM<input autoFocus required maxLength={80} value={repair.itemName} onChange={event => setRepair({ ...repair, itemName: event.target.value })} placeholder="e.g. Handheld vacuum" /></label>
        <label>CATEGORY<select value={repair.category} onChange={event => setRepair({ ...repair, category: event.target.value })}>{categories.map(category => <option key={category}>{category}</option>)}</select></label>
        <label>WHAT’S WRONG?<textarea required maxLength={500} rows={3} value={repair.problem} onChange={event => setRepair({ ...repair, problem: event.target.value })} placeholder="Describe the symptom and what the owner has tried." /></label>
        <label>BEST BENCH<select value={repair.station} onChange={event => setRepair({ ...repair, station: event.target.value })}>{stations.map(station => <option key={station}>{station}</option>)}</select></label>
        <button className="primary-action dialog-submit" type="submit"><Plus size={15} /> Add to repair queue</button>
      </form>
    </div>
  )
}
