var gulp = require("gulp");
var ts = require("gulp-typescript");
var tsProject = ts.createProject("tsconfig.json");
var clean = require('gulp-clean');

gulp.task('cleanup:dist', function () {
    return gulp.src('dist', {read: false})
        .pipe(clean());
});


gulp.task("compile:js", function () {
    return tsProject.src()
        .pipe(tsProject())
        .js.pipe(gulp.dest("build"));
});

gulp.task('watch:ts',['compile:js'], function () {
   gulp.watch('src/**/*.ts', ['compile:js']);
});

gulp.task('default', ['compile:js'])

