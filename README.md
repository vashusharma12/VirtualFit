# VirtualFit

Know your size. See your fit.

VirtualFit helps online shoppers find the size that is likely to fit them, and see a preview of the product next to them. A shopper creates a fit profile (measurements, optional photos), pastes a product link from a store (or picks a demo product), and gets a recommended size with a confidence score and a plain-language explanation.

## What is real, and what is simulated

| Feature | Status |
|---|---|
| Accounts, sessions, profile, measurements, saved sizes | **Real**: bcrypt-hashed passwords, httpOnly cookie sessions, SQLite |
| Photo storage (4 angles) with consent, deletion | **Real**: private storage, EXIF/GPS stripped, owner-only access |
| Size recommendation engine | **Real**: rule-based and tested (see "Size recommendation"). Thresholds are sensible defaults, not trained on return data |
| Body shape | **Estimate** from chest, waist and hips. It does not analyse photos |
| Product link analyzer | **Real, partly unverified**: see "Product link analyzer" |
| Virtual try-on | **Simulated by default**: shows your photo beside the product and says so on the image. No AI. A real provider adapter is included but untested |
| Product catalog | **Demo data**: fictional brands, illustrated images |

## Run it

Requires Node.js 18 or newer.

```
npm install        # installs the web app AND the server
npm run dev        # starts both: web app on http://localhost:5173, API on http://localhost:4000
```

Open http://localhost:5173. No configuration is needed in development. Keep the terminal open: closing it stops the server, and sign-up will fail with "Cannot reach the VirtualFit server". Data is stored in `server/data/` and `server/storage/` (both git-ignored).

Frontend only, no server (accounts live in the browser, not secure): create `.env.local` containing `VITE_USE_MOCK=true`, then `npm run dev`.

Other scripts: `npm run dev:web` (website only), `npm run dev:server` (API only), `npm run build`, `npm test` (all tests), `npm run test:server`.

## Project layout

```
src/                     React app (Vite, Redux Toolkit, Tailwind, React Router)
  components/            common, layout, home, auth, product, product-analysis, size-guide,
                         photos, body-shape, try-on, dashboard, settings
  pages/                 one folder per route
  redux/                 store, slices, thunks, selectors, persistence
  services/              the swap points for real backends (see below)
  utils/                 validation, units, size engine, image preparation, storage
  data/                  demo products, size charts, categories, measurement fields
shared/                  category detection, used by both the app and the server
server/                  Express API (SQLite, bcrypt, JWT cookie, sharp)
  src/routes/            auth, profile, photos, analyze, tryOn, account
  src/analyzer/          product link reader (SSRF guard, extractors, store readers)
  src/tryon/providers/   try-on providers: simulated, replicate
test/, server/test/      automated tests
```

The one rule that keeps this swappable: pages and components never call the network or `localStorage` directly. They go through Redux, and Redux goes through a file in `src/services/`.

## User flow

The home page **is** the product: a visitor pastes a product link and presses "Find my size".

- **Not logged in:** the link is remembered (for 24 hours, in the browser only) and they are asked to create a profile or log in. They then land on the result for that link, not on a blank form. Only the store's name is shown back to them, never the link itself.
- **Logged in:** the link is analysed and the result is shown at once.
- **First time, no measurements yet:** the result asks for them, and after saving them they come back to the same product.

Then: size recommendation, an optional photo-based preview ("Preview it on me"), and a saved result. Everything can be edited later from the dashboard.

The header has Find my size, **Try on**, Dashboard, How it works and About, and, under your name, a menu with Dashboard, Profile, **Measurements**, **Body profile**, Results, Settings and Log out. Pages: `/` (paste a link), `/how-it-works`, `/about`, `/login`, `/signup` are public. `/size-guide`, `/dashboard`, `/profile`, `/measurements`, `/body-profile`, `/try-on`, `/results`, `/settings` need a login. `/products` and `/products/:id` are a small **demo catalog** with made-up brands: it is not in the menu, and is linked from How it works for people who want to look around without a real link.

## API

