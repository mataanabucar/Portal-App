const fs = require('fs')
const path = require('path')
const { spawn } = require('child_process')
const express = require('express')
const dotenv = require('dotenv')

const appDir = __dirname
dotenv.config({ path: path.join(appDir, '..', '.env'), override: true, quiet: true })
dotenv.config({ path: path.join(appDir, '.env'), override: true, quiet: true })

function firstNonEmpty(...values) {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) return value.trim()
  }
  return ''
}

function envFlagEnabled(value, defaultValue = false) {
  if (value == null || String(value).trim() === '') return defaultValue
  return ['1', 'true', 'yes', 'on'].includes(String(value).trim().toLowerCase())
}

function normalizeScopes(value) {
  const raw = Array.isArray(value) ? value : String(value || '').split(/\s+/)
  return [...new Set(['openid', 'offline_access', ...raw.filter(Boolean)])].join(' ')
}

function readTokenCache(filePath) {
  const fullPath = path.resolve(appDir, filePath)
  if (!fs.existsSync(fullPath)) return null
  try {
    return JSON.parse(fs.readFileSync(fullPath, 'utf8'))
  } catch {
    return null
  }
}

function writeTokenCache(filePath, tokenSet) {
  const fullPath = path.resolve(appDir, filePath)
  fs.mkdirSync(path.dirname(fullPath), { recursive: true })
  fs.writeFileSync(fullPath, JSON.stringify(tokenSet, null, 2), 'utf8')
  return fullPath
}

function isAccessTokenValid(tokenSet) {
  if (!tokenSet?.accessToken || !tokenSet?.expiresAt) return false
  return Date.now() < tokenSet.expiresAt - 60_000
}

const localAppData = process.env.LOCALAPPDATA || path.join(process.env.USERPROFILE || '', 'AppData', 'Local')
const programFiles = process.env.ProgramFiles || 'C:\\Program Files'
const programFilesX86 = process.env['ProgramFiles(x86)'] || 'C:\\Program Files (x86)'

const chromeCandidates = [
  path.join(programFiles, 'Google', 'Chrome', 'Application', 'chrome.exe'),
  path.join(programFilesX86, 'Google', 'Chrome', 'Application', 'chrome.exe'),
  path.join(localAppData, 'Google', 'Chrome', 'Application', 'chrome.exe'),
]

const edgeCandidates = [
  path.join(programFiles, 'Microsoft', 'Edge', 'Application', 'msedge.exe'),
  path.join(programFilesX86, 'Microsoft', 'Edge', 'Application', 'msedge.exe'),
  path.join(localAppData, 'Microsoft', 'Edge', 'Application', 'msedge.exe'),
]

function firstExisting(paths) {
  for (const filePath of paths) {
    try {
      if (fs.existsSync(filePath)) return filePath
    } catch {
      // ignore lookup failures
    }
  }
  return ''
}

function normalizeBrowserMode(value) {
  const mode = String(value || '').trim().toLowerCase()
  if (['chrome-persisted', 'chrome-clean', 'edge'].includes(mode)) return mode
  return 'chrome-clean'
}

