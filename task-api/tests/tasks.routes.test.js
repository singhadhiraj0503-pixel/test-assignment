const request = require("supertest");

const app = require("../src/app");

const taskService = require("../src/services/taskService");

describe("Task API", () => {
  beforeEach(() => {
    taskService._reset();
  });

  describe("GET /tasks", () => {
    test("should return all tasks", async () => {
      taskService.create({
        title: "Task 1",
      });

      taskService.create({
        title: "Task 2",
      });

      const response = await request(app).get("/tasks");

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(2);
    });

    test("should filter tasks by status", async () => {
      taskService.create({
        title: "Todo task",
        status: "todo",
      });

      taskService.create({
        title: "Done task",
        status: "done",
      });

      const response = await request(app)
        .get("/tasks")
        .query({ status: "todo" });

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(1);
      expect(response.body[0].status).toBe("todo");
    });

    test("should paginate tasks correctly", async () => {
      for (let i = 1; i <= 5; i++) {
        taskService.create({
          title: `Task ${i}`,
        });
      }

      const response = await request(app).get("/tasks").query({
        page: 1,
        limit: 2,
      });

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(2);
      expect(response.body[0].title).toBe("Task 1");
      expect(response.body[1].title).toBe("Task 2");
    });
  });

  describe("POST /tasks", () => {
    test("should create a task", async () => {
      const response = await request(app).post("/tasks").send({
        title: "New task",
        priority: "high",
      });

      expect(response.status).toBe(201);

      expect(response.body).toEqual(
        expect.objectContaining({
          title: "New task",
          priority: "high",
          status: "todo",
        }),
      );

      expect(response.body.id).toBeDefined();
    });

    test("should reject a missing title", async () => {
      const response = await request(app).post("/tasks").send({
        priority: "high",
      });

      expect(response.status).toBe(400);

      expect(response.body.error).toBe(
        "title is required and must be a non-empty string",
      );
    });

    test("should reject an empty title", async () => {
      const response = await request(app).post("/tasks").send({
        title: "   ",
      });

      expect(response.status).toBe(400);
    });

    test("should reject an invalid priority", async () => {
      const response = await request(app).post("/tasks").send({
        title: "Test",
        priority: "urgent",
      });

      expect(response.status).toBe(400);
    });

    test("should reject an invalid status", async () => {
      const response = await request(app).post("/tasks").send({
        title: "Test",
        status: "invalid",
      });

      expect(response.status).toBe(400);
    });
  });

  describe("PUT /tasks/:id", () => {
    test("should update an existing task", async () => {
      const created = taskService.create({
        title: "Original",
      });

      const response = await request(app).put(`/tasks/${created.id}`).send({
        title: "Updated",
        priority: "high",
      });

      expect(response.status).toBe(200);
      expect(response.body.title).toBe("Updated");
      expect(response.body.priority).toBe("high");
    });

    test("should return 404 for a nonexistent task", async () => {
      const response = await request(app).put("/tasks/does-not-exist").send({
        title: "Updated",
      });

      expect(response.status).toBe(404);
      expect(response.body.error).toBe("Task not found");
    });

    test("should reject invalid update data", async () => {
      const created = taskService.create({
        title: "Original",
      });

      const response = await request(app).put(`/tasks/${created.id}`).send({
        priority: "urgent",
      });

      expect(response.status).toBe(400);
    });
  });

  describe("DELETE /tasks/:id", () => {
    test("should delete an existing task", async () => {
      const created = taskService.create({
        title: "Delete me",
      });

      const response = await request(app).delete(`/tasks/${created.id}`);

      expect(response.status).toBe(204);

      expect(taskService.findById(created.id)).toBeUndefined();
    });

    test("should return 404 for a nonexistent task", async () => {
      const response = await request(app).delete("/tasks/does-not-exist");

      expect(response.status).toBe(404);
      expect(response.body.error).toBe("Task not found");
    });
  });

  describe("PATCH /tasks/:id/complete", () => {
    test("should complete a task", async () => {
      const created = taskService.create({
        title: "Complete me",
        priority: "high",
      });

      const response = await request(app).patch(
        `/tasks/${created.id}/complete`,
      );

      expect(response.status).toBe(200);
      expect(response.body.status).toBe("done");
      expect(response.body.completedAt).toBeDefined();
      expect(response.body.priority).toBe("high");
    });

    test("should return 404 for a nonexistent task", async () => {
      const response = await request(app).patch(
        "/tasks/does-not-exist/complete",
      );

      expect(response.status).toBe(404);
      expect(response.body.error).toBe("Task not found");
    });
  });

  describe("GET /tasks/stats", () => {
    test("should return task statistics", async () => {
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

      const response = await request(app).get("/tasks/stats");

      expect(response.status).toBe(200);

      expect(response.body).toEqual({
        todo: 1,
        in_progress: 1,
        done: 1,
        overdue: 0,
      });
    });
  });

  describe("PATCH /tasks/:id/assign", () => {
    test("should assign a task to a user", async () => {
      const created = taskService.create({
        title: "Assign me",
      });

      const response = await request(app)
        .patch(`/tasks/${created.id}/assign`)
        .send({
          assignee: "John",
        });

      expect(response.status).toBe(200);
      expect(response.body.assignee).toBe("John");
      expect(response.body.id).toBe(created.id);
    });

    test("should trim whitespace from assignee", async () => {
      const created = taskService.create({
        title: "Assign me",
      });

      const response = await request(app)
        .patch(`/tasks/${created.id}/assign`)
        .send({
          assignee: "  John  ",
        });

      expect(response.status).toBe(200);
      expect(response.body.assignee).toBe("John");
    });

    test("should return 404 for a nonexistent task", async () => {
      const response = await request(app)
        .patch("/tasks/does-not-exist/assign")
        .send({
          assignee: "John",
        });

      expect(response.status).toBe(404);
      expect(response.body.error).toBe("Task not found");
    });

    test("should reject a missing assignee", async () => {
      const created = taskService.create({
        title: "Assign me",
      });

      const response = await request(app)
        .patch(`/tasks/${created.id}/assign`)
        .send({});

      expect(response.status).toBe(400);

      expect(response.body.error).toBe(
        "assignee is required and must be a non-empty string",
      );
    });

    test("should reject an empty assignee", async () => {
      const created = taskService.create({
        title: "Assign me",
      });

      const response = await request(app)
        .patch(`/tasks/${created.id}/assign`)
        .send({
          assignee: "   ",
        });

      expect(response.status).toBe(400);
    });

    test("should reject a non-string assignee", async () => {
      const created = taskService.create({
        title: "Assign me",
      });

      const response = await request(app)
        .patch(`/tasks/${created.id}/assign`)
        .send({
          assignee: 123,
        });

      expect(response.status).toBe(400);
    });

    test("should allow reassignment", async () => {
      const created = taskService.create({
        title: "Reassign me",
      });

      await request(app).patch(`/tasks/${created.id}/assign`).send({
        assignee: "John",
      });

      const response = await request(app)
        .patch(`/tasks/${created.id}/assign`)
        .send({
          assignee: "David",
        });

      expect(response.status).toBe(200);
      expect(response.body.assignee).toBe("David");
    });
  });
});
