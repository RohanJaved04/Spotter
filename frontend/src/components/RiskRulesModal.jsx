import React from 'react';
import { X, ShieldAlert, AlertTriangle } from 'lucide-react';

export default function RiskRulesModal({ isOpen, onClose }) {
  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(0, 0, 0, 0.85)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: '1rem'
    }} onClick={onClose}>
      <div 
        style={{
          width: '100%',
          maxWidth: '640px',
          maxHeight: '90vh',
          overflowY: 'auto',
          padding: '1.75rem',
          position: 'relative',
          background: '#0d0d0d',
          border: '1px solid #262626',
          borderRadius: '8px',
          boxShadow: '0 20px 40px rgba(0, 0, 0, 0.9)'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '6px',
              background: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#000000'
            }}>
              <ShieldAlert size={18} color="#000000" />
            </div>
            <div>
              <h2 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#ffffff', margin: 0 }}>
                Weather Risk & Truck Load Rules
              </h2>
              <p style={{ fontSize: '0.725rem', color: '#737373', margin: 0 }}>
                Official classification thresholds & priority ranking
              </p>
            </div>
          </div>
          <button onClick={onClose} className="btn btn-ghost" style={{ padding: '0.4rem' }}>
            <X size={18} />
          </button>
        </div>

        {/* Section 1: Checkpoint Thresholds */}
        <div style={{ marginBottom: '1.5rem' }}>
          <h3 style={{ fontSize: '0.75rem', fontWeight: 800, color: '#ffffff', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            1. Weather Condition Thresholds
          </h3>
          <div style={{ overflowX: 'auto', border: '1px solid #262626', borderRadius: '6px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.75rem', textAlign: 'left' }}>
              <thead>
                <tr style={{ background: '#171717', color: '#a3a3a3', borderBottom: '1px solid #262626' }}>
                  <th style={{ padding: '0.55rem 0.75rem' }}>Condition</th>
                  <th style={{ padding: '0.55rem 0.75rem', color: '#34d399' }}>Low</th>
                  <th style={{ padding: '0.55rem 0.75rem', color: '#fbbf24' }}>Moderate</th>
                  <th style={{ padding: '0.55rem 0.75rem', color: '#fb923c' }}>High</th>
                  <th style={{ padding: '0.55rem 0.75rem', color: '#f87171' }}>Severe</th>
                  <th style={{ padding: '0.55rem 0.75rem', color: '#fca5a5' }}>No Travel</th>
                </tr>
              </thead>
              <tbody>
                <tr style={{ borderBottom: '1px solid #1c1c1c' }}>
                  <td style={{ padding: '0.55rem 0.75rem', fontWeight: 600 }}>Wind</td>
                  <td style={{ padding: '0.55rem 0.75rem' }}>&lt; 25 mph</td>
                  <td style={{ padding: '0.55rem 0.75rem' }}>25–34 mph</td>
                  <td style={{ padding: '0.55rem 0.75rem' }}>35–44 mph</td>
                  <td style={{ padding: '0.55rem 0.75rem' }}>45–54 mph</td>
                  <td style={{ padding: '0.55rem 0.75rem', fontWeight: 700, color: '#fca5a5' }}>≥ 55 mph</td>
                </tr>
                <tr style={{ borderBottom: '1px solid #1c1c1c' }}>
                  <td style={{ padding: '0.55rem 0.75rem', fontWeight: 600 }}>Rain</td>
                  <td style={{ padding: '0.55rem 0.75rem' }}>&lt; 0.10 in/hr</td>
                  <td style={{ padding: '0.55rem 0.75rem' }}>0.10–0.25</td>
                  <td style={{ padding: '0.55rem 0.75rem' }}>0.25–0.50</td>
                  <td style={{ padding: '0.55rem 0.75rem' }}>0.50–1.00</td>
                  <td style={{ padding: '0.55rem 0.75rem', fontWeight: 700, color: '#fca5a5' }}>&gt; 1.00 in/hr</td>
                </tr>
                <tr>
                  <td style={{ padding: '0.55rem 0.75rem', fontWeight: 600 }}>Snow</td>
                  <td style={{ padding: '0.55rem 0.75rem' }}>&lt; 0.5 in/hr</td>
                  <td style={{ padding: '0.55rem 0.75rem' }}>0.5–1.0</td>
                  <td style={{ padding: '0.55rem 0.75rem' }}>1.0–2.0</td>
                  <td style={{ padding: '0.55rem 0.75rem' }}>2.0–3.0</td>
                  <td style={{ padding: '0.55rem 0.75rem', fontWeight: 700, color: '#fca5a5' }}>&gt; 3.0 in/hr</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Section 2: Load Rules */}
        <div style={{ marginBottom: '1.5rem' }}>
          <h3 style={{ fontSize: '0.75rem', fontWeight: 800, color: '#ffffff', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            2. Cargo Load Weight Escalation Rules
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
            <div style={{
              background: '#141414',
              border: '1px solid #262626',
              borderRadius: '6px',
              padding: '0.65rem 0.85rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.65rem'
            }}>
              <AlertTriangle size={15} color="#ef4444" />
              <div style={{ fontSize: '0.775rem' }}>
                <strong style={{ color: '#ffffff' }}>≥ 55 mph wind</strong> &rarr; <span style={{ color: '#fca5a5', fontWeight: 700 }}>No Travel for any load</span>
              </div>
            </div>

            <div style={{
              background: '#141414',
              border: '1px solid #262626',
              borderRadius: '6px',
              padding: '0.65rem 0.85rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.65rem'
            }}>
              <AlertTriangle size={15} color="#ef4444" />
              <div style={{ fontSize: '0.775rem' }}>
                <strong style={{ color: '#ffffff' }}>45–54 mph wind + &gt;30,000 lb load</strong> &rarr; <span style={{ color: '#fca5a5', fontWeight: 700 }}>No Travel</span>
              </div>
            </div>

            <div style={{
              background: '#141414',
              border: '1px solid #262626',
              borderRadius: '6px',
              padding: '0.65rem 0.85rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.65rem'
            }}>
              <AlertTriangle size={15} color="#f97316" />
              <div style={{ fontSize: '0.775rem' }}>
                <strong style={{ color: '#ffffff' }}>35–44 mph wind + &gt;40,000 lb load</strong> &rarr; <span style={{ color: '#fdba74', fontWeight: 700 }}>Severe Risk</span>
              </div>
            </div>
          </div>
        </div>

        {/* Section 3: Recommendation Priority */}
        <div>
          <h3 style={{ fontSize: '0.75rem', fontWeight: 800, color: '#ffffff', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            3. Route Recommendation Priority Order
          </h3>
          <div style={{
            background: '#141414',
            border: '1px solid #262626',
            borderRadius: '6px',
            padding: '0.75rem 1rem',
            fontSize: '0.75rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.35rem',
            color: '#a3a3a3'
          }}>
            <div><strong style={{ color: '#ffffff' }}>1. Fewest Severe miles</strong> (including No-Travel miles)</div>
            <div><strong style={{ color: '#ffffff' }}>2. Fewest High miles</strong></div>
            <div><strong style={{ color: '#ffffff' }}>3. Lowest average risk</strong> across corridor</div>
            <div><strong style={{ color: '#ffffff' }}>4. Shortest travel time</strong></div>
          </div>
        </div>
      </div>
    </div>
  );
}
