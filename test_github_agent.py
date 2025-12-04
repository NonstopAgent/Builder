import unittest
import sys
from unittest.mock import MagicMock, patch

# Ensure we start clean
if "backend.tools.github" in sys.modules:
    del sys.modules["backend.tools.github"]

# Create a mock module for backend.tools.github
mock_github_module = MagicMock()
sys.modules["backend.tools.github"] = mock_github_module

# Now import the agent
from backend.agents.claude_agent import ClaudeAgent

class TestGitHubAgent(unittest.TestCase):
    def setUp(self):
        self.agent = ClaudeAgent()
        # Mock Claude call to avoid real API
        self.agent._call_claude = MagicMock(return_value="mock_file_content")

        # Reset the mock module's GitHubTools for each test
        mock_github_module.GitHubTools.reset_mock()

    def test_github_read(self):
        # Configure the mock
        mock_tools_instance = mock_github_module.GitHubTools.return_value
        mock_tools_instance.read_file.return_value = "file_content"

        step = {
            "description": "Read file README.md from github repo owner/repo",
            "logs": []
        }

        result = self.agent._execute_step_with_tools(step, "Test Goal")

        # Verify
        mock_tools_instance.read_file.assert_called_with("owner/repo", "README.md")
        self.assertIn("GitHub Read Result", result["result"])

    def test_github_commit(self):
        # Configure the mock
        mock_tools_instance = mock_github_module.GitHubTools.return_value
        mock_tools_instance.update_file.return_value = "File updated successfully."

        step = {
            "description": "Update file src/main.py in github repo my-org/my-project",
            "logs": []
        }

        result = self.agent._execute_step_with_tools(step, "Test Goal")

        # Verify
        self.agent._call_claude.assert_called() # Should call to generate content
        mock_tools_instance.update_file.assert_called_with(
            "my-org/my-project",
            "src/main.py",
            "mock_file_content",
            "Update src/main.py"
        )
        self.assertEqual(result["result"], "File updated successfully.")

if __name__ == "__main__":
    unittest.main()
