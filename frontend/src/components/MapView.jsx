import React, { useEffect, useRef, useState } from 'react';
import { 
  MapContainer, 
  TileLayer, 
  Polyline, 
  CircleMarker, 
  Marker, 
  Popup, 
  Tooltip, 
  useMap 
} from 'react-leaflet';
import L from 'leaflet';
import { 
  Wind, 
  CloudRain, 
  Snowflake, 
  AlertTriangle, 
  Clock, 
  ShieldCheck, 
  Thermometer, 
  Layers,
  Eye,
  EyeOff
} from 'lucide-react';

// Fix for default Leaflet icon paths in React Vite
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// Custom origin and destination pin markers
const originIcon = L.divIcon({
  className: 'custom-pin-marker',
  html: `<div style="
    background: #10b981;
    color: white;
    width: 28px;
    height: 28px;
    border-radius: 50% 50% 50% 0;
    transform: rotate(-45deg);
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 4px 10px rgba(16, 185, 129, 0.6);
    border: 2px solid white;
  "><span style="transform: rotate(45deg); font-size: 11px; font-weight: 800;">A</span></div>`,
  iconSize: [28, 28],
  iconAnchor: [14, 28],
  popupAnchor: [0, -28]
});

const destIcon = L.divIcon({
  className: 'custom-pin-marker',
  html: `<div style="
    background: #f43f5e;
    color: white;
    width: 28px;
    height: 28px;
    border-radius: 50% 50% 50% 0;
    transform: rotate(-45deg);
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 4px 10px rgba(244, 63, 94, 0.6);
    border: 2px solid white;
  "><span style="transform: rotate(45deg); font-size: 11px; font-weight: 800;">B</span></div>`,
  iconSize: [28, 28],
  iconAnchor: [14, 28],
  popupAnchor: [0, -28]
});

// Moving truck marker with pulsing safety aura
const createTruckIcon = (riskColor) => L.divIcon({
  className: 'truck-nav-marker',
  html: `
    <div style="
      position: relative;
      width: 36px;
      height: 36px;
      display: flex;
      align-items: center;
      justify-content: center;
    ">
      <div class="truck-pulse-glow" style="
        position: absolute;
        width: 36px;
        height: 36px;
        border-radius: 50%;
        background: ${riskColor || '#ffffff'};
        opacity: 0.7;
      "></div>
      <div style="
        position: relative;
        width: 30px;
        height: 30px;
        border-radius: 50%;
        background: #000000;
        border: 2px solid #ffffff;
        box-shadow: 0 4px 12px rgba(0,0,0,0.85);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 2;
      ">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round">
          <path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2"/>
          <path d="M15 18H9"/>
          <path d="M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.624l-3.48-4.35A1 1 0 0 0 17.52 8H14"/>
          <circle cx="17" cy="18.5" r="2.5"/>
          <circle cx="7" cy="18.5" r="2.5"/>
        </svg>
      </div>
    </div>
  `,
  iconSize: [36, 36],
  iconAnchor: [18, 18],
  popupAnchor: [0, -22]
});

// Auto-fit map camera bounds to active routes
function MapBoundsUpdater({ routes, activeRouteId }) {
  const map = useMap();

  useEffect(() => {
    if (!routes || routes.length === 0) return;

    const active = routes.find(r => r.route_id === activeRouteId) || routes[0];
    const path = active?.full_path;

    if (path && path.length > 0) {
      const bounds = L.latLngBounds(path.map(p => [p[0], p[1]]));
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 12, animate: true });
    }
  }, [routes, activeRouteId, map]);

  return null;
}

