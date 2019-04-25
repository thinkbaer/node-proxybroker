import * as https from "https";
import {DEFAULT_JUDGE_REQUEST_OPTIONS, IJudgeRequestOptions} from "./IJudgeRequestOptions";

const DEFAULT_SSL_KEY = "-----BEGIN RSA PRIVATE KEY-----\n" +
    "MIIEpAIBAAKCAQEAuQACjfvAF4R0J30n6FqA7lWAnkjsXsJoN+1ZrwskYvvOQdDp\n" +
    "znoITtAoWiiIpAxkp/7K67M2u1ax78TPP2WLV8uTvFVdwb3XAQtHUyaz3TLf5QIl\n" +
    "gbo4Ce6qraA/8WmW5crRW++wVbKaO6b33NQAE2e/KvUUtU3p8kTF29QRO6m6dZnj\n" +
    "MAOtC0A9+nizJ1ejX3xZsa8FIti5r3ayvF6x8p9VGshRSrvgc8DmXEFzHG2pY0GF\n" +
    "ThBmkPmTQ6ISPIVycix1zUwmuP2+Suff7B6c8nKv8EPzslTzA7SG0BVM101QstF9\n" +
    "8etDgDuORMisflmSH1aOJo3Sr79Qvs3yDEmInwIDAQABAoIBAET28vzY/5gEwYRD\n" +
    "DNB6hJvUdfkLuEnu8QkASzGM1sirlA1HAxH8vgIbaR+LAr0c/Zz+x8ir61hVDkoS\n" +
    "tSuuAA7/jhhkPmpOCcuS18jwoZZxM7PcY/0DXYaeWTQWjB/DvAP34qoCJVsdFI/u\n" +
    "Q3In+ctCHqq16D1aST8OUjAL00zI66vq2XLV1QcifIn748TQoylltJrCHvCsaRv9\n" +
    "jM9fK2GlaLAQCY7AqiNQRZuUZXULjCTME9Sdi1lehxSLeD65gzqdTpQ8lsthF7QP\n" +
    "IGSfRzQRpT9kDHF5nbc08BTSfhVxDCI+d04Y+gtw1wCHXm5VKgSxDMt7NuCLhwps\n" +
    "wf+J1PkCgYEA4GMUahnglxsBO3Q+7TsNcVfmy5W3ZxL6/4dnm3aABLa9EkH94BoI\n" +
    "BJusPWpyJ55VAANTFJF2fUz80qwb4rEEp1KDsRGIivhXt7Ol2Bu1f5X0mGRcJVPR\n" +
    "pjVXBW1cdRptqwr8Ref+WCSVisPQNaW4CoJlYoeu6ZDmnwBYd4F6QeUCgYEA0xBe\n" +
    "KhJMikADdBsxoknr3kkAt/dI8bQU00pJB1CkVcWa1hM+IPAMRwSu74IeldKFf+2+\n" +
    "tvot65UM2mDySLZUy3UoenIb6QrOVewCfqSPwt2MFoI9wKBb7iqPA2UQLpLf3HHP\n" +
    "Ww1Om90h5W/oXqTfGQDtVzSeZrqKx9VIfXZuSDMCgYEA2koJNh7uipHO5RP1k7v7\n" +
    "G+SztiJ0RWYFoEkN1gO2Dt/nl7dzT2yDmFgJe8XuP/ScJGMXk87fQo5+9kRQ7Hvh\n" +
    "VxXC36N6/hcS3rd6A38RVol/ZjFcI0QjlFoXykPVymZnghoxyaAjo4QTpudPyqDp\n" +
    "JfAsyWnOE5LPiKdBaSEg2rECgYBfcZNjawr5qaDmLDXxsYPb7R9KEaUGx+xy77C+\n" +
    "ghUORGGUVPdPZb3nj5Kb9DdogN6lzxjjHZcOZUR+rEBj6S/HIZ/AX0GHzL8p06P9\n" +
    "KOVptU3YD+Vk6h8oQE6Ttmvu47Qft8eQ4R+fFAxz+HsX8W6BnA231a+bvNdtLmGt\n" +
    "epS8SQKBgQCoyEPLWKvH1wVJoTWlWdi/0hcJ7kJLuyCeyvHnbSQE9MZxIIXm+HQQ\n" +
    "LRrj9+uRfvzuiG+paDsZKEZxOn3Ai4D3cvgPn3dk29xuH3Lu78nAMA+Ek0E96ZPa\n" +
    "wHczKK/ymfji7DttFqSUG6Ptj2V5YRPvR1ktgjVzvXdnFH4r/Lqt8g==\n" +
    "-----END RSA PRIVATE KEY-----\n";



