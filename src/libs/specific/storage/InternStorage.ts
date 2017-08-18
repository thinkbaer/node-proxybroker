
import {DEFAULT_STORAGE_OPTIONS, Storage} from "../../generic/storage/Storage";
import {IStorageOptions} from "../../generic/storage/IStorageOptions";
import {FIX_STORAGE_OPTIONS} from "./FixStorageOptions";

export class InternStorage extends Storage {
    constructor(options: IStorageOptions = DEFAULT_STORAGE_OPTIONS){
        super(options,FIX_STORAGE_OPTIONS)
    }
}
