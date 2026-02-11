"""
GitLab Tools - Functions that the agent can call to interact with GitLab
"""

import httpx
from typing import Optional
from models import GitLabConfig
from encryption import decrypt_token


# Store the current config globally (will be set before agent creation)
_current_gitlab_config: Optional[GitLabConfig] = None


def set_gitlab_config(config: GitLabConfig):
    """Set the GitLab configuration to use for all tool calls"""
    global _current_gitlab_config
    _current_gitlab_config = config


async def list_merge_requests(state: str = "opened") -> str:
    """
    Get a list of merge requests from the GitLab project.

    Args:
        state: The state of merge requests to fetch. Options: "opened", "closed", "merged", "all"

    Returns:
        A formatted markdown list of merge requests with details
    """
    if not _current_gitlab_config:
        return "❌ No GitLab configuration selected"

    if not _current_gitlab_config.project_id:
        return "❌ No project ID configured. Please set a project ID in your GitLab configuration."

    try:
        # Decrypt token
        token = decrypt_token(_current_gitlab_config.access_token_encrypted)

        # Call GitLab API
        url = f"{_current_gitlab_config.gitlab_url}/api/v4/projects/{_current_gitlab_config.project_id}/merge_requests"
        headers = {"PRIVATE-TOKEN": token}
        params = {"state": state}

        async with httpx.AsyncClient() as client:
            response = await client.get(url, headers=headers, params=params, timeout=10.0)
            response.raise_for_status()

            merge_requests = response.json()

            if not merge_requests:
                return f"No {state} merge requests found in project {_current_gitlab_config.project_id}."

            # Format MR list
            mr_list = []
            for mr in merge_requests[:10]:  # Limit to 10 MRs
                # Get labels
                labels = ", ".join([f"`{label}`" for label in mr.get('labels', [])]) if mr.get('labels') else "None"

                # Get approvals info
                upvotes = mr.get('upvotes', 0)
                downvotes = mr.get('downvotes', 0)
                approvals = f"👍 {upvotes}" if upvotes > 0 else ""
                if downvotes > 0:
                    approvals += f" 👎 {downvotes}"

                # Format dates
                created = mr['created_at'].split('T')[0]
                updated = mr['updated_at'].split('T')[0]

                mr_list.append(
                    f"### MR !{mr['iid']}: {mr['title']}\n\n"
                    f"- **Author:** {mr['author']['name']} (@{mr['author']['username']})\n"
                    f"- **Status:** `{mr['state']}` {approvals}\n"
                    f"- **Branch:** `{mr['source_branch']}` → `{mr['target_branch']}`\n"
                    f"- **Labels:** {labels}\n"
                    f"- **Created:** {created} | **Updated:** {updated}\n"
                    f"- **URL:** {mr['web_url']}"
                )

            result = f"# 📋 Merge Requests in Project {_current_gitlab_config.project_id}\n\n"
            result += f"**Filter:** {state} | **Total:** {len(merge_requests)}\n\n"
            result += "---\n\n"
            result += "\n\n".join(mr_list)

            if len(merge_requests) > 10:
                result += f"\n\n---\n\n*... and {len(merge_requests) - 10} more merge requests*"

            return result

    except httpx.HTTPStatusError as e:
        return f"❌ GitLab API Error: {e.response.status_code} - {e.response.text}"
    except Exception as e:
        return f"❌ Error fetching merge requests: {str(e)}"


async def get_merge_request_details(mr_number: int) -> str:
    """
    Get detailed information about a specific merge request including code changes.

    Args:
        mr_number: The merge request number (IID), e.g., 1312

    Returns:
        Detailed merge request information with code diff
    """
    if not _current_gitlab_config:
        return "❌ No GitLab configuration selected"

    if not _current_gitlab_config.project_id:
        return "❌ No project ID configured. Please set a project ID in your GitLab configuration."

    try:
        # Decrypt token
        token = decrypt_token(_current_gitlab_config.access_token_encrypted)
        headers = {"PRIVATE-TOKEN": token}

        async with httpx.AsyncClient() as client:
            # Get MR details
            mr_url = f"{_current_gitlab_config.gitlab_url}/api/v4/projects/{_current_gitlab_config.project_id}/merge_requests/{mr_number}"
            mr_response = await client.get(mr_url, headers=headers, timeout=10.0)
            mr_response.raise_for_status()
            mr_data = mr_response.json()

            # Get MR changes (diff)
            changes_url = f"{mr_url}/changes"
            changes_response = await client.get(changes_url, headers=headers, timeout=10.0)
            changes_response.raise_for_status()
            changes_data = changes_response.json()

            # Format response
            result = f"""
**Merge Request !{mr_data['iid']}: {mr_data['title']}**

**Author:** {mr_data['author']['name']} (@{mr_data['author']['username']})
**Status:** {mr_data['state']}
**Created:** {mr_data['created_at']}
**Updated:** {mr_data['updated_at']}
**Source Branch:** {mr_data['source_branch']}
**Target Branch:** {mr_data['target_branch']}

**Description:**
{mr_data.get('description', 'No description provided')}

**Changes:**
"""

            # Add file changes
            changes = changes_data.get('changes', [])
            if changes:
                result += f"\n{len(changes)} file(s) changed:\n\n"
                for change in changes[:5]:  # Show first 5 files
                    result += f"- **{change['new_path']}**\n"
                    if change.get('diff'):
                        # Show first few lines of diff
                        diff_lines = change['diff'].split('\n')[:10]
                        result += f"```diff\n{chr(10).join(diff_lines)}\n```\n\n"

                if len(changes) > 5:
                    result += f"... and {len(changes) - 5} more files\n"
            else:
                result += "No changes found.\n"

            result += f"\n**URL:** {mr_data['web_url']}"

            return result

    except httpx.HTTPStatusError as e:
        return f"❌ GitLab API Error: {e.response.status_code} - {e.response.text}"
    except Exception as e:
        return f"❌ Error fetching merge request details: {str(e)}"
