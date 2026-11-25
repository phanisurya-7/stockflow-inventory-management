"""Custom permissions enforcing organization membership."""

from rest_framework.permissions import BasePermission


class HasOrganization(BasePermission):
    """Allow access only to authenticated users attached to an Organization."""

    message = "Authenticated user must belong to an organization."

    def has_permission(self, request, view) -> bool:
        return bool(
            request.user
            and request.user.is_authenticated
            and request.user.organization_id is not None
        )
