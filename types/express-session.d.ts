import type { UserInfo } from '../lib/yahoo.ts'

// Values this app keeps in the session.
declare module 'express-session' {
  interface SessionData {
    // Issued on the top page and compared with the `state` returned to /inspection.
    state: string
    nonce: string
    // Set only after the authorization code flow completes.
    isAuthenticatedUser: boolean
    userInfo: UserInfo
  }
}
