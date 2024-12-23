import * as oak from "jsr:@oak/oak";

const router = new oak.Router();

// --- Comprehensive Sanitizer Middleware ---
export const sanitizeMiddleware = async (ctx: oak.Context, next: oak.Next) => {
  try {
    // 1. Determine Content-Type: Handle different body types correctly
    const contentType = ctx.request.headers.get("Content-Type");

    let sanitizedBody = {};

    if (contentType && contentType.includes("application/json")) {
      if (!ctx.request.hasBody) {
        return await next();
      }
      // Parse JSON
      const body = await ctx.request.body.json();
      sanitizedBody = JSON.parse(JSON.stringify(body)); // Deep copy for immutability
    } else if (
      contentType &&
      contentType.includes("application/x-www-form-urlencoded")
    ) {
      // Parse Form Data
      const body = await ctx.request.body.formData();
      // Sanitize form data (example - adjust as needed):
      for (const key in body) {
        sanitizedBody[key] = escapeHtml(body[key]); // Example sanitization (see escapeHtml function below)
      }
    }
    // Add more content-type handling as needed (e.g., multipart/form-data)

    ctx.state.sanitizedBody = sanitizedBody; // Store sanitized body for later use

    await next();
  } catch (error) {
    if (error instanceof SyntaxError) {
      // JSON parsing failed
      ctx.response.status = 400;
      ctx.response.body = { message: "Invalid JSON" };
      return;
    }

    // For other errors:
    console.error("Sanitization Middleware Error:", error);
    ctx.response.status = 500;
    ctx.response.body = { message: "Internal Server Error" }; // Generic error message in production
  }
};

// --- Helper function for HTML escaping (basic example) ---
function escapeHtml(unsafe: string) {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export { router };
