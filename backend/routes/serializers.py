from rest_framework import serializers
from datetime import datetime, timezone
from .models import RouteSearchHistory, SavedRoute

def current_utc_time():
    return datetime.now(timezone.utc)

class CoordinateSerializer(serializers.Serializer):
    lat = serializers.FloatField(min_value=-90.0, max_value=90.0)
    lon = serializers.FloatField(min_value=-180.0, max_value=180.0)
    name = serializers.CharField(max_length=255, required=False, default='')

class PlanRouteRequestSerializer(serializers.Serializer):
    origin = CoordinateSerializer(required=True)
    destination = CoordinateSerializer(required=True)
    departure_time = serializers.DateTimeField(required=False, default=current_utc_time)
    load_weight_lbs = serializers.FloatField(
        min_value=1000.0,
        max_value=120000.0,
        default=32000.0,
        help_text="Gross truck load weight in pounds"
    )
    sampling_interval_miles = serializers.ChoiceField(
        choices=[10, 25, 50],
        default=25,
        help_text="Weather sampling interval in miles (10, 25, or 50)"
    )

    def validate(self, data):
        orig = data['origin']
        dest = data['destination']
        # Distance check to prevent identical origin & destination
        if abs(orig['lat'] - dest['lat']) < 0.001 and abs(orig['lon'] - dest['lon']) < 0.001:
            raise serializers.ValidationError("Origin and destination must be distinct geographic locations.")
        return data


class RouteSearchHistorySerializer(serializers.ModelSerializer):
    class Meta:
        model = RouteSearchHistory
        fields = '__all__'


class SavedRouteSerializer(serializers.ModelSerializer):
    class Meta:
        model = SavedRoute
        fields = '__all__'
        read_only_fields = ('id', 'user', 'created_at', 'updated_at')
