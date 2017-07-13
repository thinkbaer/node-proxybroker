


import * as winston from "winston";


let _winston = new winston.Logger()

let console = new winston.transports.Console()
_winston.add(winston.transports.Console)



_winston.info('TEST')