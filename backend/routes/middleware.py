import time
import uuid
import logging
import traceback
from django.http import JsonResponse
from django.utils.deprecation import MiddlewareMixin

logger = logging.getLogger('routes.middleware')

class RequestLoggingMiddleware(MiddlewareMixin):
    """
    Middleware that assigns a unique request ID, logs execution duration,
    and attaches diagnostic headers (X-Request-ID, X-Response-Time-Ms).
    """
    def process_request(self, request):
        request.request_id = str(uuid.uuid4())[:8]
        request.start_time = time.time()

    def process_response(self, request, response):
        if hasattr(request, 'start_time'):
            duration_ms = round((time.time() - request.start_time) * 1000, 2)
            response['X-Response-Time-Ms'] = str(duration_ms)
            response['X-Request-ID'] = getattr(request, 'request_id', 'unknown')
            
            # Log slow requests or API calls
            if request.path.startswith('/api/'):
                logger.info(
                    f"[{request.request_id}] {request.method} {request.path} "
                    f"Status: {response.status_code} ({duration_ms}ms)"
                )
        return response


class GlobalExceptionMiddleware(MiddlewareMixin):
    """
    Middleware that catches unhandled server exceptions and returns
    a standardized JSON error envelope with diagnostic information.
    """
    def process_exception(self, request, exception):
        req_id = getattr(request, 'request_id', 'internal')
        logger.error(
            f"Unhandled exception in request [{req_id}] {request.method} {request.path}: {str(exception)}\n"
            f"{traceback.format_exc()}"
        )
        return JsonResponse(
            {
                'success': False,
                'error': {
                    'code': 'INTERNAL_SERVER_ERROR',
                    'message': 'An unexpected error occurred while processing your request.',
                    'detail': str(exception),
                    'request_id': req_id,
                }
            },
            status=500
        )
