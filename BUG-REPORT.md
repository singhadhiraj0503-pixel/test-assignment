# Bug Report — Task Manager API

## Overview

As part of the Task Manager API assessment, I reviewed the existing Express API, wrote unit and integration tests, identified behavioral issues, fixed the selected bugs, and implemented the requested task assignment feature.

The main areas reviewed were:

- Task service/business logic
- API route behavior
- Request validation
- Pagination
- Status filtering
- Task completion
- Error handling
- Task assignment

---

## 1. Bug — Pagination Starts From the Wrong Position

### Location

`src/services/taskService.js`

### Affected functionality

```http
GET /tasks?page=1&limit=10
```

### Expected behavior

Pagination should use a one-based page number.

For example, if there are five tasks:

```text
Task 1
Task 2
Task 3
Task 4
Task 5
```

and the request is:

```http
GET /tasks?page=1&limit=2
```

the API should return:

```text
Task 1
Task 2
```

Page 2 should return:

```text
Task 3
Task 4
```

### Actual behavior

The original implementation calculated the pagination offset as:

```js
const offset = page * limit;
```

For:

```text
page = 1
limit = 2
```

the calculated offset was:

```text
1 × 2 = 2
```

Since JavaScript arrays use zero-based indexes, the API skipped the first two tasks.

### How it was discovered

A unit/integration test was added to verify that page 1 returns the first set of tasks.

The test used:

```text
page = 1
limit = 2
```

and expected the first two tasks. The original implementation returned the next set of tasks instead.

### Root cause

The page number was treated as a zero-based index instead of converting the one-based page number into an array offset.

### Fix

Changed:

```js
const offset = page * limit;
```

to:

```js
const offset = (page - 1) * limit;
```

### Result

Pagination now behaves correctly:

```text
Page 1 → Task 1, Task 2
Page 2 → Task 3, Task 4
Page 3 → Task 5
```

---

## 2. Bug — Status Filtering Uses Partial Matching

### Location

`src/services/taskService.js`

### Affected functionality

```http
GET /tasks?status=<status>
```

### Expected behavior

The status filter should return tasks whose status exactly matches the requested status.

The supported statuses are:

```text
todo
in_progress
done
```

For example:

```http
GET /tasks?status=todo
```

should return only tasks where:

```text
status === "todo"
```

### Actual behavior

The original implementation used:

```js
tasks.filter((t) => t.status.includes(status));
```

This performs a partial string match.

For example:

```js
"in_progress".includes("in")
```

returns:

```text
true
```

Therefore, a request such as:

```http
GET /tasks?status=in
```

could incorrectly match an `in_progress` task even though `in` is not a valid task status.

### How it was discovered

A unit test was added to verify that status filtering only returns exact status matches.

The test created an `in_progress` task and searched for `in`. The original implementation incorrectly returned the task.

### Root cause

The filtering logic used `.includes()` instead of an exact comparison.

### Fix

Changed:

```js
const getByStatus = (status) =>
  tasks.filter((t) => t.status.includes(status));
```

to:

```js
const getByStatus = (status) =>
  tasks.filter((t) => t.status === status);
```

### Result

Status filtering now uses exact matching:

```text
todo         → matches todo
in_progress  → matches in_progress
done         → matches done
in            → no match
```

---

## 3. Bug — Completing a Task Changes Its Priority

### Location

`src/services/taskService.js`

### Affected functionality

```http
PATCH /tasks/:id/complete
```

### Expected behavior

Completing a task should:

- Change the status to `done`
- Set `completedAt`
- Preserve the task's existing priority

For example, a high-priority task should remain high priority after completion.

### Actual behavior

The original `completeTask()` implementation contained:

```js
priority: 'medium',
```

inside the updated task object.

As a result, completing a high-priority task changed:

```text
high → medium
```

even though completing a task should not modify its priority.

### How it was discovered

A unit test created a task with:

```text
priority = high
```

and then completed the task.

The test verified that the priority should remain `high`. The original implementation changed it to `medium`.

### Root cause

The completion operation explicitly overwrote the existing priority.

### Fix

Removed:

```js
priority: 'medium',
```

from the completion update.

The completion operation now updates only the relevant fields:

```js
const updated = {
  ...task,
  status: 'done',
  completedAt: new Date().toISOString(),
};
```

### Result

Completing a task now preserves its existing priority.

---

## 4. Feature Added — Assign a Task to a User

### Endpoint

```http
PATCH /tasks/:id/assign
```

### Request body

```json
{
  "assignee": "John"
}
```

### Requirement

The endpoint should:

- Accept an assignee name
- Store the assignee on the task
- Return the updated task
- Return `404` if the task does not exist
- Validate the assignee
- Handle empty assignee values
- Define behavior for already assigned tasks

### Implementation

A new `assignTask()` function was added to:

