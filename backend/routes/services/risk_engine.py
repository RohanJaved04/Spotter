"""
Risk Engine for Weather-Aware Truck Routing.
Strictly implements the thresholds, load-weight escalation rules,
and multi-tier route recommendation ranking specified in the design doc.
"""

RISK_LEVELS = ['Low', 'Moderate', 'High', 'Severe', 'No Travel']

RISK_SCORES = {
    'Low': 1,
    'Moderate': 2,
    'High': 3,
    'Severe': 4,
    'No Travel': 5,
}

RISK_COLORS = {
    'Low': '#10b981',       # Emerald green
    'Moderate': '#f59e0b',  # Amber yellow
    'High': '#f97316',      # Vibrant orange
    'Severe': '#ef4444',    # Crimson red
    'No Travel': '#7f1d1d', # Deep maroon / black
}

def classify_wind_risk(wind_mph: float, load_weight_lbs: float) -> tuple[str, list[str]]:
    """
    Classify wind condition risk and apply load weight rules:
    - Base thresholds:
      <25 mph: Low
      25–34 mph: Moderate
      35–44 mph: High
      45–54 mph: Severe
      >=55 mph: No Travel
    - Load rules:
      >=55 mph -> No Travel for any load
      45–54 mph + >30,000 lb -> No Travel
      35–44 mph + >40,000 lb -> Severe
    """
    notes = []
    
    if wind_mph >= 55.0:
        base_level = 'No Travel'
        effective_level = 'No Travel'
        notes.append(f"Wind {wind_mph:.1f} mph ≥ 55 mph: No Travel for any load")
    elif wind_mph >= 45.0:
        base_level = 'Severe'
        if load_weight_lbs > 30000:
            effective_level = 'No Travel'
            notes.append(f"Wind {wind_mph:.1f} mph (45–54 mph) + Load {load_weight_lbs:,.0f} lb (>30,000 lb) → Escalated to No Travel")
        else:
            effective_level = 'Severe'
            notes.append(f"Wind {wind_mph:.1f} mph in 45–54 mph range: Severe")
    elif wind_mph >= 35.0:
        base_level = 'High'
        if load_weight_lbs > 40000:
            effective_level = 'Severe'
            notes.append(f"Wind {wind_mph:.1f} mph (35–44 mph) + Load {load_weight_lbs:,.0f} lb (>40,000 lb) → Escalated to Severe")
        else:
            effective_level = 'High'
            notes.append(f"Wind {wind_mph:.1f} mph in 35–44 mph range: High")
    elif wind_mph >= 25.0:
        base_level = 'Moderate'
        effective_level = 'Moderate'
    else:
        base_level = 'Low'
        effective_level = 'Low'

    return effective_level, notes

def classify_rain_risk(rain_in_per_hr: float) -> str:
    """
    Rain (in/hr):
    < 0.10: Low
    0.10–0.25: Moderate
    0.25–0.50: High
    0.50–1.00: Severe
    > 1.00: No Travel
    """
    if rain_in_per_hr > 1.00:
        return 'No Travel'
    elif rain_in_per_hr >= 0.50:
        return 'Severe'
    elif rain_in_per_hr >= 0.25:
        return 'High'
    elif rain_in_per_hr >= 0.10:
        return 'Moderate'
    else:
        return 'Low'

def classify_snow_risk(snow_in_per_hr: float) -> str:
    """
    Snow (in/hr):
    < 0.5: Low
    0.5–1.0: Moderate
    1.0–2.0: High
    2.0–3.0: Severe
    > 3.0: No Travel
    """
    if snow_in_per_hr > 3.0:
        return 'No Travel'
    elif snow_in_per_hr >= 2.0:
        return 'Severe'
    elif snow_in_per_hr >= 1.0:
        return 'High'
    elif snow_in_per_hr >= 0.5:
        return 'Moderate'
    else:
        return 'Low'

