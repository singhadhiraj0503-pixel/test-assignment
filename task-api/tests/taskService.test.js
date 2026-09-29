const taskService = require("../src/services/taskService");

describe("taskService", () => {
  beforeEach(() => {
    taskService._reset();
  });

  describe("create()", () => {
    test("should create a task with default values", () => {
      const task = taskService.create({
        title: "Test task",
      });

      expect(task).toEqual(
        expect.objectContaining({
          title: "Test task",
          description: "",
          status: "todo",
          priority: "medium",
          dueDate: null,
          completedAt: null,
        }),
      );

      expect(task.id).toBeDefined();
      expect(task.createdAt).toBeDefined();
    });

    test("should create a task with provided values", () => {
      const task = taskService.create({
        title: "Important task",
        description: "Test description",
        status: "in_progress",
        priority: "high",
        dueDate: "2030-01-01T00:00:00.000Z",
      });

      expect(task.title).toBe("Important task");
      expect(task.description).toBe("Test description");
      expect(task.status).toBe("in_progress");
      expect(task.priority).toBe("high");
      expect(task.dueDate).toBe("2030-01-01T00:00:00.000Z");
    });
  });

  describe("getAll()", () => {
    test("should return all tasks", () => {
      taskService.create({ title: "Task 1" });
      taskService.create({ title: "Task 2" });

      const tasks = taskService.getAll();

      expect(tasks).toHaveLength(2);
      expect(tasks[0].title).toBe("Task 1");
      expect(tasks[1].title).toBe("Task 2");
    });
  });

  describe("findById()", () => {
    test("should find an existing task", () => {
      const created = taskService.create({
        title: "Find me",
      });

      const task = taskService.findById(created.id);

      expect(task).toBeDefined();
      expect(task.id).toBe(created.id);
    });

    test("should return undefined for a nonexistent task", () => {
      const task = taskService.findById("does-not-exist");

      expect(task).toBeUndefined();
    });
  });

  describe("getByStatus()", () => {
    test("should return only tasks with the requested status", () => {
      taskService.create({
        title: "Todo task",
        status: "todo",
      });

      taskService.create({
        title: "Progress task",
        status: "in_progress",
      });

      taskService.create({
        title: "Done task",
        status: "done",
      });

      const result = taskService.getByStatus("todo");

      expect(result).toHaveLength(1);
      expect(result[0].status).toBe("todo");
    });

    test("should not partially match a status", () => {
      taskService.create({
        title: "Progress task",
        status: "in_progress",
      });

      const result = taskService.getByStatus("in");

      expect(result).toHaveLength(0);
    });
  });

  describe("getPaginated()", () => {
    beforeEach(() => {
      for (let i = 1; i <= 5; i++) {
        taskService.create({
          title: `Task ${i}`,
        });
      }
    });

    test("should return the first page correctly", () => {
      const result = taskService.getPaginated(1, 2);

      expect(result).toHaveLength(2);
      expect(result[0].title).toBe("Task 1");
      expect(result[1].title).toBe("Task 2");
    });

    test("should return the second page correctly", () => {
      const result = taskService.getPaginated(2, 2);

      expect(result).toHaveLength(2);
      expect(result[0].title).toBe("Task 3");
      expect(result[1].title).toBe("Task 4");
    });

    test("should return an empty array beyond the available pages", () => {
      const result = taskService.getPaginated(10, 2);

      expect(result).toEqual([]);
    });
  });

  describe("update()", () => {
    test("should update an existing task", () => {
      const created = taskService.create({
        title: "Original title",
      });

      const updated = taskService.update(created.id, {
        title: "Updated title",
        priority: "high",
      });

      expect(updated.title).toBe("Updated title");
      expect(updated.priority).toBe("high");
      expect(updated.id).toBe(created.id);
    });

    test("should return null for a nonexistent task", () => {
      const result = taskService.update("does-not-exist", {
        title: "Updated",
      });

      expect(result).toBeNull();
    });
  });

  describe("remove()", () => {
    test("should remove an existing task", () => {
      const created = taskService.create({
        title: "Delete me",
      });

      const result = taskService.remove(created.id);

      expect(result).toBe(true);
      expect(taskService.findById(created.id)).toBeUndefined();
    });

    test("should return false for a nonexistent task", () => {
      const result = taskService.remove("does-not-exist");

      expect(result).toBe(false);
    });
  });

  describe("completeTask()", () => {
    test("should mark a task as complete", () => {
      const created = taskService.create({
        title: "Complete me",
        priority: "high",
      });

      const completed = taskService.completeTask(created.id);

      expect(completed.status).toBe("done");
      expect(completed.completedAt).toBeDefined();
    });

    test("should preserve priority when completing a task", () => {
      const created = taskService.create({
        title: "High priority task",
        priority: "high",
      });

      const completed = taskService.completeTask(created.id);

      expect(completed.priority).toBe("high");
    });

    test("should return null for a nonexistent task", () => {
      const result = taskService.completeTask("does-not-exist");

      expect(result).toBeNull();
    });
  });

  describe("getStats()", () => {
    test("should count tasks by status", () => {
      taskService.create({
        title: "Todo",
        status: "todo",
      });

      taskService.create({
        title: "Progress",
        status: "in_progress",
      });

      taskService.create({
        title: "Done",
        status: "done",
      });

      const stats = taskService.getStats();

      expect(stats.todo).toBe(1);
      expect(stats.in_progress).toBe(1);
      expect(stats.done).toBe(1);
      expect(stats.overdue).toBe(0);
    });

    test("should count overdue unfinished tasks", () => {
      taskService.create({
        title: "Overdue",
        status: "todo",
        dueDate: "2020-01-01T00:00:00.000Z",
      });

      const stats = taskService.getStats();

      expect(stats.overdue).toBe(1);
    });

    test("should not count completed overdue tasks as overdue", () => {
      const task = taskService.create({
        title: "Completed overdue",
        status: "done",
        dueDate: "2020-01-01T00:00:00.000Z",
      });

      const stats = taskService.getStats();

      expect(task.status).toBe("done");
      expect(stats.overdue).toBe(0);
    });
  });

  describe("assignTask()", () => {
    test("should assign a task to a user", () => {
      const created = taskService.create({
        title: "Assign me",
      });

      const updated = taskService.assignTask(created.id, "John");

      expect(updated.assignee).toBe("John");
      expect(updated.id).toBe(created.id);
    });

    test("should allow reassignment", () => {
      const created = taskService.create({
        title: "Reassign me",
      });

      taskService.assignTask(created.id, "John");

      const updated = taskService.assignTask(created.id, "David");

      expect(updated.assignee).toBe("David");
    });

    test("should return null for a nonexistent task", () => {
      const result = taskService.assignTask("does-not-exist", "John");

      expect(result).toBeNull();
    });
  });
});
