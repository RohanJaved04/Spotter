import React, { useState, useEffect } from 'react';
import { 
  MapPin, 
  Navigation, 
  Calendar, 
  Weight, 
  Sliders, 
  ArrowUpDown,
  Search,
  Loader2,
  AlertCircle
} from 'lucide-react';
import { geocodeQuery } from '../api';

export default function TripPlanner({
  onPlanTrip,
  isLoading,
  initialParams
}) {
  const [originInput, setOriginInput] = useState('');
  const [originCoords, setOriginCoords] = useState(null);
  const [originSuggestions, setOriginSuggestions] = useState([]);
  const [showOriginDropdown, setShowOriginDropdown] = useState(false);

  const [destInput, setDestInput] = useState('');
  const [destCoords, setDestCoords] = useState(null);
  const [destSuggestions, setDestSuggestions] = useState([]);
  const [showDestDropdown, setShowDestDropdown] = useState(false);

  // Default departure time formatted as YYYY-MM-DDTHH:MM for datetime-local input
  const getFormattedNow = (hoursAhead = 0) => {
    const d = new Date();
    d.setHours(d.getHours() + hoursAhead);
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().slice(0, 16);
  };

  const [departureTime, setDepartureTime] = useState(getFormattedNow());
  const [loadWeight, setLoadWeight] = useState(38000); // 38,000 lbs default
  const [samplingInterval, setSamplingInterval] = useState(25); // 10, 25, 50 miles

  // Sync with initialParams if provided (e.g. from history reload)
  useEffect(() => {
    if (initialParams) {
      if (initialParams.origin) {
        setOriginInput(initialParams.origin.name || 'Custom Origin');
        setOriginCoords(initialParams.origin);
      }
      if (initialParams.destination) {
        setDestInput(initialParams.destination.name || 'Custom Destination');
        setDestCoords(initialParams.destination);
      }
      if (initialParams.load_weight_lbs) {
        setLoadWeight(initialParams.load_weight_lbs);
      }
      if (initialParams.sampling_interval_miles) {
        setSamplingInterval(initialParams.sampling_interval_miles);
      }
    }
  }, [initialParams]);

  // Debounced geocoding search worldwide (snappy 150ms response)
  useEffect(() => {
    if (!originInput || originInput.trim().length < 2) {
      setOriginSuggestions([]);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const results = await geocodeQuery(originInput.trim());
        setOriginSuggestions(results);
      } catch (err) {
        console.error('Origin geocode error:', err);
      }
    }, 150);
    return () => clearTimeout(timer);
  }, [originInput]);

  useEffect(() => {
    if (!destInput || destInput.trim().length < 2) {
      setDestSuggestions([]);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const results = await geocodeQuery(destInput.trim());
        setDestSuggestions(results);
      } catch (err) {
        console.error('Dest geocode error:', err);
      }
    }, 150);
    return () => clearTimeout(timer);
  }, [destInput]);

  const handleSelectOrigin = (item) => {
    setOriginInput(item.name);
    setOriginCoords({ name: item.name, lat: item.lat, lon: item.lon });
    setShowOriginDropdown(false);
  };

  const handleSelectDest = (item) => {
    setDestInput(item.name);
    setDestCoords({ name: item.name, lat: item.lat, lon: item.lon });
    setShowDestDropdown(false);
  };

  const handleSwapLocations = () => {
    const tempInput = originInput;
    const tempCoords = originCoords;
    setOriginInput(destInput);
    setOriginCoords(destCoords);
    setDestInput(tempInput);
    setDestCoords(tempCoords);
  };

  const handleSubmit = async (e) => {
    e?.preventDefault();
    let orig = originCoords;
    let dst = destCoords;

    // If user typed without clicking a suggestion, resolve automatically
    if (!orig && originInput.trim()) {
      try {
        const res = await geocodeQuery(originInput.trim());
        if (res && res.length > 0) {
          orig = { name: res[0].name, lat: res[0].lat, lon: res[0].lon };
          setOriginCoords(orig);
        }
      } catch (err) {
        console.error('Origin auto-resolve error:', err);
      }
    }

    if (!dst && destInput.trim()) {
      try {
        const res = await geocodeQuery(destInput.trim());
        if (res && res.length > 0) {
          dst = { name: res[0].name, lat: res[0].lat, lon: res[0].lon };
          setDestCoords(dst);
        }
      } catch (err) {
        console.error('Destination auto-resolve error:', err);
      }
    }

    if (!orig || !dst) {
      alert('Please specify a valid Origin and Destination location.');
      return;
    }

    onPlanTrip({
      origin: orig,
      destination: dst,
      departure_time: new Date(departureTime).toISOString(),
      load_weight_lbs: Number(loadWeight),
      sampling_interval_miles: Number(samplingInterval),
    });
  };

  // Compute weight impact indicator based on strict PDF rules
  const getWeightImpactBadge = () => {
    if (loadWeight > 40000) {
      return {
        label: 'Heavy Cargo (>40,000 lb)',
        rule: 'Wind 35-44 mph will escalate to SEVERE risk. Wind 45+ mph triggers NO TRAVEL.',
        isAlert: true
      };
    } else if (loadWeight > 30000) {
      return {
        label: 'Medium Load (>30,000 lb)',
        rule: 'Wind 45-54 mph will escalate to NO TRAVEL.',
        isAlert: true
      };
    } else {
      return {
        label: 'Light Load (≤30,000 lb)',
        rule: 'Standard thresholds apply. No Travel triggered only at ≥55 mph.',
        isAlert: false
      };
    }
  };

  const weightInfo = getWeightImpactBadge();

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', width: '100%' }}>
      {/* Origin & Destination Section */}
      <div style={{
        background: '#121212',
        border: '1px solid var(--border-color)',
        borderRadius: '8px',
        padding: '1.25rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.85rem',
        position: 'relative'
      }}>
        {/* Origin */}
        <div style={{ position: 'relative' }}>
          <label className="form-label" style={{ marginBottom: '6px' }}>
            <span>Origin Point</span>
            <span style={{ fontSize: '0.675rem', color: '#737373' }}>START</span>
          </label>
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <span style={{ position: 'absolute', left: '12px', color: '#a3a3a3' }}>
              <MapPin size={16} />
            </span>
            <input
              type="text"
              className="input-box"
              style={{ paddingLeft: '38px' }}
              value={originInput}
              onChange={(e) => {
                setOriginInput(e.target.value);
                setShowOriginDropdown(true);
              }}
              onFocus={() => setShowOriginDropdown(true)}
              placeholder="Search origin city, port, or address..."
              required
            />
          </div>

          {showOriginDropdown && originSuggestions.length > 0 && (
            <div style={{
              position: 'absolute',
              top: '100%',
              left: 0,
              right: 0,
              marginTop: '4px',
              background: '#141414',
              border: '1px solid #333333',
              borderRadius: '6px',
              zIndex: 50,
              maxHeight: '200px',
              overflowY: 'auto',
              boxShadow: '0 10px 25px rgba(0,0,0,0.8)'
            }}>
              {originSuggestions.map((item, i) => (
                <div
                  key={i}
                  onClick={() => handleSelectOrigin(item)}
                  style={{
                    padding: '0.6rem 0.85rem',
                    fontSize: '0.8rem',
                    cursor: 'pointer',
                    borderBottom: '1px solid #222222',
                    display: 'flex',
                    flexDirection: 'column'
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = '#222222')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                >
                  <span style={{ fontWeight: 600, color: '#ffffff' }}>{item.name}</span>
                  <span style={{ fontSize: '0.7rem', color: '#737373' }}>
                    {item.hub_type || 'Location'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Swap Button */}
        <div style={{ display: 'flex', justifyContent: 'center', margin: '-4px 0' }}>
          <button
            type="button"
            onClick={handleSwapLocations}
            className="btn btn-secondary"
            style={{
              padding: '4px 10px',
              fontSize: '0.7rem',
              borderRadius: '999px',
              gap: '4px'
            }}
            title="Swap Origin and Destination"
          >
            <ArrowUpDown size={12} />
            <span>Swap</span>
          </button>
        </div>

        {/* Destination */}
        <div style={{ position: 'relative' }}>
          <label className="form-label" style={{ marginBottom: '6px' }}>
            <span>Destination Point</span>
            <span style={{ fontSize: '0.675rem', color: '#737373' }}>END</span>
          </label>
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <span style={{ position: 'absolute', left: '12px', color: '#a3a3a3' }}>
              <Navigation size={16} />
            </span>
            <input
              type="text"
              className="input-box"
              style={{ paddingLeft: '38px' }}
              value={destInput}
              onChange={(e) => {
                setDestInput(e.target.value);
                setShowDestDropdown(true);
              }}
              onFocus={() => setShowDestDropdown(true)}
              placeholder="Search destination city, hub, or address..."
              required
            />
          </div>

          {showDestDropdown && destSuggestions.length > 0 && (
            <div style={{
              position: 'absolute',
              top: '100%',
              left: 0,
              right: 0,
              marginTop: '4px',
              background: '#141414',
              border: '1px solid #333333',
              borderRadius: '6px',
              zIndex: 50,
              maxHeight: '200px',
              overflowY: 'auto',
              boxShadow: '0 10px 25px rgba(0,0,0,0.8)'
            }}>
              {destSuggestions.map((item, i) => (
                <div
                  key={i}
                  onClick={() => handleSelectDest(item)}
                  style={{
                    padding: '0.6rem 0.85rem',
                    fontSize: '0.8rem',
                    cursor: 'pointer',
                    borderBottom: '1px solid #222222',
                    display: 'flex',
                    flexDirection: 'column'
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = '#222222')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                >
                  <span style={{ fontWeight: 600, color: '#ffffff' }}>{item.name}</span>
                  <span style={{ fontSize: '0.7rem', color: '#737373' }}>
                    {item.hub_type || 'Location'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Departure Time & Cargo Weight Section */}
      <div style={{
        background: '#121212',
        border: '1px solid var(--border-color)',
        borderRadius: '8px',
        padding: '1.25rem',
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
        gap: '1.25rem'
      }}>
        {/* Departure Time */}
        <div className="form-group">
          <label className="form-label">
            <span>Departure Date & Time</span>
          </label>
          <input
            type="datetime-local"
            className="input-box"
            value={departureTime}
            onChange={(e) => setDepartureTime(e.target.value)}
            required
            style={{ colorScheme: 'dark' }}
          />
          <span style={{ fontSize: '0.675rem', color: '#737373' }}>
            Weather sampled along arrival ETA at each milestone
          </span>
        </div>

        {/* Cargo Load Weight */}
        <div className="form-group">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <label className="form-label" style={{ margin: 0 }}>Truck Cargo Weight</label>
            <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#ffffff' }}>
              {Number(loadWeight).toLocaleString()} lbs
            </span>
          </div>

          <input
            type="range"
            min="5000"
            max="80000"
            step="1000"
            value={loadWeight}
            onChange={(e) => setLoadWeight(Number(e.target.value))}
            className="custom-slider"
            style={{ margin: '8px 0' }}
          />

          {/* Quick Weight Presets */}
          <div style={{ display: 'flex', gap: '6px' }}>
            {[15000, 30000, 45000, 65000].map((wt) => (
              <button
                key={wt}
                type="button"
                onClick={() => setLoadWeight(wt)}
                style={{
                  flex: 1,
                  background: loadWeight === wt ? '#ffffff' : '#1c1c1c',
                  color: loadWeight === wt ? '#000000' : '#a3a3a3',
                  border: '1px solid #2e2e2e',
                  borderRadius: '4px',
                  padding: '3px 0',
                  fontSize: '0.675rem',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                {wt / 1000}k lb
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Active Load Rule Reminder */}
      <div style={{
        background: '#0d0d0d',
        border: '1px solid #262626',
        borderRadius: '6px',
        padding: '0.6rem 0.85rem',
        fontSize: '0.725rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        color: '#a3a3a3'
      }}>
        <span><strong>{weightInfo.label}:</strong> {weightInfo.rule}</span>
      </div>

      {/* Weather Sampling Interval */}
      <div style={{
        background: '#121212',
        border: '1px solid var(--border-color)',
        borderRadius: '8px',
        padding: '0.85rem 1.25rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '0.75rem'
      }}>
        <div>
          <div style={{ fontSize: '0.775rem', fontWeight: 700, color: '#ffffff' }}>Sampling Interval</div>
          <div style={{ fontSize: '0.675rem', color: '#737373' }}>Frequency of weather checkpoints along corridor</div>
        </div>

        <div style={{ display: 'flex', gap: '6px' }}>
          {[10, 25, 50].map((interval) => (
            <button
              key={interval}
              type="button"
              onClick={() => setSamplingInterval(interval)}
              style={{
                padding: '5px 12px',
                borderRadius: '6px',
                fontSize: '0.75rem',
                fontWeight: 700,
                cursor: 'pointer',
                background: samplingInterval === interval ? '#ffffff' : '#1c1c1c',
                color: samplingInterval === interval ? '#000000' : '#a3a3a3',
                border: samplingInterval === interval ? '1px solid #ffffff' : '1px solid #2e2e2e',
                transition: 'all 0.15s ease'
              }}
            >
              Every {interval} mi
            </button>
          ))}
        </div>
      </div>

      {/* Action Submit Button */}
      <button
        type="submit"
        disabled={isLoading}
        className="btn btn-primary"
        style={{
          width: '100%',
          padding: '0.85rem',
          fontSize: '0.925rem',
          fontWeight: 800,
          letterSpacing: '0.02em',
          borderRadius: '8px'
        }}
      >
        {isLoading ? (
          <>
            <Loader2 size={16} className="animate-spin" />
            <span>Evaluating 3 Route Alternatives & Live Weather...</span>
          </>
        ) : (
          <span>Calculate Weather-Aware Routes →</span>
        )}
      </button>
    </form>
  );
}
