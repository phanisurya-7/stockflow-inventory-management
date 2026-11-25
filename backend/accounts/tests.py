"""Automated tests for StockFlow Milestone 2 authentication & organization flows."""

from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from .models import Organization

User = get_user_model()


class AuthAndOrganizationTests(APITestCase):
    def setUp(self):
        self.signup_url = reverse("auth-signup")
        self.login_url = reverse("auth-login")
        self.logout_url = reverse("auth-logout")
        self.me_url = reverse("auth-me")
        self.csrf_url = reverse("auth-csrf")

    def test_signup_creates_user_and_organization_server_side(self):
        other_org = Organization.objects.create(name="Existing Tenant")
        payload = {
            "email": "  Founder@AcmeSupply.com ",
            "password": "StrongInventoryPassword!99",
            "organization_name": "Acme Supply Co.",
            # Client-supplied organization fields must be ignored.
            "organization": other_org.id,
            "organization_id": other_org.id,
        }

        response = self.client.post(self.signup_url, payload, format="json")

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        user_data = response.data["user"]
        self.assertEqual(user_data["email"], "founder@acmesupply.com")
        self.assertEqual(user_data["organization"]["name"], "Acme Supply Co.")
        self.assertNotEqual(user_data["organization"]["id"], other_org.id)
        self.assertNotIn("password", user_data)

        user = User.objects.get(email="founder@acmesupply.com")
        self.assertEqual(user.organization.name, "Acme Supply Co.")
        self.assertNotEqual(user.password, "StrongInventoryPassword!99")
        self.assertTrue(user.check_password("StrongInventoryPassword!99"))
        self.assertEqual(Organization.objects.count(), 2)

        # Signup also establishes an active session.
        me_response = self.client.get(self.me_url)
        self.assertEqual(me_response.status_code, status.HTTP_200_OK)
        self.assertEqual(me_response.data["user"]["email"], "founder@acmesupply.com")

    def test_duplicate_email_registration_is_rejected_case_insensitively(self):
        org = Organization.objects.create(name="Northwind Goods")
        User.objects.create_user(
            email="ops@northwind.io",
            password="StrongInventoryPassword!99",
            organization=org,
        )

        response = self.client.post(
            self.signup_url,
            {
                "email": "OPS@Northwind.io",
                "password": "AnotherStrongPassword!99",
                "organization_name": "Duplicate Org",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("email", response.data)
        self.assertEqual(User.objects.count(), 1)
        self.assertEqual(Organization.objects.count(), 1)

    def test_signup_validation_rejects_weak_password_and_blank_organization(self):
        response = self.client.post(
            self.signup_url,
            {
                "email": "valid@stockflow.dev",
                "password": "short",
                "organization_name": "   ",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("password", response.data)
        self.assertIn("organization_name", response.data)
        self.assertEqual(User.objects.count(), 0)
        self.assertEqual(Organization.objects.count(), 0)

    def test_login_succeeds_with_valid_credentials_and_persists_session(self):
        org = Organization.objects.create(name="Harbor Logistics")
        User.objects.create_user(
            email="maya@harbor.co",
            password="ValidPassword!2026",
            organization=org,
        )

        response = self.client.post(
            self.login_url,
            {"email": "Maya@Harbor.co", "password": "ValidPassword!2026"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["user"]["email"], "maya@harbor.co")
        self.assertEqual(response.data["user"]["organization"]["name"], "Harbor Logistics")
        self.assertNotIn("password", response.data["user"])

        me_response = self.client.get(self.me_url)
        self.assertEqual(me_response.status_code, status.HTTP_200_OK)
        self.assertEqual(me_response.data["user"]["email"], "maya@harbor.co")

    def test_login_rejects_invalid_credentials(self):
        org = Organization.objects.create(name="Harbor Logistics")
        User.objects.create_user(
            email="maya@harbor.co",
            password="ValidPassword!2026",
            organization=org,
        )

        wrong_password = self.client.post(
            self.login_url,
            {"email": "maya@harbor.co", "password": "WrongPassword!"},
            format="json",
        )
        self.assertEqual(wrong_password.status_code, status.HTTP_401_UNAUTHORIZED)

        unknown_email = self.client.post(
            self.login_url,
            {"email": "nobody@harbor.co", "password": "ValidPassword!2026"},
            format="json",
        )
        self.assertEqual(unknown_email.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_logout_and_unauthenticated_me_access(self):
        unauth_me = self.client.get(self.me_url)
        self.assertIn(unauth_me.status_code, (status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN))

        org = Organization.objects.create(name="Cedar Retail")
        User.objects.create_user(
            email="lead@cedar.co",
            password="ValidPassword!2026",
            organization=org,
        )
        self.client.post(
            self.login_url,
            {"email": "lead@cedar.co", "password": "ValidPassword!2026"},
            format="json",
        )

        logout_response = self.client.post(self.logout_url)
        self.assertEqual(logout_response.status_code, status.HTTP_200_OK)

        after_logout_me = self.client.get(self.me_url)
        self.assertIn(
            after_logout_me.status_code,
            (status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN),
        )

    def test_csrf_endpoint_sets_cookie(self):
        response = self.client.get(self.csrf_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("csrftoken", response.cookies)
