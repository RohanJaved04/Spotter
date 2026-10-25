import React from 'react';
import { Truck, ShieldAlert, History, Bookmark, User, LogOut, ArrowLeft } from 'lucide-react';

export default function Navbar({
  user,
  viewMode,
  onBackToPlanner,
  tripParams,
  onOpenAuth,
  onOpenRules,
  onOpenHistory,
  onOpenSaved,
  onLogout,
  onDemoLogin,
  isCalculating
}) {
  return (
    <header style={{
      height: '56px',
      background: '#000000',
      borderBottom: '1px solid #262626',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 1.5rem',
      zIndex: 30,
      position: 'relative'
    }}>
      {/* Brand & Left Actions */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        {viewMode === 'results' ? (
          <button
            type="button"
            onClick={onBackToPlanner}
            className="btn btn-secondary"
            style={{ fontSize: '0.8rem', padding: '0.4rem 0.85rem' }}
          >
            <ArrowLeft size={15} />
            <span>Edit Trip</span>
          </button>
        ) : null}

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
          <div style={{
            width: '30px',
            height: '30px',
            borderRadius: '6px',
            background: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#000000'
          }}>
            <Truck size={17} color="#000000" />
          </div>
          <div>
            <span style={{
              fontSize: '1rem',
              fontWeight: 800,
              letterSpacing: '0.04em',
              color: '#ffffff'
            }}>
              SPOTTER
            </span>
          </div>
        </div>

        {viewMode === 'results' && tripParams && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '0.75rem',
            color: '#a3a3a3',
            background: '#121212',
            border: '1px solid #262626',
            padding: '3px 10px',
            borderRadius: '6px'
          }}>
            <strong style={{ color: '#ffffff' }}>{tripParams.origin?.name?.split(',')[0]}</strong>
            <span>➔</span>
            <strong style={{ color: '#ffffff' }}>{tripParams.destination?.name?.split(',')[0]}</strong>
            <span>&bull;</span>
            <span>{Number(tripParams.load_weight_lbs || 0).toLocaleString()} lbs</span>
          </div>
        )}
      </div>

      {/* Right Controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <button
          onClick={onOpenRules}
          className="btn btn-ghost"
          style={{ fontSize: '0.775rem', padding: '0.4rem 0.75rem' }}
          title="Weather Risk & Load Escalation Rules"
        >
          <ShieldAlert size={14} />
          <span>Rules</span>
        </button>

        <button
          onClick={onOpenHistory}
          className="btn btn-ghost"
          style={{ fontSize: '0.775rem', padding: '0.4rem 0.75rem' }}
          title="Search History"
        >
          <History size={14} />
          <span>History</span>
        </button>

        <button
          onClick={onOpenSaved}
          className="btn btn-ghost"
          style={{ fontSize: '0.775rem', padding: '0.4rem 0.75rem' }}
          title="Saved Routes"
        >
          <Bookmark size={14} />
          <span>Saved</span>
        </button>

        {user ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginLeft: '0.4rem' }}>
            <span style={{
              fontSize: '0.75rem',
              color: '#a3a3a3',
              background: '#141414',
              border: '1px solid #262626',
              padding: '0.3rem 0.6rem',
              borderRadius: '6px'
            }}>
              {user.username}
            </span>
            <button
              onClick={onLogout}
              className="btn btn-ghost"
              style={{ padding: '0.4rem', borderRadius: '6px' }}
              title="Sign Out"
            >
              <LogOut size={14} />
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginLeft: '0.4rem' }}>
            <button
              onClick={onDemoLogin}
              className="btn btn-secondary"
              style={{ fontSize: '0.75rem', padding: '0.4rem 0.75rem' }}
            >
              Demo User
            </button>
            <button
              onClick={onOpenAuth}
              className="btn btn-primary"
              style={{ fontSize: '0.75rem', padding: '0.4rem 0.75rem' }}
            >
              Sign In
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
