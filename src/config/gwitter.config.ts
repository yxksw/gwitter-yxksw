// Gwitter Configuration
/// <reference types="../vite-env.d.ts" />

export interface GwitterConfig {
  request: {
    token: string;
    clientID: string;
    clientSecret: string;
    owner: string;
    repo: string;
    pageSize?: number;
    autoProxy?: string;
  };
  app?: {
    onlyShowOwner?: boolean;
    enableRepoSwitcher?: boolean;
    enableAbout?: boolean;
    enableEgg?: boolean;
  };
}

// Default configuration
export const config: GwitterConfig = {
  request: {
    token: import.meta.env.VITE_GITHUB_TOKEN || '',
    clientID: import.meta.env.VITE_GITHUB_CLIENT_ID || '',
    clientSecret: import.meta.env.VITE_GITHUB_CLIENT_SECRET || '',
    pageSize: 6,
    // CORS 代理 - 用于 OAuth 请求
    // 使用原作者提供的代理服务
    autoProxy: 'https://cors-anywhere.azm.workers.dev/https://github.com/login/oauth/access_token',
    owner: import.meta.env.VITE_GITHUB_OWNER || 'yxksw',
    repo: import.meta.env.VITE_GITHUB_REPO || 'weibo',
  },
  app: {
    onlyShowOwner: true,
    enableAbout: true,
    enableRepoSwitcher: false,
    enableEgg: true,
  },
};
