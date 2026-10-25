from rest_framework import status, permissions
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenObtainPairView
from django.contrib.auth.models import User
from .serializers import UserRegistrationSerializer, UserProfileSerializer

def get_tokens_for_user(user):
    refresh = RefreshToken.for_user(user)
    return {
        'refresh': str(refresh),
        'access': str(refresh.access_token),
    }

class RegisterView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = UserRegistrationSerializer(data=request.data)
        if serializer.is_valid():
            user = serializer.save()
            tokens = get_tokens_for_user(user)
            profile = UserProfileSerializer(user).data
            return Response(
                {
                    'success': True,
                    'message': 'User registered successfully',
                    'user': profile,
                    'tokens': tokens
                },
                status=status.HTTP_201_CREATED
            )
        return Response(
            {
                'success': False,
                'errors': serializer.errors
            },
            status=status.HTTP_400_BAD_REQUEST
        )

class LoginView(TokenObtainPairView):
    def post(self, request, *args, **kwargs):
        response = super().post(request, *args, **kwargs)
        if response.status_code == 200:
            username = request.data.get('username')
            try:
                user = User.objects.get(username=username)
                profile = UserProfileSerializer(user).data
                return Response({
                    'success': True,
                    'tokens': {
                        'access': response.data['access'],
                        'refresh': response.data['refresh'],
                    },
                    'user': profile
                })
            except User.DoesNotExist:
                pass
        return response

class DemoLoginView(APIView):
    """
    Creates or logs in a pre-configured demo fleet driver account
    so the reviewer / user can immediately evaluate with a single click.
    """
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        demo_username = 'demo_driver'
        user, created = User.objects.get_or_create(
            username=demo_username,
            defaults={
                'email': 'driver@spotter-logistics.com',
                'first_name': 'Alex',
                'last_name': 'Mercer',
            }
        )
        if created:
            user.set_password('SpotterDemo2026!')
            user.save()

        tokens = get_tokens_for_user(user)
        profile = UserProfileSerializer(user).data
        return Response({
            'success': True,
            'message': 'Logged in as Demo Fleet Driver',
            'user': profile,
            'tokens': tokens
        })

class ProfileView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        serializer = UserProfileSerializer(request.user)
        return Response({
            'success': True,
            'user': serializer.data
        })

    def patch(self, request):
        serializer = UserProfileSerializer(request.user, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response({
                'success': True,
                'message': 'Profile updated successfully',
                'user': serializer.data
            })
        return Response({'success': False, 'errors': serializer.errors}, status=status.HTTP_400_BAD_REQUEST)