function buildConfig() {
  const host = firstNonEmpty(process.env.GRAPH_AUTHS_HOST, '127.0.0.1')
  const port = parseInt(firstNonEmpty(process.env.GRAPH_AUTHS_PORT, '3070'), 10)
  const redirectUri = firstNonEmpty(
    process.env.GRAPH_AUTHS_REDIRECT_URI,
    `http://localhost:${port}/auth/redirect`
  )

  return {
    host,
    port,
    tenantId: firstNonEmpty(process.env.GRAPH_AUTHS_TENANT_ID, process.env.GRAPH_TENANT_ID),
    clientId: firstNonEmpty(process.env.GRAPH_AUTHS_CLIENT_ID, process.env.GRAPH_CLIENT_ID),
    clientSecret: firstNonEmpty(process.env.GRAPH_AUTHS_CLIENT_SECRET, process.env.GRAPH_CLIENT_SECRET),
    scopes: firstNonEmpty(
      process.env.GRAPH_AUTHS_SCOPES,
      process.env.GRAPH_SCOPES,
      // Keep in sync with DEFAULT_GRAPH_SCOPES in src/server/services/graph/graphCapabilities.js.
      // .default = all tenant-approved delegated Graph permissions for this app;
      // enumerating individual scopes risks AADSTS65001 on any unapproved one.
      'openid profile email offline_access https://graph.microsoft.com/.default'
    ).split(/\s+/).filter(Boolean),
    redirectUri,
    outputFile: firstNonEmpty(process.env.GRAPH_AUTHS_OUTPUT_FILE, '../.local-auth/graph-tester-token.json'),
    autoOpenBrowser: envFlagEnabled(process.env.GRAPH_AUTHS_AUTO_OPEN_BROWSER, true),
    browserMode: normalizeBrowserMode(process.env.GRAPH_AUTHS_BROWSER_MODE),
    chromeExecutablePath: firstNonEmpty(
      process.env.GRAPH_AUTHS_CHROME_EXECUTABLE_PATH,
      process.env.GRAPH_AUTHS_LOGIN_CHROME_EXECUTABLE_PATH,
      process.env.GRAPH_LOGIN_CHROME_EXECUTABLE_PATH,
      firstExisting(chromeCandidates)
    ),
    edgeExecutablePath: firstNonEmpty(
      process.env.GRAPH_AUTHS_EDGE_EXECUTABLE_PATH,
      firstExisting(edgeCandidates)
    ),
    chromeCleanUserDataDir: firstNonEmpty(
      process.env.GRAPH_AUTHS_CHROME_CLEAN_USER_DATA_DIR,
      process.env.GRAPH_AUTHS_LOGIN_CHROME_USER_DATA_DIR,
      '.local-browser/chrome-clean'
    ),
  }
}

const config = buildConfig()
let pendingState = null

function getBrowserLaunchConfig() {
  if (config.browserMode === 'edge') {
    if (!config.edgeExecutablePath || !fs.existsSync(config.edgeExecutablePath)) {
      throw new Error(
        `GRAPH_AUTHS_BROWSER_MODE=edge but Edge was not found at ` +
        `${config.edgeExecutablePath || '(empty)'}. Set GRAPH_AUTHS_EDGE_EXECUTABLE_PATH.`
      )
    }

    return {
      label: 'Edge',
      executablePath: config.edgeExecutablePath,
      userDataDir: '',
    }
  }

  if (!config.chromeExecutablePath || !fs.existsSync(config.chromeExecutablePath)) {
    throw new Error(
      `GRAPH_AUTHS_BROWSER_MODE=${config.browserMode} but Chrome was not found at ` +
      `${config.chromeExecutablePath || '(empty)'}. Set GRAPH_AUTHS_CHROME_EXECUTABLE_PATH.`
    )
  }

  if (config.browserMode === 'chrome-persisted') {
    return {
      label: 'Chrome persisted profile',
      executablePath: config.chromeExecutablePath,
      userDataDir: '',
    }
  }

  return {
    label: 'Chrome clean profile',
    executablePath: config.chromeExecutablePath,
    userDataDir: path.resolve(appDir, config.chromeCleanUserDataDir),
  }
}

function launchUrlInConfiguredBrowser(url) {
  const browser = getBrowserLaunchConfig()
  const args = ['--no-first-run', '--no-default-browser-check', '--new-window', url]

  if (browser.userDataDir) {
    fs.mkdirSync(browser.userDataDir, { recursive: true })
    args.unshift(`--user-data-dir=${browser.userDataDir}`)
  }

  const child = spawn(browser.executablePath, args, {
    detached: true,
    stdio: 'ignore',
  })

  child.unref()
  return browser.label
}

async function openLoginUrl(authorizeUrl) {
  const browserLabel = launchUrlInConfiguredBrowser(authorizeUrl)
  return `${browserLabel} opened for Graph sign-in.`
}

