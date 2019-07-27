export interface IJudgeRequestOptions {
  local_ip?: string;
  // connection_timeout?: number;
  timeout?: number | any;
}


export const DEFAULT_JUDGE_REQUEST_OPTIONS: IJudgeRequestOptions = {
  timeout: 10000,
  // connection_timeout: 10000
};