// Canvas-based Corridor Weather Heatmap Layer for 0-48h forecast
function CorridorWeatherHeatmapLayer({ heatmapData, currentHourOffset, showHeatmap, heatmapMode }) {
  const map = useMap();
  const canvasRef = useRef(null);

  useEffect(() => {
    if (!showHeatmap || !heatmapData || !heatmapData.frames) return;

    const frame = heatmapData.frames[String(currentHourOffset)] || [];
    if (frame.length === 0) return;

    // Create or locate overlay canvas
    let canvas = canvasRef.current;
    if (!canvas) {
      canvas = L.DomUtil.create('canvas', 'corridor-weather-canvas');
      canvas.style.position = 'absolute';
      canvas.style.top = '0';
      canvas.style.left = '0';
      canvas.style.pointerEvents = 'none';
      canvas.style.zIndex = '350';
      canvas.style.opacity = '0.65';
      canvas.style.transition = 'opacity 0.25s ease';
      map.getPanes().overlayPane.appendChild(canvas);
      canvasRef.current = canvas;
    }

    const draw = () => {
      const size = map.getSize();
      canvas.width = size.x;
      canvas.height = size.y;

      const topLeft = map.containerPointToLayerPoint([0, 0]);
      L.DomUtil.setPosition(canvas, topLeft);

      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Smooth overlapping radius scaled with map zoom
      const zoom = map.getZoom();
      const radius = Math.max(55, Math.min(160, zoom * 14));

      // Render smooth atmospheric radial gradients along the travel corridor
      frame.forEach((pt) => {
        const point = map.latLngToContainerPoint([pt.lat, pt.lon]);

        const gradient = ctx.createRadialGradient(
          point.x, point.y, 0,
          point.x, point.y, radius
        );

        let color = pt.risk_color || '#10b981';
        if (heatmapMode === 'wind') {
          color = pt.wind_mph >= 55 ? '#7f1d1d' :
                  pt.wind_mph >= 45 ? '#ef4444' :
                  pt.wind_mph >= 35 ? '#f97316' :
                  pt.wind_mph >= 25 ? '#f59e0b' : '#10b981';
        } else if (heatmapMode === 'precip') {
          color = pt.precip_in > 1.0 ? '#7f1d1d' :
                  pt.precip_in >= 0.5 ? '#ef4444' :
                  pt.precip_in >= 0.25 ? '#f97316' :
                  pt.precip_in >= 0.1 ? '#38bdf8' : '#0284c7';
        }

        gradient.addColorStop(0, color + 'cc');
        gradient.addColorStop(0.35, color + '66');
        gradient.addColorStop(0.7, color + '22');
        gradient.addColorStop(1, 'rgba(0,0,0,0)');

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(point.x, point.y, radius, 0, Math.PI * 2);
        ctx.fill();
      });
    };

    draw();

    map.on('move', draw);
    map.on('zoom', draw);
    map.on('resize', draw);

    return () => {
      map.off('move', draw);
      map.off('zoom', draw);
      map.off('resize', draw);
    };
  }, [map, heatmapData, currentHourOffset, showHeatmap, heatmapMode]);

  useEffect(() => {
    return () => {
      if (canvasRef.current && canvasRef.current.parentNode) {
        canvasRef.current.parentNode.removeChild(canvasRef.current);
        canvasRef.current = null;
      }
    };
  }, []);

  return null;
}

