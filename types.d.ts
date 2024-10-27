interface Server {
  name: string;
  url: string;
  proxy?: string;
  auth?: {
    username: string;
    password: string;
  };
}

interface Proxy {
  protocol: 'http' | 'https' | 'socks5';
  host: string;
  port: number;
  auth?: {
    username: string;
    password: string;
  };
}

export interface Config {
  PORT: number;
  REPOSITORIES: Server[];
  DEFAULT_PATH: string;
  LOG_REQUESTS?: boolean;
  IGNORE_FILES?: string[];
  VALID_FILE_TYPES?: string[];
  PROXIES: Record<string, Proxy>;
}
