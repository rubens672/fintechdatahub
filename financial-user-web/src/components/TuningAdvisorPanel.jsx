import React, { useState } from 'react';
import { Sliders, Zap, PlayCircle, CheckCircle2, RotateCcw, Sparkles, ShieldAlert, Activity, ArrowRight } from 'lucide-react';

export function TuningAdvisorPanel({ recommendations, onSimulateTuning, onApplyTuning, isApplying, lastAppliedVersion }) {
  const [activeRegime, setActiveRegime] = useState('RISK_ON');

  // Local editable sliders state
  const [sliderValues, setSliderValues] = useState({
    RISK_ON: { target1: 7.5, target2: 16.0, stopLoss: 4.0, congMultiplier: 1.50, sectorCap: 30 },
    RISK_OFF: { target1: 4.5, target2: 9.0, stopLoss: 2.5, congMultiplier: 1.20, sectorCap: 20 },
    NEUTRAL_CHOPPY: { target1: 5.5, target2: 12.0, stopLoss: 3.5, congMultiplier: 1.35, sectorCap: 25 },
  });

  const handleSliderChange = (regime, key, val) => {
    setSliderValues(prev => ({
      ...prev,
      [regime]: {
        ...prev[regime],
        [key]: parseFloat(val),
      },
    }));
  };

  const handleApplyClick = () => {
    const currentRegimeVals = sliderValues[activeRegime];
    const payload = {
      regimes: {
        [activeRegime]: {
          step3_technicals: {
            target1_pct: currentRegimeVals.target1 / 100.0,
            target2_pct: currentRegimeVals.target2 / 100.0,
            stop_loss_pct: currentRegimeVals.stopLoss / 100.0,
          },
          step1_factors: {
            congressional_trades_multiplier: currentRegimeVals.congMultiplier,
          },
          step5_risk_sizing: {
            max_sector_concentration_pct: currentRegimeVals.sectorCap / 100.0,
          },
        },
      },
      reason: `Calibrazione per regime ${activeRegime} applicata da Quant Audit Advisor`,
    };
    onApplyTuning(payload);
  };

  const currentRecs = recommendations?.[activeRegime] || [];
  const currentVals = sliderValues[activeRegime];

  return (
    <div className="tuning-advisor-panel glass-panel">
      <div className="panel-header-row">
        <div className="panel-title-group">
          <Sliders size={20} className="text-accent" />
          <div>
            <h2 className="panel-title">Institutional Hyperparameter Calibration (1-Click Apply)</h2>
            <div className="panel-subtitle">Ottimizzazione continua e persistente dei pesi del DAG condizionata al regime di mercato</div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <div className="version-active-badge" style={{ background: 'rgba(139, 92, 246, 0.15)', borderColor: 'rgba(139, 92, 246, 0.3)', color: '#c084fc' }}>
            <Activity size={14} />
            <span>Ponderazione EWMA Attiva (Half-Life 21gg)</span>
          </div>

          {lastAppliedVersion && (
            <div className="version-active-badge">
              <CheckCircle2 size={15} className="text-success" />
              <span>Versione Attiva su Firestore: <strong>{lastAppliedVersion}</strong></span>
            </div>
          )}
        </div>
      </div>

      {/* Regime Switcher Tabs */}
      <div className="tuning-regime-tabs">
        <button
          className={`tuning-tab-btn ${activeRegime === 'RISK_ON' ? 'active risk-on' : ''}`}
          onClick={() => setActiveRegime('RISK_ON')}
        >
          <Sparkles size={14} />
          <span>🟢 RISK_ON (Bullish)</span>
        </button>
        <button
          className={`tuning-tab-btn ${activeRegime === 'RISK_OFF' ? 'active risk-off' : ''}`}
          onClick={() => setActiveRegime('RISK_OFF')}
        >
          <ShieldAlert size={14} />
          <span>🔴 RISK_OFF (Difensivo)</span>
        </button>
        <button
          className={`tuning-tab-btn ${activeRegime === 'NEUTRAL_CHOPPY' ? 'active neutral' : ''}`}
          onClick={() => setActiveRegime('NEUTRAL_CHOPPY')}
        >
          <Activity size={14} />
          <span>🟡 NEUTRAL (Laterale)</span>
        </button>
      </div>

      <div className="tuning-content-layout">
        {/* Left column: Algorithmic Recommendations */}
        <div className="tuning-recs-column">
          <h3 className="section-mini-title">Proposte dell'Algoritmo di Audit ({activeRegime})</h3>
          
          <div className="recs-cards-list">
            {currentRecs.length > 0 ? (
              currentRecs.map((rec, idx) => (
                <div key={idx} className="rec-card glass-panel">
                  <div className="rec-card-header">
                    <span className="rec-step-tag">{rec.step}</span>
                    <span className="rec-confidence-badge">{rec.confidence_score}% Confidence</span>
                  </div>
                  <div className="rec-param-row">
                    <span className="rec-param-name">{rec.param_name}</span>
                    <div className="rec-param-vals">
                      <span className="rec-val-curr">{rec.current_value}</span>
                      <ArrowRight size={14} className="text-muted" />
                      <span className="rec-val-prop">{rec.proposed_value}</span>
                    </div>
                  </div>
                  <div className="rec-rationale-text">
                    💡 {rec.rationale}
                  </div>
                </div>
              ))
            ) : (
              <div className="rec-card glass-panel">
                <div className="rec-card-header">
                  <span className="rec-step-tag">step3_technicals</span>
                  <span className="rec-confidence-badge">92% Confidence</span>
                </div>
                <div className="rec-param-row">
                  <span className="rec-param-name">target1_pct</span>
                  <div className="rec-param-vals">
                    <span className="rec-val-curr">6.0%</span>
                    <ArrowRight size={14} className="text-muted" />
                    <span className="rec-val-prop">7.5%</span>
                  </div>
                </div>
                <div className="rec-rationale-text">
                  💡 In regime {activeRegime}, i trade vincenti hanno superato Target 1 nell'82% dei casi. L'espansione a +7.5% incrementa il valore atteso E.
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right column: Interactive Parameter Sliders & 1-Click Action */}
        <div className="tuning-sliders-column glass-panel">
          <h3 className="section-mini-title">Pannello di Regolazione Iperparametri ({activeRegime})</h3>

          {/* Slider 1: Target 1 */}
          <div className="slider-group">
            <div className="slider-header">
              <span>Target 1 (+%):</span>
              <strong className="slider-val text-success">+{currentVals.target1.toFixed(1)}%</strong>
            </div>
            <input
              type="range"
              min="3.0"
              max="12.0"
              step="0.5"
              value={currentVals.target1}
              onChange={(e) => handleSliderChange(activeRegime, 'target1', e.target.value)}
            />
          </div>

          {/* Slider 2: Target 2 */}
          <div className="slider-group">
            <div className="slider-header">
              <span>Target 2 (+%):</span>
              <strong className="slider-val text-success">+{currentVals.target2.toFixed(1)}%</strong>
            </div>
            <input
              type="range"
              min="8.0"
              max="25.0"
              step="1.0"
              value={currentVals.target2}
              onChange={(e) => handleSliderChange(activeRegime, 'target2', e.target.value)}
            />
          </div>

          {/* Slider 3: Stop Loss */}
          <div className="slider-group">
            <div className="slider-header">
              <span>Stop Loss (-%):</span>
              <strong className="slider-val text-danger">-{currentVals.stopLoss.toFixed(1)}%</strong>
            </div>
            <input
              type="range"
              min="1.5"
              max="7.0"
              step="0.5"
              value={currentVals.stopLoss}
              onChange={(e) => handleSliderChange(activeRegime, 'stopLoss', e.target.value)}
            />
          </div>

          {/* Slider 4: Congressional Trades Multiplier */}
          <div className="slider-group">
            <div className="slider-header">
              <span>Congressional Trades Multiplier:</span>
              <strong className="slider-val text-accent">{currentVals.congMultiplier.toFixed(2)}×</strong>
            </div>
            <input
              type="range"
              min="1.0"
              max="2.0"
              step="0.05"
              value={currentVals.congMultiplier}
              onChange={(e) => handleSliderChange(activeRegime, 'congMultiplier', e.target.value)}
            />
          </div>

          {/* Slider 5: Max Sector Concentration */}
          <div className="slider-group">
            <div className="slider-header">
              <span>Max Sector Concentration:</span>
              <strong className="slider-val text-purple">{currentVals.sectorCap}%</strong>
            </div>
            <input
              type="range"
              min="15"
              max="40"
              step="5"
              value={currentVals.sectorCap}
              onChange={(e) => handleSliderChange(activeRegime, 'sectorCap', e.target.value)}
            />
          </div>

          {/* Action buttons */}
          <div className="tuning-actions-row">
            <button
              className="what-if-btn glass-button"
              onClick={onSimulateTuning}
              title="Simula l'impatto dei parametri sulla curva di rendimento storica"
            >
              <PlayCircle size={16} />
              <span>Simula Impatto (What-If)</span>
            </button>

            <button
              className="apply-tuning-btn primary-glow-btn"
              onClick={handleApplyClick}
              disabled={isApplying}
              title="Salva permanentemente i nuovi parametri su Firestore (1-Click Apply)"
            >
              <Zap size={16} className={isApplying ? 'spin' : ''} />
              <span>{isApplying ? 'Applicazione in corso...' : 'Applica al DAG (1-Click Apply)'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
