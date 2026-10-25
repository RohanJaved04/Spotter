"""
Corridor Weather Heatmap Service.
Samples continuous weather along the route trajectories and lateral corridor flanks,
fetches 0–48 hour forecasts, and produces time-indexed heatmap frames
(wind, precipitation, snow, risk intensity) for the 0–48h interactive map slider.
"""

import math
import logging
from datetime import datetime, timedelta
from .weather_service import fetch_weather_batch, extract_weather_at_eta
from .risk_engine import evaluate_checkpoint_risk

logger = logging.getLogger('routes.heatmap_service')

FORECAST_STEPS = [0, 3, 6, 9, 12, 18, 24, 30, 36, 42, 48]

def compute_corridor_grid(routes: list[dict], max_points: int = 45) -> list[tuple[float, float]]:
    """
    Computes a continuous spatial corridor sampling along all candidate driving routes.
    Includes trajectory centerlines and lateral corridor flanks (+/- 15-25 miles)
    to form a realistic, cohesive weather corridor swath rather than disconnected grid lines.
    """
    if not routes:
        return []

    sampled_coords = []
    seen = set()

    for r in routes:
        path = r.get('full_path', [])
        if not path:
            continue

        n_pts = len(path)
        # Select 12-16 evenly spaced points along each route
        num_samples = min(16, max(8, n_pts // 15))
        step = max(1, n_pts // num_samples)

        for i in range(0, n_pts, step):
            lat, lon = path[i]
            
            # Estimate perpendicular offset vector using next coordinate
            next_idx = min(n_pts - 1, i + 1)
            dlat = path[next_idx][0] - lat
            dlon = path[next_idx][1] - lon
            norm = math.sqrt(dlat * dlat + dlon * dlon) or 1.0
            
            perp_lat = -dlon / norm * 0.22  # ~15 miles lateral offset
            perp_lon = dlat / norm * 0.22

            # 3 corridor points: Center, Left flank, Right flank
            candidates = [
                (round(lat, 3), round(lon, 3)),
                (round(lat + perp_lat, 3), round(lon + perp_lon, 3)),
                (round(lat - perp_lat, 3), round(lon - perp_lon, 3)),
            ]

            for c in candidates:
                # Deduplicate by ~0.15 deg grid key
                key = (round(c[0] * 5) / 5, round(c[1] * 5) / 5)
                if key not in seen:
                    seen.add(key)
                    sampled_coords.append(c)

    if not sampled_coords:
        # Fallback to direct checkpoints
        for r in routes:
            for cp in r.get('checkpoints', []):
                coord = (round(cp['coordinate'][0], 3), round(cp['coordinate'][1], 3))
                if coord not in seen:
                    seen.add(coord)
                    sampled_coords.append(coord)

    return sampled_coords[:max_points]


def generate_corridor_forecast_timeline(
    routes: list[dict],
    departure_time: datetime,
    load_weight_lbs: float
) -> dict:
    """
    Generates the complete 0–48 hour corridor weather data.
    Returns:
      - bounding_box: [[min_lat, min_lon], [max_lat, max_lon]]
      - timeline_hours: [0, 3, 6, 9, 12, 18, 24, 30, 36, 42, 48]
      - frames: mapping of hour_str -> list of heat points [lat, lon, intensity, risk, wind_mph, precip_in]
    """
    grid_coords = compute_corridor_grid(routes, max_points=50)
    if not grid_coords:
        return {
            'timeline_hours': FORECAST_STEPS,
            'frames': {str(h): [] for h in FORECAST_STEPS}
        }

    # Batch fetch weather for all corridor coordinates
    weather_map = fetch_weather_batch(grid_coords)

    frames = {}

    for step_h in FORECAST_STEPS:
        target_dt = departure_time + timedelta(hours=step_h)
        frame_points = []

        for lat, lon in grid_coords:
            raw_w = weather_map.get((lat, lon))
            w_data = extract_weather_at_eta(raw_w, target_dt)
            risk_data = evaluate_checkpoint_risk(w_data, load_weight_lbs)

            score = risk_data.get('overall_score', 1)
            intensity = min(1.0, max(0.25, (score - 1) / 4.0 * 0.75 + 0.25))

            frame_points.append({
                'lat': lat,
                'lon': lon,
                'intensity': round(intensity, 2),
                'risk_level': risk_data.get('overall_risk', 'Low'),
                'risk_color': risk_data.get('color', '#10b981'),
                'wind_mph': w_data.get('wind_speed_mph', 0),
                'precip_in': w_data.get('precipitation_in_per_hr', 0),
                'snow_in': w_data.get('snowfall_in_per_hr', 0),
                'condition': w_data.get('condition_name', 'Clear'),
                'temp_f': w_data.get('temperature_f', 65),
            })

        frames[str(step_h)] = frame_points

    all_lats = [pt[0] for pt in grid_coords]
    all_lons = [pt[1] for pt in grid_coords]
    bbox = [
        [min(all_lats), min(all_lons)],
        [max(all_lats), max(all_lons)]
    ]

    return {
        'bounding_box': bbox,
        'timeline_hours': FORECAST_STEPS,
        'departure_time_iso': departure_time.isoformat(),
        'frames': frames
    }
