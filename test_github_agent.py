import unittest
import sys
from unittest.mock import MagicMock, patch

# Need to make sure backend.tools.github is importable or mocked before claude_agent imports it
sys.modules["backend.tools.github"] = MagicMock()

from backend.agents.claude_agent import ClaudeAgent

class TestGitHubAgent(unittest.TestCase):
    def setUp(self):
        self.agent = ClaudeAgent()
        # Mock Claude call to avoid real API
        self.agent._call_claude = MagicMock(return_value="mock_file_content")

    def test_github_read(self):
        # We need to mock the GitHubTools imported INSIDE the method
        with patch("backend.tools.github.GitHubTools") as MockGitHubTools:
            # Setup mock
            mock_tools = MockGitHubTools.return_value
            mock_tools.read_file.return_value = "file_content"

            step = {
                "description": "Read file README.md from repo owner/repo",
                "logs": []
            }

            result = self.agent._execute_step_with_tools(step, "Test Goal")

            # Verify
            mock_tools.read_file.assert_called_with("owner/repo", "README.md")
            self.assertIn("GitHub Read Result", result["result"])

    def test_github_commit(self):
         with patch("backend.tools.github.GitHubTools") as MockGitHubTools:
            # Setup mock
            mock_tools = MockGitHubTools.return_value
            mock_tools.update_file.return_value = "File updated successfully."

            step = {
                "description": "Update file src/main.py in repo my-org/my-project",
                "logs": []
            }

            result = self.agent._execute_step_with_tools(step, "Test Goal")

            # Verify
            self.agent._call_claude.assert_called() # Should call to generate content
            mock_tools.update_file.assert_called_with(
                "my-org/my-project",
                "src/main.py",
                "mock_file_content",
                "Update src/main.py"
            )
            self.assertEqual(result["result"], "File updated successfully.")

if __name__ == "__main__":
    unittest.main()
