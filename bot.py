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
