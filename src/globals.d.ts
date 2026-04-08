/**
 * Minimal ambient `console` declaration for platform-agnostic usage.
 *
 * The library intentionally avoids pulling in DOM or Node type definitions
 * to prevent accidental platform-specific API usage. Only the methods
 * actually used in source code are declared here.
 */
declare const console: {
  warn(...data: unknown[]): void;
};