| Method | Path | Purpose |
|---|---|---|
| POST | /api/auth/signup, /login, /logout | Account and session |
| GET | /api/auth/config | Whether Google sign-in is available (returns the public client id) |
| POST | /api/auth/google | Sign in or sign up with a Google credential |
| GET | /api/auth/me | Current user |
| GET / PUT | /api/profile | Profile, measurements and saved sizes |
| GET | /api/photos | Photo consent and the photos you have |
| POST | /api/photos/consent | Grant or withdraw consent (withdrawing deletes all photos) |
| PUT / DELETE | /api/photos/:angle | Upload, replace or delete a photo |
| GET | /api/photos/:angle/image | The photo (owner only) |
| POST | /api/analyze-product | Read a product link: name, price, sizes, chart, category |
| GET | /api/try-on/config | Which provider is active and what it supports |
| POST | /api/try-on | Start a try-on job |
| GET | /api/try-on, /api/try-on/:id | History, or one job's status |
| GET | /api/try-on/:id/image | The result image (owner only) |
| POST | /api/try-on/:id/save, /cancel | Keep a result, or stop a running job |
| DELETE | /api/try-on/:id, /api/try-on | Delete one result or all |
| GET | /api/account/export | Download your data as JSON |
| DELETE | /api/account | Delete the account and every file (needs your password) |

## Size recommendation

`src/utils/sizeEngine.js` is pure logic (no React, no network). `src/services/sizeRecommendationService.js` is what the app calls, so a backend or ML model can replace it with the same return shape.

