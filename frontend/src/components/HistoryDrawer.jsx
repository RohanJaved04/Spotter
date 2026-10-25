import React, { useState, useEffect } from 'react';
import { X, History, Bookmark, Trash2, ArrowRight } from 'lucide-react';
import { getSearchHistory, getSavedRoutes, deleteSavedRoute } from '../api';

export default function HistoryDrawer({
  isOpen,
  onClose,
  onReloadTrip,
  activeTab = 'history',
  isLoggedIn,
  onOpenAuth
}) {
  const [tab, setTab] = useState(activeTab);
  const [historyItems, setHistoryItems] = useState([]);
  const [savedItems, setSavedItems] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    setTab(activeTab);
  }, [activeTab]);

  useEffect(() => {
    if (isOpen && isLoggedIn) {
      loadData();
    }
  }, [isOpen, isLoggedIn, tab]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      if (tab === 'history') {
        const hist = await getSearchHistory();
        setHistoryItems(hist);
      } else {
        const saved = await getSavedRoutes();
        setSavedItems(saved);
      }
    } catch (err) {
      console.error('Failed to load history or saved:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteSaved = async (id, e) => {
    e.stopPropagation();
    try {
      await deleteSavedRoute(id);
      setSavedItems(prev => prev.filter(item => item.id !== id));
    } catch (err) {
      console.error('Failed to delete saved route:', err);
    }
  };

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(0, 0, 0, 0.85)',
      display: 'flex',
      justifyContent: 'flex-end',
      zIndex: 1000
    }} onClick={onClose}>
      <div 
        style={{
          width: '100%',
          maxWidth: '420px',
          height: '100%',
          background: '#0d0d0d',
          borderLeft: '1px solid #262626',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '-10px 0 30px rgba(0, 0, 0, 0.9)'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drawer Header */}
        <div style={{
          padding: '1.25rem',
          borderBottom: '1px solid #222222',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {tab === 'history' ? <History size={17} /> : <Bookmark size={17} />}
            <h2 style={{ fontSize: '1rem', fontWeight: 800, color: '#ffffff', margin: 0 }}>
              {tab === 'history' ? 'Search History' : 'Saved Corridors'}
            </h2>
          </div>
          <button onClick={onClose} className="btn btn-ghost" style={{ padding: '4px' }}>
            <X size={18} />
          </button>
        </div>

        {/* Tab Toggle */}
        <div style={{ padding: '0.75rem 1.25rem', borderBottom: '1px solid #222222' }}>
          <div style={{ display: 'flex', background: '#171717', borderRadius: '6px', padding: '3px' }}>
            <button
              onClick={() => setTab('history')}
              style={{
                flex: 1,
                padding: '0.4rem',
                borderRadius: '4px',
                border: 'none',
                background: tab === 'history' ? '#ffffff' : 'transparent',
                color: tab === 'history' ? '#000000' : '#a3a3a3',
                fontSize: '0.75rem',
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              Recent Searches
            </button>
            <button
              onClick={() => setTab('saved')}
              style={{
                flex: 1,
                padding: '0.4rem',
                borderRadius: '4px',
                border: 'none',
                background: tab === 'saved' ? '#ffffff' : 'transparent',
                color: tab === 'saved' ? '#000000' : '#a3a3a3',
                fontSize: '0.75rem',
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              Saved Trips
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
          {!isLoggedIn ? (
            <div style={{ textAlign: 'center', padding: '2rem 1rem', color: '#737373' }}>
              <p style={{ fontSize: '0.8rem', marginBottom: '1rem' }}>
                Sign in with a demo account to track search history and save corridors.
              </p>
              <button onClick={onOpenAuth} className="btn btn-primary" style={{ width: '100%' }}>
                Sign In or Try Demo
              </button>
            </div>
          ) : isLoading ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: '#737373', fontSize: '0.8rem' }}>
              Loading trips...
            </div>
          ) : tab === 'history' ? (
            historyItems.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2rem', color: '#666666', fontSize: '0.8rem' }}>
                No recent searches logged yet. Plan a route to see it here!
              </div>
            ) : (
              historyItems.map((item) => (
                <div
                  key={item.id}
                  style={{
                    padding: '0.85rem',
                    borderRadius: '6px',
                    border: '1px solid #222222',
                    background: '#121212',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.4rem',
                    cursor: 'pointer'
                  }}
                  onClick={() => {
                    onReloadTrip({
                      origin: { name: item.origin_name, lat: item.origin_lat, lon: item.origin_lon },
                      destination: { name: item.dest_name, lat: item.dest_lat, lon: item.dest_lon },
                      load_weight_lbs: item.load_weight_lbs,
                      sampling_interval_miles: item.sampling_interval_miles
                    });
                    onClose();
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', fontWeight: 700, color: '#ffffff' }}>
                      <span>{item.origin_name?.split(',')[0]}</span>
                      <ArrowRight size={12} color="#a3a3a3" />
                      <span>{item.dest_name?.split(',')[0]}</span>
                    </div>
                    <span className="badge-risk badge-risk-low" style={{ fontSize: '0.625rem' }}>
                      {item.avg_risk_level || 'Low'}
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.7rem', color: '#737373' }}>
                    <span>{Number(item.total_distance_miles).toLocaleString()} mi</span>
                    <span>&bull;</span>
                    <span>{Number(item.load_weight_lbs).toLocaleString()} lbs</span>
                    <span>&bull;</span>
                    <span>{new Date(item.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
              ))
            )
          ) : (
            savedItems.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2rem', color: '#666666', fontSize: '0.8rem' }}>
                No saved routes yet. Click the bookmark icon on any route card to save it!
              </div>
            ) : (
              savedItems.map((item) => (
                <div
                  key={item.id}
                  style={{
                    padding: '0.85rem',
                    borderRadius: '6px',
                    border: '1px solid #222222',
                    background: '#121212',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.4rem',
                    cursor: 'pointer'
                  }}
                  onClick={() => {
                    onReloadTrip({
                      origin: { name: item.origin_name, lat: item.route_details?.full_path?.[0]?.[0] || 0, lon: item.route_details?.full_path?.[0]?.[1] || 0 },
                      destination: { name: item.dest_name, lat: item.route_details?.full_path?.slice(-1)?.[0]?.[0] || 0, lon: item.route_details?.full_path?.slice(-1)?.[0]?.[1] || 0 },
                      load_weight_lbs: item.load_weight_lbs,
                      sampling_interval_miles: item.sampling_interval_miles
                    });
                    onClose();
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ fontSize: '0.825rem', fontWeight: 700, color: '#ffffff' }}>
                      {item.title}
                    </div>
                    <button
                      onClick={(e) => handleDeleteSaved(item.id, e)}
                      className="btn btn-ghost"
                      style={{ padding: '2px 6px', color: '#ef4444' }}
                      title="Delete saved route"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.7rem', color: '#737373' }}>
                    <span>{Number(item.load_weight_lbs).toLocaleString()} lbs</span>
                    <span>&bull;</span>
                    <span>{item.notes || 'Saved route'}</span>
                  </div>
                </div>
              ))
            )
          )}
        </div>
      </div>
    </div>
  );
}
