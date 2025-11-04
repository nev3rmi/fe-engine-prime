import { NextResponse } from "next/server";

/**
 * Health Check Endpoint
 *
 * Provides application health status for monitoring and deployment validation.
 *
 * FE-500: Health Check Automation
 * - Basic health check endpoint
 * - Returns service status and metadata
 * - Used by CI/CD pipelines for deployment validation
 */

export async function GET() {
  const healthData = {
    status: "healthy",
    timestamp: new Date().toISOString(),
    service: "fe-engine-prime",
    version: process.env.npm_package_version || "unknown",
    environment: process.env.NODE_ENV || "development",
    uptime: process.uptime(),
    checks: {
      server: "ok",
      // Add more checks as needed
    },
  };

  return NextResponse.json(healthData, { status: 200 });
}

/**
 * HEAD request support for quick health checks
 * Returns 200 OK if service is healthy
 */
export async function HEAD() {
  return new NextResponse(null, { status: 200 });
}
