import { Component } from 'react'

// React can only catch rendering crashes with a class component (there is no hook for it), so this is
// the one class in the app. It stops a bug anywhere from showing a blank white screen.
export default class ErrorBoundary extends Component {
  state = { failed: false }

  static getDerivedStateFromError() {
    return { failed: true }
  }

  componentDidCatch(error) {
    console.error('[VirtualFit] unexpected error', error)
  }

  render() {
    if (!this.state.failed) return this.props.children
    return (
      <div role="alert" className="grid min-h-screen place-items-center bg-fog px-4">
        <div className="max-w-md rounded-2xl border border-line bg-white p-8 text-center">
          <h1 className="text-2xl font-bold">Something went wrong</h1>
          <p className="mt-2 text-muted">An unexpected error stopped this page. Your data is safe. Reloading usually fixes it.</p>
          <button type="button" onClick={() => window.location.assign('/')} className="mt-6 inline-flex h-11 items-center rounded-lg bg-ink px-5 text-sm font-medium text-white hover:bg-black">
            Reload VirtualFit
          </button>
        </div>
      </div>
    )
  }
}
