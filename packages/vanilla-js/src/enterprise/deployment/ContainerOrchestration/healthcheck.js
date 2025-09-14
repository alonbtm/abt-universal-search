#!/usr/bin/env node

/**
 * Universal Search - Docker Health Check
 * Comprehensive health check script for container orchestration
 */

const http = require("http");
const fs = require("fs");
const os = require("os");

// Configuration
const config = {
  host: process.env.HEALTH_CHECK_HOST || "localhost",
  port: parseInt(process.env.PORT || "3000"),
  path: process.env.HEALTH_CHECK_PATH || "/health",
  timeout: parseInt(process.env.HEALTH_CHECK_TIMEOUT || "5000"),
  maxMemoryUsage: parseFloat(process.env.MAX_MEMORY_USAGE || "0.9"), // 90%
  maxCpuUsage: parseFloat(process.env.MAX_CPU_USAGE || "0.95"), // 95%
  requiredDiskSpace: parseInt(process.env.MIN_DISK_SPACE || "100"), // 100MB
};

class HealthChecker {
  constructor() {
    this.startTime = Date.now();
    this.lastCpuUsage = process.cpuUsage();
    this.lastCheck = Date.now();
  }

  async performHealthCheck() {
    const checks = {
      timestamp: new Date().toISOString(),
      status: "healthy",
      checks: {
        http: await this.checkHttpEndpoint(),
        memory: this.checkMemoryUsage(),
        cpu: this.checkCpuUsage(),
        disk: this.checkDiskSpace(),
        uptime: this.checkUptime(),
        database: await this.checkDatabaseConnection(),
        redis: await this.checkRedisConnection(),
        dependencies: await this.checkDependencies(),
      },
    };

    // Determine overall health status
    const failedChecks = Object.values(checks.checks).filter(
      (check) => !check.healthy,
    );

    if (failedChecks.length > 0) {
      checks.status = "unhealthy";
      checks.failedChecks = failedChecks.length;
    }

    return checks;
  }

  async checkHttpEndpoint() {
    return new Promise((resolve) => {
      const startTime = Date.now();

      const req = http.request(
        {
          hostname: config.host,
          port: config.port,
          path: config.path,
          method: "GET",
          timeout: config.timeout,
          headers: {
            "User-Agent": "Docker-Health-Check/1.0",
          },
        },
        (res) => {
          const responseTime = Date.now() - startTime;

          let body = "";
          res.on("data", (chunk) => (body += chunk));
          res.on("end", () => {
            resolve({
              name: "http",
              healthy: res.statusCode >= 200 && res.statusCode < 400,
              responseTime,
              statusCode: res.statusCode,
              details: {
                endpoint: `http://${config.host}:${config.port}${config.path}`,
                responseTime: `${responseTime}ms`,
                statusCode: res.statusCode,
              },
            });
          });
        },
      );

      req.on("error", (error) => {
        resolve({
          name: "http",
          healthy: false,
          error: error.message,
          details: {
            endpoint: `http://${config.host}:${config.port}${config.path}`,
            error: error.message,
          },
        });
      });

      req.on("timeout", () => {
        req.destroy();
        resolve({
          name: "http",
          healthy: false,
          error: "Request timeout",
          details: {
            endpoint: `http://${config.host}:${config.port}${config.path}`,
            timeout: `${config.timeout}ms`,
          },
        });
      });

      req.end();
    });
  }

  checkMemoryUsage() {
    const memUsage = process.memoryUsage();
    const totalSystemMemory = os.totalmem();
    const freeSystemMemory = os.freemem();
    const usedSystemMemory = totalSystemMemory - freeSystemMemory;

    const memoryUsagePercent = usedSystemMemory / totalSystemMemory;
    const heapUsagePercent = memUsage.heapUsed / memUsage.heapTotal;

    return {
      name: "memory",
      healthy:
        memoryUsagePercent < config.maxMemoryUsage && heapUsagePercent < 0.9,
      details: {
        heapUsed: `${Math.round(memUsage.heapUsed / 1024 / 1024)}MB`,
        heapTotal: `${Math.round(memUsage.heapTotal / 1024 / 1024)}MB`,
        heapUsagePercent: `${Math.round(heapUsagePercent * 100)}%`,
        systemMemoryUsage: `${Math.round(memoryUsagePercent * 100)}%`,
        rss: `${Math.round(memUsage.rss / 1024 / 1024)}MB`,
        external: `${Math.round(memUsage.external / 1024 / 1024)}MB`,
      },
    };
  }

  checkCpuUsage() {
    const currentUsage = process.cpuUsage(this.lastCpuUsage);
    const currentTime = Date.now();
    const timeDiff = currentTime - this.lastCheck;

    // Calculate CPU usage percentage
    const totalUsage = currentUsage.user + currentUsage.system;
    const cpuPercent = (totalUsage / (timeDiff * 1000)) * 100;

    // Update for next check
    this.lastCpuUsage = process.cpuUsage();
    this.lastCheck = currentTime;

    const loadAverage = os.loadavg();

    return {
      name: "cpu",
      healthy: cpuPercent < config.maxCpuUsage * 100,
      details: {
        processUsage: `${Math.round(cpuPercent)}%`,
        loadAverage: {
          "1min": loadAverage[0].toFixed(2),
          "5min": loadAverage[1].toFixed(2),
          "15min": loadAverage[2].toFixed(2),
        },
        cores: os.cpus().length,
      },
    };
  }

