import { ApiError } from "./apiClient";

export function getApiErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    return nestMessageFromPayload(error.payload) ?? error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "Ocorreu um erro inesperado.";
}

function nestMessageFromPayload(payload: unknown): string | null {
  if (payload === null || payload === undefined) {
    return null;
  }

  if (typeof payload === "string") {
    return payload;
  }

  if (typeof payload !== "object") {
    return null;
  }

  const record = payload as Record<string, unknown>;
  const message = record.message;

  if (typeof message === "string") {
    return message;
  }

  if (Array.isArray(message) && message.every((m) => typeof m === "string")) {
    return message.join(" ");
  }

  return null;
}
