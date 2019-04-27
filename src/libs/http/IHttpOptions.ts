import * as https from "https";

export interface IHttpOptions extends https.RequestOptions {
  stream?: boolean;
  proxy?: string;
  retry?: number;
}
