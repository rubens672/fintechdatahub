import React from 'react';
import { CheckCircle2, Loader2, Circle, Clock, Sparkles } from 'lucide-react';

export function Stepper({
  stepsState,
  currentStep,
  runId,
  totalTime,
  executionTime,
  onSelectStep,
  onStepClick,
  isRunning,
  activeMessage,
  progressPct
}) {
  const handleStepClick = onSelectStep || onStepClick;
  const displayTime = totalTime || executionTime;
  const STEPS_CONFIG = [
    { id: 'step0', num: '0', name: 'Market Regime', desc: 'VIX & Macro Context' },
    { id: 'step1', num: '1', name: 'Factor Screening', desc: 'Valuation & Multiples' },
    { id: 'step2', num: '2', name: 'Catalysts & News', desc: 'Consensus & Form 4' },
    { id: 'step3', num: '3', name: 'Technical Timing', desc: 'Pivots, S/R, RSI' },
    { id: 'step4', num: '4', name: 'Relative Valuation', desc: 'Peer Multiples Ranking' },
    { id: 'step5', num: '5', name: 'Portfolio Sizing', desc: '100% Capital Deploy' },
    { id: 'step6', num: '6', name: 'Backtest Verify', desc: 'Historical Edge' },
  ];

  const getStepStatus = (index) => {
    if (stepsState && stepsState[index] !== undefined) {
      return stepsState[index]; // 'completed', 'running', 'pending', 'error'
    }
    if (currentStep === index) return 'running';
    if (currentStep > index) return 'completed';
    return 'pending';
  };

  return (
    <div className="stepper-panel glass-panel">
      <div className="stepper-header">
        <div className="stepper-title">
          7-NODE QUANTITATIVE DAG WORKFLOW {runId && <span style={{ fontSize: '13px', color: 'var(--cyan-primary)', fontFamily: 'var(--font-mono)' }}>[{runId}]</span>}
        </div>
        {displayTime && !isRunning && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: 'var(--text-muted)', fontFamily: 'JetBrains Mono' }}>
            <Clock size={14} />
            <span>Tempo esecuzione: {displayTime}s</span>
          </div>
        )}
      </div>

      <div className="stepper-track">
        {STEPS_CONFIG.map((step, idx) => {
          const status = getStepStatus(idx);
          return (
            <div
              key={step.id}
              className={`step-node ${status}`}
              onClick={() => handleStepClick && handleStepClick(idx)}
              style={{ cursor: 'pointer', transition: 'all 0.2s ease' }}
              title="Clicca per visualizzare i risultati dettagliati di questo step"
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span className="step-num">Step {step.num}</span>
                {status === 'completed' && <CheckCircle2 size={14} color="var(--green-profit)" />}
                {status === 'running' && <Loader2 size={14} color="var(--cyan-primary)" className="animate-spin" />}
                {status === 'pending' && <Circle size={12} color="var(--text-dim)" />}
              </div>

              <div className="step-name">{step.name}</div>
              <div style={{ fontSize: '11px', color: 'var(--text-dim)' }}>{step.desc}</div>
            </div>
          );
        })}
      </div>

      {/* Live Activity & Processing Banner */}
      {isRunning && (
        <div className="stepper-live-activity">
          <div className="stepper-live-activity-header">
            <div className="stepper-live-activity-title">
              <Sparkles size={16} color="var(--cyan-primary)" className="animate-spin" />
              <span>{activeMessage || 'Elaborazione quantitativa in corso...'}</span>
            </div>
            <span className="stepper-live-activity-badge">
              {progressPct ? `${progressPct}%` : 'IN CORSO'}
            </span>
          </div>
          <div className="stepper-progress-track">
            <div
              className="stepper-progress-fill"
              style={{ width: `${progressPct || 45}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
