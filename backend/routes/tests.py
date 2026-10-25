from django.test import TestCase
from rest_framework.test import APIClient
from routes.services.risk_engine import (
    classify_wind_risk,
    classify_rain_risk,
    classify_snow_risk,
    evaluate_checkpoint_risk,
    aggregate_route_risks,
    rank_and_recommend_routes
)

class RiskEngineTestCase(TestCase):
    def test_wind_thresholds_empty_truck(self):
        """Test base wind thresholds with standard empty/light load (20,000 lbs)"""
        # Low: < 25 mph
        risk, _ = classify_wind_risk(24.0, 20000)
        self.assertEqual(risk, 'Low')
        
        # Moderate: 25-34 mph
        risk, _ = classify_wind_risk(30.0, 20000)
        self.assertEqual(risk, 'Moderate')

        # High: 35-44 mph (light load stays High)
        risk, _ = classify_wind_risk(40.0, 20000)
        self.assertEqual(risk, 'High')

        # Severe: 45-54 mph (light load stays Severe)
        risk, _ = classify_wind_risk(50.0, 20000)
        self.assertEqual(risk, 'Severe')

        # No Travel: >= 55 mph
        risk, _ = classify_wind_risk(56.0, 20000)
        self.assertEqual(risk, 'No Travel')

    def test_load_weight_escalation_rules(self):
        """
        Test specific load rules from requirements:
        • ≥55 mph → No Travel for any load
        • 45–54 mph + >30,000 lb → No Travel
        • 35–44 mph + >40,000 lb → Severe
        """
        # 1. >= 55 mph -> No Travel for any load (light and heavy)
        risk1, _ = classify_wind_risk(55.0, 15000)
        self.assertEqual(risk1, 'No Travel')
        risk2, _ = classify_wind_risk(58.0, 45000)
        self.assertEqual(risk2, 'No Travel')

        # 2. 45–54 mph + >30,000 lb → No Travel
        risk_heavy_45, notes = classify_wind_risk(48.0, 32000)
        self.assertEqual(risk_heavy_45, 'No Travel')
        self.assertTrue(any('No Travel' in n for n in notes))

        # But 45–54 mph with <= 30,000 lb remains Severe
        risk_light_45, _ = classify_wind_risk(48.0, 28000)
        self.assertEqual(risk_light_45, 'Severe')

        # 3. 35–44 mph + >40,000 lb → Severe
        risk_heavy_35, notes35 = classify_wind_risk(38.0, 42000)
        self.assertEqual(risk_heavy_35, 'Severe')
        self.assertTrue(any('Severe' in n for n in notes35))

        # But 35–44 mph with <= 40,000 lb remains High
        risk_mod_35, _ = classify_wind_risk(38.0, 35000)
        self.assertEqual(risk_mod_35, 'High')

    def test_rain_thresholds(self):
        """
        Rain:
        <0.10: Low
        0.10–0.25: Moderate
        0.25–0.50: High
        0.50–1.00: Severe
        >1.00: No Travel
        """
        self.assertEqual(classify_rain_risk(0.05), 'Low')
        self.assertEqual(classify_rain_risk(0.18), 'Moderate')
        self.assertEqual(classify_rain_risk(0.35), 'High')
        self.assertEqual(classify_rain_risk(0.75), 'Severe')
        self.assertEqual(classify_rain_risk(1.20), 'No Travel')

    def test_snow_thresholds(self):
        """
        Snow:
        <0.5: Low
        0.5–1.0: Moderate
        1.0–2.0: High
        2.0–3.0: Severe
        >3.0: No Travel
        """
        self.assertEqual(classify_snow_risk(0.2), 'Low')
        self.assertEqual(classify_snow_risk(0.7), 'Moderate')
        self.assertEqual(classify_snow_risk(1.5), 'High')
        self.assertEqual(classify_snow_risk(2.5), 'Severe')
        self.assertEqual(classify_snow_risk(3.5), 'No Travel')

    def test_checkpoint_composite_max_risk(self):
        """Checkpoint overall risk is max of wind, rain, snow subject to load rules."""
        weather = {
            'wind_speed_mph': 20.0,      # Low
            'precipitation_in_per_hr': 0.8, # Severe
            'snowfall_in_per_hr': 0.1     # Low
        }
        eval_res = evaluate_checkpoint_risk(weather, 25000)
        self.assertEqual(eval_res['overall_risk'], 'Severe')
        self.assertEqual(eval_res['overall_score'], 4)

    def test_route_recommendation_ranking(self):
        """
        Recommendation ranking preference:
        1. Fewest Severe miles
        2. Fewest High miles
        3. Lowest average risk
        4. Shortest travel times
        """
        routes = [
            {
                'route_id': 'route_A',
                'duration_seconds': 10000,
                'risk_summary': {
                    'total_severe_and_worse_miles': 15.0,
                    'high_miles': 10.0,
                    'average_risk_score': 2.5
                }
            },
            {
                'route_id': 'route_B',
                'duration_seconds': 12000,
                'risk_summary': {
                    'total_severe_and_worse_miles': 0.0,  # Zero severe miles!
                    'high_miles': 25.0,
                    'average_risk_score': 2.0
                }
            },
            {
                'route_id': 'route_C',
                'duration_seconds': 11000,
                'risk_summary': {
                    'total_severe_and_worse_miles': 0.0,
                    'high_miles': 5.0,  # Zero severe miles AND fewer high miles!
                    'average_risk_score': 1.8
                }
            }
        ]

        ranked = rank_and_recommend_routes(routes)
        # Route C should be ranked #1 because it has 0 severe miles and lowest high miles
        self.assertEqual(ranked[0]['route_id'], 'route_C')
        self.assertTrue(ranked[0]['is_recommended'])
        # Route B should be ranked #2 (0 severe miles, but more high miles than C)
        self.assertEqual(ranked[1]['route_id'], 'route_B')
        # Route A should be ranked #3 (has 15 severe miles)
        self.assertEqual(ranked[2]['route_id'], 'route_A')


class ApiEndpointsTestCase(TestCase):
    def setUp(self):
        self.client = APIClient()

    def test_geocode_endpoint(self):
        response = self.client.get('/api/geocode/?q=Chicago')
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertTrue(data['success'])
        self.assertGreater(len(data['results']), 0)

    def test_demo_auth_login(self):
        response = self.client.post('/api/auth/demo/')
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertTrue(data['success'])
        self.assertIn('tokens', data)
        self.assertIn('access', data['tokens'])
