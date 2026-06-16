# World Cup 2026 — Family Sweepstake

A single-page leaderboard for tracking Yaw, Andy, Max & Derrick's World Cup 2026 sweepstake. No backend, no database — runs entirely in the browser and saves results to localStorage.

## What's inside

- `index.html` — the page
- `style.css` — all styling (stadium scoreboard theme)
- `gate.js` — password screen shown before the app loads
- `points-engine.js` — points calculation logic (mirrors the original spreadsheet rules)
- `state.js` — the draw, fixtures, and saved/seed results
- `app.js` — rendering and interactivity

## Password

The site is gated behind a simple password screen: **`dynasty26`**

The password is not stored in plain text anywhere in the code — `gate.js` only contains a SHA-256 *hash* of it. When someone types a password, the browser hashes what they typed and compares it to the stored hash, so the actual word never appears in the files you commit to GitHub. That keeps it from being readable by anyone casually browsing the public repo.

Worth being clear-eyed about the limit here: this is still not real security. For a static site with no server, the password check has to happen somewhere a browser can see it, so a sufficiently determined person (using browser dev tools to watch what gets typed, or simply trying common passwords) could still get in. The hash just raises the bar from "anyone can read it instantly on GitHub" to "someone has to deliberately try to crack it" — which is the right amount of effort for keeping a family sweepstake away from search engines and randoms, not for guarding anything sensitive.

To change the password, generate a new SHA-256 hash and swap it into `GATE_PASSWORD_HASH` near the top of `gate.js`. You can generate one in any browser console with:
```js
crypto.subtle.digest("SHA-256", new TextEncoder().encode("yournewpassword"))
  .then(buf => console.log(Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2,"0")).join("")));
```

Once someone enters the correct password, the site stays unlocked for that browser tab/session — they won't be asked again until they close the browser entirely.

## Running it locally

No build step needed. Just open `index.html` in a browser, or for a cleaner local test run:

```bash
python3 -m http.server 8000
```

then visit `http://localhost:8000`.

## Deploying to GitHub Pages (free hosting)

1. Create a new GitHub repository (e.g. `wc2026-sweepstake`).
2. Upload these 5 files to the root of the repo (`index.html`, `style.css`, `points-engine.js`, `state.js`, `app.js`).
3. In the repo, go to **Settings → Pages**.
4. Under **Build and deployment → Source**, choose **Deploy from a branch**.
5. Pick the `main` branch and `/ (root)` folder, then **Save**.
6. After a minute or two, your site will be live at:
   `https://<your-username>.github.io/wc2026-sweepstake/`

Share that link with Yaw, Andy, Max & Derrick.

## How results get entered

Each player (or whoever's on admin duty) enters match scores, clean sheets, and red cards in the **Group Matches** and **Knockout** tabs. Points calculate automatically and the **Leaderboard** tab re-sorts itself live.

### Important — about data syncing

Because this is a simple static site with no server, **results are saved in each person's own browser only** (localStorage). If four different people open the site on four different phones, they will NOT automatically see each other's score entries.

The simplest way to run this day-to-day:

- **Option A (recommended): one admin.** Nominate one person (or rotate) to be the only one entering results each matchday. Everyone else just views the Leaderboard tab on their own device after that person has entered scores — but note the viewer also needs the latest data. See Option B for actually syncing that.
- **Option B: export/import to sync.** After entering results, the admin clicks **Backup / Sync → Export Results**, and shares that `.json` file with the group (e.g. in a WhatsApp group). Anyone else can click **Import Results** and select that file to see the same standings on their own device.
- **Option C (more setup, but the "always live" experience):** Upgrade to a tiny shared backend later if this becomes annoying — happy to help with that if so.

## Editing the draw or fixtures

The draw (which 12 teams each player has) lives in `state.js` near the top, in the `DRAW_DATA` object. The group stage fixtures are generated automatically from the `GROUPS_DATA` object just below it. Edit either if anything changes.
