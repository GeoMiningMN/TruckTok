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
