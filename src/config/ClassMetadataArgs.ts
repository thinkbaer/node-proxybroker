/**
 * Arguments for ClassMetadata class, helps to construct an ClassMetadata object.
 */
export interface ClassMetadataArgs {

    /**
     * Class to which is applied.
     * Function target is a defined in the class.
     */
    readonly target: Function;

    /**
     * Class's name. If name is not set then table's name will be generated from target's name.
     */
    readonly name?: string;


}