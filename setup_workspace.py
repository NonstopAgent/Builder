from pathlib import Path

HERE = Path(__file__).resolve().parent
REPO_ROOT = HERE
WORKSPACE_DIR = REPO_ROOT / "workspace"


def main() -> None:
    print(f"Creating workspace at: {WORKSPACE_DIR}")
    WORKSPACE_DIR.mkdir(parents=True, exist_ok=True)

    # Example subdirectories
    examples_dir = WORKSPACE_DIR / "examples"
    examples_dir.mkdir(parents=True, exist_ok=True)

    # Example README
    readme_path = WORKSPACE_DIR / "README.md"
    if not readme_path.exists():
        readme_path.write_text(
            "# Super Builder Workspace\n\n"
            "This directory is where the AI agent reads and writes files.\n\n"
            "- The backend enforces that all file operations stay inside this folder.\n"
            "- The frontend workspace explorer is rooted here.\n"
            "- The agent can safely generate new code, scripts, and notes here.\n",
            encoding="utf-8",
        )
        print(f"Created {readme_path}")

    # Example Python script
    example_py = examples_dir / "hello_world.py"
    if not example_py.exists():
        example_py.write_text(
            '"""Example script generated during workspace setup.\n'
            'You can run this with:  python workspace/examples/hello_world.py\n'
            '"""\n\n'
            'def main() -> None:\n'
            '    print("Hello from the Super Builder workspace!")\n\n'
            'if __name__ == "__main__":\n'
            '    main()\n',
            encoding="utf-8",
        )
        print(f"Created {example_py}")

    print("Workspace setup complete.")


if __name__ == "__main__":
    main()
