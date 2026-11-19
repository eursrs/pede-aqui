import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { AuthProvider } from './auth/AuthContext'
import OwnerApp from './OwnerApp'
import './app.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <OwnerApp />
    </AuthProvider>
  </StrictMode>,
)
