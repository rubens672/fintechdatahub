import React from 'react';

export function MethodologyDocView() {
  return (
    <div style={{ width: '100%', height: '100%', flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
      <iframe
        src="/api/docs/graph-design/view"
        title="Specifica Matematica & Ingegneristica DAG"
        style={{
          width: '100%',
          height: '100%',
          flex: 1,
          border: 'none',
          borderRadius: '12px',
          background: '#070d18',
          display: 'block',
        }}
      />
    </div>
  );
}
