var log4js = require('log4js');
var Path = require('path');
const logType = { error: 'error', warn: 'warn', fatal: 'fatal' };

module.exports.getLogger = (logFileName, logFilePath) => {
    const loggerName = logFileName.substring(0, logFileName.indexOf('.log'));
    log4js.configure({
        appenders: { [loggerName]: { type: 'file', filename: logFilePath ? Path.join(logFilePath, logFileName) : logFileName } },
        categories: { default: { appenders: [loggerName], level: 'all' } }
    });
    let logger = log4js.getLogger(loggerName);
    logger.level = 'ALL';
    return logger;
}
module.exports.logToLogFile = (logger, text, type) => {
    if (text) {
        if (logger && logger.level) {
            if (!type) {
                logger.trace(text);
                return;
            }
            switch (type) {
                case logType.error:
                    logger.error(text);
                    break;
                case logType.warn:
                    logger.warn(text);
                    break;
                case logType.fatal:
                    logger.fatal(text);
                    break;
                case logType.info:
                    logger.info(text);
                    break;
                default:
                    logger.trace(text);
                    break;
            }
        }
    }
}