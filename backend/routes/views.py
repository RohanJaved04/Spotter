import requests
import logging
from datetime import datetime, timezone
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, permissions
from django.core.cache import cache

from .serializers import PlanRouteRequestSerializer, RouteSearchHistorySerializer, SavedRouteSerializer
from .models import RouteSearchHistory, SavedRoute
from .services.routing_service import plan_weather_aware_routes
from .services.corridor_heatmap_service import generate_corridor_forecast_timeline

logger = logging.getLogger('routes.views')

# Pre-defined major global freight and transportation hubs
POPULAR_FREIGHT_HUBS = [
    {"name": "Rotterdam, Netherlands", "lat": 51.9244, "lon": 4.4777, "hub_type": "Port of Rotterdam (Global Hub)"},
    {"name": "Frankfurt, Germany", "lat": 50.1109, "lon": 8.6821, "hub_type": "European Cargo Gateway"},
    {"name": "Chicago, United States", "lat": 41.8781, "lon": -87.6298, "hub_type": "Intermodal Rail & Freight Hub"},
    {"name": "Paris, France", "lat": 48.8566, "lon": 2.3522, "hub_type": "Western Europe Logistics Center"},
    {"name": "London, United Kingdom", "lat": 51.5074, "lon": -0.1278, "hub_type": "UK Distribution Core"},
    {"name": "Tokyo, Japan", "lat": 35.6762, "lon": 139.6503, "hub_type": "Pacific Logistics Superhub"},
    {"name": "Toronto, Canada", "lat": 43.6532, "lon": -79.3832, "hub_type": "Trans-Canada Freight Gateway"},
    {"name": "Sydney, Australia", "lat": -33.8688, "lon": 151.2093, "hub_type": "Oceania Freight Corridor"},
]


class GeocodeView(APIView):
    """
    Search and geocode locations for origin & destination inputs.
    Includes caching and freight hub fuzzy matching.
    """
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        query = request.query_params.get('q', '').strip()
        if not query or len(query) < 2:
            return Response({'success': True, 'results': POPULAR_FREIGHT_HUBS[:6]})

        cache_key = f"geocode_v3_{query.lower()[:35]}"
        cached = cache.get(cache_key)
        if cached:
            return Response({'success': True, 'results': cached})

        results = []

        # 1. Primary: Query Open-Meteo Worldwide Geocoding API (Fast, no rate-limiting, accurate)
        try:
            om_resp = requests.get(
                'https://geocoding-api.open-meteo.com/v1/search',
                params={'name': query, 'count': 8, 'language': 'en', 'format': 'json'},
                timeout=3.5
            )
            if om_resp.status_code == 200:
                om_data = om_resp.json()
                for item in om_data.get('results', []):
                    name_parts = [item.get('name')]
                    admin1 = item.get('admin1')
                    country = item.get('country')
                    if admin1 and admin1 != item.get('name'):
                        name_parts.append(admin1)
                    if country:
                        name_parts.append(country)
                    display_name = ", ".join(name_parts)

                    lat = float(item['latitude'])
                    lon = float(item['longitude'])
                    results.append({
                        'name': display_name,
                        'lat': lat,
                        'lon': lon,
                        'hub_type': f"{item.get('feature_code', 'City')} • {country or ''}".strip(' •')
                    })
        except Exception as e:
            logger.warning(f"Open-Meteo geocode lookup error: {e}")

        # 2. Secondary fallback if fewer results found: OpenStreetMap Nominatim
        if len(results) < 4:
            headers = {'User-Agent': 'SpotterGlobalRouting/2.5 (contact@spotter-routing.org)'}
            try:
                nom_resp = requests.get(
                    'https://nominatim.openstreetmap.org/search',
                    params={'q': query, 'format': 'json', 'addressdetails': 1, 'limit': 6},
                    headers=headers,
                    timeout=3.5
                )
                if nom_resp.status_code == 200:
                    nom_data = nom_resp.json()
                    for item in nom_data:
                        lat = float(item['lat'])
                        lon = float(item['lon'])
                        # Deduplicate with already found results
                        if not any(abs(r['lat'] - lat) < 0.05 and abs(r['lon'] - lon) < 0.05 for r in results):
                            raw_name = item.get('display_name', query)
                            parts = [p.strip() for p in raw_name.split(',')]
                            short_name = ", ".join(parts[:3]) if len(parts) > 3 else raw_name

                            results.append({
                                'name': short_name,
                                'lat': lat,
                                'lon': lon,
                                'hub_type': item.get('type', 'Location')
                            })
            except Exception as e:
                logger.warning(f"Nominatim fallback geocode error: {e}")

        # 3. Fallback to predefined global hubs if still no external matches
        if not results:
            results = [h for h in POPULAR_FREIGHT_HUBS if query.lower() in h['name'].lower()]

        cache.set(cache_key, results[:8], timeout=3600)
        return Response({'success': True, 'results': results[:8]})


