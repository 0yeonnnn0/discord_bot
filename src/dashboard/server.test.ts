import { describe, it, expect, beforeEach } from "vitest";
import { state } from "../shared/state";

// Test that the server module exports createServer
import { createServer } from "./server";

describe("createServer", () => {
  beforeEach(() => {
    state.config.dashboardSecret = "test-secret-123";
  });

  it("returns an express app", () => {
    const app = createServer();
    expect(app).toBeDefined();
    expect(typeof app.listen).toBe("function");
  });

  it("has /api routes registered", () => {
    const app = createServer();
    // Express stores routes in _router.stack
    const routes = (app as any)._router?.stack || [];
    expect(routes.length).toBeGreaterThan(0);
  });
});