const DEFAULT_SSL_CERT = "-----BEGIN CERTIFICATE-----\n" +
    "MIIDLDCCAhQCAQIwDQYJKoZIhvcNAQELBQAwXDELMAkGA1UEBhMCREUxDzANBgNV\n" +
    "BAgMBkJlcmxpbjEPMA0GA1UEBwwGQmVybGluMRUwEwYDVQQKDAx0aGlua2JhZXIu\n" +
    "ZGUxFDASBgNVBAMMC2p1ZGdlLmxvY2FsMB4XDTE3MDQwODEzMzU0MFoXDTI3MDQw\n" +
    "NjEzMzU0MFowXDELMAkGA1UEBhMCREUxDzANBgNVBAgMBkJlcmxpbjEPMA0GA1UE\n" +
    "BwwGQmVybGluMRUwEwYDVQQKDAx0aGlua2JhZXIuZGUxFDASBgNVBAMMC2p1ZGdl\n" +
    "LmxvY2FsMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAuQACjfvAF4R0\n" +
    "J30n6FqA7lWAnkjsXsJoN+1ZrwskYvvOQdDpznoITtAoWiiIpAxkp/7K67M2u1ax\n" +
    "78TPP2WLV8uTvFVdwb3XAQtHUyaz3TLf5QIlgbo4Ce6qraA/8WmW5crRW++wVbKa\n" +
    "O6b33NQAE2e/KvUUtU3p8kTF29QRO6m6dZnjMAOtC0A9+nizJ1ejX3xZsa8FIti5\n" +
    "r3ayvF6x8p9VGshRSrvgc8DmXEFzHG2pY0GFThBmkPmTQ6ISPIVycix1zUwmuP2+\n" +
    "Suff7B6c8nKv8EPzslTzA7SG0BVM101QstF98etDgDuORMisflmSH1aOJo3Sr79Q\n" +
    "vs3yDEmInwIDAQABMA0GCSqGSIb3DQEBCwUAA4IBAQCZcob1AVSSIhH4LSLCJbvm\n" +
    "KVUM21+RAtMLXlzgkcr/qU6k4J7x/4R266TAk3mlvL0uM8exVFzJfbFpIxOgHDBO\n" +
    "iBgIXv8NiOn46/tTPZ6CXG5f6q842tj+7/Eva9CH8HRXBDNkstDkz0mGeWz59IOL\n" +
    "iHnbyGGPesGGaJeAYmeMY4VslEdQZcIvqHMXlWeH6TqFxjnP+a4PC8tJxargP7Zp\n" +
    "IarYioKsL5JH68w8RVjh2P6Td9L0l9c1lQANfpArB6cMDbtDCl0lzny9E4DxHajp\n" +
    "K0zecaQARf3FLmr1f/6/PyY+jDql4KHNAsAKb7tFeP+LwwmV7lWNHrC3I/QP4qqe\n" +
    "-----END CERTIFICATE-----\n";



export interface IJudgeOptions {

    selftest?: boolean

    remote_lookup?: boolean

    remote_ip?: string

    ip?: string

    http_port?: number

    https_port?: number

    ssl?: https.ServerOptions & {key_file?:string, cert_file?:string}

    request?: IJudgeRequestOptions
}


export const DEFAULT_JUDGE_OPTIONS: IJudgeOptions = {

    selftest: true,

    remote_lookup: true,

    remote_ip: '127.0.0.1',

    ip: '0.0.0.0',

    http_port: 8080,

    https_port: 8181,

    ssl: {

        key: Buffer.from(DEFAULT_SSL_KEY,"utf8"),

        cert: Buffer.from(DEFAULT_SSL_CERT,"utf8")
    },

    request: DEFAULT_JUDGE_REQUEST_OPTIONS
};