```text
src/services/taskService.js
```

The function:

1. Finds the task by ID
2. Returns `null` if the task does not exist
3. Adds or updates the `assignee`
4. Stores the updated task
5. Returns the updated task

---

## 5. Feature Validation — Assignee

A new `validateAssignTask()` function was added to:

```text
src/utils/validators.js
```

The validation requires `assignee` to be a non-empty string.

Invalid examples include:

```json
{}
```

```json
{
  "assignee": ""
}
```

```json
{
  "assignee": "   "
}
```

```json
{
  "assignee": 123
}
```

These requests return:

```text
400 Bad Request
```

with an appropriate validation error.

---

## 6. Feature Behavior — Nonexistent Task

When an assignment is attempted for a task that does not exist:

```http
PATCH /tasks/does-not-exist/assign
```

with:

```json
{
  "assignee": "John"
}
```

the API returns:

```text
404 Not Found
```

with:

```json
{
  "error": "Task not found"
}
```

This follows the same error-handling pattern used by the existing update, delete, and complete endpoints.

---

## 7. Feature Design Decision — Reassignment

The implementation allows a task to be reassigned.

For example:

### Initial assignment

```json
{
  "assignee": "John"
}
```

### Reassignment

```json
{
  "assignee": "David"
}
```

The final value becomes:

```json
{
  "assignee": "David"
}
```

### Reasoning

The assignment does not require an existing assignment to be immutable.

The `/assign` endpoint represents assigning a task to a user, so allowing an existing assignment to be replaced provides a straightforward reassignment behavior.

This behavior is covered by an automated test.

---

## 8. Whitespace Handling for Assignee

The API trims whitespace from the assignee before storing it.

For example:

```json
{
  "assignee": "  John  "
}
```

is stored as:

```json
{
  "assignee": "John"
}
```

This prevents unnecessary leading and trailing whitespace from being stored in the task data.

---

## 9. Tests Added

Two test files were added:

```text
tests/taskService.test.js
tests/tasks.routes.test.js
```

### Unit tests

The service tests cover:

- Task creation
- Default task values
- Custom task values
- Retrieving all tasks
- Finding tasks by ID
- Missing task IDs
- Status filtering
- Exact status matching
- Pagination
- Updating tasks
- Removing tasks
- Completing tasks
- Preserving priority during completion
- Task statistics
- Overdue tasks
- Task assignment
- Reassignment
- Missing task assignment

### Integration tests

The route tests cover:

```text
GET    /tasks
GET    /tasks?status=...
GET    /tasks?page=...&limit=...
POST   /tasks
PUT    /tasks/:id
DELETE /tasks/:id
PATCH  /tasks/:id/complete
GET    /tasks/stats
PATCH  /tasks/:id/assign
```

They also cover relevant error cases including:

- Missing title
- Empty title
- Invalid priority
- Invalid status
- Invalid update data
- Nonexistent task IDs
- Missing assignee
- Empty assignee
- Non-string assignee
- Reassignment

---

## 10. Summary of Changes

| Area | Change |
|---|---|
| Pagination | Fixed incorrect page offset calculation |
| Status filtering | Changed partial matching to exact matching |
| Task completion | Preserved existing task priority |
| Task assignment | Added `PATCH /tasks/:id/assign` |
| Assignment validation | Added validation for non-empty string assignee |
| Reassignment | Existing assignments can be replaced |
| Whitespace | Assignee names are trimmed |
| Unit testing | Added service-level tests |
| Integration testing | Added API route tests |
| Error handling | Added tests for invalid input and missing tasks |
| Coverage | Configured tests to measure source coverage |

---

## 11. Files Modified

### Existing files modified

```text
src/routes/tasks.js
src/services/taskService.js
src/utils/validators.js
```

### New files added

```text
tests/taskService.test.js
tests/tasks.routes.test.js
BUG-REPORT.md
```

### Existing files that did not require modification

```text
src/app.js
jest.config.js
package.json
```

---

## 12. Verification

The project can be verified using:

```bash
npm test
```

and:

```bash
npm run coverage
```

The verification should confirm that:

1. Existing API behavior is covered by tests.
2. The identified bugs are covered by regression tests.
3. The selected fixes pass their tests.
4. The new assignment feature passes its tests.
5. Code coverage meets the assignment target of 80% or higher.

---

## 13. Future Testing Considerations

If more time were available, additional tests could cover:

- Invalid pagination values such as negative page/limit values
- Non-numeric pagination parameters
- Very large pagination limits
- Unknown query parameters
- Unexpected fields in task updates
- Invalid date formats and date edge cases
- Behavior after completing an already completed task
- Behavior when assigning an already completed task
- More comprehensive statistics and overdue-date scenarios

These were not implemented because the assignment asks to avoid unnecessary changes beyond the requested scope.