def evaluate_checkpoint_risk(weather_data: dict, load_weight_lbs: float) -> dict:
    """
    Evaluates weather risk for a single checkpoint given weather metrics and truck load.
    weather_data must contain:
      - wind_speed_mph
      - precipitation_in_per_hr (or rain_in_per_hr)
      - snowfall_in_per_hr (or snow_in_per_hr)
    """
    wind_mph = float(weather_data.get('wind_speed_mph', 0.0))
    rain_rate = float(weather_data.get('precipitation_in_per_hr', weather_data.get('rain_in_per_hr', 0.0)))
    snow_rate = float(weather_data.get('snowfall_in_per_hr', weather_data.get('snow_in_per_hr', 0.0)))

    wind_risk, wind_notes = classify_wind_risk(wind_mph, load_weight_lbs)
    rain_risk = classify_rain_risk(rain_rate)
    snow_risk = classify_snow_risk(snow_rate)

    # Determine highest severity among conditions
    all_risks = [wind_risk, rain_risk, snow_risk]
    max_score = max(RISK_SCORES[r] for r in all_risks)
    
    # Reverse lookup name
    overall_risk = next(k for k, v in RISK_SCORES.items() if v == max_score)

    # Identify primary hazards
    primary_hazards = []
    if RISK_SCORES[wind_risk] == max_score and max_score > 1:
        primary_hazards.append(f"Wind ({wind_mph:.1f} mph)")
    if RISK_SCORES[rain_risk] == max_score and max_score > 1:
        primary_hazards.append(f"Rain ({rain_rate:.2f} in/hr)")
    if RISK_SCORES[snow_risk] == max_score and max_score > 1:
        primary_hazards.append(f"Snow ({snow_rate:.2f} in/hr)")

    return {
        'overall_risk': overall_risk,
        'overall_score': max_score,
        'color': RISK_COLORS[overall_risk],
        'wind_risk': wind_risk,
        'rain_risk': rain_risk,
        'snow_risk': snow_risk,
        'wind_mph': round(wind_mph, 1),
        'rain_in_per_hr': round(rain_rate, 2),
        'snow_in_per_hr': round(snow_rate, 2),
        'primary_hazards': primary_hazards,
        'load_impact_notes': wind_notes,
    }


def aggregate_route_risks(checkpoints: list[dict], total_route_miles: float) -> dict:
    """
    Aggregates checkpoint risks across the route into mileage breakdowns:
    - Miles in No Travel
    - Miles in Severe
    - Miles in High
    - Miles in Moderate
    - Miles in Low
    - Average Risk Score
    """
    if not checkpoints:
        return {
            'no_travel_miles': 0.0,
            'severe_miles': 0.0,
            'high_miles': 0.0,
            'moderate_miles': 0.0,
            'low_miles': 0.0,
            'average_risk_score': 1.0,
            'average_risk_level': 'Low',
            'critical_hazards_count': 0,
        }

    # Each checkpoint represents a segment around it
    n = len(checkpoints)
    miles_per_segment = total_route_miles / n if n > 0 else 0.0

    breakdown = {
        'No Travel': 0.0,
        'Severe': 0.0,
        'High': 0.0,
        'Moderate': 0.0,
        'Low': 0.0,
    }
    total_score = 0
    max_score = 1
    max_wind = 0.0
    max_precip = 0.0
    max_snow = 0.0

    for cp in checkpoints:
        risk = cp.get('risk', {}).get('overall_risk', 'Low')
        score = cp.get('risk', {}).get('overall_score', 1)
        breakdown[risk] = breakdown.get(risk, 0.0) + miles_per_segment
        total_score += score

        if score > max_score:
            max_score = score

        w = cp.get('weather', {})
        wind = float(w.get('wind_speed_mph', 0.0) or 0.0)
        precip = float(w.get('precipitation_in_per_hr', 0.0) or 0.0)
        snow = float(w.get('snowfall_in_per_hr', 0.0) or 0.0)

        if wind > max_wind:
            max_wind = wind
        if precip > max_precip:
            max_precip = precip
        if snow > max_snow:
            max_snow = snow

    avg_score = total_score / n if n > 0 else 1.0
    
    # Map average score back to descriptive level
    if avg_score >= 4.5:
        avg_level = 'No Travel'
    elif avg_score >= 3.5:
        avg_level = 'Severe'
    elif avg_score >= 2.5:
        avg_level = 'High'
    elif avg_score >= 1.5:
        avg_level = 'Moderate'
    else:
        avg_level = 'Low'

    max_level = next(k for k, v in RISK_SCORES.items() if v == max_score)

    if max_score >= 4:
        if max_precip > 1.0:
            peak_hazard = f"Extreme Torrential Rain ({max_precip:.2f} in/hr)"
        elif max_wind >= 45:
            peak_hazard = f"Severe High Wind ({max_wind:.1f} mph)"
        elif max_snow >= 2.0:
            peak_hazard = f"Heavy Snow / Blizzard ({max_snow:.2f} in/hr)"
        elif max_precip >= 0.5:
            peak_hazard = f"Heavy Rain ({max_precip:.2f} in/hr)"
        else:
            peak_hazard = f"Severe Hazard (Wind {max_wind:.1f} mph)"
    elif max_score == 3:
        if max_wind >= 35:
            peak_hazard = f"High Wind ({max_wind:.1f} mph)"
        elif max_precip >= 0.25:
            peak_hazard = f"Heavy Rain ({max_precip:.2f} in/hr)"
        elif max_snow >= 1.0:
            peak_hazard = f"Heavy Snow ({max_snow:.2f} in/hr)"
        else:
            peak_hazard = f"High Risk Hazard"
    elif max_score == 2:
        if max_wind >= 25:
            peak_hazard = f"Moderate Wind Gusts ({max_wind:.1f} mph)"
        elif max_precip >= 0.10:
            peak_hazard = f"Moderate Rain ({max_precip:.2f} in/hr)"
        elif max_snow >= 0.5:
            peak_hazard = f"Moderate Snow ({max_snow:.2f} in/hr)"
        else:
            peak_hazard = f"Moderate Conditions"
    else:
        peak_hazard = f"Clear & Favorable (Wind {max_wind:.1f} mph)"

    critical_hazards = sum(1 for cp in checkpoints if cp.get('risk', {}).get('overall_risk') in ['Severe', 'No Travel'])

    return {
        'no_travel_miles': round(breakdown['No Travel'], 1),
        'severe_miles': round(breakdown['Severe'], 1),
        # Severe + No Travel is the top safety filter
        'total_severe_and_worse_miles': round(breakdown['Severe'] + breakdown['No Travel'], 1),
        'high_miles': round(breakdown['High'], 1),
        'moderate_miles': round(breakdown['Moderate'], 1),
        'low_miles': round(breakdown['Low'], 1),
        'average_risk_score': round(avg_score, 2),
        'average_risk_level': avg_level,
        'max_risk_level': max_level,
        'max_risk_score': max_score,
        'max_wind_mph': round(max_wind, 1),
        'max_precip_in_per_hr': round(max_precip, 2),
        'max_snow_in_per_hr': round(max_snow, 2),
        'peak_hazard_label': peak_hazard,
        'critical_hazards_count': critical_hazards,
    }


