import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import { initSentry } from './lib/sentry'
import { initInstallCapture } from './lib/installApp'

initSentry()
initInstallCapture()

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').then((reg) => {
      // Check for updates periodically while app is open
      setInterval(() => {
        try {
          reg.update()
        } catch (_) {}
      }, 60 * 60 * 1000)
    }).catch(() => {})
  })
}
