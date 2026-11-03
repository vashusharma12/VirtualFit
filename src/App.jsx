import { BrowserRouter } from 'react-router-dom'
import AppRoutes from './routes/AppRoutes'
import AppBootstrap from './components/layout/AppBootstrap'
import SaveStatusToast from './components/layout/SaveStatusToast'
import ErrorBoundary from './components/layout/ErrorBoundary'

export default function App() {
  return (
    <ErrorBoundary>
      <AppBootstrap>
        <BrowserRouter>
          <AppRoutes />
          <SaveStatusToast />
        </BrowserRouter>
      </AppBootstrap>
    </ErrorBoundary>
  )
}
