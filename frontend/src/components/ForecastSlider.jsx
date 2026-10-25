import React from 'react';
import { Play, Pause, RotateCcw, Clock, Navigation } from 'lucide-react';

export default function ForecastSlider({
  activeRoute,
  activeStopIndex = 0,
  onChangeStopIndex,
  isAnimating = false,
  onToggleAnimate
}) {
  const checkpoints = activeRoute?.checkpoints || [];
  const totalStops = checkpoints.length;
  const currentStop = checkpoints[activeStopIndex] || checkpoints[0];

  if (totalStops <= 1) return null;

  return (
    <div style={{
      position: 'absolute',
      bottom: '20px',
      left: '50%',
      transform: 'translateX(-50%)',
      width: 'min(660px, calc(100% - 460px))',
      zIndex: 400,
    }}>
      <div style={{
        background: '#0d0d0d',
        border: '1px solid #262626',
        borderRadius: '8px',
        padding: '0.75rem 1rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.45rem',
        boxShadow: '0 10px 25px rgba(0,0,0,0.85)'
      }}>
        {/* Header Row */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '6px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.725rem', fontWeight: 800, color: '#ffffff', letterSpacing: '0.04em' }}>
            <Navigation size={13} color="#ffffff" />
            <span>ROUTE STOPS ANIMATION</span>
            <span style={{ fontSize: '0.675rem', color: '#737373', fontWeight: 500 }}>
              ({totalStops} stops charted)
            </span>
          </div>

          {currentStop && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.725rem', color: '#a3a3a3' }}>
              <Clock size={12} />
              <strong style={{ color: '#ffffff' }}>Stop {activeStopIndex + 1}/{totalStops}</strong>
              <span>&bull;</span>
              <span>Mi {currentStop.distance_from_start_miles}</span>
              <span>&bull;</span>
              <span style={{ color: '#ffffff', fontFamily: 'var(--font-mono)' }}>{currentStop.eta_formatted}</span>
              <span className={`badge-risk badge-risk-${currentStop.risk?.overall_risk?.toLowerCase().replace(' ', '-')}`} style={{ fontSize: '0.6rem', padding: '1px 5px' }}>
                {currentStop.risk?.overall_risk}
              </span>
            </div>
          )}
        </div>

        {/* Controls Row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          {/* Animate / Pause Button */}
          <button
            type="button"
            onClick={onToggleAnimate}
            className="btn btn-primary"
            style={{
              padding: '0.35rem 0.85rem',
              fontSize: '0.725rem',
              borderRadius: '4px',
              minWidth: '105px',
              gap: '6px'
            }}
          >
            {isAnimating ? (
              <>
                <Pause size={13} />
                <span>Pause</span>
              </>
            ) : (
              <>
                <Play size={13} fill="#000000" />
                <span>Animate Route</span>
              </>
            )}
          </button>

          {/* Range Scrubber along Stops */}
          <div style={{ flex: 1, position: 'relative', display: 'flex', alignItems: 'center' }}>
            <input
              type="range"
              min="0"
              max={totalStops - 1}
              step="1"
              value={activeStopIndex}
              onChange={(e) => onChangeStopIndex(Number(e.target.value))}
              className="custom-slider"
              style={{ width: '100%', height: '4px' }}
            />
          </div>

          {/* Reset to Start (Stop 1) */}
          <button
            type="button"
            onClick={() => onChangeStopIndex(0)}
            className="btn btn-secondary"
            style={{ padding: '0.35rem', borderRadius: '4px' }}
            title="Rewind to Departure (Mile 0)"
          >
            <RotateCcw size={13} />
          </button>
        </div>

        {/* Timeline Stop Landmarks */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          fontSize: '0.625rem',
          color: '#737373',
          fontFamily: 'var(--font-mono)',
          padding: '0 2px'
        }}>
          <span>Start (Mi 0)</span>
          {totalStops > 2 && (
            <span>Midway (Mi {checkpoints[Math.floor(totalStops / 2)]?.distance_from_start_miles})</span>
          )}
          <span>Dest (Mi {checkpoints[totalStops - 1]?.distance_from_start_miles})</span>
        </div>
      </div>
    </div>
  );
}
