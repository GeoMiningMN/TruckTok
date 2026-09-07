# Local AI Trading Bot (Paper Only)

Self-improving paper-trading bot scaffold based on the [Miles Deutscher “Build a Working AI Trading Bot”](https://x.com/milesdeutscher/status/2078229763630805501) principles, adapted for a local **Ollama** brain + **Alpaca paper trading**.

> **Safety:** Paper trading only. Review every LLM suggestion before changing strategy files. Never commit API keys or run unattended with real money.

## Quick start

1. Create a virtualenv and install deps:
   ```bash
   cd ai-trading-bot
   python3 -m venv venv
   source venv/bin/activate
   pip install -r requirements.txt
   ```
2. Copy `.env.example` → `.env` and paste your **Alpaca paper** keys.
3. Pull a local model (example):
   ```bash
   ollama pull qwen3-coder:8b
   ```
4. Edit `strategy.md` with your rules, then:
   ```bash
   python bot.py
   ```

Full micro-steps, safety rules, and enhancement ideas are in [`GUIDE.md`](./GUIDE.md).

## Project files

| File | Role |
|------|------|
| `bot.py` | Paper client, ledger logging, LLM reflection helper |
| `strategy.md` | Your trading rules (brain dump) |
| `trade_ledger.md` | Append-only trade log |
| `learning_file.md` | LLM reflections / suggested improvements |
| `.env.example` | Alpaca paper key template |

## Disclaimer

This is educational scaffolding, not financial advice. Past or simulated performance does not predict future results.
