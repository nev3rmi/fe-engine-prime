import { GET, HEAD } from "../route";
import { NextResponse } from "next/server";

describe("Health Check API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("GET /api/health", () => {
    it("returns 200 OK status", async () => {
      const response = await GET();
      expect(response.status).toBe(200);
    });

    it("returns healthy status", async () => {
      const response = await GET();
      const data = await response.json();
      expect(data.status).toBe("healthy");
    });

    it("includes required metadata", async () => {
      const response = await GET();
      const data = await response.json();

      expect(data).toHaveProperty("status");
      expect(data).toHaveProperty("timestamp");
      expect(data).toHaveProperty("service");
      expect(data).toHaveProperty("version");
      expect(data).toHaveProperty("environment");
      expect(data).toHaveProperty("uptime");
      expect(data).toHaveProperty("checks");
    });

    it("includes valid timestamp", async () => {
      const response = await GET();
      const data = await response.json();

      const timestamp = new Date(data.timestamp);
      expect(timestamp).toBeInstanceOf(Date);
      expect(timestamp.getTime()).toBeGreaterThan(0);
    });

    it("includes service name", async () => {
      const response = await GET();
      const data = await response.json();

      expect(data.service).toBe("fe-engine-prime");
    });

    it("includes environment", async () => {
      const response = await GET();
      const data = await response.json();

      expect(data.environment).toBeDefined();
      expect(typeof data.environment).toBe("string");
    });

    it("includes uptime", async () => {
      const response = await GET();
      const data = await response.json();

      expect(data.uptime).toBeDefined();
      expect(typeof data.uptime).toBe("number");
      expect(data.uptime).toBeGreaterThanOrEqual(0);
    });

    it("includes checks object", async () => {
      const response = await GET();
      const data = await response.json();

      expect(data.checks).toBeDefined();
      expect(typeof data.checks).toBe("object");
      expect(data.checks.server).toBe("ok");
    });

    it("returns JSON content type", async () => {
      const response = await GET();
      const contentType = response.headers.get("content-type");

      expect(contentType).toContain("application/json");
    });
  });

  describe("HEAD /api/health", () => {
    it("returns 200 OK status", async () => {
      const response = await HEAD();
      expect(response.status).toBe(200);
    });

    it("returns no body", async () => {
      const response = await HEAD();
      const text = await response.text();
      expect(text).toBe("");
    });
  });
});
