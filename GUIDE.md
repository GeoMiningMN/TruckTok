# Step-by-Step Guide: Build a Local Self-Improving AI Trading Bot
## Ollama + Alpaca Paper Trading (Mac M1 Pro Compatible)

**Based on**: Miles Deutscher’s “Build a Working AI Trading Bot” guide principles  
**Target Setup**: Local Ollama (qwen3-coder:8b or similar) on MacBook Pro M1 Pro 16GB + Alpaca paper trading  
**Focus**: Execution on *your* strategy + self-improving memory system (Trade Ledger + Learning File)  
**Safety First**: Paper trading only. Start tiny. Review everything manually.

---

## Prerequisites
- Mac with Ollama installed and running (`ollama serve`)
- Python 3.10+
- Basic terminal & Python comfort
- Free Alpaca account (paper trading sandbox)

**Time to first working version**: 1–2 hours

---

## Phase 1: Project Setup & Dependencies

1. Create project folder:
   ```bash
   mkdir ~/ai_trading_bot && cd ~/ai_trading_bot
   ```

2. (Strongly recommended) Create virtual environment:
   ```bash
   python3 -m venv venv
   source venv/bin/activate
   ```

3. Install packages:
   ```bash
   pip install alpaca-py python-dotenv ollama schedule
   ```

4. Create `.env` file for secrets:
   ```bash
   touch .env
   ```

---

## Phase 2: Alpaca Paper Trading Setup