For each size it scores how well each measurement fits (full marks inside the size's range, falling to zero a set distance outside it), weights the measurements by category, and picks the best-scoring size that is in stock. Confidence combines fit quality, the gap to the next-best size, how many measurements were available, and how trustworthy the chart is. It is capped at 95%.

It handles garment-measurement charts (allowing for built-in room), single-number rows, charts listed largest-first, a snug/regular/relaxed preference, out-of-stock sizes, and cases where nothing fits (it names the closest and says so). All thresholds are constants at the top of the file.

## Product link analyzer

`POST /api/analyze-product` fetches the page on the server (browsers cannot, because of CORS) and works out whether it is a clothing product page, and what its size chart says.

**What it accepts, and what it refuses with an explanation**
- It only analyses the page of **one clothing, footwear, or cap/hat product**.
- A store **home page**, a **search results** page, a **category or collection** page, a **cart or account** page, or a page that lists many products is refused, and the message says what to paste instead. Obvious ones (like a home page or `/search?q=`) are refused before anything is downloaded.
- A **non-clothing product** (a phone, headphones, furniture, a book, beauty products and so on) is refused with the reason, naming what it looks like.
- Dresses, innerwear and accessories are recognised as clothing-adjacent but not sizeable yet, and are explained in the app.
- If a page has no price, sizes or product details, it is not treated as a product just because it has a title and a picture.

**How it finds the size chart** (cheapest first)
1. Structured data in the page (JSON-LD, Open Graph) and readers for Amazon.in, Myntra, Ajio and Flipkart.
2. A size **table**, or a chart made of ordinary page elements (`<div>`/`<span>` cells), or a chart hidden in the page's own data (found by its shape, whatever the site calls it). If the unit is not stated, it is guessed from the numbers and the shopper can flip it in one click.
3. A **"Size chart" link or chart URL** found in the page, followed with the same safety checks.
4. **A real browser** that opens the page, clicks "Size chart", and reads the panel and any chart data the page loaded. Most big stores only load their chart on click, so this is the layer that makes the biggest difference. It is **on by default** and installed automatically by `npm install` (a one-time download of about 150 MB). If it cannot be installed or started, the server says so at start-up, switches that step off, and everything else keeps working. To skip the download: set `PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1` before `npm install`. To switch the step off: `ANALYZER_USE_BROWSER=false` in `server/.env`. On a Linux server you may also need `npx playwright install-deps chromium`.
5. **AI reading of a chart picture or text** (optional, needs `ANTHROPIC_API_KEY` in `server/.env`). The result is only ever *suggested*: the shopper reviews and corrects every number before it is used.

If none of that finds a chart, the shopper can **upload a screenshot of the store's size chart** (works for any website, needs the AI key), use standard sizing, or type the chart in by hand.

**Find out why a store is not working:**
```
npm run analyze -- "https://www.myntra.com/..."               # what the server receives, and which layer found a chart
npm run analyze -- "<link>" --no-browser                       # without the browser step
npm run analyze -- "<link>" --save page.html                   # save the page the server received
```
It prints whether the page was blocked, whether it is an empty script shell, whether a "Size chart" button exists, what size-related data is in the page, and the exact next step. If a store still fails, send the output to the developer.

**Be aware**
- No program can read the size chart of literally every website: stores differ, change their pages, and some block automated requests. This reads far more than a plain download would, and when it cannot, it says so and offers the screenshot, standard sizing and manual routes instead of guessing.
- The four store readers and the browser step were written from commonly seen page structures and tested with realistic sample pages and a stand-in browser, **not against the live sites** (they could not be reached while building).
- Amazon and some others block automated requests. CAPTCHA and bot-protection pages are detected and reported; the browser step is deliberately **not** used to get around them. The screenshot upload works for these stores.
- AI can misread numbers, which is why its output is always shown for the shopper to check.
- Scraping may breach a store's terms of service. Fine for a portfolio project; for a commercial product use official feeds or partnerships.
- **Security:** the server refuses localhost, private networks and cloud-metadata addresses, checks every redirect and DNS answer (and, in the browser step, every request the page makes), allows only ports 80 and 443, caps size, and rate-limits each account. Never set `ANALYZER_ALLOW_PRIVATE_HOSTS` outside local testing (the server refuses to start with it in production).

Demo mode (`VITE_USE_MOCK=true`) reads nothing from the page. It applies the same "is this a clothing product page" checks. Links containing words like `jeans`, `shirt`, `shoes` or `cap` return a sample product; a link containing `blocked` simulates a refusal; screenshot upload returns a sample chart.

## Sign in with Google

Free. It is optional: without it, email and password still work, and the button simply does not appear.

1. Go to https://console.cloud.google.com/ and create a project (free).
2. **APIs and Services, then OAuth consent screen:** choose External, give the app a name and your email, and save. While the app is in "Testing", only people you add as test users can sign in. To open it to everyone, press "Publish app". Sign-in with just name and email needs no Google review.
3. **Credentials, then Create credentials, then OAuth client ID:** type "Web application". Under **Authorized JavaScript origins** add `http://localhost:5173` (and your real website address when you deploy). No redirect address is needed.
4. Copy the Client ID. In `server/.env` add: `GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com`
5. Restart (`npm run dev`). The server prints `Google sign-in: on` and the buttons appear on the login and sign-up pages.

How it works: Google's button gives the browser a signed credential. The server verifies the signature, that it was issued for your app, that it has not expired, and that the email is verified. Then it creates or finds the account and starts the normal session. Only the Google account id, email and name are stored (not the profile picture).

Things to know:
- **Same email as an existing password account:** Google proves the person owns the email, so the accounts are joined and all data is kept. The old password is removed (otherwise someone who registered that email first could still get in), and the person is told. They sign in with Google from then on.
- **Google-only accounts have no password,** so deleting such an account is confirmed by signing in with Google again instead.
- This was tested with a stand-in for Google (the real service needs your Client ID), and the real verifier was checked to reject bad credentials. Please try it once with a real Google account after setup.

## Privacy and security

- Passwords are bcrypt-hashed; sessions use an httpOnly, SameSite cookie (Secure in production). Mock mode is for demos only and is not secure.
- Photos need explicit consent, are re-encoded (metadata removed), stored privately, and only the owner can fetch them. Withdrawing consent, "delete all", and account deletion remove the files from disk.
- Settings lets the shopper download their data and delete their account (password required, or a fresh Google sign-in for Google-only accounts).
- Bump `CONSENT_VERSION` in `server/src/routes/photos.js` if the consent wording changes, so everyone is asked again.
- **Production:** set `NODE_ENV=production` and a `JWT_SECRET` of at least 32 random characters in `server/.env`; serve over HTTPS; put the API behind the same site as the web app (or set `CLIENT_ORIGIN`). Move photo storage to S3 or similar by implementing `put`, `get`, `remove` in `server/src/storage/`. Body photos are sensitive personal data: get legal review (for example under India's DPDP Act) before launching commercially.

## Accessibility

Semantic landmarks, one h1 per page, labelled form fields with inline errors, keyboard-operable controls with visible focus, a skip link, focus moved to the page content on navigation, descriptive page titles, tables that scroll on small screens, and reduced-motion support. All pages were checked automatically for headings, image alt text, labels, button names and duplicate ids.

## Tests

```
npm test
```
Covers the size engine (32 cases), category detection, the extractors (sample pages, CAPTCHA, broken data, charts hidden in page data, chart links, the browser step with a stand-in browser), the diagnostic command, the security checks, and the API over real HTTP including the full try-on lifecycle, ownership rules, provider failures, retention, and account export and deletion.

## Known limitations

- The store readers are unverified against live sites (above).
- The try-on is simulated unless you connect a provider, and the included external adapter is untested.
- Size thresholds are defaults, not trained on purchase or return data.
- `ErrorBoundary` is the one class component in the app: React offers no hook for catching render errors.
- Demo-mode account storage is not secure.
- Google sign-in has not been run against real Google here (it needs your own Client ID); the verification logic is tested.
