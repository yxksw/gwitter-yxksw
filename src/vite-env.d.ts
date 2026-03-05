/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_GITHUB_TOKEN: string
  readonly VITE_GITHUB_CLIENT_ID: string
  readonly VITE_GITHUB_CLIENT_SECRET: string
  readonly VITE_GITHUB_OWNER: string
  readonly VITE_GITHUB_REPO: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
