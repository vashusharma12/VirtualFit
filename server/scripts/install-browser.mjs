// Runs after `npm install`. Downloads the browser VirtualFit uses to open "Size chart" buttons on stores that
// only load the chart on click. It must NEVER make the install fail: without the browser everything else works.
import { spawnSync } from 'node:child_process'
import { createRequire } from 'node:module'
import path from 'node:path'

const say = (m) => console.log(`[virtualfit] ${m}`)

if (process.env.PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD === '1' || process.env.ANALYZER_USE_BROWSER === 'false') {
  say('Skipping the browser download (switched off). Size charts that load on click will not be readable.')
  process.exit(0)
}

let command // [program, args, extra spawn options]
if (process.env.VF_BROWSER_INSTALL_CMD) {
  command = [process.env.VF_BROWSER_INSTALL_CMD, [], { shell: true }] // lets the tests stand in for the real download
} else {
  try {
    // The package does not export its command-line file, but it does export package.json: use its folder.
    const folder = path.dirname(createRequire(import.meta.url).resolve('playwright/package.json'))
    command = [process.execPath, [path.join(folder, 'cli.js'), 'install', 'chromium'], {}]
  } catch {
    say('The "playwright" package is not installed, so the browser step is off.')
    process.exit(0)
  }
}

say('Downloading the browser used to read size charts (about 150 MB, once). This can take a minute.')
const result = spawnSync(command[0], command[1], { stdio: 'inherit', ...command[2] })
if (result.status === 0) {
  say('Browser ready.')
} else {
  say('Could not download the browser (no internet, or a blocked download). VirtualFit will still work, but size charts')
  say('that only load when you click "Size chart" cannot be read. Try again later with: npx playwright install chromium')
}
process.exit(0)
