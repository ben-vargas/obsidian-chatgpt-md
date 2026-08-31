interface ErrorLike {
  name?: string;
  message?: string;
  cause?: ErrorLike;
}

export function formatStreamError(error: unknown): string {
  const err = toErrorLike(error);
  let rootCause = err;

  while (rootCause?.cause && isRetryError(rootCause)) {
    rootCause = rootCause.cause;
  }

  let errorMessage = `Error: ${getErrorMessage(rootCause, err, error)}`;

  if (rootCause?.name && rootCause.name !== "Error") {
    errorMessage = `Error (${rootCause.name}): ${errorMessage.replace("Error: ", "")}`;
  }

  if (err?.cause?.message && err.cause !== rootCause) {
    errorMessage += `\n\nDetails: ${err.cause.message}`;
  }

  return errorMessage;
}

export function isRetryError(error: unknown): boolean {
  const err = toErrorLike(error);
  return err?.name === "AI_RetryError" || !!err?.message?.includes("Retry");
}

function getErrorMessage(rootCause: ErrorLike | undefined, err: ErrorLike | undefined, rawError: unknown): string {
  if (rootCause?.message) return rootCause.message;
  if (err?.message) return err.message;
  if (typeof rawError === "string") return rawError;
  return "Unknown error occurred";
}

function toErrorLike(error: unknown): ErrorLike | undefined {
  if (!error || typeof error !== "object") return undefined;
  return error;
}
