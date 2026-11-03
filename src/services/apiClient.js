import axios from 'axios'

// Real backend by default. Set VITE_USE_MOCK=true to run the frontend alone with local mock services.
export const USE_MOCK = import.meta.env.VITE_USE_MOCK === 'true'

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  withCredentials: true, // the session lives in an httpOnly cookie; no token is ever visible to JavaScript
  timeout: 15000,
})

apiClient.interceptors.response.use(
  (res) => res,
  (err) => {
    const status = err.response?.status
    let message = err.response?.data?.message
    // No JSON message from the API means it never answered. In development, Vite's proxy replies with an
    // empty 500/502/503/504 when the API server is not running, so treat that the same as "no response".
    const unreachable = !err.response || ([500, 502, 503, 504].includes(status) && !message)
    if (!message) {
      message = unreachable
        ? 'Cannot reach the VirtualFit server. Start everything with "npm run dev" (it runs the website and the server together), then try again. To use the website alone, set VITE_USE_MOCK=true in .env.local.'
        : 'Something went wrong. Please try again.'
    }
    // An expired session on a normal request logs the user out (auth endpoints handle their own 401s).
    if (status === 401 && !err.config?.url?.startsWith('/auth/')) {
      window.dispatchEvent(new Event('virtualfit:unauthorized'))
    }
    const error = new Error(message)
    error.status = status
    error.code = err.response?.data?.code
    return Promise.reject(error)
  },
)

export const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
