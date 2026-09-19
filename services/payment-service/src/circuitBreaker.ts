// Simple circuit breaker around outbound calls (the mock payment provider).
// States: closed (pass through), open (fail fast), half-open (trial request).
// Thresholds are configurable via env for the demo:
//   CB_FAILURE_THRESHOLD, CB_TIMEOUT_MS, CB_RESET_MS, CB_TRIAL_MAX_MS
export interface CircuitBreakerOptions {
  failureThreshold: number;
  timeoutMs: number;
  resetMs: number;
}

export class CircuitBreaker {
  private failures = 0;
  private openedAt = 0;
  private state: "closed" | "open" | "half-open" = "closed";

  constructor(private readonly options: CircuitBreakerOptions) {}

  getState(): string {
    return this.state;
  }

  getStats(): {
    state: string;
    failures: number;
    failureThreshold: number;
    timeoutMs: number;
    resetMs: number;
    openedAt: string | null;
  } {
    return {
      state: this.state,
      failures: this.failures,
      failureThreshold: this.options.failureThreshold,
      timeoutMs: this.options.timeoutMs,
      resetMs: this.options.resetMs,
      openedAt: this.openedAt ? new Date(this.openedAt).toISOString() : null,
    };
  }

  async execute<T>(
    fn: () => Promise<T>,
  ): Promise<T> {
    if (this.state === "open") {
      const elapsed = Date.now() - this.openedAt;
      if (elapsed >= this.options.resetMs) {
        this.state = "half-open";
      } else {
        throw new Error("circuit open: failing fast");
      }
    }

    try {
      const result = await Promise.race([
        fn(),
        new Promise<never>((_, reject) =>
          setTimeout(
            () => reject(new Error("circuit timeout")),
            this.options.timeoutMs,
          ),
        ),
      ]);
      this.recordSuccess();
      return result;
    } catch (e) {
      this.recordFailure();
      throw e;
    }
  }

  private recordSuccess(): void {
    this.failures = 0;
    this.state = "closed";
  }

  private recordFailure(): void {
    this.failures++;
    if (this.failures >= this.options.failureThreshold) {
      this.state = "open";
      this.openedAt = Date.now();
    } else if (this.state === "half-open") {
      this.state = "open";
      this.openedAt = Date.now();
    }
  }
}

export function createPaymentCircuitBreaker(): CircuitBreaker {
  return new CircuitBreaker({
    failureThreshold: Number(process.env.CB_FAILURE_THRESHOLD ?? 3),
    timeoutMs: Number(process.env.CB_TIMEOUT_MS ?? 2_000),
    resetMs: Number(process.env.CB_RESET_MS ?? 10_000),
  });
}