import { Context, Next } from "jsr:@oak/oak";

export const timeoutMiddleware = async (ctx: Context, next: Next) => {
  const timeoutMs = 6000;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    await Promise.race([
      next().catch((err) => {
        // Catches rejections from next()
        if (err.name === "AbortError") {
          // Check if aborted
          const timeoutError = new Error("Request timed out"); // Only create timeout error for AbortError
          timeoutError.name = "TimeoutError";
          throw timeoutError; // Throw the timeout error so outer catch handles it
        } else {
          throw err; // Re-throw other errors for global error handler
        }
      }),
    ]).finally(() => clearTimeout(timeoutId)); // Always clear timeout
  } catch (error) {
    if ((error as Error).name === "TimeoutError") {
      ctx.response.status = 504;
      ctx.response.body = { message: (error as Error).message };
    } else {
      console.error("Timeout Middleware caught:", error); // Log for debugging
      throw error; // Re-throw for global error handler
    }
  }
};
