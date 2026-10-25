from django.db import models
from django.contrib.auth.models import User

class RouteSearchHistory(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='search_history', null=True, blank=True)
    origin_name = models.CharField(max_length=255)
    origin_lat = models.FloatField()
    origin_lon = models.FloatField()
    dest_name = models.CharField(max_length=255)
    dest_lat = models.FloatField()
    dest_lon = models.FloatField()
    departure_time = models.DateTimeField()
    load_weight_lbs = models.IntegerField()
    sampling_interval_miles = models.IntegerField(default=25)
    recommended_route_name = models.CharField(max_length=100, blank=True)
    total_distance_miles = models.FloatField(default=0.0)
    total_duration_hours = models.FloatField(default=0.0)
    avg_risk_level = models.CharField(max_length=30, blank=True)
    summary_data = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']
        verbose_name_plural = 'Route Search Histories'

    def __str__(self):
        return f"{self.origin_name} -> {self.dest_name} ({self.load_weight_lbs:,} lbs) [{self.created_at.strftime('%Y-%m-%d %H:%M')}]"


class SavedRoute(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='saved_routes')
    title = models.CharField(max_length=255)
    origin_name = models.CharField(max_length=255)
    dest_name = models.CharField(max_length=255)
    load_weight_lbs = models.IntegerField()
    sampling_interval_miles = models.IntegerField(default=25)
    route_details = models.JSONField(default=dict)
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.title} - {self.user.username}"
