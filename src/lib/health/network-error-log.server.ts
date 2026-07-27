type ErrnoLike = {
  code?: unknown;
  errno?: unknown;
  syscall?: unknown;
  hostname?: unknown;
  message?: unknown;
};

/** Safe fields for Vercel logs — no secrets, headers, or tokens. */
export function safeNetworkErrorFields(error: unknown): {
  name: string;
  message: string;
  causeCode: unknown;
  causeErrno: unknown;
  causeSyscall: unknown;
  causeHostname: unknown;
  causeMessage: unknown;
} {
  const err = error instanceof Error ? error : new Error(String(error));
  const cause = err.cause;
  const errnoLike: ErrnoLike | null =
    cause && typeof cause === "object" && cause !== null
      ? (cause as ErrnoLike)
      : null;

  return {
    name: err.name,
    message: err.message,
    causeCode: errnoLike?.code ?? null,
    causeErrno: errnoLike?.errno ?? null,
    causeSyscall: errnoLike?.syscall ?? null,
    causeHostname: errnoLike?.hostname ?? null,
    causeMessage:
      cause instanceof Error
        ? cause.message
        : typeof cause === "string"
          ? cause
          : (errnoLike?.message ?? null),
  };
}
