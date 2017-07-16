import * as https from "https";
import {DEFAULT_JUDGE_REQUEST_OPTIONS, IJudgeRequestOptions} from "./IJudgeRequestOptions";

export interface IJudgeOptions {
    selftest?: boolean
    remote_lookup?: boolean
    remote_url?: string
    judge_url?: string
    cert_file?: string
    key_file?: string
    debug?: boolean
    ssl_options?: https.ServerOptions
    request?: IJudgeRequestOptions
}


export const DEFAULT_JUDGE_OPTIONS: IJudgeOptions = {
    selftest: true,
    remote_lookup: true,
    debug: false,
    remote_url: 'http://127.0.0.1:8080',
    judge_url: 'http://0.0.0.0:8080',
    request: DEFAULT_JUDGE_REQUEST_OPTIONS
}



