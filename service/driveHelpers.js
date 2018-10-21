const { fork } = require('child_process');
const { logError, logInfo } = require('./helper');
const { authorizeGAccount } = require('./auth');
const fs = require('fs');
const { google } = require('googleapis');

module.exports.getDriveClient = (credentialsFilePath) => {
    const { client_id, client_secret, token } = JSON.parse(fs.readFileSync(credentialsFilePath));
    const authClient = new google.auth.OAuth2(client_id, client_secret, 'http://localhost:1000');
    // authClient.apiKey = api_key;
    authClient.setCredentials({ refresh_token: token.refresh_token });
    return google.drive({ version: 'v3', auth: authClient });
}

module.exports.authAndForkDriveProcess = (credentialsFilePath, logger, modulePath, dates,
    onProcCompleteCb = (() => { })) => {
    authorizeGAccount(credentialsFilePath, logger).then(browser => {
        if (browser && browser !== null) {
            browser._process.on('close', (code, signal) => {
                //If browser wasn't closed on its own and closed through this code
                if (code === 1) {
                    forkDriveProcess(credentialsFilePath, modulePath, logger,
                        dates, onProcCompleteCb);
                }
            });
            browser.close();
        }
        else {
            forkDriveProcess(credentialsFilePath, modulePath, logger, dates, onProcCompleteCb);
        }
    }).catch(error => {
        console.log(error);
        logError(logger, error);
    });

}

const forkDriveProcess = (credentialsFilePath, modulePath, logger, dates = [], callback) => {
    // inspect is for debugging child process
    const driveProc = fork(modulePath, [], {
        stdio: ["pipe", "pipe", "pipe", "ipc"]/* , execArgv: ['--inspect-brk=9229'] */
    });
    driveProc.send({ credentialsFilePath, dates }, err => {
        if (err) {
            logError(logger, err);
        }
    });
    driveProc.on('message', message => {
        if (typeof message === 'object') {
            if ('error' in message) {
                let error = message.error;
                if (typeof error === 'object') {
                    error = JSON.stringify(error, null, 1);
                }
                logError(logger, error);
            }
            else {
                if (callback && 'done' in message) {
                    callback(message.done);
                }
                else {
                    logInfo(logger, JSON.stringify(message, null, 1));
                }
            }
        }
        else {
            logInfo(logger, message);
        }
    });
    return driveProc;
}

const searchDrive = (drive, query = '', allFiles = [], errCb, doneCb) => {
    drive.files.list({ q: query }, (error, response) => {
        if (error) {
            errCb(error);
        }
        const { nextPageToken, files } = response.data;
        if (nextPageToken) {
            searchDrive(drive, { ...query, nextPageToken }, [...allFiles, ...files], errCb, doneCb);
        }
        else {
            doneCb([...allFiles, ...files]);
        }
    });
}

const getFilesFilterClause = (dates = [], folderId = '', additionalFilterClause = '') => {
    let dateFilterClause = '';
    if (dates.length > 0) {
        dateFilterClause += '(';
        dates.forEach(date => {
            date.replace('-', '\\-');
            dateFilterClause += `name contains '"${date}"' or `;
        });
        dateFilterClause = dateFilterClause.slice(0, dateFilterClause.lastIndexOf(' or '));
        dateFilterClause += ') and ';
    }
    return `${folderId !== '' ? `'${folderId}' in parents and ` : ''}(${dateFilterClause}trashed = false)` +
        (additionalFilterClause !== '' ? ` and ${additionalFilterClause}` : '');
}

module.exports.getFilesFilterClause = getFilesFilterClause;
module.exports.searchDrive = searchDrive;