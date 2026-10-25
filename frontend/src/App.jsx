import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import TripPlanner from './components/TripPlanner';
import MapView from './components/MapView';
import ForecastSlider from './components/ForecastSlider';
import RouteCardDeck from './components/RouteCardDeck';
import RiskRulesModal from './components/RiskRulesModal';
import AuthModal from './components/AuthModal';
import HistoryDrawer from './components/HistoryDrawer';
import { planRoutes, saveRouteBookmark, demoLogin } from './api';
import { AlertTriangle, ArrowRight, Compass } from 'lucide-react';

export default function App() {
  const [user, setUser] = useState(null);
  const [viewMode, setViewMode] = useState('planner'); // 'planner' (full-screen inputs) or 'results'
  const [routes, setRoutes] = useState([]);
  const [activeRouteId, setActiveRouteId] = useState(null);
  const [heatmapData, setHeatmapData] = useState(null);
  const [currentHourOffset, setCurrentHourOffset] = useState(0);
  const [showHeatmap, setShowHeatmap] = useState(true);
  const [heatmapMode, setHeatmapMode] = useState('risk');
  const [isCalculating, setIsCalculating] = useState(false);
  const [errorAlert, setErrorAlert] = useState(null);
  const [tripParams, setTripParams] = useState(null);
  const [activeStopIndex, setActiveStopIndex] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);

  // Modals
  const [showRulesModal, setShowRulesModal] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showHistoryDrawer, setShowHistoryDrawer] = useState(false);
  const [historyTab, setHistoryTab] = useState('history');

  // Animation loop driving vehicle and stop progression along charted route
  useEffect(() => {
    if (!isAnimating || !routes || routes.length === 0) return;
    const activeRoute = routes.find(r => r.route_id === activeRouteId) || routes[0];
    const totalStops = activeRoute?.checkpoints?.length || 0;
    if (totalStops <= 1) {
      setIsAnimating(false);
      return;
    }

    const timer = setInterval(() => {
      setActiveStopIndex((prev) => {
        const next = (prev + 1) % totalStops;
        const nextStop = activeRoute.checkpoints?.[next];
        if (nextStop && typeof nextStop.elapsed_hours === 'number') {
          setCurrentHourOffset(Math.min(48, Math.round(nextStop.elapsed_hours)));
        }
        return next;
      });
    }, 1200);

    return () => clearInterval(timer);
  }, [isAnimating, routes, activeRouteId]);

  // Load user from localStorage on start
  useEffect(() => {
    const savedUser = localStorage.getItem('spotter_user');
    if (savedUser) {
      try {
        setUser(JSON.parse(savedUser));
      } catch {
        localStorage.removeItem('spotter_user');
      }
    }
  }, []);

  const handlePlanTrip = async (params) => {
    setIsCalculating(true);
    setErrorAlert(null);
    setTripParams(params);
    setActiveStopIndex(0);
    setIsAnimating(false);

    try {
      const data = await planRoutes(params);
      if (data.success && data.routes && data.routes.length > 0) {
        setRoutes(data.routes);
        setActiveRouteId(data.recommended_route_id || data.routes[0].route_id);
        setHeatmapData(data.heatmap);
        setCurrentHourOffset(0);
        setActiveStopIndex(0);
        setIsAnimating(false);
        // Switch to results view automatically
        setViewMode('results');
      } else {
        setErrorAlert(data.message || 'No viable routes found for this corridor.');
      }
    } catch (err) {
      console.error('Route calculation error:', err);
      const msg = err.response?.data?.message || err.response?.data?.detail || err.message || 'Route planning service error.';
      setErrorAlert(msg);
    } finally {
      setIsCalculating(false);
    }
  };

  const handleSaveRoute = async (route) => {
    if (!user) {
      setShowAuthModal(true);
      return;
    }
    try {
      await saveRouteBookmark({
        title: `${route.route_name} (${route.distance_miles} mi)`,
        origin_name: tripParams?.origin?.name || 'Origin',
        dest_name: tripParams?.destination?.name || 'Destination',
        load_weight_lbs: tripParams?.load_weight_lbs || 40000,
        sampling_interval_miles: tripParams?.sampling_interval_miles || 25,
        route_details: route,
        notes: `Recommended: ${route.is_recommended ? 'Yes' : 'No'} | Duration: ${route.formatted_duration}`
      });
      alert(`Route "${route.route_name}" successfully saved to your bookmarks!`);
    } catch (err) {
      console.error('Failed to bookmark route:', err);
      alert('Could not save route. Please try again.');
    }
  };

  const handleDemoLogin = async () => {
    try {
      const data = await demoLogin();
      if (data.tokens) {
        localStorage.setItem('spotter_access_token', data.tokens.access);
        localStorage.setItem('spotter_refresh_token', data.tokens.refresh);
        localStorage.setItem('spotter_user', JSON.stringify(data.user));
        setUser(data.user);
      }
    } catch (err) {
      console.error('Demo login error:', err);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('spotter_access_token');
    localStorage.removeItem('spotter_refresh_token');
    localStorage.removeItem('spotter_user');
    setUser(null);
  };

  return (
    <div className="app-container">
      {/* Minimal Monochrome Navbar */}
      <Navbar
        user={user}
        viewMode={viewMode}
        onBackToPlanner={() => setViewMode('planner')}
        tripParams={tripParams}
        onOpenAuth={() => setShowAuthModal(true)}
        onOpenRules={() => setShowRulesModal(true)}
        onOpenHistory={() => {
          setHistoryTab('history');
          setShowHistoryDrawer(true);
        }}
        onOpenSaved={() => {
          setHistoryTab('saved');
          setShowHistoryDrawer(true);
        }}
        onLogout={handleLogout}
        onDemoLogin={handleDemoLogin}
        isCalculating={isCalculating}
      />

      {/* Global Error Banner */}
      {errorAlert && (
        <div style={{
          position: 'absolute',
          top: '64px',
          left: '50%',
          transform: 'translateX(-50%)',
          background: '#ef4444',
          color: '#ffffff',
          padding: '0.65rem 1.25rem',
          borderRadius: '6px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          zIndex: 900,
          boxShadow: '0 8px 20px rgba(0, 0, 0, 0.6)',
          maxWidth: '90%',
          fontSize: '0.8rem',
          fontWeight: 600
        }}>
          <AlertTriangle size={16} />
          <span>{errorAlert}</span>
          <button
            onClick={() => setErrorAlert(null)}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#ffffff',
              cursor: 'pointer',
              marginLeft: '0.5rem',
              fontWeight: 800
            }}
          >
            ✕
          </button>
        </div>
      )}

      {/* STAGE 1: FULL SCREEN FOR INPUTS (Simpler, uncluttered, focused) */}
      {viewMode === 'planner' ? (
        <div className="full-screen-input-view">
          <div className="input-hero-card">
            {/* Minimal Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #1f1f1f', paddingBottom: '1rem' }}>
              <div>
                <h1 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#ffffff', margin: 0, letterSpacing: '-0.02em' }}>
                  Trip Dispatch & Weather Planning
                </h1>
                <p style={{ fontSize: '0.775rem', color: '#737373', margin: '3px 0 0 0' }}>
                  Evaluate 3 route corridors against live weather risks and truck weight limits
                </p>
              </div>

              {routes.length > 0 && (
                <button
                  type="button"
                  onClick={() => setViewMode('results')}
                  className="btn btn-secondary"
                  style={{ fontSize: '0.75rem', padding: '0.4rem 0.75rem', gap: '4px' }}
                >
                  <span>View Routes ({routes.length})</span>
                  <ArrowRight size={13} />
                </button>
              )}
            </div>

            {/* Input Form */}
            <TripPlanner
              onPlanTrip={handlePlanTrip}
              isLoading={isCalculating}
              initialParams={tripParams}
            />
          </div>
        </div>
      ) : (
        /* STAGE 2: RESULTS VIEW (Evaluated Routes + Interactive Map + Timeline) */
        <div className="results-main-content">
          {/* Left: 3 Evaluated Route Cards */}
          <aside className="results-sidebar">
            <div style={{
              padding: '0.75rem 1rem',
              borderBottom: '1px solid #222222',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: '#0d0d0d'
            }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#ffffff', letterSpacing: '0.04em' }}>
                3 EVALUATED ROUTES
              </span>
              <button
                type="button"
                onClick={() => setViewMode('planner')}
                className="btn btn-ghost"
                style={{ fontSize: '0.7rem', padding: '2px 8px' }}
              >
                Edit Inputs
              </button>
            </div>

            <div className="results-sidebar-scroll">
              <RouteCardDeck
                routes={routes}
                activeRouteId={activeRouteId}
                onSelectRoute={(id) => {
                  setActiveRouteId(id);
                  setActiveStopIndex(0);
                  setIsAnimating(false);
                }}
                onSaveRoute={handleSaveRoute}
                onEditParams={() => setViewMode('planner')}
                tripParams={tripParams}
                isLoggedIn={!!user}
              />
            </div>
          </aside>

          {/* Right: Map Viewport */}
          <div className="map-viewport">
            <MapView
              routes={routes}
              activeRouteId={activeRouteId}
              onSelectRoute={(id) => {
                setActiveRouteId(id);
                setActiveStopIndex(0);
                setIsAnimating(false);
              }}
              heatmapData={heatmapData}
              currentHourOffset={currentHourOffset}
              showHeatmap={showHeatmap}
              onToggleHeatmap={() => setShowHeatmap(!showHeatmap)}
              heatmapMode={heatmapMode}
              onChangeHeatmapMode={(mode) => setHeatmapMode(mode)}
              tripParams={tripParams}
              activeStopIndex={activeStopIndex}
              onSelectStop={(idx) => {
                setActiveStopIndex(idx);
                const activeRoute = routes.find(r => r.route_id === activeRouteId) || routes[0];
                const stop = activeRoute?.checkpoints?.[idx];
                if (stop && typeof stop.elapsed_hours === 'number') {
                  setCurrentHourOffset(Math.min(48, Math.round(stop.elapsed_hours)));
                }
              }}
              isAnimating={isAnimating}
            />

            {/* Route Stops Animation Controller */}
            {routes.length > 0 && (
              <ForecastSlider
                activeRoute={routes.find(r => r.route_id === activeRouteId) || routes[0]}
                activeStopIndex={activeStopIndex}
                onChangeStopIndex={(idx) => {
                  setActiveStopIndex(idx);
                  const activeRoute = routes.find(r => r.route_id === activeRouteId) || routes[0];
                  const stop = activeRoute?.checkpoints?.[idx];
                  if (stop && typeof stop.elapsed_hours === 'number') {
                    setCurrentHourOffset(Math.min(48, Math.round(stop.elapsed_hours)));
                  }
                }}
                isAnimating={isAnimating}
                onToggleAnimate={() => setIsAnimating(prev => !prev)}
              />
            )}
          </div>
        </div>
      )}

      {/* Modals */}
      <RiskRulesModal
        isOpen={showRulesModal}
        onClose={() => setShowRulesModal(false)}
      />

      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        onAuthSuccess={(userData) => setUser(userData)}
      />

      <HistoryDrawer
        isOpen={showHistoryDrawer}
        onClose={() => setShowHistoryDrawer(false)}
        activeTab={historyTab}
        onChangeTab={(tab) => setHistoryTab(tab)}
        onSelectHistoryItem={(item) => {
          setViewMode('planner');
          setShowHistoryDrawer(false);
          handlePlanTrip({
            origin: { name: item.origin_name, lat: item.origin_lat, lon: item.origin_lon },
            destination: { name: item.dest_name, lat: item.dest_lat, lon: item.dest_lon },
            departure_time: item.departure_time,
            load_weight_lbs: item.load_weight_lbs,
            sampling_interval_miles: item.sampling_interval_miles
          });
        }}
      />
    </div>
  );
}
