# screener-tradingview

Turn a stock screen from [Screener.in](https://www.screener.in) into a watchlist you can import into [TradingView](https://www.tradingview.com).

**Live:** https://screener-tradingview.vercel.app

## How to use

1. Export your screen from Screener.in as a CSV file. It should include the `Name`, `NSE Code` and `BSE Code` columns.
2. Drop the file on the page, or click to choose it.
3. Copy the list or download `watchlist.txt`, then import it into a TradingView watchlist.

The file is read in your browser and never uploaded.

## How it works

Each row becomes one TradingView symbol:

- A stock with an NSE code becomes `NSE:<code>`.
- A stock with only a BSE code is looked up in `public/bse_mapping.csv` and becomes `BSE:<security id>`.
- Any other row is skipped and listed under "Show dropped rows".

`&` and `-` become `_`, so `M&M` becomes `NSE:M_M`.

## Updating the BSE list

`public/bse_mapping.csv` is a saved copy of BSE's list of securities, so a BSE-only stock listed after it was saved gets skipped. To refresh it, download the current list from [BSE's website](https://www.bseindia.com) and replace the file. Only the `Security Code` and `Security Id` columns are used.

## Run locally

Needs Node.js 22 or newer.

```bash
npm install
npm run dev
```

Built with Next.js, React, TypeScript, Tailwind CSS and Papa Parse.
