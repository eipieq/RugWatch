# RugWatch

autonomous rug pull detection and exit agent on OKX OnchainOS.

monitors 5 on-chain signals continuously, scores a composite RugScore (0–1), and exits a position autonomously when the threshold is crossed. no human approval. no delay.

---

## how it works

```
token added → monitoring loop starts (every 60s)
                ↓
         fetch 5 signals in parallel
         - dev wallet movement      (weight 0.30)
         - smart money exit         (weight 0.25)
         - holder concentration     (weight 0.20)
         - liquidity withdrawal     (weight 0.15)
         - trade flow toxicity      (weight 0.10)
                ↓
         RugScore = Σ(signal × weight)
                ↓
         ≥ 0.65 → warning
         ≥ 0.80 → onchainos swap execute → USDC
```

all signal data comes from OKX OnchainOS. the exit routes across 500+ liquidity sources via the OKX DEX aggregator.

---

## stack

| layer | tech |
|---|---|
| backend | Python / FastAPI / asyncio |
| frontend | Next.js 15 / Tailwind CSS |
| on-chain data | OKX OnchainOS (`onchainos` CLI) |
| exit execution | `okx-dex-swap` |
| agent wallet | OKX Agentic Wallet |
| chain | X Layer (zero gas) |

---

## setup

### prerequisites

- `onchainos` CLI installed (from the xagt plugin setup)
- Python 3.12+
- Node.js 18+

### backend

```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
# add your OKX API keys to .env
uvicorn main:app --reload --port 8000
```

### frontend

```bash
cd frontend
npm install
cp .env.local.example .env.local
npm run dev
```

open http://localhost:3000

### demo page (no backend needed)

open http://localhost:3000/demo

---

## deploy

### frontend → Vercel

1. push repo to GitHub
2. import in Vercel dashboard, set root directory to `frontend`
3. add env var: `BACKEND_URL=https://your-backend.fly.dev`
4. deploy

### backend → Fly.io

```bash
cd backend
fly launch                          # creates app
fly volumes create rugwatch_data --size 1  # persistent storage for SQLite
fly secrets set FRONTEND_URL=https://rugwatch.vercel.app
fly secrets set OKX_API_KEY=... OKX_SECRET_KEY=... OKX_API_PASSPHRASE=... OKX_PROJECT_ID=...
fly deploy
```

---

## OKX Agentic Wallet (in-app)

rugwatch connects to your **OKX Agentic Wallet** through the `onchainos` CLI on the machine running the backend.

1. open the dashboard — wallet bar under the header
2. enter your email → **send code** → paste OTP from inbox → **verify**
3. connected state shows your EVM address and total balance
4. **add token** — auto-exit uses the connected wallet (no manual paste)
5. optional: **buy {symbol} with USDC** on a watched token to open a position via `onchainos swap execute`
6. when RugScore ≥ exit threshold, the agent calls `onchainos swap execute` to sell back to USDC

requirements:
- `onchainos` installed (`npx @xagt/agent-plugin@latest setup`)
- backend running on the same machine as your CLI session

---

## demo (simulated rug)

the frontend has a demo panel on each monitored token. no real rug needed:

1. add any token address via the watchlist
2. use the **0.45 / 0.70 / 0.90** buttons to step the RugScore up
3. or hit **simulate rug** to inject all signals at 1.0 immediately
4. watch the gauge, signal bars, event log, and chart update in real time
5. if a wallet is configured, the agent fires `onchainos swap execute` autonomously at ≥ 0.80

---

## api reference

| endpoint | method | description |
|---|---|---|
| `/api/status` | GET | all token states + global events |
| `/api/watch` | POST | add a token to monitoring |
| `/api/watch/:address` | DELETE | remove a token |
| `/api/simulate-rug` | POST | inject artificial signals for demo |
| `/api/events` | GET | SSE stream of real-time events |
| `/api/health` | GET | health check |

---

## signal sources

| signal | OKX skill | CLI command |
|---|---|---|
| dev wallet | `okx-dex-signal` | `onchainos tracker activities --tracker-type multi_address` |
| smart money | `okx-dex-signal` | `onchainos tracker activities --tracker-type smart_money` |
| holder concentration | `okx-dex-token` | `onchainos token cluster-overview` |
| liquidity withdrawal | `okx-dex-market` | `onchainos token liquidity` |
| trade flow toxicity | `okx-dex-market` | `onchainos token trades` |

---

## project structure

```
rugwatch/
├── backend/
│   ├── main.py          # FastAPI app + all routes
│   ├── monitor.py       # async monitoring loop per token
│   ├── signals.py       # 5 signal calculators (onchainos CLI calls)
│   ├── scorer.py        # weighted RugScore aggregation
│   ├── exit.py          # autonomous swap exit via onchainos
│   ├── state.py         # in-memory token state store
│   └── requirements.txt
└── frontend/
    ├── app/
    │   ├── page.tsx     # main dashboard
    │   └── layout.tsx
    ├── components/
    │   ├── RiskGauge.tsx      # SVG score gauge
    │   ├── SignalPanel.tsx    # 5 signal bars
    │   ├── ScoreChart.tsx     # score history sparkline
    │   ├── WatchList.tsx      # token list sidebar
    │   ├── EventLog.tsx       # real-time event feed
    │   └── AddTokenForm.tsx   # add token form
    └── lib/
        ├── types.ts     # TypeScript types
        └── api.ts       # API helpers
```