1. Sign up / log in at [alpaca.markets](https://alpaca.markets)
2. Go to **Paper Trading** dashboard
3. Generate **Paper API Key** and **Secret Key**
4. Edit `.env`:
   ```
   ALPACA_API_KEY=PASTE_YOUR_PAPER_KEY_HERE
   ALPACA_SECRET_KEY=PASTE_YOUR_PAPER_SECRET_HERE
   ALPACA_PAPER=True
   ```

**Note**: Paper keys are separate from live keys. `paper=True` routes all calls to the sandbox.

---

## Phase 3: Ollama Local LLM Setup (“Brain”)

1. Pull recommended model (fits well on 16GB Mac):
   ```bash
   ollama pull qwen3-coder:8b
   ```
   - Good alternatives: `qwen3:8b`, `qwen2.5-coder:7b` or `14b`

2. Quick test:
   ```bash
   ollama run qwen3-coder:8b
   ```
   Type a question, then `/bye`

---

## Phase 4: Create Core Files (Memory System)

Create these three files in your project folder:

### `strategy.md` (Your initial rules – edit freely)
```markdown
# Trading Strategy Rules

## Core Philosophy
- Paper trade only until thoroughly validated
- Focus on liquid US equities (SPY, QQQ, major stocks)
- Clear rules for entry, exit, position sizing, and risk

## Example Simple Strategy (Replace with yours)
- Buy when price > 20-day SMA AND RSI(14) < 40 (oversold in uptrend)
- Sell/Exit when price < 20-day SMA or +5% profit or -3% stop-loss
- Max 3–5 concurrent positions
- Position size: 5–10% of current equity per trade
- Only trade during regular market hours (9:30 AM – 4:00 PM ET)

## Tunable Parameters
- SMA period: 20
- RSI buy threshold: 40
- Take-profit: +5%
- Stop-loss: -3% or ATR-based
```

### `trade_ledger.md` (Append-only trade log)
```markdown
# Trade Ledger

**Format per entry**:
- Timestamp (ET)
- Symbol
- Side (BUY / SELL)
- Quantity
- Fill Price
- P/L (when closed)
- Reason / Notes from strategy or LLM

## Entries
```

### `learning_file.md` (LLM reflections & improvements)
```markdown
# Learning File – Strategy Reflections & Improvements

## Latest Reflection
- Date:
- Key Observations:
- Suggested Changes:

## Historical Notes
```

---

## Phase 5: Core Bot Script (`bot.py`)

Create `bot.py` with the code below. This is a **minimal working starter** that includes:
- Alpaca paper client
- Basic ledger logging
- LLM reflection prompt (manual review recommended at first)
- Test execution example

```python
import os
from dotenv import load_dotenv
from datetime import datetime
from alpaca.trading.client import TradingClient
from alpaca.trading.requests import MarketOrderRequest
from alpaca.trading.enums import OrderSide, TimeInForce
import ollama

load_dotenv()

# ==================== CONFIG ====================
API_KEY = os.getenv("ALPACA_API_KEY")
SECRET_KEY = os.getenv("ALPACA_SECRET_KEY")
PAPER = os.getenv("ALPACA_PAPER", "True").lower() == "true"

MODEL = "qwen3-coder:8b"          # Change to your model

LEDGER_FILE = "trade_ledger.md"
LEARNING_FILE = "learning_file.md"
STRATEGY_FILE = "strategy.md"

# ==================== CLIENTS ====================
trading_client = TradingClient(API_KEY, SECRET_KEY, paper=PAPER)

def log_trade(symbol: str, side: str, qty: float, price: float, notes: str = ""):
    ts = datetime.now().strftime("%Y-%m-%d %H:%M:%S ET")
    entry = f"- {ts} | {symbol} | {side} | Qty: {qty} | Price: ${price:.2f} | {notes}\n"
    with open(LEDGER_FILE, "a") as f:
        f.write(entry)
    print(f"[LEDGER] {entry.strip()}")

def get_account():
    acct = trading_client.get_account()
    print(f"Equity: ${float(acct.equity):,.2f} | Buying Power: ${float(acct.buying_power):,.2f}")
    return acct

def reflect_and_suggest():
    """LLM reviews ledger + strategy and suggests improvements"""
    with open(STRATEGY_FILE, "r") as f:
        strategy = f.read()
    with open(LEDGER_FILE, "r") as f:
        ledger = f.read()[-3000:]   # Last ~3000 chars

    prompt = f"""You are an expert trading strategy optimizer and risk manager.

CURRENT STRATEGY:
{strategy}

RECENT TRADE LEDGER (most recent entries):
{ledger}

TASK:
1. Analyze recent performance and adherence to rules.
2. Suggest 2–3 specific, actionable improvements (parameters, rules, risk management, or new conditions).
3. Output in this exact format:

=== UPDATED STRATEGY.md ===
<full revised strategy.md content here>

=== NEW LEARNING NOTES ===
<concise new notes to append to learning_file.md>
"""

    response = ollama.chat(model=MODEL, messages=[{"role": "user", "content": prompt}])
    print("\n" + "="*60)
    print("LLM REFLECTION & SUGGESTIONS")
    print("="*60)
    print(response['message']['content'])
    print("="*60 + "\n")
    print(">>> REVIEW THE SUGGESTIONS ABOVE. Manually update strategy.md and learning_file.md for safety.")

def place_paper_order(symbol: str = "SPY", qty: float = 1):
    """Example execution function – use with extreme caution"""
    order_data = MarketOrderRequest(
        symbol=symbol,
        qty=qty,
        side=OrderSide.BUY,
        time_in_force=TimeInForce.DAY
    )
    try:
        order = trading_client.submit_order(order_data=order_data)
        print(f"[ORDER] Submitted {order.id} | {symbol} {qty} shares")
        # In production: fetch actual fill price from order or positions
        log_trade(symbol, "BUY", qty, 0.0, "TEST PAPER ORDER - update with real fill price")
        return order
    except Exception as e:
        print(f"[ERROR] Order failed: {e}")
        return None

# ==================== MAIN ====================
if __name__ == "__main__":
    print("=== LOCAL AI TRADING BOT (PAPER MODE) ===")
    get_account()

    print("\nReady. Recommended first steps:")
    print("1. Edit strategy.md with your real rules")
    print("2. Uncomment and run place_paper_order() for a tiny test (comment out after)")
    print("3. Run reflect_and_suggest() and manually apply good suggestions")
    print("4. Build a scheduled loop next (see enhancements below)")

    # === UNCOMMENT FOR TESTING (REMOVE AFTER) ===
    # place_paper_order("SPY", 1)
    # reflect_and_suggest()
```

**Run it**:
```bash
python bot.py
```

---

## Phase 6: Running the Bot & Daily Workflow

**Recommended Daily Flow**:
1. Morning: Run `python bot.py` → check account
2. During market hours: Enhance loop or run manually
3. End of day / on demand: Run `reflect_and_suggest()` → review output → update files
4. Weekly: Review full ledger and learning file

**Enhance the Loop (Next Version Ideas)**:
- Add `schedule` library for timed runs during market hours
- Fetch real market data with `StockHistoricalDataClient`
- Make execution conditional on parsed LLM output (JSON mode)
- Add position checks before new orders
- Discord / notification integration (you already use bots)

---

## Phase 7: Safety, Monitoring & Best Practices

**Non-Negotiable Rules**:
- **Paper trading only** until you have consistent positive results over many weeks
- Always review LLM suggestions before editing live files
- Start with 1 share or very small sizes
- Monitor Alpaca dashboard constantly
- Keep API keys secure (`.env` + `.gitignore`)
- Never run unattended with real money

**Monitoring**:
- Alpaca Paper dashboard
- `trade_ledger.md` and `learning_file.md`
- Terminal logs from the script

**Git / Version Control Tip**:
```bash
git init
echo ".env" >> .gitignore
git add .
git commit -m "Initial local AI trading bot setup"
```

---

## Next Steps & Enhancements

1. **Add Real Market Data** – Use Alpaca’s historical/latest data clients for better signals.
2. **Scheduled Execution** – Use `schedule` + market hours check or Mac `launchd`.
3. **Tool Calling** – Upgrade to Ollama tool calling for automatic file read/write.
4. **Multi-Agent** – Wrap in Hermes / OpenClaw / your existing agent framework.
5. **Backtesting** – Build a separate backtester using historical data before paper.
6. **Notifications** – Add Discord/Telegram alerts on trades or reflections.
7. **Scale** – Move to VPS + multi-GPU later when ready for higher frequency.

---

**You now have a complete, local, private foundation** that follows the exact principles in the original guide:
- LLM as brain for reflection & strategy improvement
- Memory system (Ledger + Learning File)
- Paper execution via Alpaca
- Clear separation of strategy (yours) vs execution/reflection (LLM)

Start small, stay safe, and iterate using the LLM’s own suggestions.

---

*Guide created: July 17, 2026 — from the shared Grok conversation “Build Your AI Trading Bot.”*
