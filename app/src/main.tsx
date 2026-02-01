import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { TestingModeProvider } from './ui/context'
import { ActivityLogProvider } from './ui/components'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <TestingModeProvider>
      <ActivityLogProvider>
        <App />
      </ActivityLogProvider>
    </TestingModeProvider>
  </StrictMode>,
)
