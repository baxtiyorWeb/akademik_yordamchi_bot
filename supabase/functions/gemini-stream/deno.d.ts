// Minimal Deno declaration for editor/TS diagnostics in this workspace.
// Keeps the runtime file unchanged; scoped to this function folder.
declare const Deno: {
  env: {
    get(key: string): string | undefined;
  };
  serve?(handler: (req: Request) => Response | Promise<Response>): void;
} & any;

export {};
