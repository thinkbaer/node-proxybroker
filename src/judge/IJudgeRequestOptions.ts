export interface IJudgeRequestOptions {
    local_ip?: string,
    connection_timeout?: number
    socket_timeout?: number
}


export const DEFAULT_JUDGE_REQUEST_OPTIONS: IJudgeRequestOptions = {
    socket_timeout: 10000,
    connection_timeout: 5000
}
