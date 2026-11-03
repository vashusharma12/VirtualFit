// Every analyzer failure has a stable code so the UI can offer the right next step.
export class AnalyzeError extends Error {
  // `retryable`: the page as downloaded may just be an empty shell that a browser could fill in.
  constructor(code, message, { retryable = false } = {}) {
    super(message)
    this.code = code
    this.retryable = retryable
  }
}

export const STATUS_FOR_CODE = {
  invalid_url: 400,
  blocked_host: 400,
  not_html: 422,
  no_product_data: 422,
  not_a_product_page: 422,
  not_clothing: 422,
  too_large: 422,
  blocked_by_site: 502,
  fetch_failed: 502,
  timeout: 504,
  chart_reader_unavailable: 501,
  chart_unreadable: 422,
  chart_reader_busy: 503,
  chart_reader_failed: 502,
  chart_reader_auth: 502,
}
