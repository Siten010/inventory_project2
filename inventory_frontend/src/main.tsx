import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import AppSample from './AppSample'
// import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {/* <App /> */}
    <AppSample />
  </StrictMode>,
)
