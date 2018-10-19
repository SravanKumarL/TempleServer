const path = require('path');
const { backup } = require(path.join(__dirname, './importExport'));
const logger = require(__dirname + path.sep + 'helper').getLogger('serviceLog.log');
let server = null;
const stopService = (code) => {
    logger.fatal('Stopping Temple Server ...');
    if (server !== null) {
        server.close();
    }
    logger.fatal('Process exited with code ' + code);
};
process.on('exit', (code) => stopService(code));
process.on('beforeExit', (code) => stopService(code));
const killHandler = () => {
    stopService(128);
    logger.fatal('Killing the process ...');
    setTimeout(() => process.exit(128), 100);
}
process.on('SIGKILL', killHandler);
process.on('SIGINT', killHandler);
process.on('SIGTERM', killHandler);
process.on('uncaughtException', (err) => {
    logger.error(err);
    process.exit(1);
});
process.on('unhandledRejection', (reason, p) => {
    logger.error('Unhandled Rejection at:', p + 'with reason :\n' + reason);
    process.exit(1);
});
logger.info('Starting Temple Server ...');
setTimeout(() => server = require(path.join(__dirname, '../src/server/index')), 100);
const times = [{ hr: 0, min: 0, sec: 0 }, { hr: 15, min: 0, sec: 0 }];
const scheduledBackup = () => {
    backup();
    setInterval(backup, 24 * 60 * 60 * 1000);
}
times.forEach(time => {
    const getScheduledTime = (nextDay = false) => new Date(new Date().getFullYear(), new Date().getMonth(),
        (new Date().getDate() + (nextDay ? 1 : 0)), time.hr, time.min, time.sec, 0).getTime() - Date.now();
    let scheduledTime = getScheduledTime();
    if (scheduledTime < 0) {
        scheduledTime = getScheduledTime(true);
    }
    setTimeout(scheduledBackup, scheduledTime);
});