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

module.exports.cloneErrorObject = error => {
    // const errorClone = new error.constructor();
    // Object.keys(error).forEach(key => {
    //     if (error.hasOwnProperty(key)) {
    //         errorClone[key] = error[key];
    //     }
    // });
    // return errorClone;
    return { message: error.message, stack: error.stack };
}

const logError = (logger, err) => {
    console.log(err);
    logger.fatal(err);
}

const logInfo = (logger, info) => {
    console.log(info);
    logger.info(info);
}

module.exports.attachEventHandlers = (proc, logger, collection = 'temple database', operationType, doneCallBack) => {
    const completedCb = () => {
        if (doneCallBack) {
            doneCallBack();
        }
    }
    proc.stdout.on('data', (data) => {
        completedCb();
        logInfo(logger, data.toString());
    });
    proc.stderr.on('data', (data) => {
        completedCb();
        logInfo(logger, data.toString());
    });
    proc.on('exit', (code) => {
        completedCb();
        logInfo(logger, `${operationType} of ${collection} ${code === 0 ? 'completed' : 'exited'} with code ${code}`);
    });
    proc.on('error', err => {
        logError(logger, err);
    });
    proc.on('exit', code => {
        completedCb();
        logInfo(logger, `${operationType} of ${collection} ${code === 0 ? 'completed' : 'exited'} with code ${code}`);
    });
    proc.on('message', msg => {
        completedCb();
        logInfo(logger, msg);
    });
}

module.exports.logError = logError;
module.exports.logInfo = logInfo;
