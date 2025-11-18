# Type Consistency Patch – Super Builder

This document describes the expected shapes of Task and Step objects so that
backend models and frontend types stay aligned.

---

## Task

Required fields:

- `id: int`
- `type: str`
- `goal: str`
- `project_id: Optional[str]`
- `status: Literal["queued", "in_progress", "completed", "failed"]`
- `plan: List[Step]`
- `current_step: Optional[int]`
- `logs: List[str]`
- `created_at: str`  (ISO timestamp)
- `updated_at: str`  (ISO timestamp)

## Step

Required fields:

- `description: str`
- `status: Literal["pending", "completed", "failed"]`
- `logs: List[str]`
- `error: Optional[str]`
- `metadata: Dict[str, Any]`
- `created_at: str`
- `updated_at: str`

---

## Frontend / Backend Mapping Notes

- When sending data **from frontend to backend**:
  - Use `projectId` in DTOs if needed, but convert to `project_id` before storing.
- When reading **from backend**:
  - Treat `current_step` as `number | null`.
  - Don’t assume `plan` is non-empty; newly created tasks may have `plan = []`.

Keep this file in the repo root and update it whenever you change models.
