import { Link } from 'react-router-dom'
import { Seo } from '../components/Seo'
import { APP_NAME } from '../constants'
import { seo } from '../seo'

export default function Landing() {
  return (
    <>
      <Seo {...seo} path="/" />
      <div data-testid="static-landing" className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
        <p className="mb-3 text-sm uppercase tracking-widest text-muted-foreground">{APP_NAME} · FLIGHT OPERATIONS</p>
        <h1 className="mb-4 max-w-2xl text-4xl font-bold tracking-tight text-foreground sm:text-5xl">A mission desk for the long way out</h1>
        <p className="mb-8 max-w-md text-muted-foreground">Shared mission planning, live crew presence, and handoff notes for a deep-space expedition.</p>
        <Link to="/home" className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90">Enter the flight deck</Link>
      </div>
    </>
  )
}
