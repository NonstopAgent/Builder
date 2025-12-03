import os
import logging
from typing import List, Optional, Dict, Any
from github import Github, GithubException
from github.ContentFile import ContentFile
from github.Repository import Repository

logger = logging.getLogger(__name__)

class GitHubTools:
    """
    Tools for interacting with the GitHub API.
    """
    def __init__(self, token: Optional[str] = None):
        self.token = token or os.getenv("GITHUB_TOKEN")
        if not self.token:
            logger.warning("GITHUB_TOKEN not set. GitHub tools will not function.")
            self.github = None
        else:
            self.github = Github(self.token)

    def _get_repo(self, repo_name: str) -> Optional[Repository]:
        if not self.github:
            return None
        try:
            return self.github.get_repo(repo_name)
        except GithubException as e:
            logger.error(f"Error getting repo {repo_name}: {e}")
            return None

    def read_file(self, repo_name: str, file_path: str, branch: str = "main") -> str:
        """
        Read a file from a GitHub repository.
        """
        repo = self._get_repo(repo_name)
        if not repo:
            return "Error: Repository not found or GitHub token missing."

        try:
            contents = repo.get_contents(file_path, ref=branch)
            if isinstance(contents, list):
                return f"Error: {file_path} is a directory."
            return contents.decoded_content.decode("utf-8")
        except GithubException as e:
            return f"Error reading file: {e}"

    def list_files(self, repo_name: str, path: str = "", branch: str = "main") -> str:
        """
        List files in a GitHub repository directory.
        """
        repo = self._get_repo(repo_name)
        if not repo:
            return "Error: Repository not found or GitHub token missing."

        try:
            contents = repo.get_contents(path, ref=branch)
            files = []
            if isinstance(contents, list):
                for content in contents:
                    files.append(f"{content.type}: {content.path}")
            else:
                files.append(f"{contents.type}: {contents.path}")
            return "\n".join(files)
        except GithubException as e:
            return f"Error listing files: {e}"

    def create_branch(self, repo_name: str, new_branch: str, base_branch: str = "main") -> str:
        """
        Create a new branch in a GitHub repository.
        """
        repo = self._get_repo(repo_name)
        if not repo:
            return "Error: Repository not found."

        try:
            source = repo.get_branch(base_branch)
            repo.create_git_ref(ref=f"refs/heads/{new_branch}", sha=source.commit.sha)
            return f"Branch {new_branch} created successfully from {base_branch}."
        except GithubException as e:
            return f"Error creating branch: {e}"

    def update_file(self, repo_name: str, file_path: str, content: str, commit_message: str, branch: str = "main") -> str:
        """
        Create or update a file in a GitHub repository.
        """
        repo = self._get_repo(repo_name)
        if not repo:
            return "Error: Repository not found."

        try:
            # Check if file exists
            try:
                contents = repo.get_contents(file_path, ref=branch)
                # Update
                if isinstance(contents, list):
                     return f"Error: {file_path} is a directory."
                repo.update_file(contents.path, commit_message, content, contents.sha, branch=branch)
                return f"File {file_path} updated successfully."
            except GithubException:
                # Create
                repo.create_file(file_path, commit_message, content, branch=branch)
                return f"File {file_path} created successfully."
        except GithubException as e:
            return f"Error updating file: {e}"

    def create_pull_request(self, repo_name: str, title: str, body: str, head_branch: str, base_branch: str = "main") -> str:
        """
        Create a pull request.
        """
        repo = self._get_repo(repo_name)
        if not repo:
            return "Error: Repository not found."

        try:
            pr = repo.create_pull(title=title, body=body, head=head_branch, base=base_branch)
            return f"PR created successfully: {pr.html_url}"
        except GithubException as e:
            return f"Error creating PR: {e}"