class PlanRoutesView(APIView):
    """
    Core route calculation endpoint:
    - Generates 3 alternative routes
    - Samples weather every 10 / 25 / 50 miles using arrival ETA at each checkpoint
    - Evaluates weather risk and applies load rules
    - Recommends best route
    - Computes corridor weather heatmap for 0-48 hour slider
    """
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = PlanRouteRequestSerializer(data=request.data)
        if not serializer.is_valid():
            return Response({
                'success': False,
                'message': 'Invalid route planning parameters',
                'errors': serializer.errors
            }, status=status.HTTP_400_BAD_REQUEST)

        data = serializer.validated_data
        origin = data['origin']
        dest = data['destination']
        departure_time = data.get('departure_time') or datetime.now(timezone.utc)
        load_weight_lbs = data['load_weight_lbs']
        sampling_interval_miles = data['sampling_interval_miles']

        try:
            ranked_routes = plan_weather_aware_routes(
                origin=(origin['lat'], origin['lon']),
                destination=(dest['lat'], dest['lon']),
                departure_time=departure_time,
                load_weight_lbs=load_weight_lbs,
                sampling_interval_miles=sampling_interval_miles
            )

            if not ranked_routes:
                return Response({
                    'success': False,
                    'message': 'No viable driving routes could be found between the specified locations.'
                }, status=status.HTTP_422_UNPROCESSABLE_ENTITY)

            # Generate corridor weather heatmap data for 0–48h slider
            heatmap_data = generate_corridor_forecast_timeline(
                routes=ranked_routes,
                departure_time=departure_time,
                load_weight_lbs=load_weight_lbs
            )

            # Recommended route is top ranked route
            recommended = ranked_routes[0]

            # Save to search history if user is authenticated or guest tracking
            if request.user.is_authenticated:
                try:
                    RouteSearchHistory.objects.create(
                        user=request.user,
                        origin_name=origin.get('name', 'Origin'),
                        origin_lat=origin['lat'],
                        origin_lon=origin['lon'],
                        dest_name=dest.get('name', 'Destination'),
                        dest_lat=dest['lat'],
                        dest_lon=dest['lon'],
                        departure_time=departure_time,
                        load_weight_lbs=int(load_weight_lbs),
                        sampling_interval_miles=int(sampling_interval_miles),
                        recommended_route_name=recommended.get('route_name', ''),
                        total_distance_miles=recommended.get('distance_miles', 0.0),
                        total_duration_hours=recommended.get('duration_hours', 0.0),
                        avg_risk_level=recommended.get('risk_summary', {}).get('average_risk_level', 'Low'),
                        summary_data={
                            'recommendation_reason': recommended.get('recommendation_reason'),
                            'severe_miles': recommended.get('risk_summary', {}).get('severe_miles', 0),
                            'high_miles': recommended.get('risk_summary', {}).get('high_miles', 0),
                        }
                    )
                except Exception as ex:
                    logger.warning(f"Could not record search history: {ex}")

            return Response({
                'success': True,
                'routes': ranked_routes,
                'recommended_route_id': recommended.get('route_id'),
                'heatmap': heatmap_data,
                'query_params': {
                    'origin': origin,
                    'destination': dest,
                    'departure_time': departure_time.isoformat(),
                    'load_weight_lbs': load_weight_lbs,
                    'sampling_interval_miles': sampling_interval_miles,
                }
            })

        except Exception as e:
            logger.error(f"Error calculating routes: {e}", exc_info=True)
            return Response({
                'success': False,
                'message': f"Error calculating weather-aware routes: {str(e)}"
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class RouteSearchHistoryView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        history = RouteSearchHistory.objects.filter(user=request.user)[:20]
        serializer = RouteSearchHistorySerializer(history, many=True)
        return Response({'success': True, 'history': serializer.data})


class SavedRouteView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        saved = SavedRoute.objects.filter(user=request.user)
        serializer = SavedRouteSerializer(saved, many=True)
        return Response({'success': True, 'saved_routes': serializer.data})

    def post(self, request):
        data = request.data.copy()
        serializer = SavedRouteSerializer(data=data)
        if serializer.is_valid():
            serializer.save(user=request.user)
            return Response({'success': True, 'saved_route': serializer.data}, status=status.HTTP_201_CREATED)
        return Response({'success': False, 'errors': serializer.errors}, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request, pk=None):
        try:
            saved = SavedRoute.objects.get(pk=pk, user=request.user)
            saved.delete()
            return Response({'success': True, 'message': 'Route removed from saved list.'})
        except SavedRoute.DoesNotExist:
            return Response({'success': False, 'message': 'Route not found.'}, status=status.HTTP_404_NOT_FOUND)
