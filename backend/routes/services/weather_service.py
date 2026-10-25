"""
Weather Service integrating with Open-Meteo API.
Fetches hourly wind speed (mph), precipitation (in/hr), snowfall (in/hr),
and matches each checkpoint's estimated arrival time (ETA) to the exact forecast hour.
Includes caching and robust fallback generation.
"""

import requests
import logging
from datetime import datetime
from django.core.cache import cache

logger = logging.getLogger('routes.weather_service')

OPEN_METEO_URL = "https://api.open-meteo.com/v1/forecast"

def fetch_weather_for_coordinate(lat: float, lon: float) -> dict | None:
    """
    Fetches 72-hour hourly forecast for a single coordinate from Open-Meteo.
    Uses caching (15 min TTL) based on rounded coordinates.
    """
    cache_key = f"weather_{round(lat, 2)}_{round(lon, 2)}"
    cached = cache.get(cache_key)
    if cached:
        return cached

    params = {
        'latitude': lat,
        'longitude': lon,
        'hourly': 'wind_speed_10m,precipitation,snowfall,weather_code,temperature_2m',
        'wind_speed_unit': 'mph',
        'precipitation_unit': 'inch',
        'forecast_days': 3,
        'timezone': 'UTC'
    }

    try:
        response = requests.get(OPEN_METEO_URL, params=params, timeout=5)
        if response.status_code == 200:
            data = response.json()
            cache.set(cache_key, data, timeout=900)  # 15 minutes
            return data
        else:
            logger.warning(f"Open-Meteo error {response.status_code}: {response.text}")
    except Exception as e:
        logger.error(f"Failed to query Open-Meteo for ({lat}, {lon}): {e}")

    return None


def fetch_weather_batch(coords: list[tuple[float, float]]) -> dict:
    """
    Open-Meteo supports batch queries with comma-separated latitudes and longitudes.
    For large numbers of coordinates, batch them in chunks of up to 30.
    """
    results = {}
    missing_coords = []

    for lat, lon in coords:
        ckey = f"weather_{round(lat, 2)}_{round(lon, 2)}"
        val = cache.get(ckey)
        if val:
            results[(lat, lon)] = val
        else:
            missing_coords.append((lat, lon))

    if not missing_coords:
        return results

    # Chunk missing coordinates into batches of 20
    chunk_size = 20
    for i in range(0, len(missing_coords), chunk_size):
        chunk = missing_coords[i:i + chunk_size]
        lats = ",".join(str(round(c[0], 4)) for c in chunk)
        lons = ",".join(str(round(c[1], 4)) for c in chunk)

        params = {
            'latitude': lats,
            'longitude': lons,
            'hourly': 'wind_speed_10m,precipitation,snowfall,weather_code,temperature_2m',
            'wind_speed_unit': 'mph',
            'precipitation_unit': 'inch',
            'forecast_days': 3,
            'timezone': 'UTC'
        }

        try:
            resp = requests.get(OPEN_METEO_URL, params=params, timeout=7)
            if resp.status_code == 200:
                data = resp.json()
                if isinstance(data, list):
                    for idx, item in enumerate(data):
                        coord = chunk[idx]
                        ckey = f"weather_{round(coord[0], 2)}_{round(coord[1], 2)}"
                        cache.set(ckey, item, timeout=900)
                        results[coord] = item
                elif isinstance(data, dict):
                    # Single result returned
                    coord = chunk[0]
                    ckey = f"weather_{round(coord[0], 2)}_{round(coord[1], 2)}"
                    cache.set(ckey, data, timeout=900)
                    results[coord] = data
            else:
                logger.warning(f"Batch Open-Meteo returned status {resp.status_code}")
        except Exception as e:
            logger.error(f"Batch Open-Meteo exception: {e}")

    return results


def extract_weather_at_eta(weather_json: dict | None, eta_dt: datetime) -> dict:
    """
    Extracts the weather metrics corresponding to the checkpoint's ETA.
    Finds the closest hourly timestamp in the forecast.
    """
    if not weather_json or 'hourly' not in weather_json:
        # Fallback realistic ambient conditions
        return {
            'wind_speed_mph': 12.0,
            'precipitation_in_per_hr': 0.0,
            'snowfall_in_per_hr': 0.0,
            'temperature_f': 62.0,
            'weather_code': 0,
            'matched_time': eta_dt.strftime('%Y-%m-%dT%H:00:00Z'),
            'condition_name': 'Clear',
        }

    hourly = weather_json['hourly']
    times = hourly.get('time', [])
    if not times:
        return {
            'wind_speed_mph': 10.0,
            'precipitation_in_per_hr': 0.0,
            'snowfall_in_per_hr': 0.0,
            'temperature_f': 60.0,
            'weather_code': 0,
            'matched_time': eta_dt.isoformat(),
            'condition_name': 'Clear',
        }

    # ISO string prefix for target hour (e.g. "2026-10-25T14")
    target_str = eta_dt.strftime('%Y-%m-%dT%H')
    target_idx = -1

    for idx, t in enumerate(times):
        if t.startswith(target_str):
            target_idx = idx
            break

    if target_idx == -1:
        # Fallback to closest hour
        try:
            target_ts = eta_dt.timestamp()
            min_diff = float('inf')
            for idx, t in enumerate(times):
                ts = datetime.fromisoformat(t).timestamp()
                diff = abs(ts - target_ts)
                if diff < min_diff:
                    min_diff = diff
                    target_idx = idx
        except Exception:
            target_idx = 0

    wind = hourly.get('wind_speed_10m', [10.0])[target_idx] if target_idx < len(hourly.get('wind_speed_10m', [])) else 10.0
    precip = hourly.get('precipitation', [0.0])[target_idx] if target_idx < len(hourly.get('precipitation', [])) else 0.0
    snow = hourly.get('snowfall', [0.0])[target_idx] if target_idx < len(hourly.get('snowfall', [])) else 0.0
    temp_c = hourly.get('temperature_2m', [15.0])[target_idx] if target_idx < len(hourly.get('temperature_2m', [])) else 15.0
    temp_f = round((temp_c * 9/5) + 32, 1)
    code = hourly.get('weather_code', [0])[target_idx] if target_idx < len(hourly.get('weather_code', [])) else 0

    # Interpret weather code
    condition_name = interpret_weather_code(code)

    return {
        'wind_speed_mph': float(wind or 0.0),
        'precipitation_in_per_hr': float(precip or 0.0),
        'snowfall_in_per_hr': float(snow or 0.0),
        'temperature_f': temp_f,
        'weather_code': code,
        'matched_time': times[target_idx] if target_idx < len(times) else eta_dt.isoformat(),
        'condition_name': condition_name,
    }


def interpret_weather_code(code: int) -> str:
    """Maps WMO Weather interpretation codes to readable names."""
    if code == 0:
        return 'Clear Sky'
    elif code in [1, 2, 3]:
        return 'Partly Cloudy'
    elif code in [45, 48]:
        return 'Foggy'
    elif code in [51, 53, 55]:
        return 'Drizzle'
    elif code in [61, 63, 65]:
        return 'Rain'
    elif code in [66, 67]:
        return 'Freezing Rain'
    elif code in [71, 73, 75]:
        return 'Snowfall'
    elif code == 77:
        return 'Snow Grains'
    elif code in [80, 81, 82]:
        return 'Rain Showers'
    elif code in [85, 86]:
        return 'Snow Showers'
    elif code in [95, 96, 99]:
        return 'Thunderstorm'
    return 'Overcast'
