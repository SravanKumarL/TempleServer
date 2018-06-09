const path = require('path');
const logger = require(__dirname + path.sep + 'helper').getLogger('serviceLog.log');
const stopService = (code) => {
    logger.fatal('Stopping Temple Server ...');
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
setTimeout(() => require(path.join(__dirname, '../src/server/index')), 100);