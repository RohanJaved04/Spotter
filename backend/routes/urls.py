from django.urls import path
from .views import GeocodeView, PlanRoutesView, RouteSearchHistoryView, SavedRouteView

urlpatterns = [
    path('geocode/', GeocodeView.as_view(), name='api_geocode'),
    path('routes/plan/', PlanRoutesView.as_view(), name='api_routes_plan'),
    path('routes/history/', RouteSearchHistoryView.as_view(), name='api_routes_history'),
    path('routes/saved/', SavedRouteView.as_view(), name='api_routes_saved'),
    path('routes/saved/<int:pk>/', SavedRouteView.as_view(), name='api_routes_saved_detail'),
]
