/**
 * Created by cezaryrk on 15.10.16.
 */
class PageHandle {
}
class Main {
    constructor() {
        this.$promise = Promise.resolve(this);
    }
    boot() {
        console.log('boot');
        return Promise.resolve([__dirname + '/providers']);
    }
    // arg: find
    find() {
        console.log('find');
    }
}
let main = new Main();
main.boot()
    .find();
