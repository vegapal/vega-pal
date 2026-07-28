export {};

type GtagCommand = "config" | "event" | "js" | "set";

type GtagConfigParams = Record<string, string | number | boolean | undefined>;

type GtagEventParams = Record<string, string | number | boolean | undefined>;

interface GtagFunction {
  (command: "js", date: Date): void;
  (command: "config", targetId: string, params?: GtagConfigParams): void;
  (command: "event", eventName: string, params?: GtagEventParams): void;
  (command: "set", params: GtagConfigParams): void;
}

type ClarityFunction = (...args: [string, ...string[]]) => void;

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: GtagFunction;
    clarity?: ClarityFunction;
  }
}
