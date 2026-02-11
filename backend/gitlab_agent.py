"""
GitLab Agent - Agno agent for GitLab operations with config selection
"""

from typing import List, Optional, Dict, Any
from agno.agent import Agent
from agno.models.ollama import Ollama
import os

from models import GitLabConfig
from gitlab_tools import list_merge_requests, get_merge_request_details, set_gitlab_config


class GitLabAgent:
    """
    GitLab Agent for handling GitLab operations with interactive config selection

    This agent:
    1. Lists available GitLab configurations for a user
    2. Asks the user to select a configuration
    3. Executes GitLab operations (show MR, review MR) using the selected config
    """

    def __init__(self, user_id: str, gitlab_configs: List[GitLabConfig]):
        """
        Initialize GitLab Agent

        Args:
            user_id: Current user ID
            gitlab_configs: List of user's GitLab configurations
        """
        self.user_id = user_id
        self.gitlab_configs = gitlab_configs
        self.selected_config: Optional[GitLabConfig] = None

        # Initialize Ollama model
        model_name = os.getenv("OLLAMA_MODEL", "llama3.2")
        base_url = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
        ollama_model = Ollama(id=model_name, host=base_url)

        # Instructions for the agent
        instructions = f"""You are a helpful GitLab assistant. You can help users with their merge requests.

You have access to these tools:
- list_merge_requests: Get a list of merge requests (specify state: opened, closed, merged, or all)
- get_merge_request_details: Get full details about a specific merge request by number

When users ask about merge requests, use these tools to help them.

Examples:
- "show me merge requests" → call list_merge_requests with state="opened"
- "list all MRs" → call list_merge_requests with state="all"
- "show details of MR 1312" → call get_merge_request_details with mr_number=1312
- "what's in merge request !456" → call get_merge_request_details with mr_number=456

Always be helpful and provide clear, formatted responses based on the tool results."""

        # Create agent with GitLab tools
        self.agent = Agent(
            model=ollama_model,
            tools=[list_merge_requests, get_merge_request_details],
            instructions=instructions,
            markdown=True,
        )

    def list_gitlab_configs(self) -> str:
        """
        List available GitLab configurations for the user

        Returns:
            Formatted list of GitLab configurations
        """
        if not self.gitlab_configs:
            return "No GitLab configurations found. Please add a GitLab configuration in settings first."

        config_list = []
        for idx, config in enumerate(self.gitlab_configs, 1):
            status = "✓ Valid" if config.is_active else "⚠ Invalid"
            name = config.config_name or f"Config {idx}"
            config_list.append(
                f"{idx}. {name}\n"
                f"   URL: {config.gitlab_url}\n"
                f"   Status: {status}\n"
                f"   ID: {config.id}"
            )

        return "\n\n".join(config_list)

    def select_config_by_id(self, config_id: str) -> bool:
        """
        Select a GitLab configuration by ID

        Args:
            config_id: GitLab configuration ID

        Returns:
            True if config found and selected, False otherwise
        """
        for config in self.gitlab_configs:
            if str(config.id) == config_id:
                self.selected_config = config
                return True
        return False

    def process_command(self, command: str) -> str:
        """
        Process a slash command

        Args:
            command: Slash command (e.g., "/show-mr", "/review-mr")

        Returns:
            Agent response
        """
        # Check if we have GitLab configs available
        if not self.gitlab_configs:
            return "❌ **No GitLab Configurations Found**\n\nPlease add a GitLab configuration in the settings (⚙️ icon in top-right) before using GitLab commands."

        # First, ask user to select a GitLab config
        config_list = self.list_gitlab_configs()

        if command.startswith("/show-mr"):
            prompt = f"""You are a helpful GitLab assistant. The user wants to see their merge requests.

Available GitLab Configurations:
{config_list}

Please respond in a friendly, conversational way asking the user to select which GitLab configuration they want to use.

Format your response like this:
- Start with a brief acknowledgment of their request
- Show them the available configurations in a clean format
- Ask them to reply with the configuration ID they want to use
- Be helpful and friendly

Do not use technical jargon. Keep it simple and user-friendly."""

            run_output = self.agent.run(prompt)
            return self._extract_response(run_output)

        elif command.startswith("/review-mr"):
            prompt = f"""You are a helpful GitLab assistant. The user wants to perform an AI-powered code review of a merge request.

Available GitLab Configurations:
{config_list}

Please respond in a friendly, conversational way asking the user to:
1. First, select which GitLab configuration to use
2. Explain that after they select a config, you'll show them available merge requests to review

Format your response like this:
- Start with a brief acknowledgment of their request
- Show them the available configurations in a clean format
- Ask them to reply with the configuration ID they want to use
- Be helpful and friendly

Do not use technical jargon. Keep it simple and user-friendly."""

            run_output = self.agent.run(prompt)
            return self._extract_response(run_output)

        else:
            return f"❌ Unknown command: `{command}`\n\nAvailable commands:\n- `/show-mr` - Show merge requests\n- `/review-mr` - Review a merge request"

    async def process_with_config(self, command: str, config_id: str) -> str:
        """
        Process a command with a specific config ID

        Args:
            command: Slash command
            config_id: Selected GitLab configuration ID

        Returns:
            Command execution result
        """
        # Select the config
        if not self.select_config_by_id(config_id):
            return f"❌ Error: GitLab configuration with ID `{config_id}` not found."

        # Set the config for tools to use
        set_gitlab_config(self.selected_config)

        # Execute the command directly (more reliable than relying on model's function calling)
        if command.startswith("/show-mr"):
            # Directly call the list_merge_requests tool
            result = await list_merge_requests(state="opened")
            return result
        elif command.startswith("/review-mr"):
            # Show merge requests for selection
            result = await list_merge_requests(state="opened")
            return result + "\n\n" + "💡 **Next step:** Reply with the MR number (e.g., `!123` or just `123`) to review it."
        else:
            return f"❌ Unknown command: `{command}`"

    async def handle_query(self, query: str, last_config_id: str = None) -> str:
        """
        Handle natural language queries about GitLab

        Args:
            query: User's natural language query
            last_config_id: Last used GitLab config ID from session

        Returns:
            Response with MR information
        """
        # Auto-select config if only one active or use last config
        if not self.selected_config:
            # Try to use last config from session first
            if last_config_id and self.select_config_by_id(last_config_id):
                pass  # Config selected successfully
            else:
                # Fall back to auto-select if only one active
                active_configs = [c for c in self.gitlab_configs if c.is_active]
                if len(active_configs) == 1:
                    self.selected_config = active_configs[0]
                else:
                    config_list = self.list_gitlab_configs()
                    return f"Please select a GitLab configuration first:\n\n{config_list}\n\nThen use `/show-mr` or `/review-mr` to get started."

        # Set the config for the tools to use
        set_gitlab_config(self.selected_config)

        # Parse query and call appropriate tools directly
        query_lower = query.lower()

        # Check for MR number pattern (e.g., "!123", "MR 123", "merge request 456")
        import re
        mr_number_match = re.search(r'(?:!|mr|merge\s+request)\s*(\d+)', query_lower)

        if mr_number_match:
            # User wants details about a specific MR
            mr_number = int(mr_number_match.group(1))
            result = await get_merge_request_details(mr_number)
            return result

        # Check for list/show MR requests
        if any(keyword in query_lower for keyword in ['list', 'show', 'merge request', 'mr', 'pull request']):
            # Determine state from query
            if 'closed' in query_lower:
                state = 'closed'
            elif 'merged' in query_lower:
                state = 'merged'
            elif 'all' in query_lower:
                state = 'all'
            else:
                state = 'opened'  # Default to opened

            result = await list_merge_requests(state=state)
            return result

        # If no clear pattern, return None (not a GitLab query)
        return None

    def _extract_agent_response(self, run_output) -> str:
        """
        Extract the final text response from agent run output with tool calls.

        This method properly handles Agno RunResponse objects that include tool calls
        and tool results, extracting only the final assistant response.
        """
        # First, check for messages list (most common in Agno)
        if hasattr(run_output, 'messages') and run_output.messages:
            # Iterate through messages in reverse to find the last assistant message
            # that contains actual content (not just tool calls)
            for msg in reversed(run_output.messages):
                # Skip non-assistant messages
                if not hasattr(msg, 'role') or msg.role != 'assistant':
                    continue

                # Check if message has content
                if hasattr(msg, 'content'):
                    content = msg.content

                    # If content is a string, use it
                    if isinstance(content, str) and content.strip():
                        return content

                    # If content is a list, extract text from it
                    if isinstance(content, list):
                        text_parts = []
                        for item in content:
                            # Skip tool use objects
                            if isinstance(item, dict):
                                if item.get('type') == 'text' and 'text' in item:
                                    text_parts.append(item['text'])
                                # Skip tool_use type
                                elif item.get('type') == 'tool_use':
                                    continue
                            elif hasattr(item, 'type'):
                                # Object with type attribute
                                if getattr(item, 'type', None) == 'text' and hasattr(item, 'text'):
                                    text_parts.append(item.text)
                                # Skip tool_use
                                elif getattr(item, 'type', None) == 'tool_use':
                                    continue
                            elif isinstance(item, str):
                                text_parts.append(item)

                        if text_parts:
                            return '\n'.join(text_parts)

        # Fallback: Try content attribute directly
        if hasattr(run_output, 'content'):
            content = run_output.content

            if isinstance(content, str) and content.strip():
                return content

            # If content is a list, extract text
            if isinstance(content, list):
                text_parts = []
                for item in content:
                    if isinstance(item, dict) and item.get('type') == 'text':
                        text_parts.append(item.get('text', ''))
                    elif isinstance(item, str):
                        text_parts.append(item)

                if text_parts:
                    return '\n'.join(text_parts)

        # Try text attribute
        if hasattr(run_output, 'text') and run_output.text:
            return run_output.text

        # Try message attribute
        if hasattr(run_output, 'message'):
            msg = run_output.message
            if hasattr(msg, 'content'):
                return str(msg.content)
            return str(msg)

        # Last resort - convert to string
        return str(run_output)

    def _extract_response(self, run_output) -> str:
        """Extract text response from agent run output (for simple non-tool queries)"""
        # For simple queries without tool calls, use the simpler extraction
        if hasattr(run_output, 'content') and isinstance(run_output.content, str):
            return run_output.content

        # Otherwise, use the comprehensive extraction method
        return self._extract_agent_response(run_output)
