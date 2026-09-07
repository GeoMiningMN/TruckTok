# Alpaca Paper Trading Bot — Implementation Plan

This is a plan, not a working bot. TruckTok stays a video app. The bot should live in this `trading-bot/` folder (or a new dedicated repo later). Nothing here is financial advice: the goal is a **safe paper-trading system** that executes a strategy you already understand, then records and reviews results.

Source of ideas (not a spec): [Grok shared conversation](https://grok.com/share/c2hhcmQtMw_9e60730a-3734-466e-a8bb-946a0010794f), which restates Miles Deutscher’s “build an AI trading bot” loop. We keep the useful parts and reject the parts that would make an LLM the order engine.

---

## 1. Goal

Build a **local Python bot** that:

1. Connects to **Alpaca paper trading only** (`https://paper-api.alpaca.markets`, `paper=True`).
2. Runs a **deterministic first strategy** (rules in config, not free-form LLM output).
3. Places, tracks, and closes **simulated** orders.
4. Writes a durable trade ledger and daily performance snapshot.
5. Optionally uses a **local LLM as an analyst**, never as the thing that submits orders.

Definition of done for v1: you can start the bot during market hours, it evaluates SPY (or a tiny watchlist), submits paper orders that respect hard risk limits, logs fills, and you can inspect those trades in both the Alpaca paper dashboard and local files.

---

## 2. What we take from the Grok / Deutscher ideas

Those notes are right about the *shape* of the system:

| Idea | How we use it |
| --- | --- |
| Bot ≠ edge | You supply the strategy. The software only executes and records it. |
| Brain / hands / memory | Split: strategy engine, Alpaca adapter, ledger + learning notes. |
| Loop: set → execute → learn → repeat | Real loop, with **human approval** on strategy changes. |
| Paper first | Hard-coded. Live keys and live URLs are out of scope. |
| Trade ledger + learning file | Keep both. Ledger is append-only facts. Learning file is commentary. |
| Local LLM (Ollama) | Optional **reflection job** after the session, not on the order path. |
| Start tiny | 1-share / tiny notional sizes until the plumbing is trusted. |

---

## 3. What we will not copy

The shared Grok guide is a useful sketch. It is not production-ready:

- The sample `bot.py` is incomplete (syntax errors, no market data, a commented-out “buy 1 SPY” test).
- Letting the LLM rewrite `strategy.md` and then auto-trade the new rules is how you get unbounded behavior.
- Markdown-only state is fine for humans, not for fills, P/L, or idempotent order IDs.
- No clock/market-hours check, no kill switch, no max daily loss, no position inventory.
- Alpaca paper fills ignore real liquidity and slippage. Paper P/L is an upper bound, not proof of an edge.

**Rule:** an LLM may propose parameter changes. Only a config file you commit (or a human-gated apply step) can change what the bot trades.

---

## 4. Target architecture

```
                 ┌──────────────────┐
  Ollama (opt.)  │  Reflection job  │  reads ledger → writes learning notes
                 └────────┬─────────┘
                          │ never calls broker.submit()
                          ▼
┌─────────┐   ┌───────────┴───────────┐   ┌──────────────┐
│ Config  │──▶│  Strategy engine      │──▶│ Risk gate    │
│ YAML    │   │  (SMA/RSI or later)   │   │ hard limits  │
└─────────┘   └───────────┬───────────┘   └──────┬───────┘
                          │ approved signals     │
                          ▼                      ▼
                 ┌────────────────────────────────┐
                 │ Execution service              │
                 │ Alpaca TradingClient paper=True│
                 └──────────────┬─────────────────┘
                                │
           ┌────────────────────┼────────────────────┐
           ▼                    ▼                    ▼
    Alpaca paper API      SQLite + JSONL        Markdown
    (orders/positions)    (system of record)    (human ledger)
```

### Components

1. **Broker adapter** — `alpaca-py` `TradingClient` with `paper=True`. Wraps account, clock, positions, orders. Fail closed if `ALPACA_PAPER` is not true or if the base URL is not the paper endpoint.
2. **Market data** — `StockHistoricalDataClient` for daily/minute bars. Paper accounts get **IEX** data, not SIP. Treat that as a first-class constraint in backtests and live-paper.
3. **Clock** — `get_clock()`; do not trade when the market is closed (v1: regular hours only).
4. **Strategy engine** — Pure functions: bars + positions → list of `Signal(symbol, side, qty, reason, strength)`. No I/O.
5. **Risk gate** — Rejects signals that violate max positions, max notional per name, max daily loss, existing exposure, or a kill-switch file.
6. **Execution** — Limit or market orders, client order IDs for idempotency, poll until fill/cancel, never retry blindly.
7. **Memory**
   - SQLite (or JSONL) for orders, fills, equity snapshots.
   - `trade_ledger.md` generated from that store (human-readable, not the source of truth).
   - `learning_file.md` written by the reflection job.
8. **Reflection (optional, later)** — Local model (e.g. Qwen via Ollama) summarizes the day’s trades against `strategy.yaml` and *suggests* changes. Suggestions land in `proposals/` and stay unapplied until you edit config.

### Suggested layout

```
trading-bot/
  PLAN.md                 ← this file
  README.md               ← how to run (added when code exists)
  pyproject.toml
  .env.example
  configs/strategy.yaml
  src/trading_bot/
    broker/
    data/
    strategy/
    risk/
    execution/
    memory/
    reflection/
    app.py                ← CLI: status | run-once | paper-loop
  tests/
  scripts/smoke_paper_account.py
```

Python 3.11+, venv, packages: `alpaca-py`, `python-dotenv`, `pydantic`, `pandas` (signals), later `ollama` only for reflection.

---

## 5. Safety rails (non-negotiable)

These are product requirements, not later polish:

- **Paper-only mode** in v1. If live keys or `https://api.alpaca.markets` appear, the process exits.
- **Kill switch:** presence of `configs/KILL` (or `TRADING_BOT_KILL=1`) cancels open orders and refuses new ones.
- **Hard limits** in config, not in the LLM prompt: max positions, max % equity per symbol, max daily realized+unrealized loss, min cash buffer, allow-list of symbols.
- **Idempotency:** every order has a client order ID derived from `{date, symbol, side, signal_id}` so a crash/restart does not double-buy.
- **Secrets:** `.env` + `.gitignore`. Never log keys.
- **Human-in-the-loop for strategy mutation.** Auto-apply of LLM edits is out of scope.
- **No unattended live money.** Paper loop may run unattended; live is a later project with a written go-live checklist.

Alpaca paper caveats to remember in every review: no market impact, no queue position, possible fills larger than real liquidity, no dividends, no fill emails. Do not treat paper P/L as a live forecast.

---

## 6. Phased plan

Each phase has a **exit check**. Do not skip ahead. Code for a phase should be testable without the next phase.

### Phase 0 — Project shell

- Add `pyproject.toml`, venv, `.env.example`, `.gitignore` for `.env` / `KILL` / data files.
- Keep this isolated from the Next.js TruckTok app (separate package, separate CI later).
- Exit check: `python -c "import trading_bot"` in the venv.

### Phase 1 — Alpaca paper connectivity (read-only)

You do this once in the Alpaca dashboard:

1. Create/login at [alpaca.markets](https://alpaca.markets).
2. Open the **Paper** account (keys are not the live keys). Paper-only accounts work.
3. Generate paper API key + secret.
4. Put them in `.env` with `ALPACA_PAPER=true`.

Then a smoke script that **does not place orders**:

- Construct `TradingClient(..., paper=True)`.
- Assert account `status`, print equity / buying power / cash.
- Call `get_clock()` and print `is_open`.
- List positions and open orders.

Exit check: script prints paper equity (~$100k default unless you reset the paper account) and never submits an order. Confirm the same numbers in the Alpaca paper dashboard.

### Phase 2 — Market data + bars

- Fetch daily (then 1-minute) bars for an allow-list: start with `SPY` only.
- Store bars locally so strategy tests do not hit the API.
- Handle IEX-only paper data: missing prints, gaps, and that this will not match a SIP backtest.

Exit check: a unit test computes 20-day SMA and RSI(14) on a fixture of bars with no network.

### Phase 3 — Deterministic v1 strategy

Start with the example from the Grok notes, encoded as config — not as prose the model interprets at runtime:

- Universe: `SPY` (expand later to `QQQ`, `AAPL` only after SPY path is solid).
- Buy: close > SMA(20) and RSI(14) < 60 (uptrend, not extremely overbought).
- Exit: close < SMA(20), or +5% take-profit, or −3% stop.
- Position size: 1 share first; then a % of equity cap (e.g. 5%).

This is a **starter** to prove the pipeline. It is not claimed to be an edge. You replace the functions later without rewriting broker/risk/execution.

Exit check: given fixture bars, the engine emits a known sequence of signals. No Alpaca calls in this test.

### Phase 4 — Risk gate

Before any `submit_order`:

- Symbol must be on the allow-list.
- Open position count < `max_positions`.
- Notional ≤ `max_notional_pct * equity`.
- Day P/L > `-max_daily_loss`.
- Market is open (regular session).
- Kill switch is off.
- Buying power is sufficient.

Exit check: tests that a valid signal is rejected when each limit is tripped.

### Phase 5 — Paper execution + ledger (first real orders)

- `run-once` CLI: fetch clock → bars → signals → risk → submit → poll fill → persist.
- Use `MarketOrderRequest` for v1 (simplest). Prefer `LimitOrderRequest` once you care about paper vs live fill quality.
- Persist: Alpaca order id, client order id, submitted/filled timestamps, qty, fill price, reason.
- Append a human line to `trade_ledger.md`.
- Reconcile local state vs `get_orders()` / `get_all_positions()` on startup.

Exit check: during market hours, `run-once` can buy 1 share of SPY on paper, you see the order in the dashboard, local ledger matches, restart does not duplicate the order.

### Phase 6 — Loop + exits

- `paper-loop`: sleep/poll on a fixed interval (e.g. 60s) while `clock.is_open`.
- Manage exits: stop / take-profit / SMA cross using **positions you already hold**, not new entries only.
- Daily equity snapshot at close.
- Structured logs (JSON) plus console summary.

Exit check: a paper session can open and later close the SPY position via the exit rules, with both legs in the ledger.

### Phase 7 — Offline backtest (same strategy code)

- Replay historical daily bars through the **same** `strategy` + `risk` functions.
- Simple fill model: next bar open, optional spread. Label it as naive.
- Report: trades, win rate, max drawdown, vs buy-and-hold SPY — with a disclaimer that this is not paper and not live.

Exit check: backtest and paper bot import the same signal function. Changing SMA period in YAML changes both.

### Phase 8 — Optional LLM reflection (off the order path)

Only after Phases 1–6 are boringly reliable.

- After close (or on demand): feed last N ledger rows + `strategy.yaml` to a local model via Ollama (`http://localhost:11434`).
- Model writes `learning_file.md` and a `proposals/YYYY-MM-DD.yaml` diff.
- You apply or reject by editing `configs/strategy.yaml`.
- Hardware note from the Grok thread: an 8B coder model is a reasonable local starting point; it is **not** required for paper trading to work.

Exit check: killing Ollama does not prevent `run-once` from trading. The broker module has no import of `ollama`.

### Phase 9 — Ops, then stop (do not “go live” in this project)

- README: install, Alpaca paper keys, `status`, `run-once`, `paper-loop`, kill switch.
- Tests in CI (strategy + risk; broker tests mocked).
- Explicit **non-goal:** wiring live Alpaca. That would be a separate plan with different keys, smaller size, and acceptance of paper’s blind spots (slippage, liquidity, dividends).

---

## 7. First strategy config (v1 draft)

```yaml
mode: paper
broker:
  paper: true
  base_url: https://paper-api.alpaca.markets
universe:
  - SPY
session: regular  # 09:30–16:00 ET
strategy:
  name: sma_rsi_v1
  sma_period: 20
  rsi_period: 14
  rsi_buy_below: 60
  take_profit_pct: 5.0
  stop_loss_pct: 3.0
risk:
  max_positions: 1
  max_notional_pct_per_symbol: 0.05
  max_daily_loss_pct: 0.02
  qty_override: 1          # force 1 share until execution is trusted
kill_switch_file: configs/KILL
```

You should treat every number as a placeholder until you have a strategy you actually believe in.

---

## 8. Success criteria

**Plumbing is done when:**

- Paper account read works without placing orders.
- One SPY round-trip appears in Alpaca’s paper UI and in the local ledger with matching qty/price/time.
- Restart does not duplicate orders.
- Kill switch and daily-loss cap are proven with tests.
- LLM (if added) cannot submit orders even if it “wants” to.

**Strategy research is a separate bar:**

- Weeks of paper results plus a backtest of the *same* code.
- You still do not have an edge just because the bot ran. Deutscher’s point stands: automation without a real strategy mainly loses faster.

---

## 9. Decisions already made vs still open

**Decided for this plan**

- Alpaca paper only.
- Python + official `alpaca-py`.
- Deterministic strategy on the order path.
- LLM optional and read-only w.r.t. the broker.
- Isolated from the TruckTok Next.js app.

**Open (you can answer later; defaults in parentheses)**

- New GitHub repo vs this `trading-bot/` folder *(folder is fine to start)*.
- Daily bars vs 1-minute for v1 *(daily is simpler; minute after the loop works)*.
- Market vs limit orders *(market for first fill proof; limit after)*.
- Whether you want Ollama on the machine that runs the bot *(not needed for Phases 0–7)*.
- Universe beyond SPY *(not until SPY paper round-trips are clean)*.

---

## 10. Recommended implementation order

When you say to start building, do this in order:

1. Phase 0–1: project + read-only Alpaca smoke test.
2. Phase 2–4: bars, SMA/RSI, risk tests (no orders).
3. Phase 5: one manual `run-once` paper buy of 1 SPY, verify dashboard.
4. Phase 6: exits + loop.
5. Phase 7: backtest using the same functions.
6. Phase 8 only if you still want the “learning file” from the Grok notes.

What you need on your side before Phase 1 code can be run: an Alpaca paper API key and secret (dashboard → Paper). Those stay in `.env` and are never committed.

---

## 11. Explicit non-goals for v1

- Live trading, options, crypto, or margin/shorting.
- Calling Claude/Grok/ChatGPT on every bar to “decide” buys.
- MCP/exchange-agent orchestration, Docker, VPS, Discord, Supabase.
- Mixing this into the TruckTok UI.
- Copy-pasting the Grok `bot.py` as-is.
