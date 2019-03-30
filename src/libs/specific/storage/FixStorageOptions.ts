


import {Variable} from "../../../entities/Variable";
import {IpAddrState} from "../../../entities/IpAddrState";
import {IpAddr} from "../../../entities/IpAddr";
import {IpLoc} from "../../../entities/IpLoc";
import {JobState} from "../../../entities/JobState";
import {Job} from "../../../entities/Job";
import {IpRotate} from "../../../entities/IpRotate";
import {IpRotateLog} from "../../../entities/IpRotateLog";

export const FIX_STORAGE_OPTIONS = {
    entities: [
        Variable,
        IpAddrState,
        IpAddr,
        IpLoc,
        Job,
        JobState,
        IpRotate,
        IpRotateLog
    ],
    migrations: [
        __dirname + "/migrations/*"
    ],
    autoSchemaSync: true
};