async function openHomePageOnStart() {
  if (!config.autoOpenBrowser) return

  const appUrl = `http://${config.host}:${config.port}`
  try {
    const browserLabel = launchUrlInConfiguredBrowser(appUrl)
    console.log(`App page opened in ${browserLabel}`)
  } catch (err) {
    console.error(`Could not auto-open app page: ${err.message}`)
    console.error(`Open ${appUrl} manually.`)
  }
}

const app = express()
app.use(express.static(path.join(appDir, 'public')))

app.get('/auth/login', async (_req, res) => {
  if (!config.tenantId || !config.clientId || !config.clientSecret) {
    return res.status(500).json({
      error: 'Graph client settings are missing. Set GRAPH_AUTHS_* or parent GRAPH_* values in .env.',
    })
  }

  pendingState = Math.random().toString(36).slice(2)

  const params = new URLSearchParams({
    client_id: config.clientId,
    response_type: 'code',
    redirect_uri: config.redirectUri,
    scope: normalizeScopes(config.scopes),
    state: pendingState,
    response_mode: 'query',
  })

  try {
    const authorizeUrl = `https://login.microsoftonline.com/${config.tenantId}/oauth2/v2.0/authorize?${params}`
    const message = await openLoginUrl(authorizeUrl)
    res.json({ message })
  } catch (err) {
    pendingState = null
    res.status(500).json({ error: err.message })
  }
})

app.get('/auth/redirect', async (req, res) => {
  const { code, state, error, error_description: errorDescription } = req.query

  if (error) return res.status(400).send(`Auth error: ${errorDescription || error}`)
  if (!pendingState) return res.status(400).send('No login in progress. Start the login flow again.')
  if (state !== pendingState) return res.status(403).send('State mismatch. Start the login flow again.')
  if (!code) return res.status(400).send('No authorization code returned.')

  try {
    const tokenRes = await fetch(`https://login.microsoftonline.com/${config.tenantId}/oauth2/v2.0/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: config.redirectUri,
        client_id: config.clientId,
        client_secret: config.clientSecret,
        scope: normalizeScopes(config.scopes),
      }).toString(),
    })

    if (!tokenRes.ok) {
      const text = await tokenRes.text()
      return res.status(500).send(`Token exchange failed: ${text}`)
    }

    const data = await tokenRes.json()
    const savedPath = writeTokenCache(config.outputFile, {
      accessToken: data.access_token,
      refreshToken: data.refresh_token || '',
      idToken: data.id_token || '',
      scope: data.scope || normalizeScopes(config.scopes),
      tokenType: data.token_type || 'Bearer',
      expiresIn: data.expires_in,
      expiresAt: Date.now() + (Number(data.expires_in) || 0) * 1000,
      savedAt: Date.now(),
    })

    pendingState = null
    res.send(
      '<!doctype html><html><body style="font-family:Segoe UI,Tahoma,sans-serif;padding:24px">' +
      '<h2>Graph sign-in complete.</h2>' +
      `<p>Auth info written to:<br><code>${savedPath}</code></p>` +
      '<script>setTimeout(function(){ window.close(); }, 1200)</script>' +
      '</body></html>'
    )
  } catch (err) {
    res.status(500).send(`Error: ${err.message}`)
  }
})

app.get('/auth/status', (_req, res) => {
  const tokenSet = readTokenCache(config.outputFile)
  res.json({
    connected: isAccessTokenValid(tokenSet),
    hasRefreshToken: !!tokenSet?.refreshToken,
    outputFile: path.resolve(appDir, config.outputFile),
    redirectUri: config.redirectUri,
    browserMode: config.browserMode,
    autoOpenBrowser: config.autoOpenBrowser,
  })
})

const server = app.listen(config.port, config.host, () => {
  console.log(`Graph Auths running on http://${config.host}:${config.port}`)
  console.log(`Redirect URI: ${config.redirectUri}`)
  console.log(`Output file: ${path.resolve(appDir, config.outputFile)}`)
  console.log(`Browser mode: ${config.browserMode}`)
  openHomePageOnStart()
})

module.exports = { app, config, server }
