"""Serializers for authentication and organization onboarding."""

from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError
from django.db import transaction
from rest_framework import serializers

from .models import Organization

User = get_user_model()


class OrganizationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Organization
        fields = ["id", "name", "created_at"]
        read_only_fields = fields


class UserSerializer(serializers.ModelSerializer):
    organization = OrganizationSerializer(read_only=True)

    class Meta:
        model = User
        fields = ["id", "email", "organization", "created_at"]
        read_only_fields = fields


class SignupSerializer(serializers.Serializer):
    email = serializers.EmailField(max_length=255)
    password = serializers.CharField(
        write_only=True,
        trim_whitespace=False,
        style={"input_type": "password"},
    )
    organization_name = serializers.CharField(max_length=150, trim_whitespace=True)

    def validate_email(self, value: str) -> str:
        normalized = value.strip().lower()
        if User.objects.filter(email__iexact=normalized).exists():
            raise serializers.ValidationError("An account with this email already exists.")
        return normalized

    def validate_organization_name(self, value: str) -> str:
        cleaned = value.strip()
        if len(cleaned) < 2:
            raise serializers.ValidationError(
                "Organization name must be at least 2 characters long."
            )
        return cleaned

    def validate_password(self, value: str) -> str:
        email = self.initial_data.get("email", "")
        candidate_user = User(email=email.strip().lower() if isinstance(email, str) else "")
        try:
            validate_password(value, user=candidate_user)
        except DjangoValidationError as exc:
            raise serializers.ValidationError(list(exc.messages))
        return value

    def create(self, validated_data: dict) -> User:
        with transaction.atomic():
            organization = Organization.objects.create(
                name=validated_data["organization_name"],
            )
            user = User.objects.create_user(
                email=validated_data["email"],
                password=validated_data["password"],
                organization=organization,
            )
        return user


class LoginSerializer(serializers.Serializer):
    email = serializers.EmailField(max_length=255)
    password = serializers.CharField(
        write_only=True,
        trim_whitespace=False,
        style={"input_type": "password"},
    )

    def validate_email(self, value: str) -> str:
        return value.strip().lower()
