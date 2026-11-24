/**
 * Gated routes. Any file under src/pages/(app)/(protected)/ requires sign-in.
 * The parent app layout keeps RecordRoom connections closed until the user is
 * authenticated. Pending or signed-out visitors get the join screen below.
 */

import { useState } from 'react'
import { Link, Outlet } from 'react-router-dom'
import { AuthOverlay, useAuthStatus } from 'deepspace'
import { Wrench } from 'lucide-react'
import '../../../benchline.css'

export default function ProtectedLayout() {
  const { isLoaded, isSignedIn } = useAuthStatus()
  if (!isLoaded || !isSignedIn) return <SignedOutPanel />
  return <Outlet />
}

function SignedOutPanel() {
  const [showAuthModal, setShowAuthModal] = useState(false)

  return (
    <main className="bench-signin-shell" data-testid="signed-out-panel">
      <section className="bench-signin-card">
        <div className="bench-logo"><Wrench size={19} /></div>
        <div className="surface-kicker">COMMUNITY REPAIR TEAM</div>
        <h1>Join the repair shift</h1>
        <p>Sign in to log new repairs, claim a bench, and leave handoffs the next volunteer can use.</p>
        <button type="button" className="primary-action" onClick={() => setShowAuthModal(true)}>
          Sign in to the shiftboard
        </button>
        <Link to="/" className="bench-back-link">Back to overview</Link>
      </section>
      {showAuthModal && <AuthOverlay onClose={() => setShowAuthModal(false)} />}
    </main>
  )
}