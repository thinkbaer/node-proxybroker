
import * as https from "https";
import {IJudgeRequestOptions} from "./IJudgeRequestOptions";

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
