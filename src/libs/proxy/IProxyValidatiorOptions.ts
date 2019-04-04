import {DEFAULT_JUDGE_OPTIONS, IJudgeOptions} from "../judge/IJudgeOptions";


export interface IProxyValidatiorOptions {

    parallel?:number

    schedule: {

        enable: boolean

        pattern?: string

        time_distance?: number

        limit?: number
    }

    judge?: IJudgeOptions
}

export const K_VALIDATOR = 'validator'

const hours6 = 6 * 60 * 60

export const DEFAULT_VALIDATOR_OPTIONS: IProxyValidatiorOptions = {

    parallel:100,

    schedule: {

        enable: true,

        pattern: '*/10 * * * *',

        time_distance: hours6,

        limit: 1000
    },

    judge: DEFAULT_JUDGE_OPTIONS


}