def rank_and_recommend_routes(routes: list[dict]) -> list[dict]:
    """
    Ranks routes according to strict priority order from design requirements:
    Prefer:
    1. Fewest Severe miles (combined Severe & No Travel miles)
    2. Fewest High miles
    3. Lowest average risk
    4. Shortest travel times

    Adds 'is_recommended': True to the top ranked route, with recommendation reasons.
    """
    if not routes:
        return []

    def sorting_key(route):
        stats = route.get('risk_summary', {})
        # 1. Fewest Severe (and No Travel) miles
        severe_and_worse = stats.get('total_severe_and_worse_miles', 0.0)
        # 2. Fewest High miles
        high_miles = stats.get('high_miles', 0.0)
        # 3. Lowest average risk
        avg_risk = stats.get('average_risk_score', 1.0)
        # 4. Shortest travel time (in minutes/seconds)
        duration = route.get('duration_seconds', 0.0)

        return (severe_and_worse, high_miles, avg_risk, duration)

    sorted_routes = sorted(routes, key=sorting_key)

    # Decorate with ranking metadata
    for idx, route in enumerate(sorted_routes):
        is_best = (idx == 0)
        route['rank'] = idx + 1
        route['is_recommended'] = is_best
        
        reasons = []
        stats = route.get('risk_summary', {})
        if is_best:
            if stats.get('total_severe_and_worse_miles', 0) == 0:
                reasons.append("Zero Severe/No-Travel weather zones")
            else:
                reasons.append(f"Lowest exposure to severe conditions ({stats.get('total_severe_and_worse_miles', 0):.1f} mi)")

            if stats.get('high_miles', 0) == 0:
                reasons.append("Zero High-risk miles")
            else:
                reasons.append(f"Minimal high-risk exposure ({stats.get('high_miles', 0):.1f} mi)")
            
            reasons.append(f"Lowest average trip risk ({stats.get('average_risk_score', 1.0)}/5.0)")
            reasons.append(f"Optimal travel duration ({route.get('formatted_duration', '')})")
            route['recommendation_badge'] = "BEST RECOMMENDED ROUTE"
            route['recommendation_reason'] = " • ".join(reasons)
        else:
            diff_severe = stats.get('total_severe_and_worse_miles', 0) - sorted_routes[0].get('risk_summary', {}).get('total_severe_and_worse_miles', 0)
            if diff_severe > 0:
                reasons.append(f"+{diff_severe:.1f} mi severe weather vs recommended")
            diff_time = (route.get('duration_seconds', 0) - sorted_routes[0].get('duration_seconds', 0)) / 60
            if diff_time > 0:
                reasons.append(f"+{int(diff_time)} mins longer")
            route['recommendation_badge'] = f"ALTERNATIVE #{idx + 1}"
            route['recommendation_reason'] = " • ".join(reasons) if reasons else "Alternative corridor"

    return sorted_routes
