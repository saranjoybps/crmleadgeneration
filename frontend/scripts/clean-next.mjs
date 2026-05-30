import fs from "node:fs";

const target = ".next";

try {
  fs.rmSync(target, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 });
} catch (error) {
  if (error && typeof error === "object" && "code" in error && (error.code === "EPERM" || error.code === "EBUSY")) {
    console.warn(`Skipping ${target} cleanup because it is locked by another process.`);
    process.exit(0);
  }

  throw error;
}
