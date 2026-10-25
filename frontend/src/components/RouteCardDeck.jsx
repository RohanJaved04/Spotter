import React, { useState } from 'react';
import { 
  Award, 
  Clock, 
  Milestone, 
  ChevronDown, 
  ChevronUp, 
  Bookmark, 
  Sliders, 
  AlertTriangle,
  Wind,
  ShieldCheck
} from 'lucide-react';

export default function RouteCardDeck({
  routes,
  activeRouteId,
  onSelectRoute,
  onSaveRoute,
  onEditParams,
  tripParams
}) {
  const [expandedRouteId, setExpandedRouteId] = useState(null);

  if (!routes || routes.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '3.5rem 1.5rem', color: '#737373' }}>
        <div style={{
          width: '44px',
          height: '44px',
          borderRadius: '8px',
          background: '#141414',
          border: '1px solid #262626',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: '1rem'
        }}>
          <Sliders size={20} color="#ffffff" />
        </div>
        <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#ffffff', marginBottom: '0.4rem' }}>
          No Routes Calculated Yet
        </h3>
        <p style={{ fontSize: '0.8rem', color: '#737373', lineHeight: 1.4, marginBottom: '1.25rem' }}>
          Enter origin and destination in the Trip Planner to generate 3 weather-aware route options.
        </p>
        {onEditParams && (
          <button
            type="button"
            onClick={onEditParams}
            className="btn btn-primary"
            style={{ fontSize: '0.8rem', padding: '0.45rem 1rem' }}
          >
            Go to Trip Planner
          </button>
        )}
      </div>
    );
  }

  const toggleExpand = (id, e) => {
    e.stopPropagation();
    setExpandedRouteId(expandedRouteId === id ? null : id);
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: '0.75rem',
      width: '100%'
    }}>
      {/* 3 Evaluated Route Cards */}
      {routes.map((route) => {
        const isActive = route.route_id === activeRouteId;
        const isRec = route.is_recommended;
        const stats = route.risk_summary || {};
        const isExpanded = expandedRouteId === route.route_id;

        const severeMiles = stats.total_severe_and_worse_miles || 0;
        const highMiles = stats.high_miles || 0;
        const modMiles = stats.moderate_miles || 0;
        const lowMiles = stats.low_miles || 0;
        const totalMiles = route.distance_miles || (severeMiles + highMiles + modMiles + lowMiles) || 1;

        return (
          <div
            key={route.route_id}
            onClick={() => onSelectRoute(route.route_id)}
            style={{
              cursor: 'pointer',
              padding: '0.85rem 1rem',
              borderRadius: '8px',
              border: isActive ? '1px solid #ffffff' : '1px solid #222222',
              background: isActive ? '#171717' : '#0f0f0f',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.5rem',
              transition: 'all 0.15s ease'
            }}
          >
            {/* Header Ribbon */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              {isRec ? (
                <div style={{
                  background: '#ffffff',
                  color: '#000000',
                  padding: '2px 8px',
                  borderRadius: '4px',
                  fontSize: '0.65rem',
                  fontWeight: 800,
                  letterSpacing: '0.04em',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}>
                  <Award size={12} />
                  <span>RECOMMENDED ROUTE</span>
                </div>
              ) : (
                <div style={{
                  background: '#222222',
                  color: '#a3a3a3',
                  padding: '2px 8px',
                  borderRadius: '4px',
                  fontSize: '0.65rem',
                  fontWeight: 700
                }}>
                  <span>ALTERNATIVE #{route.rank}</span>
                </div>
              )}

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onSaveRoute(route);
                  }}
                  className="btn btn-ghost"
                  style={{ padding: '2px 6px', fontSize: '0.7rem' }}
                  title="Bookmark / Save Route"
                >
                  <Bookmark size={13} color="#a3a3a3" />
                </button>
                <span style={{
                  fontSize: '0.7rem',
                  fontWeight: 700,
                  color: isActive ? '#ffffff' : '#737373'
                }}>
                  {isActive ? 'ACTIVE' : 'SELECT'}
                </span>
              </div>
            </div>

            {/* Route Name & Core Stats */}
            <div>
              <h3 style={{ fontSize: '0.875rem', fontWeight: 700, color: '#ffffff', margin: 0, lineHeight: 1.3 }}>
                {route.route_name}
              </h3>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px', fontSize: '0.75rem', color: '#a3a3a3', flexWrap: 'wrap' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#ffffff', fontWeight: 600 }}>
                  <Clock size={12} color="#a3a3a3" />
                  {route.formatted_duration}
                </span>
                <span>&bull;</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#ffffff', fontWeight: 600 }}>
                  <Milestone size={12} color="#a3a3a3" />
                  {route.distance_miles.toLocaleString()} mi
                </span>
                <span>&bull;</span>
                <span style={{
                  fontSize: '0.725rem',
                  fontWeight: 700,
                  color: (stats.no_travel_miles > 0 || stats.severe_miles > 0) ? '#ef4444' : 
                         (stats.high_miles > 0 ? '#f97316' : 
                         (stats.moderate_miles > 0 ? '#f59e0b' : '#10b981'))
                }}>
                  Peak: {stats.max_risk_level || 'Low'}
                </span>
              </div>
            </div>

            {/* Critical Hazard Alert Banner */}
            {stats.no_travel_miles > 0 ? (
              <div style={{
                background: 'rgba(127, 29, 29, 0.45)',
                border: '1px solid #ef4444',
                color: '#fecaca',
                padding: '5px 8px',
                borderRadius: '4px',
                fontSize: '0.7rem',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}>
                <AlertTriangle size={13} color="#ef4444" style={{ flexShrink: 0 }} />
                <span>
                  <strong>NO TRAVEL WARNING:</strong> {stats.no_travel_miles} mi ({stats.peak_hazard_label || 'Extreme Torrential Rain / Gale Wind'})
                </span>
              </div>
            ) : severeMiles > 0 ? (
              <div style={{
                background: 'rgba(239, 68, 68, 0.2)',
                border: '1px solid rgba(239, 68, 68, 0.5)',
                color: '#fca5a5',
                padding: '5px 8px',
                borderRadius: '4px',
                fontSize: '0.7rem',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}>
                <AlertTriangle size={13} color="#f87171" style={{ flexShrink: 0 }} />
                <span>
                  <strong>SEVERE WEATHER ALERT:</strong> {severeMiles} mi ({stats.peak_hazard_label || 'Severe Condition'})
                </span>
              </div>
            ) : highMiles > 0 ? (
              <div style={{
                background: 'rgba(249, 115, 22, 0.15)',
                border: '1px solid rgba(249, 115, 22, 0.4)',
                color: '#fdba74',
                padding: '4px 8px',
                borderRadius: '4px',
                fontSize: '0.7rem',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}>
                <AlertTriangle size={13} color="#fb923c" style={{ flexShrink: 0 }} />
                <span>
                  <strong>HIGH RISK:</strong> {highMiles} mi ({stats.peak_hazard_label || 'High Wind / Rain'})
                </span>
              </div>
            ) : modMiles > 0 ? (
              <div style={{
                background: 'rgba(245, 158, 11, 0.12)',
                border: '1px solid rgba(245, 158, 11, 0.35)',
                color: '#fde68a',
                padding: '4px 8px',
                borderRadius: '4px',
                fontSize: '0.7rem',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}>
                <Wind size={13} color="#f59e0b" style={{ flexShrink: 0 }} />
                <span>
                  Moderate Weather: {modMiles} mi ({stats.peak_hazard_label || 'Breezy / Rain'})
                </span>
              </div>
            ) : (
              <div style={{
                background: 'rgba(16, 185, 129, 0.08)',
                border: '1px solid rgba(16, 185, 129, 0.25)',
                color: '#a7f3d0',
                padding: '4px 8px',
                borderRadius: '4px',
                fontSize: '0.675rem',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}>
                <ShieldCheck size={13} color="#10b981" style={{ flexShrink: 0 }} />
                <span>All {totalMiles.toLocaleString()} mi Clear & Low Risk ({stats.peak_hazard_label || 'Calm skies'})</span>
              </div>
            )}

            {/* Risk Mileage Distribution Bar */}
            <div style={{ marginTop: '2px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.65rem', color: '#737373', marginBottom: '3px' }}>
                <span>Weather Hazard Exposure:</span>
                <span style={{ fontWeight: 700, color: (stats.no_travel_miles > 0 || severeMiles > 0) ? '#ef4444' : (highMiles > 0 ? '#f97316' : '#10b981') }}>
                  {stats.no_travel_miles > 0 ? `${stats.no_travel_miles} mi No-Travel` : (severeMiles > 0 ? `${severeMiles} mi Severe` : (highMiles > 0 ? `${highMiles} mi High` : '0 mi Severe/High'))}
                </span>
              </div>
              <div style={{
                display: 'flex',
                height: '6px',
                borderRadius: '3px',
                overflow: 'hidden',
                background: '#222222'
              }}>
                <div style={{ width: `${(lowMiles / totalMiles) * 100}%`, background: '#10b981' }} title={`Low Risk: ${lowMiles} mi`} />
                <div style={{ width: `${(modMiles / totalMiles) * 100}%`, background: '#f59e0b' }} title={`Moderate Risk: ${modMiles} mi`} />
                <div style={{ width: `${(highMiles / totalMiles) * 100}%`, background: '#f97316' }} title={`High Risk: ${highMiles} mi`} />
                <div style={{ width: `${(severeMiles / totalMiles) * 100}%`, background: '#ef4444' }} title={`Severe / No Travel: ${severeMiles} mi`} />
              </div>
            </div>

            {/* Key Metrics Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '4px', marginTop: '2px' }}>
              <div style={{
                background: '#141414',
                border: '1px solid #222222',
                padding: '4px',
                borderRadius: '4px',
                textAlign: 'center'
              }}>
                <div style={{ fontSize: '0.575rem', color: '#737373' }}>Severe/Stop</div>
                <div style={{ fontSize: '0.725rem', fontWeight: 800, color: (stats.no_travel_miles > 0 || severeMiles > 0) ? '#ef4444' : '#ffffff' }}>
                  {stats.total_severe_and_worse_miles || severeMiles || 0} mi
                </div>
              </div>

              <div style={{
                background: '#141414',
                border: '1px solid #222222',
                padding: '4px',
                borderRadius: '4px',
                textAlign: 'center'
              }}>
                <div style={{ fontSize: '0.575rem', color: '#737373' }}>High Risk</div>
                <div style={{ fontSize: '0.725rem', fontWeight: 800, color: highMiles > 0 ? '#fb923c' : '#ffffff' }}>
                  {highMiles} mi
                </div>
              </div>

              <div style={{
                background: '#141414',
                border: '1px solid #222222',
                padding: '4px',
                borderRadius: '4px',
                textAlign: 'center'
              }}>
                <div style={{ fontSize: '0.575rem', color: '#737373' }}>Peak Wind</div>
                <div style={{ fontSize: '0.725rem', fontWeight: 800, color: stats.max_wind_mph >= 35 ? '#f97316' : '#ffffff' }}>
                  {stats.max_wind_mph || 0} mph
                </div>
              </div>

              <div style={{
                background: '#141414',
                border: '1px solid #222222',
                padding: '4px',
                borderRadius: '4px',
                textAlign: 'center'
              }}>
                <div style={{ fontSize: '0.575rem', color: '#737373' }}>Peak Rain</div>
                <div style={{ fontSize: '0.725rem', fontWeight: 800, color: stats.max_precip_in_per_hr >= 0.25 ? '#ef4444' : '#ffffff' }}>
                  {stats.max_precip_in_per_hr || 0} in/h
                </div>
              </div>
            </div>

            {/* Recommendation Reasons Note */}
            <div style={{
              fontSize: '0.675rem',
              color: isRec ? '#ffffff' : '#737373',
              lineHeight: 1.3,
              background: isRec ? '#1c1c1c' : 'transparent',
              padding: isRec ? '4px 6px' : '0',
              borderRadius: '4px'
            }}>
              {route.recommendation_reason}
            </div>

            {/* Expand / Collapse Checkpoints Button */}
            <button
              type="button"
              onClick={(e) => toggleExpand(route.route_id, e)}
              className="btn btn-ghost"
              style={{
                padding: '3px 6px',
                fontSize: '0.675rem',
                justifyContent: 'space-between',
                width: '100%',
                borderTop: '1px solid #222222',
                marginTop: '2px'
              }}
            >
              <span>{isExpanded ? 'Hide Checkpoints' : `Inspect ${route.checkpoints?.length || 0} Checkpoints`}</span>
              {isExpanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
            </button>

            {/* Detailed Checkpoint List */}
            {isExpanded && (
              <div style={{
                maxHeight: '160px',
                overflowY: 'auto',
                display: 'flex',
                flexDirection: 'column',
                gap: '3px',
                marginTop: '3px',
                paddingRight: '3px'
              }}>
                {route.checkpoints?.map((cp) => (
                  <div
                    key={cp.index}
                    style={{
                      background: '#121212',
                      border: '1px solid #222222',
                      borderRadius: '4px',
                      padding: '4px 8px',
                      fontSize: '0.65rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between'
                    }}
                  >
                    <div>
                      <strong style={{ color: '#ffffff' }}>Mi {cp.distance_from_start_miles}: </strong>
                      <span style={{ color: '#a3a3a3' }}>{cp.eta_formatted}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ color: '#737373' }}>{cp.weather?.wind_speed_mph} mph</span>
                      <span className={`badge-risk badge-risk-${cp.risk?.overall_risk?.toLowerCase().replace(' ', '-')}`} style={{ fontSize: '0.6rem', padding: '1px 5px' }}>
                        {cp.risk?.overall_risk}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
