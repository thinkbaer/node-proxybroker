
process.on('unhandledRejection', (reason: any, p: any) => {
    console.error(reason)
});

process.on('uncaughtException', (err: any) => {
    console.error(err, err.stack)

});