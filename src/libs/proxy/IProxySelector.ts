export interface IProxySelector {
  targetSSL?: boolean;

  country?: string;

  level?: number;

  'speed-limit'?: number;

  limit?: number;

  repeat?: number;
}
