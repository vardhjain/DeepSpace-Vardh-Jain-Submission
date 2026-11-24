import { memo, useEffect, useMemo, useState, type FormEvent } from 'react'
import { useChannels, useMessages, useQuery } from 'deepspace'
import { ArrowUpRight, MessageCircle, Send } from 'lucide-react'
import { callAction } from './call-action'

const CHANNEL_NAME = 'benchline-repair-handoff'
type Volunteer = { userId: string; name: string }

type Props = { userId: string; initials: string; notify: (message: string) => void }

/**
 * Team handoff chat. The draft lives here so typing a shift note does not
 * re-render the board, and the channel is opened by a server action with a
 * fixed id so two volunteers opening it together cannot create two channels.
 */
export const HandoffChat = memo(function HandoffChat({ userId, initials, notify }: Props) {
  const { channels } = useChannels()
  const [channelId, setChannelId] = useState<string>()
  const { messages, send } = useMessages(channelId)
  const volunteers = useQuery<Volunteer>('volunteers')
  const [draft, setDraft] = useState('')

  // First record per userId wins, matching how names were looked up before.
  const names = useMemo(() => {
    const map = new Map<string, string>()
    for (const item of volunteers.records) {
      if (!map.has(item.data.userId)) map.set(item.data.userId, item.data.name || 'Volunteer')
    }
    return map
  }, [volunteers.records])

  useEffect(() => {
    if (channelId) return
    const channel = channels.find(item => item.data.name === CHANNEL_NAME)
    if (channel) setChannelId(channel.recordId)
  }, [channels, channelId])

  const open = async () => {
    const result = await callAction<{ recordId: string }>('open-handoff-channel')
    if (result.success) setChannelId(result.data.recordId)
    else notify(result.error)
  }

  const submit = async (event: FormEvent) => {
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

  const recent = messages.slice(-5)
  const nameFor = (id: string) => names.get(id) ?? 'Volunteer'

  return (
    <article className="surface handoff-panel">
      <div className="surface-heading"><div><div className="surface-kicker">VOLUNTEER CHAT</div><h2>Shift handoff</h2></div><span className="live-tag"><span className="status-light online" />TEAM</span></div>
      {channelId ? (
        <>
          <div className="message-list">
            {recent.length ? recent.map(message => (
              <div className="message-row" key={message.recordId}>
                <span className="message-avatar">{message.data.authorId === userId ? initials : nameFor(message.data.authorId).slice(0, 2).toUpperCase()}</span>
                <div><b>{message.data.authorId === userId ? 'You' : nameFor(message.data.authorId)}</b><p>{message.data.deleted ? 'Message removed' : message.data.content}</p></div>
              </div>
            )) : <p className="empty-copy">No handoffs yet. Leave a note for the next volunteer.</p>}
          </div>
          <form className="message-compose" onSubmit={submit}>
            <input value={draft} onChange={event => setDraft(event.target.value)} placeholder="Share a shift note…" aria-label="Shift handoff note" />
            <button type="submit" aria-label="Send handoff note" disabled={!draft.trim()}><Send size={15} /></button>
          </form>
        </>
      ) : (
        <div className="channel-empty">
          <div className="chat-mark"><MessageCircle size={18} /></div>
          <p>Keep repair notes and shift changes in one shared place.</p>
          <button type="button" className="secondary-action" onClick={() => void open()}>Open team handoff <ArrowUpRight size={14} /></button>
        </div>
      )}
    </article>
  )
})
