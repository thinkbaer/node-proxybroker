var gulp = require("gulp");
var ts = require("gulp-typescript");
var tsProject = ts.createProject("tsconfig.json");

gulp.task("compile:js", function () {
    return tsProject.src()
        .pipe(tsProject())
        .js.pipe(gulp.dest("dist"));
});

gulp.task('watch:ts',['compile:js'], function () {
   gulp.watch('src/**/*.ts', ['compile:js']);
});

gulp.task('default', ['compile:js'])

