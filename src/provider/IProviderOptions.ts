

export interface IProviderOptions {

    enable : boolean

    paths : Array<string>

    offset? : number

    /**
     * Amount of parallel allowed worker jobs
     */
    parallel?:number
}