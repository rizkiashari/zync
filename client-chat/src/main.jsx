import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { Provider } from 'react-redux'
import './index.css'
import App from './App.jsx'
import { store } from './store/index.js'
import { AuthProvider } from './context/AuthContext.jsx'
import { SocketProvider } from './context/SocketContext.jsx'
import { CallProvider } from './context/CallContext.jsx'
import { WorkspaceProvider } from './context/WorkspaceContext.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Provider store={store}>
      <BrowserRouter>
        <AuthProvider>
          <WorkspaceProvider>
            <SocketProvider>
              <CallProvider>
                <App />
              </CallProvider>
            </SocketProvider>
          </WorkspaceProvider>
        </AuthProvider>
      </BrowserRouter>
    </Provider>
  </StrictMode>,
)