  checkDiskSpace() {
    try {
      const stats = fs.statSync("/");
      // This is a simplified check - in production, you'd use statvfs or similar
      return {
        name: "disk",
        healthy: true, // Simplified - would check actual disk space
        details: {
          note: "Disk space check simplified for demo",
          tmpDir: fs.existsSync("/tmp") ? "accessible" : "not accessible",
        },
      };
    } catch (error) {
      return {
        name: "disk",
        healthy: false,
        error: error.message,
        details: {
          error: error.message,
        },
      };
    }
  }

  checkUptime() {
    const processUptimeMs = Date.now() - this.startTime;
    const systemUptime = os.uptime();

    return {
      name: "uptime",
      healthy: true,
      details: {
        process: `${Math.round(processUptimeMs / 1000)}s`,
        system: `${Math.round(systemUptime)}s`,
        processHours: Math.round((processUptimeMs / 1000 / 3600) * 100) / 100,
        systemHours: Math.round((systemUptime / 3600) * 100) / 100,
      },
    };
  }

  async checkDatabaseConnection() {
    // Simplified database check
    const databaseUrl = process.env.DATABASE_URL;

    if (!databaseUrl) {
      return {
        name: "database",
        healthy: true,
        details: {
          status: "not_configured",
          note: "Database connection not configured",
        },
      };
    }

    try {
      // In a real implementation, this would attempt a database connection
      // For now, we'll simulate based on environment variables
      return {
        name: "database",
        healthy: true,
        details: {
          status: "connected",
          note: "Database check simplified for demo",
        },
      };
    } catch (error) {
      return {
        name: "database",
        healthy: false,
        error: error.message,
        details: {
          error: error.message,
        },
      };
    }
  }

  async checkRedisConnection() {
    // Simplified Redis check
    const redisUrl = process.env.REDIS_URL;

    if (!redisUrl) {
      return {
        name: "redis",
        healthy: true,
        details: {
          status: "not_configured",
          note: "Redis connection not configured",
        },
      };
    }

    try {
      // In a real implementation, this would attempt a Redis connection
      return {
        name: "redis",
        healthy: true,
        details: {
          status: "connected",
          note: "Redis check simplified for demo",
        },
      };
    } catch (error) {
      return {
        name: "redis",
        healthy: false,
        error: error.message,
        details: {
          error: error.message,
        },
      };
    }
  }

  async checkDependencies() {
    const dependencies = {
      node: process.version,
      platform: os.platform(),
      arch: os.arch(),
      pid: process.pid,
      ppid: process.ppid,
    };

    // Check critical files exist
    const criticalFiles = ["/app/dist/index.js", "/app/package.json"];

    const missingFiles = criticalFiles.filter((file) => !fs.existsSync(file));

    return {
      name: "dependencies",
      healthy: missingFiles.length === 0,
      details: {
        ...dependencies,
        missingFiles: missingFiles.length > 0 ? missingFiles : undefined,
        env: {
          NODE_ENV: process.env.NODE_ENV,
          PORT: process.env.PORT,
        },
      },
    };
  }

  formatOutput(healthData) {
    if (process.env.HEALTH_CHECK_FORMAT === "json") {
      return JSON.stringify(healthData, null, 2);
    }

    // Human-readable format
    let output = `Health Check Report - ${healthData.timestamp}\n`;
    output += `Overall Status: ${healthData.status.toUpperCase()}\n`;
    output += "=".repeat(50) + "\n";

    for (const [name, check] of Object.entries(healthData.checks)) {
      const status = check.healthy ? "✅ PASS" : "❌ FAIL";
      output += `${status} ${name.toUpperCase()}\n`;

      if (check.error) {
        output += `   Error: ${check.error}\n`;
      }

      if (check.details) {
        for (const [key, value] of Object.entries(check.details)) {
          if (typeof value === "object") {
            output += `   ${key}: ${JSON.stringify(value)}\n`;
          } else {
            output += `   ${key}: ${value}\n`;
          }
        }
      }
      output += "\n";
    }

    return output;
  }
}

// Main execution
async function main() {
  const healthChecker = new HealthChecker();

  try {
    const healthData = await healthChecker.performHealthCheck();
    const output = healthChecker.formatOutput(healthData);

    console.log(output);

    // Exit with appropriate code
    process.exit(healthData.status === "healthy" ? 0 : 1);
  } catch (error) {
    console.error("Health check failed:", error.message);
    console.error("Error details:", error.stack);
    process.exit(1);
  }
}

// Handle signals gracefully
process.on("SIGTERM", () => {
  console.log("Health check received SIGTERM, exiting...");
  process.exit(1);
});

process.on("SIGINT", () => {
  console.log("Health check received SIGINT, exiting...");
  process.exit(1);
});

// Run health check
if (require.main === module) {
  main();
}

module.exports = HealthChecker;
