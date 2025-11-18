# Example Tasks for Super Builder

Use these to test the system and see how the agent behaves.

---

## 1. Simple Script – Hello World

**Goal**

> Create a Python script that prints "Hello, world!" when run.

**Type**

`build`

**Expected**

- A new file appears in `workspace/` (for example `hello_world.py`).
- Running `python workspace/hello_world.py` prints the message.

---

## 2. Fibonacci Generator

**Goal**

> Create a Python script that generates Fibonacci numbers up to N, where N is provided via command-line argument.

**Type**

`build`

**Expected**

- Script reads `sys.argv[1]` as integer.
- Prints numbers from 0 up to N (inclusive or exclusive – agent decides).
- Handles invalid input gracefully.

---

## 3. JSON to CSV Converter

**Goal**

> Build a CLI tool that reads a JSON file `data.json` in the workspace and writes its content to `output.csv` in CSV format.

**Type**

`build`

**Expected**

- Reads `workspace/data.json`.
- Infers columns from keys.
- Writes `workspace/output.csv`.

---

## 4. Refactor Function

**Goal**

> Refactor the function `main` in `workspace/examples/hello_world.py` to accept a `name` argument and print "Hello, <name>!".

**Type**

`modify`

**Expected**

- The file is updated instead of new file.
- `main(name: str)` implemented.
- Guard (`if __name__ == "__main__":`) updated accordingly.

---

## 5. Documentation Writer

**Goal**

> Generate a Markdown README file in the workspace that documents all existing Python scripts and what they do.

**Type**

`plan` or `build`

**Expected**

- Agent inspects workspace files.
- Creates `workspace/SCRIPTS_README.md` summarizing each script.

---

## 6. Unit Test Generation

**Goal**

> For the Fibonacci script, create a `tests` directory and write unit tests using pytest.

**Type**

`build`

**Expected**

- `workspace/tests/test_fibonacci.py` with a few test cases.
- Tests import functions from the main script.

---

## 7. Web API Plan

**Goal**

> Create a detailed multi-step plan to add a new FastAPI endpoint that returns task statistics: total tasks, completed tasks, and tasks in progress.

**Type**

`plan`

**Expected**

- Agent focuses on planning (not code generation).
- Plan steps should describe changes to `backend/main.py` and `backend/storage.py`.

---

## 8. Log Analyzer

**Goal**

> Build a Python script that reads `tasks.json` and prints a summary of task counts by status.

**Type**

`build`

**Expected**

- Reads `tasks.json` from repo root or workspace copy.
- Outputs something like:

  ```text
  queued: 2
  in_progress: 1
  completed: 3
  ```

---

## 9. Workspace Cleanup Tool

**Goal**

> Create a Python script that deletes all `.tmp` files under the workspace directory, but nothing else.

**Type**

`build`

**Expected**

* Recursively walks `workspace/`.
* Deletes only `*.tmp` files.
* Prints what it removed.

---

## 10. Multi-File Mini Project

**Goal**

> Build a small notes app in the workspace that:
>
> * Stores notes in a JSON file
> * Supports adding, listing, and deleting notes from the command line

**Type**

`build`

**Expected**

* One or more Python modules to manage notes.
* CLI using `argparse` with subcommands: `add`, `list`, `delete`.
* Data stored in `workspace/notes.json`.

---

These are starting points. You can combine them, refine them, or create your own as you iterate.
