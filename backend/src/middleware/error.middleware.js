import { ZodError } from "zod";

export const errorMiddleware = (error, _req, res, _next) => {
  if (error instanceof ZodError) {
    res.status(400).json({
      message: "Validation failed",
      issues: error.issues
    });
    return;
  }

  const statusCode = error.statusCode || 500;

  res.status(statusCode).json({
    message: statusCode === 500 ? "Internal server error" : error.message,
    details: error.details
  });
};
