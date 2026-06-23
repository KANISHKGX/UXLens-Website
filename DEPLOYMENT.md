# Deploying UX Lens (free tier: Railway backend + Vercel frontend)

Code is ready for this. Two things only you can do, since they need your own
accounts: push to GitHub, and click through the Railway/Vercel dashboards.

## 0. One-time cleanup

A `.git` folder got partially created in this project by a tool that
couldn't fully clean it up afterward. Before starting, delete it manually in
Windows Explorer or PowerShell:

```powershell
cd "C:\Projects\OCR\website_OC"
Remove-Item -Recurse -Force .git
```

## 1. Push to GitHub

```powershell
cd "C:\Projects\OCR\website_OC"
git init
git add -A
git commit -m "Initial commit"
```

Create a new empty repo on github.com (no README/license), then:

```powershell
git remote add origin https://github.com/<you>/<repo>.git
git branch -M main
git push -u origin main
```

`backend/.env` (your real OpenAI key) is already excluded by `.gitignore` —
confirm it didn't get committed by checking `git show --stat HEAD` doesn't
list it.

## 2. Backend on Railway

1. railway.app → New Project → Deploy from GitHub repo → pick this repo.
2. Project Settings → set **Root Directory** to `backend`.
3. Railway auto-detects Python via `backend/runtime.txt` and uses
   `backend/Procfile` (`web: uvicorn main:app --host 0.0.0.0 --port $PORT`) —
   no extra config needed.
4. Variables tab → add:
   - `OPENAI_API_KEY` = your key (required)
   - `DEBUG` = `false`
   - `THUMIO_API_KEY` = (optional, leave blank — thum.io works unauthenticated
     at lower rate limits)
5. Deploy. Once live, copy the public URL Railway gives you, e.g.
   `https://your-app.up.railway.app`. Sanity check: open
   `https://your-app.up.railway.app/health` — should return
   `{"status":"ok",...}`.

**Note on screenshots:** the backend tries Selenium → Playwright → thum.io
for each screenshot. Railway's container has no Chrome browser installed, so
the first two will fail and it'll fall through to thum.io automatically —
slightly slower per page, but works with no extra setup. Also, screenshots
are saved to local disk inside the container, which is wiped on every
redeploy/restart — fine for a free demo, just don't expect old jobs' images
to survive a redeploy.

## 3. Frontend on Vercel

1. vercel.com → Add New Project → import the same GitHub repo.
2. Root Directory: `frontend`.
3. Framework Preset: Vite (auto-detected). Build command `npm run build`,
   output directory `dist` (defaults are already correct).
4. Environment Variables → add `VITE_API_BASE` = the Railway URL from step 2
   (no trailing slash), e.g. `https://your-app.up.railway.app`.
5. Deploy. Vercel gives you a URL like `https://your-app.vercel.app` — that's
   the live site.

The app uses hash routing (`/#/report/...`), so no rewrite rules are needed
for client-side routes on Vercel's static host.

## 4. After both are live

Open the Vercel URL, run an analysis, and confirm screenshots load (they're
fetched from the Railway backend via `VITE_API_BASE`). If they don't load,
check the browser console for CORS errors — `backend/main.py` currently
allows all origins (`allow_origins=["*"]`), so this should work out of the
box; tighten it to your exact Vercel domain later if you want.

## Costs

Railway no longer has an unlimited free tier — new accounts get a small
trial credit, then it's pay-as-you-go (typically a few dollars/month for a
small FastAPI service that's mostly idle). Vercel's frontend hosting is free
for personal projects.
