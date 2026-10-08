from typing import List, Dict, Any


def format_insider_transactions_table(transactions: List[Dict[str, Any]], limit: int = 10) -> str:
    """Formats SEC Form 4 insider transactions into a clean Markdown table with Unicode indicators."""
    if not transactions:
        return "*Nessuna transazione insider SEC Form 4 recente disponibile.*"

    rows = []
    rows.append("| Data | Insider / Ruolo | Operazione | Azioni | Prezzo | Controvalore Totale |")
    rows.append("| :--- | :--- | :---: | :---: | :---: | :---: |")

    for tx in transactions[:limit]:
        date = tx.get("date", tx.get("transactionDate", "-"))
        name = tx.get("reportingName", tx.get("name", "Executive"))
        title = tx.get("officerTitle", tx.get("title", ""))
        who = f"**{name}**<br/><small>{title}</small>" if title else f"**{name}**"

        tx_type = str(tx.get("transactionType", tx.get("type", "P"))).upper()
        if "BUY" in tx_type or "P" == tx_type or "PURCHASE" in tx_type:
            op_badge = "🟢 ACQUISTO (P)"
        elif "SALE" in tx_type or "S" == tx_type or "SELL" in tx_type:
            op_badge = "🔴 VENDITA (S)"
        else:
            op_badge = f"⚪ {tx_type}"

        shares = tx.get("shares", tx.get("amount", 0))
        shares_str = f"{shares:,.0f}" if isinstance(shares, (int, float)) else str(shares)

        price = tx.get("price", tx.get("transactionPrice", 0))
        price_str = f"${price:,.2f}" if isinstance(price, (int, float)) and price > 0 else "-"

        value = tx.get("value", tx.get("totalValue", 0))
        if not value and isinstance(shares, (int, float)) and isinstance(price, (int, float)):
            value = shares * price
        val_str = f"**${value:,.0f}**" if isinstance(value, (int, float)) and value > 0 else "-"

        rows.append(f"| {date} | {who} | {op_badge} | {shares_str} | {price_str} | {val_str} |")

    return "\n".join(rows)


def format_screener_results_table(results: List[Dict[str, Any]], limit: int = 15) -> str:
    """Formats quantitative stock screener results into a structured Markdown table."""
    if not results:
        return "*Nessun titolo trovato con i criteri di screening selezionati.*"

    rows = []
    rows.append("| Ticker | Nome Azienda | Settore | Market Cap | P/E | Div Yield | Beta |")
    rows.append("| :--- | :--- | :--- | :---: | :---: | :---: | :---: |")

    for r in results[:limit]:
        ticker = f"**{r.get('symbol', r.get('code', '-'))}**"
        name = r.get("name", r.get("company_name", "-"))
        sector = r.get("sector", "-")

        mc = r.get("market_capitalization", r.get("market_cap", 0))
        if isinstance(mc, (int, float)):
            if mc >= 1e12:
                mc_str = f"${mc/1e12:.2f}T"
            elif mc >= 1e9:
                mc_str = f"${mc/1e9:.2f}B"
            elif mc >= 1e6:
                mc_str = f"${mc/1e6:.2f}M"
            else:
                mc_str = f"${mc:,.0f}"
        else:
            mc_str = str(mc)

        pe = r.get("pe", r.get("trailing_pe", None))
        pe_str = f"{pe:.1f}x" if isinstance(pe, (int, float)) and pe > 0 else "-"

        dy = r.get("dividend_yield", 0)
        dy_str = f"{dy*100:.2f}%" if isinstance(dy, (int, float)) and dy > 0 else "0.00%"

        beta = r.get("beta", None)
        beta_str = f"{beta:.2f}" if isinstance(beta, (int, float)) else "-"

        rows.append(f"| {ticker} | {name} | {sector} | {mc_str} | {pe_str} | {dy_str} | {beta_str} |")

    return "\n".join(rows)
