"""API views for session-based signup, login, logout, and current-user state."""

from django.contrib.auth import authenticate, login, logout
from django.db import IntegrityError
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import ensure_csrf_cookie
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .serializers import LoginSerializer, SignupSerializer, UserSerializer


class CsrfView(APIView):
    """Issue a CSRF cookie for the React SPA."""

    permission_classes = [AllowAny]

    @method_decorator(ensure_csrf_cookie)
    def get(self, _request):
        return Response({"detail": "CSRF cookie set."}, status=status.HTTP_200_OK)


class SignupView(APIView):
    """Register a user, create their organization server-side, and start a session."""

    permission_classes = [AllowAny]

    def post(self, request):
        serializer = SignupSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            user = serializer.save()
        except IntegrityError:
            return Response(
                {"email": ["An account with this email already exists."]},
                status=status.HTTP_400_BAD_REQUEST,
            )

        login(request, user)
        return Response(
            {"user": UserSerializer(user).data},
            status=status.HTTP_201_CREATED,
        )


class LoginView(APIView):
    """Authenticate by email and password and establish an HttpOnly session."""

    permission_classes = [AllowAny]

    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        email = serializer.validated_data["email"]
        password = serializer.validated_data["password"]
        user = authenticate(request, username=email, password=password)

        if user is None or not user.is_active:
            return Response(
                {"detail": "Invalid email or password."},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        login(request, user)
        return Response(
            {"user": UserSerializer(user).data},
            status=status.HTTP_200_OK,
        )


class LogoutView(APIView):
    """End the active user session."""

    permission_classes = [IsAuthenticated]

    def post(self, request):
        logout(request)
        return Response(
            {"detail": "Signed out successfully."},
            status=status.HTTP_200_OK,
        )


class MeView(APIView):
    """Return the currently authenticated user and their organization."""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response(
            {"user": UserSerializer(request.user).data},
            status=status.HTTP_200_OK,
        )
