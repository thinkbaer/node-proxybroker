import * as express from "express";


export class Judge {

    public app: express.Application;
    enabled: boolean = false
    self_ip : string = '0.0.0.0'
    self_port : number = 8080


    constructor(/*PARENT APP*/) {
        //create expressjs application
        this.app = express();

        //configure application
        //this.config();
//configure routes
        this.routes();

    }


    private routes() {
        //get router
        let router: express.Router;
        router = express.Router();
        router.get("/api/judge", this.judge.bind(this));
        //use router middleware
        this.app.use(router);
    }

    public judge(req: express.Request, res: express.Response, next: express.NextFunction) {
        if (this.enabled) {
            res.json({time: (new Date()).getTime()})
        } else {
            next();
        }
    }


    enable() {
        this.enabled = true
    }

    disable() {
        this.enabled = false

    }

    startup(){

    }

    shutdown() {

    }
}