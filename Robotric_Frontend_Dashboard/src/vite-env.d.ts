/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Where the dashboard calls the backend (default: /api on the same domain). */
  readonly VITE_API_BASE?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
