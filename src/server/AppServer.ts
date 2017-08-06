import * as express from "express";
import * as _ from 'lodash'
import {createExpressServer, RoutingControllersOptions, useContainer} from "routing-controllers";
import {DataAccessController} from "./api/controllers/DataAccessController";
import {Server} from "./Server";
import {IServerOptions} from "./IServerOptions";
import TodoException from "../exceptions/TodoException";
import {Runtime} from "../lib/Runtime";
import {Container} from "typedi";

export const K_APPSERVER = 'server'

const K_EXPRESS_STATIC = 'static_files'
const K_EXPRESS_ROUTING = 'routing_controller'

export type ROUTE_TYPE = 'static_files' | 'routing_controller'

export interface IRouteType {
    type:ROUTE_TYPE
}

export interface IStaticFiles extends IRouteType{
    routePrefix?:string
    path:string
    defaultFile?:string
}

export interface IRoutingController extends RoutingControllersOptions, IRouteType{

}

export type IExpressRoute = IRoutingController | IStaticFiles


/**
 *
 */

export interface IExpressOptions extends IServerOptions {

    routes?: IExpressRoute[]

}

const FIXED_API_OPTIONS: IRoutingController = {

    type: K_EXPRESS_ROUTING,

    routePrefix:'/api',

    controllers: [DataAccessController],

    classTransformer:false

}

const DEFAULT_SERVER_OPTIONS: IExpressOptions = {

    protocol: 'http',

    ip: '127.0.0.1',

    port :32323,

    routes:[]
}

export class AppServer extends Server {

    options: IExpressOptions

    app: express.Application


    constructor(options: IExpressOptions = DEFAULT_SERVER_OPTIONS) {
        options = _.defaults(options, DEFAULT_SERVER_OPTIONS);
        super(options)
        options.routes.unshift(FIXED_API_OPTIONS)
        options.routes = _.uniq(options.routes)
        this.options = options

        // TODO
        Runtime.$().setConfig('application',this.options)
    }


    prepare(): Promise<void> {
        this.app = express()
        this.app.disable("x-powered-by");
        useContainer(Container);

        for(let app of this.options.routes){
            if(app.type == K_EXPRESS_ROUTING){
                this.app.use(createExpressServer(app))
            }else if(app.type == K_EXPRESS_STATIC){
                let _app:IStaticFiles = <IStaticFiles>app
                if(app.routePrefix){
                    this.app.use(app.routePrefix, express.static(_app.path))
                }else{
                    this.app.use(express.static(_app.path))
                }
            }else{
                throw  new TodoException()
            }
        }
        return null
    }

    response(req: express.Request, res: express.Response) {
        this.app(req,res)
    }


}
