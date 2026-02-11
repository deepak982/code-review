"""
GitLab credential validation utility
"""
import httpx
import logging
from typing import Optional
from pydantic import BaseModel, HttpUrl, ValidationError

logger = logging.getLogger(__name__)


class GitLabValidationResult(BaseModel):
    """Result of GitLab credential validation"""
    is_valid: bool
    error_message: Optional[str] = None
    error_code: Optional[str] = None  # 'invalid_token', 'network_error', 'invalid_url', 'timeout'
    gitlab_username: Optional[str] = None


async def validate_gitlab_credentials(
    gitlab_url: str,
    access_token: str,
    timeout: int = 10
) -> GitLabValidationResult:
    """
    Validate GitLab credentials by calling the GitLab API /user endpoint.

    Args:
        gitlab_url: Base GitLab URL (e.g., https://gitlab.com)
        access_token: GitLab personal access token
        timeout: Request timeout in seconds

    Returns:
        GitLabValidationResult with validation status and details
    """
    # Normalize URL (remove trailing slash)
    gitlab_url = gitlab_url.rstrip('/')

    # Validate URL format
    try:
        HttpUrl(gitlab_url)  # Pydantic URL validation
    except ValidationError:
        logger.warning(f"Invalid GitLab URL format: {gitlab_url}")
        return GitLabValidationResult(
            is_valid=False,
            error_message="Invalid GitLab URL format",
            error_code="invalid_url"
        )

    # Construct API endpoint
    api_url = f"{gitlab_url}/api/v4/user"

    # Make API request
    async with httpx.AsyncClient(timeout=timeout) as client:
        try:
            response = await client.get(
                api_url,
                headers={"PRIVATE-TOKEN": access_token}
            )

            # Check response status
            if response.status_code == 200:
                data = response.json()
                username = data.get('username', 'unknown')
                logger.info(f"GitLab validation successful for user: {username}")
                return GitLabValidationResult(
                    is_valid=True,
                    gitlab_username=username
                )

            elif response.status_code == 401:
                logger.warning("GitLab validation failed: Invalid token")
                return GitLabValidationResult(
                    is_valid=False,
                    error_message="Invalid access token or token expired",
                    error_code="invalid_token"
                )

            elif response.status_code == 403:
                logger.warning("GitLab validation failed: Insufficient permissions")
                return GitLabValidationResult(
                    is_valid=False,
                    error_message="Token lacks required permissions",
                    error_code="insufficient_permissions"
                )

            elif response.status_code == 404:
                logger.warning(f"GitLab API endpoint not found: {api_url}")
                return GitLabValidationResult(
                    is_valid=False,
                    error_message="GitLab API endpoint not found - check URL",
                    error_code="not_found"
                )

            else:
                logger.error(f"GitLab API returned status {response.status_code}")
                return GitLabValidationResult(
                    is_valid=False,
                    error_message=f"GitLab API error: {response.status_code}",
                    error_code="api_error"
                )

        except httpx.TimeoutException:
            logger.error(f"GitLab validation timeout for URL: {gitlab_url}")
            return GitLabValidationResult(
                is_valid=False,
                error_message="Connection timeout - GitLab instance unreachable",
                error_code="timeout"
            )

        except httpx.NetworkError as e:
            logger.error(f"GitLab validation network error: {e}")
            return GitLabValidationResult(
                is_valid=False,
                error_message="Network error - could not reach GitLab instance",
                error_code="network_error"
            )

        except Exception as e:
            logger.error(f"Unexpected error during GitLab validation: {e}")
            return GitLabValidationResult(
                is_valid=False,
                error_message="Unexpected error during validation",
                error_code="unknown_error"
            )
