local M = {
  tcp_port = 4011,
  http_port = 4010,
  auto_refresh = true,
  auto_open = true,  -- open browser automatically on :ActDiagram
  browser = nil,     -- browser executable or macOS app name (e.g. "Arc", "Firefox", "google-chrome")
}

--- Valid config keys (needed because some defaults are nil)
M._keys = { tcp_port = true, http_port = true, auto_refresh = true, auto_open = true, browser = true }

return M
