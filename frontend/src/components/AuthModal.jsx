import React, { useState } from 'react';
import { X, Lock, User, Mail } from 'lucide-react';
import { loginUser, registerUser, demoLogin } from '../api';

export default function AuthModal({ isOpen, onClose, onAuthSuccess }) {
  const [tab, setTab] = useState('login'); // 'login' or 'register'
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen) return null;

  const handleDemoClick = async () => {
    setIsLoading(true);
    setErrorMsg('');
    try {
      const data = await demoLogin();
      if (data.tokens) {
        localStorage.setItem('spotter_access_token', data.tokens.access);
        localStorage.setItem('spotter_refresh_token', data.tokens.refresh);
        localStorage.setItem('spotter_user', JSON.stringify(data.user));
        onAuthSuccess(data.user);
        onClose();
      }
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Demo account login failed.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg('');

    try {
      if (tab === 'login') {
        const data = await loginUser(username, password);
        if (data.tokens) {
          localStorage.setItem('spotter_access_token', data.tokens.access);
          localStorage.setItem('spotter_refresh_token', data.tokens.refresh);
          localStorage.setItem('spotter_user', JSON.stringify(data.user));
          onAuthSuccess(data.user);
          onClose();
        }
      } else {
        if (password !== confirmPassword) {
          setErrorMsg('Passwords do not match.');
          setIsLoading(false);
          return;
        }
        const data = await registerUser({
          username,
          password,
          confirm_password: confirmPassword,
          email,
          full_name: fullName
        });
        if (data.tokens) {
          localStorage.setItem('spotter_access_token', data.tokens.access);
          localStorage.setItem('spotter_refresh_token', data.tokens.refresh);
          localStorage.setItem('spotter_user', JSON.stringify(data.user));
          onAuthSuccess(data.user);
          onClose();
        }
      }
    } catch (err) {
      const errs = err.response?.data?.errors;
      if (errs) {
        const firstKey = Object.keys(errs)[0];
        setErrorMsg(`${firstKey}: ${Array.isArray(errs[firstKey]) ? errs[firstKey][0] : errs[firstKey]}`);
      } else {
        setErrorMsg(err.response?.data?.message || 'Authentication error.');
      }
    } finally {
      setIsLoading(false);
    }
  };

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
          maxWidth: '380px',
          padding: '1.75rem',
          position: 'relative',
          background: '#0d0d0d',
          border: '1px solid #262626',
          borderRadius: '8px',
          boxShadow: '0 20px 40px rgba(0, 0, 0, 0.9)'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button 
          onClick={onClose} 
          className="btn btn-ghost" 
          style={{ position: 'absolute', top: '14px', right: '14px', padding: '4px' }}
        >
          <X size={18} />
        </button>

        {/* Modal Header */}
        <div style={{ textAlign: 'center', marginBottom: '1.25rem' }}>
          <div style={{
            width: '36px',
            height: '36px',
            borderRadius: '6px',
            background: '#ffffff',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '0.5rem',
            color: '#000000'
          }}>
            <Lock size={18} color="#000000" />
          </div>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#ffffff', margin: 0 }}>
            {tab === 'login' ? 'Sign In' : 'Create Account'}
          </h2>
          <p style={{ fontSize: '0.75rem', color: '#737373', margin: '4px 0 0 0' }}>
            Access saved corridors & route search history
          </p>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', background: '#171717', borderRadius: '6px', padding: '3px', marginBottom: '1rem' }}>
          <button
            type="button"
            onClick={() => { setTab('login'); setErrorMsg(''); }}
            style={{
              flex: 1,
              padding: '0.4rem',
              fontSize: '0.75rem',
              fontWeight: 700,
              borderRadius: '4px',
              border: 'none',
              cursor: 'pointer',
              background: tab === 'login' ? '#ffffff' : 'transparent',
              color: tab === 'login' ? '#000000' : '#737373',
              transition: 'all 0.15s ease'
            }}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => { setTab('register'); setErrorMsg(''); }}
            style={{
              flex: 1,
              padding: '0.4rem',
              fontSize: '0.75rem',
              fontWeight: 700,
              borderRadius: '4px',
              border: 'none',
              cursor: 'pointer',
              background: tab === 'register' ? '#ffffff' : 'transparent',
              color: tab === 'register' ? '#000000' : '#737373',
              transition: 'all 0.15s ease'
            }}
          >
            Register
          </button>
        </div>

        {/* Quick Demo Login Option */}
        <button
          type="button"
          onClick={handleDemoClick}
          disabled={isLoading}
          className="btn btn-secondary"
          style={{ width: '100%', marginBottom: '1rem', fontSize: '0.775rem' }}
        >
          ⚡ Instant Demo Sign In (1-Click)
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '1rem' }}>
          <div style={{ flex: 1, height: '1px', background: '#222222' }} />
          <span style={{ fontSize: '0.675rem', color: '#666666' }}>OR</span>
          <div style={{ flex: 1, height: '1px', background: '#222222' }} />
        </div>

        {errorMsg && (
          <div style={{
            background: 'rgba(239, 68, 68, 0.15)',
            border: '1px solid rgba(239, 68, 68, 0.4)',
            color: '#fca5a5',
            padding: '0.5rem',
            borderRadius: '4px',
            fontSize: '0.75rem',
            marginBottom: '1rem'
          }}>
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
          {tab === 'register' && (
            <>
              <div className="form-group">
                <label className="form-label">Full Name</label>
                <input
                  type="text"
                  className="input-box"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="John Doe"
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Email</label>
                <input
                  type="email"
                  className="input-box"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="driver@logistics.com"
                  required
                />
              </div>
            </>
          )}

          <div className="form-group">
            <label className="form-label">Username</label>
            <input
              type="text"
              className="input-box"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Username"
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Password</label>
            <input
              type="password"
              className="input-box"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
          </div>

          {tab === 'register' && (
            <div className="form-group">
              <label className="form-label">Confirm Password</label>
              <input
                type="password"
                className="input-box"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                required
              />
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="btn btn-primary"
            style={{ width: '100%', marginTop: '0.5rem', padding: '0.65rem' }}
          >
            {isLoading ? 'Processing...' : (tab === 'login' ? 'Sign In' : 'Create Account')}
          </button>
        </form>
      </div>
    </div>
  );
}
