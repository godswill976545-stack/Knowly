import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { ClerkProvider } from '@clerk/clerk-react'
import './index.css'
import App from './App.jsx'

const CLERK_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY

const clerkAppearance = {
  variables: {
    fontFamily: "'Inter', system-ui, sans-serif",
    colorPrimary: '#131b2e',
    colorBackground: '#ffffff',
    colorText: '#0b1c30',
    colorInputBackground: '#ffffff',
    colorInputText: '#0b1c30',
    borderRadius: '0.5rem',
  },
}

function Root() {
  if (CLERK_KEY) {
    return (
      <ClerkProvider publishableKey={CLERK_KEY} appearance={clerkAppearance}>
        <App />
      </ClerkProvider>
    )
  }
  return <App />
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Root />
  </StrictMode>,
)
