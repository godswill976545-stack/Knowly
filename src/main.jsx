import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { ClerkProvider } from '@clerk/clerk-react'
import './index.css'
import App from './App.jsx'

const CLERK_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY

const clerkAppearance = {
  variables: {
    fontFamily: "'Nunito Sans', system-ui, sans-serif",
    colorPrimary: '#18803d',
    colorBackground: '#ffffff',
    colorText: '#2b2118',
    colorInputBackground: '#ffffff',
    colorInputText: '#2b2118',
    borderRadius: '0.75rem',
  },
  elements: {
    // UserButton popover — themed to match the app card look
    userButtonPopoverCard: 'mc-clerk-pop',
    userButtonPopoverMain: 'mc-clerk-main',
    userButtonPopoverHeader: 'mc-clerk-head',
    userButtonPopoverFooter: 'mc-clerk-foot',
    avatarBox: 'mc-clerk-avatar',
    userPreviewSecondaryIdentifier: 'mc-clerk-email',
    badge: 'mc-clerk-hide',
  },
}

function Root() {
  if (CLERK_KEY) {
    return (
      <ClerkProvider
        publishableKey={CLERK_KEY}
        appearance={clerkAppearance}
        signInFallbackRedirectUrl="/"
        signUpFallbackRedirectUrl="/"
        afterSignOutUrl="/"
      >
        <App />
      </ClerkProvider>
    )
  }
  return <App />
}

if (!document.documentElement.lang) {
  document.documentElement.lang = 'fr'
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Root />
  </StrictMode>,
)