export default function MapView({
  routes,
  activeRouteId,
  onSelectRoute,
  heatmapData,
  currentHourOffset,
  showHeatmap,
  onToggleHeatmap,
  heatmapMode,
  onChangeHeatmapMode,
  tripParams,
  activeStopIndex = 0,
  onSelectStop,
  isAnimating = false
}) {
  const activeRoute = routes.find(r => r.route_id === activeRouteId) || routes[0];
  const [mapStyle, setMapStyle] = useState('streets'); // Default is Street View as requested
  const checkpoints = activeRoute?.checkpoints || [];
  const currentStop = checkpoints[activeStopIndex] || checkpoints[0];

  const darkBaseUrl = 'https://services.arcgisonline.com/arcgis/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}';
  const darkRefUrl = 'https://services.arcgisonline.com/arcgis/rest/services/Canvas/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}';
  const osmUrl = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';

  const startPt = activeRoute?.full_path?.[0];
  const endPt = activeRoute?.full_path?.[activeRoute.full_path.length - 1];

  return (
    <div className="map-viewport">
      <MapContainer
        center={[39.8283, -98.5795]} // Center of USA
        zoom={4}
        zoomControl={false}
        style={{ width: '100%', height: '100%' }}
      >
        {mapStyle === 'dark' ? (
          <>
            <TileLayer
              attribution='&copy; <a href="https://www.esri.com/">Esri</a> &copy; OpenStreetMap'
              url={darkBaseUrl}
              maxZoom={16}
            />
            <TileLayer
              attribution='&copy; <a href="https://www.esri.com/">Esri</a>'
              url={darkRefUrl}
              maxZoom={16}
              opacity={0.8}
            />
          </>
        ) : (
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url={osmUrl}
            maxZoom={19}
          />
        )}

        <MapBoundsUpdater routes={routes} activeRouteId={activeRouteId} />

        {/* Corridor Weather Heatmap Layer */}
        <CorridorWeatherHeatmapLayer
          heatmapData={heatmapData}
          currentHourOffset={currentHourOffset}
          showHeatmap={showHeatmap}
          heatmapMode={heatmapMode}
        />

        {/* Inactive routes polylines */}
        {routes
          .filter(r => r.route_id !== activeRouteId)
          .map(r => (
            <Polyline
              key={r.route_id}
              positions={r.full_path}
              pathOptions={{
                color: '#64748b',
                weight: 4,
                opacity: 0.45,
                dashArray: '4, 8'
              }}
              eventHandlers={{
                click: () => onSelectRoute(r.route_id)
              }}
            >
              <Tooltip sticky>
                <div style={{ fontSize: '0.75rem', fontWeight: 600 }}>
                  Click to inspect: {r.route_name} ({r.formatted_duration})
                </div>
              </Tooltip>
            </Polyline>
          ))}

        {/* Active Route Segments colored by Risk */}
        {activeRoute?.colored_segments?.map((seg, idx) => (
          <Polyline
            key={`active_seg_${idx}`}
            positions={seg.coordinates}
            pathOptions={{
              color: seg.color || '#10b981',
              weight: 6,
              opacity: 0.95,
              lineCap: 'round',
              lineJoin: 'round'
            }}
          />
        ))}

        {/* Active Route Glowing Underlay */}
        {activeRoute?.full_path && (
          <Polyline
            positions={activeRoute.full_path}
            pathOptions={{
              color: activeRoute.is_recommended ? '#38bdf8' : '#818cf8',
              weight: 12,
              opacity: 0.18,
            }}
          />
        )}

        {/* Checkpoint Markers on the Active Route */}
        {checkpoints.map((cp, idx) => {
          const riskColor = cp.risk?.color || '#10b981';
          const isCritical = cp.risk?.overall_risk === 'Severe' || cp.risk?.overall_risk === 'No Travel';
          const isActiveStop = idx === activeStopIndex;

          return (
            <CircleMarker
              key={`cp_${cp.index ?? idx}`}
              center={cp.coordinate}
              radius={isActiveStop ? 9 : (isCritical ? 7 : 5)}
              pathOptions={{
                fillColor: riskColor,
                fillOpacity: isActiveStop ? 1 : 0.95,
                color: isActiveStop ? '#ffffff' : (isCritical ? '#ffffff' : '#1e293b'),
                weight: isActiveStop ? 3 : (isCritical ? 2.5 : 1.5),
              }}
              eventHandlers={{
                click: () => onSelectStop && onSelectStop(idx)
              }}
            >
              <Popup>
                <div style={{ padding: '0.85rem', minWidth: '240px', maxWidth: '300px' }}>
                  {/* Header */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
                    paddingBottom: '0.4rem',
                    marginBottom: '0.6rem'
                  }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#38bdf8' }}>
                      MILE {cp.distance_from_start_miles}
                    </span>
                    <span className={`badge-risk badge-risk-${cp.risk?.overall_risk?.toLowerCase().replace(' ', '-')}`}>
                      {cp.risk?.overall_risk}
                    </span>
                  </div>

                  {/* Arrival Time ETA */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', color: '#f1f5f9', marginBottom: '0.5rem' }}>
                    <Clock size={14} color="#94a3b8" />
                    <span>ETA: <strong>{cp.eta_formatted}</strong></span>
                    <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>({cp.elapsed_hours}h in)</span>
                  </div>

                  {/* Weather Metrics Grid */}
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: '0.5rem',
                    background: 'rgba(30, 41, 59, 0.7)',
                    padding: '0.5rem',
                    borderRadius: '8px',
                    fontSize: '0.75rem',
                    marginBottom: '0.5rem'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                      <Wind size={13} color="#38bdf8" />
                      <div>
                        <div style={{ color: '#94a3b8', fontSize: '0.65rem' }}>Wind Speed</div>
                        <strong style={{ color: cp.risk?.wind_risk === 'No Travel' ? '#ef4444' : '#f8fafc' }}>
                          {cp.weather?.wind_speed_mph} mph
                        </strong>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                      <CloudRain size={13} color="#60a5fa" />
                      <div>
                        <div style={{ color: '#94a3b8', fontSize: '0.65rem' }}>Precipitation</div>
                        <strong>{cp.weather?.precipitation_in_per_hr} in/hr</strong>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                      <Snowflake size={13} color="#a5f3fc" />
                      <div>
                        <div style={{ color: '#94a3b8', fontSize: '0.65rem' }}>Snowfall</div>
                        <strong>{cp.weather?.snowfall_in_per_hr} in/hr</strong>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                      <Thermometer size={13} color="#fbbf24" />
                      <div>
                        <div style={{ color: '#94a3b8', fontSize: '0.65rem' }}>Temp / Sky</div>
                        <strong>{cp.weather?.temperature_f}°F</strong>
                      </div>
                    </div>
                  </div>

                  {/* Cargo Load Escalation Warning Notes */}
                  {cp.risk?.load_impact_notes && cp.risk.load_impact_notes.length > 0 && (
                    <div style={{
                      background: 'rgba(239, 68, 68, 0.15)',
                      border: '1px solid rgba(239, 68, 68, 0.4)',
                      borderRadius: '6px',
                      padding: '0.35rem 0.5rem',
                      fontSize: '0.675rem',
                      color: '#fca5a5',
                      lineHeight: 1.3
                    }}>
                      <div style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <AlertTriangle size={12} color="#f87171" />
                        LOAD WEIGHT ESCALATION:
                      </div>
                      {cp.risk.load_impact_notes.map((note, nIdx) => (
                        <div key={nIdx}>{note}</div>
                      ))}
                    </div>
                  )}
                </div>
              </Popup>
            </CircleMarker>
          );
        })}

        {/* Animated Moving Truck on Charted Route */}
        {currentStop?.coordinate && (
          <Marker
            position={currentStop.coordinate}
            icon={createTruckIcon(currentStop.risk?.color)}
            zIndexOffset={1000}
          >
            <Tooltip permanent direction="top" offset={[0, -20]} className="custom-truck-tooltip">
              <div style={{
                background: '#000000',
                color: '#ffffff',
                border: '1px solid #404040',
                borderRadius: '6px',
                padding: '3px 8px',
                fontSize: '11px',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                whiteSpace: 'nowrap',
                boxShadow: '0 4px 14px rgba(0,0,0,0.85)'
              }}>
                <span>🚚 Stop {activeStopIndex + 1}/{checkpoints.length}</span>
                <span style={{ color: currentStop.risk?.color || '#10b981' }}>
                  ({currentStop.weather?.wind_speed_mph || 0} mph)
                </span>
              </div>
            </Tooltip>
          </Marker>
        )}

        {/* Start Pin */}
        {startPt && (
          <Marker position={[startPt[0], startPt[1]]} icon={originIcon}>
            <Popup>
              <div style={{ padding: '0.5rem', fontSize: '0.8rem' }}>
                <strong style={{ color: '#10b981' }}>ORIGIN</strong>
                <div>{tripParams?.origin?.name || 'Start Location'}</div>
              </div>
            </Popup>
          </Marker>
        )}

        {/* Destination Pin */}
        {endPt && (
          <Marker position={[endPt[0], endPt[1]]} icon={destIcon}>
            <Popup>
              <div style={{ padding: '0.5rem', fontSize: '0.8rem' }}>
                <strong style={{ color: '#f43f5e' }}>DESTINATION</strong>
                <div>{tripParams?.destination?.name || 'End Location'}</div>
              </div>
            </Popup>
          </Marker>
        )}
      </MapContainer>

      {/* Floating Map Controls & Overlays */}
      <div style={{
        position: 'absolute',
        top: '16px',
        right: '16px',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        zIndex: 400
      }}>
        {/* Heatmap Visibility & Metric Toggle */}
        <div className="glass-panel" style={{ padding: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <button
            onClick={onToggleHeatmap}
            className={`btn ${showHeatmap ? 'btn-primary' : 'btn-secondary'}`}
            style={{ padding: '0.35rem 0.65rem', fontSize: '0.75rem' }}
          >
            {showHeatmap ? <Eye size={14} /> : <EyeOff size={14} />}
            <span>Corridor Heatmap</span>
          </button>

          {showHeatmap && (
            <select
              value={heatmapMode}
              onChange={(e) => onChangeHeatmapMode(e.target.value)}
              className="input-box"
              style={{ padding: '0.3rem 0.5rem', fontSize: '0.75rem', width: 'auto' }}
            >
              <option value="risk">Hazard Level</option>
              <option value="wind">Wind Speed</option>
              <option value="precip">Precipitation</option>
            </select>
          )}

          <button
            onClick={() => setMapStyle(mapStyle === 'dark' ? 'streets' : 'dark')}
            className="btn btn-secondary"
            style={{ padding: '0.35rem 0.65rem', fontSize: '0.75rem' }}
            title="Toggle Map Style"
          >
            <Layers size={14} />
            <span>{mapStyle === 'dark' ? 'Streets' : 'Dark'}</span>
          </button>
        </div>
      </div>

      {/* Legend Badge Overlay */}
      <div style={{
        position: 'absolute',
        bottom: '24px',
        left: '24px',
        zIndex: 400
      }}>
        <div className="glass-panel" style={{ padding: '0.5rem 0.75rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <span style={{ fontSize: '0.7rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase' }}>
            Risk Key:
          </span>
          {[
            { label: 'Low', color: '#10b981' },
            { label: 'Mod', color: '#f59e0b' },
            { label: 'High', color: '#f97316' },
            { label: 'Severe', color: '#ef4444' },
            { label: 'No Travel', color: '#7f1d1d' },
          ].map((l, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.7rem' }}>
              <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: l.color }} />
              <span style={{ color: '#cbd5e1' }}>{l.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
