import React, { useState, useEffect, useRef, useMemo } from 'react';
import { TrendingUp, BarChart2, Activity, Layers, Maximize2, RefreshCw } from 'lucide-react';

export function CandlestickChart({ symbol, currentPrice, entryZone, stopLoss, targetPrice, targetPrice2 }) {
  const [period, setPeriod] = useState('6mo');
  const [data, setData] = useState([]);
  const [levels, setLevels] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [hoverIndex, setHoverIndex] = useState(null);
  
  // Indicator Toggles
  const [showSMA20, setShowSMA20] = useState(true);
  const [showSMA50, setShowSMA50] = useState(true);
  const [showBollinger, setShowBollinger] = useState(true);
  const [showLevels, setShowLevels] = useState(true);

  const canvasRef = useRef(null);
  const containerRef = useRef(null);

  // Fetch or generate realistic OHLCV historical series
  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);

    async function loadHistory() {
      try {
        const cleanSym = (symbol || 'NVDA').replace('.US', '');
        const res = await fetch(`/api/stock/${cleanSym}/history?period=${period}`);
        if (res.ok) {
          const json = await res.json();
          if (json.prices && json.prices.length > 0) {
            if (isMounted) {
              setData(json.prices);
              setLevels(json.levels || {});
              setIsLoading(false);
              return;
            }
          }
        }
      } catch (err) {
        console.error('Error fetching authentic stock history:', err);
      }

      if (isMounted) {
        setData([]);
        setLevels({});
        setIsLoading(false);
      }
    }

    loadHistory();
    return () => {
      isMounted = false;
    };
  }, [symbol, period, currentPrice]);

  // Compute Technical Indicators (ensuring fallback indicators if missing)
  const computedData = useMemo(() => {
    if (!data || data.length === 0) return [];

    return data.map((item, idx, arr) => {
      let sma20 = item.sma20 ?? null;
      let bUpper = item.bUpper ?? null;
      let bLower = item.bLower ?? null;
      let sma50 = item.sma50 ?? null;

      if (sma20 === null && idx >= 19) {
        const slice20 = arr.slice(idx - 19, idx + 1);
        const sum20 = slice20.reduce((acc, curr) => acc + curr.close, 0);
        sma20 = sum20 / 20;

        const variance = slice20.reduce((acc, curr) => acc + Math.pow(curr.close - sma20, 2), 0) / 20;
        const stdDev = Math.sqrt(variance);
        bUpper = sma20 + 2 * stdDev;
        bLower = sma20 - 2 * stdDev;
      }

      if (sma50 === null && idx >= 49) {
        const slice50 = arr.slice(idx - 49, idx + 1);
        const sum50 = slice50.reduce((acc, curr) => acc + curr.close, 0);
        sma50 = sum50 / 50;
      }

      return {
        ...item,
        sma20,
        sma50,
        bUpper,
        bLower,
      };
    });
  }, [data]);

  // Render on HTML5 Canvas with Crisp Retina Support
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || computedData.length === 0) return;

    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    const width = canvas.parentElement.clientWidth || 800;
    const height = 370;

    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    ctx.scale(dpr, dpr);

    // Layout areas with wide dedicated right margin for levels and price labels
    const padding = { top: 25, right: 105, bottom: 30, left: 15 };
    const chartHeight = height - padding.top - padding.bottom;
    const priceChartHeight = chartHeight * 0.74;
    const volumeChartHeight = chartHeight * 0.18;
    const volumeTop = padding.top + priceChartHeight + chartHeight * 0.05;
    const chartWidth = width - padding.left - padding.right;

    // Background gradient
    const bgGrad = ctx.createLinearGradient(0, 0, 0, height);
    bgGrad.addColorStop(0, '#0b1120');
    bgGrad.addColorStop(1, '#070d18');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, width, height);

    // Calculate Price Range
    let minPrice = Infinity;
    let maxPrice = -Infinity;
    let maxVolume = 0;

    computedData.forEach((d) => {
      if (d.low < minPrice) minPrice = d.low;
      if (d.high > maxPrice) maxPrice = d.high;
      if (d.bUpper && showBollinger && d.bUpper > maxPrice) maxPrice = d.bUpper;
      if (d.bLower && showBollinger && d.bLower < minPrice) minPrice = d.bLower;
      if (d.volume > maxVolume) maxVolume = d.volume;
    });

    // Key Levels: Quantitative Ladder Guard (STOP < S1 < LAST < T1 < T2)
    const latestBar = computedData[computedData.length - 1];
    const lastClose = Number(currentPrice || latestBar?.close || 100.0);

    const hasExplicitEntry = entryZone !== undefined && entryZone !== null && Number(entryZone) > 0;
    const hasExplicitStop = stopLoss !== undefined && stopLoss !== null && Number(stopLoss) > 0;
    const hasExplicitT1 = targetPrice !== undefined && targetPrice !== null && Number(targetPrice) > 0;
    const hasExplicitT2 = targetPrice2 !== undefined && targetPrice2 !== null && Number(targetPrice2) > 0;

    let s1 = hasExplicitEntry ? Number(Number(entryZone).toFixed(2)) : Number((lastClose * 0.975).toFixed(2));
    let stop = hasExplicitStop ? Number(Number(stopLoss).toFixed(2)) : Number((s1 * 0.955).toFixed(2));
    let t1 = hasExplicitT1 ? Number(Number(targetPrice).toFixed(2)) : Number((lastClose * 1.045).toFixed(2));
    let t2 = hasExplicitT2 ? Number(Number(targetPrice2).toFixed(2)) : Number((t1 * 1.055).toFixed(2));

    // Fallback sanity guard ONLY if values are unassigned
    if (!hasExplicitStop && stop >= s1) {
      stop = Number((s1 * 0.955).toFixed(2));
    }
    if (!hasExplicitT2 && t2 <= t1) {
      t2 = Number((t1 * 1.055).toFixed(2));
    }

    if (showLevels) {
      if (stop < minPrice) minPrice = stop;
      if (s1 < minPrice) minPrice = s1;
      if (t1 > maxPrice) maxPrice = t1;
      if (t2 > maxPrice) maxPrice = t2;
      if (lastClose > maxPrice) maxPrice = lastClose;
      if (lastClose < minPrice) minPrice = lastClose;
    }

    // Add 4% padding on price axis
    const priceMargin = (maxPrice - minPrice) * 0.04 || 1;
    minPrice -= priceMargin;
    maxPrice += priceMargin;
    const priceRange = maxPrice - minPrice;

    const getY = (val) => padding.top + (1 - (val - minPrice) / priceRange) * priceChartHeight;
    const getVolY = (vol) => volumeTop + (1 - vol / (maxVolume || 1)) * volumeChartHeight;
    const getX = (idx) => padding.left + (idx / (computedData.length - 1 || 1)) * chartWidth;

    // 1. Draw Grid Lines & Horizontal Price Labels (Aligned to far right)
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.lineWidth = 1;
    ctx.font = '10px JetBrains Mono, monospace';
    ctx.fillStyle = 'rgba(148, 163, 184, 0.45)';
    ctx.textAlign = 'right';

    const gridSteps = 5;
    for (let i = 0; i <= gridSteps; i++) {
      const pVal = minPrice + (i / gridSteps) * priceRange;
      const y = getY(pVal);
      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(width - padding.right, y);
      ctx.stroke();

      ctx.fillText(`$${pVal.toFixed(2)}`, width - 8, y + 3);
    }

    // 2. Draw Date Labels on X Axis
    ctx.fillStyle = 'rgba(148, 163, 184, 0.55)';
    ctx.textAlign = 'center';
    ctx.font = '9.5px JetBrains Mono, monospace';
    const stepBars = period === '1mo' ? 4 : period === '3mo' ? 12 : period === '6mo' ? 24 : 45;
    for (let i = 0; i < computedData.length; i += stepBars) {
      const d = computedData[i];
      if (d && d.date) {
        const x = getX(i);
        const label = period === '1mo' ? d.date.slice(5) : d.date.slice(2);
        ctx.fillText(label, x, height - 10);
      }
    }

    // 3. Draw Bollinger Bands Cloud
    if (showBollinger) {
      ctx.beginPath();
      let started = false;
      for (let i = 0; i < computedData.length; i++) {
        const d = computedData[i];
        if (d.bUpper !== null) {
          const x = getX(i);
          const y = getY(d.bUpper);
          if (!started) {
            ctx.moveTo(x, y);
            started = true;
          } else {
            ctx.lineTo(x, y);
          }
        }
      }
      for (let i = computedData.length - 1; i >= 0; i--) {
        const d = computedData[i];
        if (d.bLower !== null) {
          const x = getX(i);
          const y = getY(d.bLower);
          ctx.lineTo(x, y);
        }
      }
      ctx.closePath();
      ctx.fillStyle = 'rgba(129, 140, 248, 0.07)';
      ctx.fill();

      // Band Lines
      ctx.strokeStyle = 'rgba(129, 140, 248, 0.4)';
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      started = false;
      computedData.forEach((d, i) => {
        if (d.bUpper !== null) {
          const x = getX(i);
          const y = getY(d.bUpper);
          if (!started) { ctx.moveTo(x, y); started = true; } else ctx.lineTo(x, y);
        }
      });
      ctx.stroke();

      ctx.beginPath();
      started = false;
      computedData.forEach((d, i) => {
        if (d.bLower !== null) {
          const x = getX(i);
          const y = getY(d.bLower);
          if (!started) { ctx.moveTo(x, y); started = true; } else ctx.lineTo(x, y);
        }
      });
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // 4. Draw Volume Bars
    const barWidth = Math.max(1.5, (chartWidth / computedData.length) * 0.72);
    computedData.forEach((d, i) => {
      const x = getX(i);
      const isUp = d.close >= d.open;
      const vY = getVolY(d.volume);
      const vH = volumeTop + volumeChartHeight - vY;

      ctx.fillStyle = isUp ? 'rgba(16, 185, 129, 0.25)' : 'rgba(239, 68, 68, 0.25)';
      ctx.fillRect(x - barWidth / 2, vY, barWidth, vH);
    });

    // 5. Draw Candlesticks (Wick + Body)
    computedData.forEach((d, i) => {
      const x = getX(i);
      const isUp = d.close >= d.open;
      const highY = getY(d.high);
      const lowY = getY(d.low);
      const openY = getY(d.open);
      const closeY = getY(d.close);

      // Wick
      ctx.strokeStyle = isUp ? '#10b981' : '#ef4444';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(x, highY);
      ctx.lineTo(x, lowY);
      ctx.stroke();

      // Body
      const bodyTop = Math.min(openY, closeY);
      const bodyHeight = Math.max(1.5, Math.abs(closeY - openY));
      ctx.fillStyle = isUp ? '#10b981' : '#ef4444';
      ctx.fillRect(x - barWidth / 2, bodyTop, barWidth, bodyHeight);
    });

    // 6. Draw SMA 20 (Amber/Gold)
    if (showSMA20) {
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      let started = false;
      computedData.forEach((d, i) => {
        if (d.sma20 !== null) {
          const x = getX(i);
          const y = getY(d.sma20);
          if (!started) { ctx.moveTo(x, y); started = true; } else ctx.lineTo(x, y);
        }
      });
      ctx.stroke();
    }

    // 7. Draw SMA 50 (Cyan/Blue)
    if (showSMA50) {
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      let started = false;
      computedData.forEach((d, i) => {
        if (d.sma50 !== null) {
          const x = getX(i);
          const y = getY(d.sma50);
          if (!started) { ctx.moveTo(x, y); started = true; } else ctx.lineTo(x, y);
        }
      });
      ctx.stroke();
    }

    // 8. Draw S1 Entry / Stop-Loss / Target Horizontal Lines & Anti-Collision Badges
    if (showLevels) {
      const levelsToDraw = [
        { val: t2, color: '#ec4899', label: 'T2' },
        { val: t1, color: '#a855f7', label: 'T1' },
        { val: lastClose, color: '#38bdf8', label: 'LAST', isLast: true },
        { val: s1, color: '#10b981', label: 'S1' },
        { val: stop, color: '#ef4444', label: 'STOP' },
      ].filter((l) => typeof l.val === 'number' && !isNaN(l.val) && l.val > 0);

      // Step 1: Draw dashed horizontal lines at EXACT price Y positions
      levelsToDraw.forEach((l) => {
        const y = getY(l.val);
        ctx.strokeStyle = l.color;
        ctx.lineWidth = l.isLast ? 1.0 : 1.3;
        ctx.setLineDash(l.isLast ? [2, 3] : [4, 4]);
        ctx.beginPath();
        ctx.moveTo(padding.left, y);
        ctx.lineTo(width - padding.right, y);
        ctx.stroke();
        ctx.setLineDash([]);
      });

      // Step 2: Anti-Collision badge placement (visual only — lines stay at real Y)
      const sortedLevels = [...levelsToDraw].sort((a, b) => b.val - a.val);
      const placedBadges = [];
      const minBadgeSpacing = 16;

      sortedLevels.forEach((l) => {
        const realY = getY(l.val);
        let badgeY = realY;
        if (placedBadges.length > 0) {
          const prev = placedBadges[placedBadges.length - 1];
          if (badgeY < prev.badgeY + minBadgeSpacing) {
            badgeY = prev.badgeY + minBadgeSpacing;
          }
        }
        placedBadges.push({ ...l, realY, badgeY });
      });

      // Step 3: Draw connector tick and badge at (possibly offset) badgeY
      placedBadges.forEach((b) => {
        const badgeX = width - padding.right + 6;
        const text = `${b.label} $${b.val.toFixed(2)}`;
        ctx.font = 'bold 9px JetBrains Mono, monospace';
        const textWidth = ctx.measureText(text).width;

        // Draw connector line from real line edge to badge if offset
        if (Math.abs(b.badgeY - b.realY) > 2) {
          ctx.strokeStyle = `${b.color}88`;
          ctx.lineWidth = 0.8;
          ctx.setLineDash([2, 2]);
          ctx.beginPath();
          ctx.moveTo(width - padding.right, b.realY);
          ctx.lineTo(badgeX, b.badgeY);
          ctx.stroke();
          ctx.setLineDash([]);
        }

        // Draw badge background + border
        ctx.fillStyle = 'rgba(15, 23, 42, 0.95)';
        ctx.strokeStyle = b.color;
        ctx.lineWidth = 1;
        ctx.fillRect(badgeX, b.badgeY - 7, textWidth + 8, 14);
        ctx.strokeRect(badgeX, b.badgeY - 7, textWidth + 8, 14);

        // Draw text
        ctx.fillStyle = b.color;
        ctx.textAlign = 'left';
        ctx.fillText(text, badgeX + 4, b.badgeY + 3);
      });
    }
    if (hoverIndex !== null && hoverIndex >= 0 && hoverIndex < computedData.length) {
      const d = computedData[hoverIndex];
      const hX = getX(hoverIndex);
      const hY = getY(d.close);

      // Vertical line
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
      ctx.lineWidth = 1;
      ctx.setLineDash([2, 2]);
      ctx.beginPath();
      ctx.moveTo(hX, padding.top);
      ctx.lineTo(hX, height - padding.bottom);
      ctx.stroke();

      // Horizontal line
      ctx.beginPath();
      ctx.moveTo(padding.left, hY);
      ctx.lineTo(width - padding.right, hY);
      ctx.stroke();
      ctx.setLineDash([]);

      // Point circle
      ctx.fillStyle = d.close >= d.open ? '#10b981' : '#ef4444';
      ctx.beginPath();
      ctx.arc(hX, hY, 3.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }, [computedData, showSMA20, showSMA50, showBollinger, showLevels, hoverIndex, entryZone, stopLoss, targetPrice, targetPrice2, period]);

  // Mouse Move on Canvas
  const handleMouseMove = (e) => {
    const canvas = canvasRef.current;
    if (!canvas || computedData.length === 0) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const paddingLeft = 15;
    const paddingRight = 105;
    const chartWidth = rect.width - paddingLeft - paddingRight;

    if (x < paddingLeft || x > rect.width - paddingRight) {
      setHoverIndex(null);
      return;
    }

    const relX = (x - paddingLeft) / chartWidth;
    const idx = Math.round(relX * (computedData.length - 1));
    if (idx >= 0 && idx < computedData.length) {
      setHoverIndex(idx);
    }
  };

  const handleMouseLeave = () => {
    setHoverIndex(null);
  };

  // Active Candle in HUD
  const activeCandle = hoverIndex !== null && computedData[hoverIndex] 
    ? computedData[hoverIndex] 
    : computedData[computedData.length - 1];

  const candleChange = activeCandle ? ((activeCandle.close - activeCandle.open) / activeCandle.open) * 100 : 0;
  const isUp = candleChange >= 0;

  return (
    <div className="candlestick-container" ref={containerRef} style={{ background: 'rgba(11, 17, 32, 0.95)', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '12px', padding: '16px', marginBottom: '22px' }}>
      {/* Top Header Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', marginBottom: '14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--cyan-primary)', fontWeight: 800, fontSize: '13.5px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            <Activity size={16} /> Grafico Tecnico & Livelli Quantitativi ({symbol})
          </div>
          <span style={{ fontSize: '11px', background: 'rgba(255, 255, 255, 0.06)', color: 'var(--text-muted)', padding: '2px 8px', borderRadius: '4px' }}>
            {period.toUpperCase()} ({computedData.length} barre)
          </span>
        </div>

        {/* Timeframe Pills */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'rgba(255, 255, 255, 0.04)', padding: '3px', borderRadius: '6px' }}>
          {['1mo', '3mo', '6mo', '1y'].map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setPeriod(p)}
              style={{
                background: period === p ? 'var(--cyan-primary)' : 'transparent',
                color: period === p ? '#0b1120' : 'var(--text-muted)',
                border: 'none',
                padding: '4px 10px',
                borderRadius: '4px',
                fontSize: '11.5px',
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              {p.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* HUD Info Bar (Open, High, Low, Close, Volume, SMAs) */}
      {activeCandle && (
        <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '14px', fontSize: '12px', fontFamily: 'JetBrains Mono, monospace', color: 'var(--text-muted)', background: 'rgba(255, 255, 255, 0.03)', padding: '8px 12px', borderRadius: '6px', marginBottom: '10px' }}>
          <div><span style={{ color: 'var(--text-dim)' }}>Data:</span> <strong style={{ color: '#ffffff' }}>{activeCandle.date}</strong></div>
          <div><span style={{ color: 'var(--text-dim)' }}>O:</span> <strong style={{ color: '#ffffff' }}>${activeCandle.open.toFixed(2)}</strong></div>
          <div><span style={{ color: 'var(--text-dim)' }}>H:</span> <strong style={{ color: '#ffffff' }}>${activeCandle.high.toFixed(2)}</strong></div>
          <div><span style={{ color: 'var(--text-dim)' }}>L:</span> <strong style={{ color: '#ffffff' }}>${activeCandle.low.toFixed(2)}</strong></div>
          <div><span style={{ color: 'var(--text-dim)' }}>C:</span> <strong style={{ color: isUp ? 'var(--green-profit)' : 'var(--red-loss)' }}>${activeCandle.close.toFixed(2)}</strong> ({isUp ? '+' : ''}{candleChange.toFixed(2)}%)</div>
          <div><span style={{ color: 'var(--text-dim)' }}>Vol:</span> <strong style={{ color: '#ffffff' }}>{(activeCandle.volume / 1e6).toFixed(1)}M</strong></div>
          {activeCandle.sma20 && (
            <div style={{ color: '#f59e0b' }}><span>SMA 20:</span> <strong>${activeCandle.sma20.toFixed(2)}</strong></div>
          )}
          {activeCandle.sma50 && (
            <div style={{ color: '#38bdf8' }}><span>SMA 50:</span> <strong>${activeCandle.sma50.toFixed(2)}</strong></div>
          )}
        </div>
      )}

      {/* Canvas */}
      <div style={{ position: 'relative', width: '100%', minHeight: '370px' }}>
        <canvas
          ref={canvasRef}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          style={{ width: '100%', height: '370px', cursor: 'crosshair', display: 'block' }}
        />
        {isLoading && (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(11, 17, 32, 0.7)' }}>
            <div style={{ color: 'var(--cyan-primary)', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <RefreshCw size={16} className="spin" /> Caricamento serie storica...
            </div>
          </div>
        )}
      </div>

      {/* Bottom Indicator Toggles */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px', marginTop: '12px', paddingTop: '10px', borderTop: '1px solid rgba(255, 255, 255, 0.05)', fontSize: '11.5px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={() => setShowSMA20(!showSMA20)}
            style={{
              background: showSMA20 ? 'rgba(245, 158, 11, 0.15)' : 'rgba(255, 255, 255, 0.04)',
              border: `1px solid ${showSMA20 ? '#f59e0b' : 'transparent'}`,
              color: showSMA20 ? '#f59e0b' : 'var(--text-dim)',
              padding: '3px 8px',
              borderRadius: '4px',
              cursor: 'pointer',
              fontWeight: 600,
            }}
          >
            ● SMA 20 (Arancione)
          </button>
          <button
            type="button"
            onClick={() => setShowSMA50(!showSMA50)}
            style={{
              background: showSMA50 ? 'rgba(56, 189, 248, 0.15)' : 'rgba(255, 255, 255, 0.04)',
              border: `1px solid ${showSMA50 ? '#38bdf8' : 'transparent'}`,
              color: showSMA50 ? '#38bdf8' : 'var(--text-dim)',
              padding: '3px 8px',
              borderRadius: '4px',
              cursor: 'pointer',
              fontWeight: 600,
            }}
          >
            ● SMA 50 (Blu)
          </button>
          <button
            type="button"
            onClick={() => setShowBollinger(!showBollinger)}
            style={{
              background: showBollinger ? 'rgba(129, 140, 248, 0.15)' : 'rgba(255, 255, 255, 0.04)',
              border: `1px solid ${showBollinger ? '#818cf8' : 'transparent'}`,
              color: showBollinger ? '#818cf8' : 'var(--text-dim)',
              padding: '3px 8px',
              borderRadius: '4px',
              cursor: 'pointer',
              fontWeight: 600,
            }}
          >
            ● Bande Bollinger
          </button>
          <button
            type="button"
            onClick={() => setShowLevels(!showLevels)}
            style={{
              background: showLevels ? 'rgba(16, 185, 129, 0.15)' : 'rgba(255, 255, 255, 0.04)',
              border: `1px solid ${showLevels ? '#10b981' : 'transparent'}`,
              color: showLevels ? '#10b981' : 'var(--text-dim)',
              padding: '3px 8px',
              borderRadius: '4px',
              cursor: 'pointer',
              fontWeight: 600,
            }}
          >
            ● Livelli S1 / Stop / T1
          </button>
        </div>

        <div style={{ color: 'var(--text-dim)', fontSize: '11px' }}>
          Interattivo: passa con il mouse per i dettagli candela
        </div>
      </div>
    </div>
  );
}
