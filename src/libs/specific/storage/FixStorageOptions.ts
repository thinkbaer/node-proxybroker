


import {Variable} from "../../../model/Variable";
import {IpAddrState} from "../../../model/IpAddrState";
import {IpAddr} from "../../../model/IpAddr";
import {IpLoc} from "../../../model/IpLoc";
import {JobState} from "../../../model/JobState";
import {Job} from "../../../model/Job";
import {IpRotate} from "../../../model/IpRotate";
import {IpRotateLog} from "../../../model/IpRotateLog";

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

