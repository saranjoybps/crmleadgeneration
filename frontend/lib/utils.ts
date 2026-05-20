import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const errorMessages: Record<string, string> = {
  "duplicate key value violates unique constraint": "A record with this value already exists.",
  "violates foreign key constraint": "Referenced record not found.",
  "violates not-null constraint": "A required value is missing.",
  "new row violates row-level security policy": "You do not have permission to perform this action.",
  "permission denied": "You do not have permission to perform this action.",
  "permission denied for table": "You do not have permission to perform this action.",
  "could not find a relationship": "Invalid request.",
  "invalid input syntax for type uuid": "Invalid identifier format.",
  "invalid input syntax for type": "Invalid input format.",
  "is not present in table": "Resource not found.",
  "JWT expired": "Your session has expired. Please login again.",
  "Invalid login credentials": "Invalid email or password.",
  "Email not confirmed": "Please confirm your email address before logging in.",
  "User already registered": "An account with this email already exists.",
  "Password should be at least 6 characters": "Password must be at least 6 characters.",
  "unable to create user": "Unable to create user. Please try again.",
};

export function sanitizeError(error: unknown): string {
  if (!error) return "An unexpected error occurred.";
  const message = typeof error === "string" ? error : String(error);
  const lower = message.toLowerCase();
  for (const [key, value] of Object.entries(errorMessages)) {
    if (lower.includes(key)) return value;
  }
  return "An unexpected error occurred. Please try again.";
}
