export class AppError extends Error {
  constructor(
    public message: string,
    public statusCode: number = 500,
    public code?: string
  ) {
    super(message);
    this.name = "AppError";
  }
}

export class AuthError extends AppError {
  constructor(message = "Authentication failed", code?: string) {
    super(message, 401, code);
    this.name = "AuthError";
  }
}

export class ForbiddenError extends AppError {
  constructor(message = "Access denied") {
    super(message, 403);
    this.name = "ForbiddenError";
  }
}

export class NotFoundError extends AppError {
  constructor(message = "Resource not found") {
    super(message, 404);
    this.name = "NotFoundError";
  }
}

export class ConflictError extends AppError {
  constructor(message = "Resource already exists", code?: string) {
    super(message, 409, code);
    this.name = "ConflictError";
  }
}

export class ValidationError extends AppError {
  constructor(message = "Validation failed", public issues?: unknown) {
    super(message, 400, "VALIDATION_ERROR");
    this.name = "ValidationError";
  }
}