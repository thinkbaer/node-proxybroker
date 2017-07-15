

let s = "TEST"
let y = JSON.stringify(s)
console.log(s,y)
//let x = JSON.parse(s)
try{
let z = JSON.parse(s)
    console.log(s,z)
}catch(e){console.log('parse broke')}



/*
import * as winston from "winston";


let _winston = new winston.Logger()

let console = new winston.transports.Console()
_winston.add(winston.transports.Console)



_winston.info('TEST')
    */