import * as bodyParser from "body-parser";
import * as express from "express";
import * as path from "path";
import * as http from "http";
import * as net from "net";
import * as _ from 'lodash'
import {createExpressServer, RoutingControllersOptions, useContainer} from "routing-controllers";
import {Config} from "commons-config";
import {Utils} from "../utils/Utils";
import {DataAccessController} from "./api/controllers/DataAccessController";
import {Container} from "typedi";
import {ProviderManager} from "../provider/ProviderManager";


/**
 *

 */

export interface IExpressOptions extends RoutingControllersOptions {
    host?: string
    port?: number


}

const FIX_OPTIONS: IExpressOptions = {
    routePrefix:'/api',
    controllers: [DataAccessController]
}

const DEFAULT_OPTIONS: IExpressOptions = {
    port: 32323,
    host: 'localhost'
}

export class Express {

    options: IExpressOptions

    express: express.Application

    storage: Storage


    constructor(options: IExpressOptions) {
        // check if options are set per config
        /*
         let _options = <IExpressOptions>Config.get(K_UI_SERVER);
         if (_options) {
         options = _options
         }
         */
        options = Utils.merge(options, FIX_OPTIONS);
        this.options = _.defaults(options, DEFAULT_OPTIONS);

    }

    prepare(): Promise<void> {
        this.express = createExpressServer(this.options)
        this.express.listen(this.options.port, this.options.host)
        this.express.disable("x-powered-by");

        this.express.get('*', (req, res) => {
            res.sendFile(path.join(__dirname, 'app/index.html'));
        });

        return null
    }


}
