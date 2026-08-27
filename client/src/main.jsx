import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { OrganizationProvider } from './contexts/OrganizationContext.jsx'
import { AuthProvider } from './contexts/AuthContext.jsx'
import App from './App.jsx'
import './index.css'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 10000,
    }
  }
})

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <OrganizationProvider>
          <AuthProvider>
            <App />
          </AuthProvider>
        </OrganizationProvider>
      </BrowserRouter>
    </QueryClientProvider>
  </React.StrictMode>,
)
