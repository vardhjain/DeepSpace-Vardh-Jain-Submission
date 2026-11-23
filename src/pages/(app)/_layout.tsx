import { Suspense, type ReactNode } from 'react'
import { Outlet } from 'react-router-dom'
import { DeepSpaceAuthProvider, RecordProvider, RecordScope, AgentTools, useAuthStatus } from 'deepspace'
import { useToast } from '@/components/ui'
import { APP_NAME, SCOPE_ID } from '../../constants'
import { schemas } from '../../schemas'

export default function AppLayout() {
  return (
    <DeepSpaceAuthProvider>
      <title>{APP_NAME}</title>
      <AuthBoot>
        <div className="min-h-screen bg-background text-foreground">
          <Suspense fallback={<div className="min-h-screen bg-background" aria-busy="true" />}>
            <Outlet />
          </Suspense>
        </div>
      </AuthBoot>
    </DeepSpaceAuthProvider>
  )
}

function AuthBoot({ children }: { children: ReactNode }) {
  const { isLoaded, isSignedIn } = useAuthStatus()
  const { error, warning } = useToast()
  if (!isLoaded || !isSignedIn) return <>{children}</>
  return (
    <RecordProvider onWriteError={e => e.kind === 'permission' ? warning(e.title, e.detail) : error(e.title, e.detail)}>
      <RecordScope roomId={SCOPE_ID} schemas={schemas}>
        <AgentTools />
        {children}
      </RecordScope>
    </RecordProvider>
  )
}

