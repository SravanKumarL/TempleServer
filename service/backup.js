const { Constants } = require('../src/server/constants/constants');
const { getCurrentDate } = require('../src/server/constants/constants');
const backupModel = require('../src/server/models/backup');
const { spawn } = require('child_process');
const path = require('path');
const logger = require(__dirname + path.sep + 'helper').getLogger('backup.log');
const fs = require('fs');
const { google } = require('googleapis');
const http = require('http');
const url = require('url');
const querystring = require('querystring');
const puppeteer = require('puppeteer');
const { fork } = require('child_process');
// const opn = require('opn');

const dirName = 'backupdumps';
if (!fs.existsSync(`./${dirName}`)) {
    fs.mkdirSync(`./${dirName}`);
}

module.exports.backup = () => {
    let isBackupSetup = false;

    //Check for backup collection if it exists
    backupModel.estimatedDocumentCount((err, count) => {
        isBackupSetup = count > 0;

        // const yesterday = new Date();
        // yesterday.setDate(yesterday.getDate() - 1);
        const dates = [getCurrentDate()/* , getCurrentDate(yesterday) */];
        [Constants.Transactions, Constants.Users, Constants.poojaCollection].forEach(collection => {
            // const backupProcess = exec(`mongoexport -d temple -c transactions -q "{createdDate: {$in: ['${dates}']}}"` +
            //     ` -o backupdump_${dates.join('_')}.json`);
            const exportargs = ['-d', 'temple', '-c', collection,
                '-o', `${dirName}/backup_${collection}dump_${dates.join('_')}.json`];
            //If already present
            if (isBackupSetup) {
                exportargs.push(['-q', `"{createdDate: {$in: ['${dates}']}}"`]);
            }
            const backupProcess = spawn('mongoexport', exportargs);
            attachEventHandlers(backupProcess, logger, collection);
        });

        if (!isBackupSetup) {
            const backup = new backupModel({ createdDate: new Date() });
            backup.save(err => {
                if (err != null) {
                    logger.fatal(`Error occured while creating backup collection : ${err}`);
                }
            });
        }
    });
}

const attachEventHandlers = (backupProcess, logger, collection = 'temple database') => {
    backupProcess.stdout.on('data', (data) => {
        const logText = data.toString();
        console.log(logText);
        logger.info(logText);
    });
    backupProcess.stderr.on('data', (data) => {
        const logText = data.toString();
        console.log(logText);
        logger.error(logText);
    });
    backupProcess.on('exit', (code) => {
        const logText = `Backup of ${collection} ${code === 0 ? 'completed' : 'exited'} with code ${code}`;
        console.log(logText);
        logger.info(logText);
    });
    backupProcess.on('error', err => {
        console.log(err);
        logger.error(err);
    });
    backupProcess.on('exit', code => {
        const logText = `Backup of ${collection} ${code === 0 ? 'completed' : 'exited'} with code ${code}`;
        console.log(logText);
        logger.fatal(logText);
    });
    backupProcess.on('message', msg => {
        console.log(msg);
        logger.info(msg);
    });
}

module.exports.gdriveBackup = () => {
    let browser = null;
    const credentialsFilePath = __dirname + '/assets/client_id.json';
    new Promise((resolve, reject) => {
        fs.readFile(credentialsFilePath, async (err, content) => {
            try {
                if (err) {
                    reject(err);
                }
                const { client_id, client_secret, scopes, api_key, token } = JSON.parse(content);
                const authClient = new google.auth.OAuth2(client_id, client_secret, 'http://localhost:1000');
                authClient.apiKey = api_key;
                const authUri = authClient.generateAuthUrl({ access_type: 'offline', scope: scopes[0] });
                let tokenAvailable = false;
                if (token) {
                    const { access_token, refresh_token, expiry_date } = token;
                    tokenAvailable = (access_token && Date.parse(expiry_date) - Date.now() > 1) || refresh_token;
                }
                if (tokenAvailable) {
                    authClient.setCredentials(token);
                    resolve(authClient);
                }
                else {
                    browser = await login(authClient, authUri, content, credentialsFilePath);
                    resolve(authClient);
                }
            }
            catch (exception) {
                reject(exception);
            }
        });
    }).then(authClient => {
        const uploadModulePath = __dirname + '\\uploadBackup.js';
        if (browser && browser !== null) {
            browser._process.on('close', (code, signal) => {
                //If browser wasn't closed on its own and closed through this code
                if (code === 1) {
                    forkDriveUpload(credentialsFilePath, uploadModulePath, logger);
                }
            });
            browser.close();
        }
        forkDriveUpload(credentialsFilePath, uploadModulePath, logger);
    }).catch(error => {
        console.log(error);
        logError(logger, error);
    });
}

const forkDriveUpload = (credentialsFilePath, uploadModulePath, logger) => {
    const uploadProc = fork(uploadModulePath, [], { stdio: ["pipe", "pipe", "pipe", "ipc"], execArgv: ['--inspect-brk=9229'] }); // inspect is for debugging child process
    uploadProc.send(credentialsFilePath, err => {
        if (err) {
            logError(logger, err);
        }
    });
    uploadProc.on('message', message => {
        if (typeof message === 'object') {
            if ('error' in message) {
                let error = message.error;
                if (typeof error === 'object') {
                    error = JSON.stringify(error, null, 1);
                }
                logError(logger, error);
            }
            else {
                logInfo(logger, JSON.stringify(message, null, 1));
            }
        }
        else {
            logInfo(logger, message);
        }
    });
    return uploadProc;
}
const login = (authClient, authUri, content, credentialsFilePath) => {
    return new Promise((resolve, reject) => {
        let browser = null;
        const server = http.createServer(async (req, res) => {
            if (req.url.indexOf('/?code') > -1) {
                const qs = querystring.parse(url.parse(req.url).query);
                res.end('Obtained auth code');
                server.close();
                const code = qs.code;
                authClient.getToken(code, async (err, token) => {
                    if (err) {
                        logError(logger, err);
                        reject(err);
                    }
                    else {
                        authClient.setCredentials(token);
                        const newFileContents = { ...JSON.parse(content), token: { ...token, expiry_date: new Date(token.expiry_date) } };
                        fs.writeFileSync(credentialsFilePath, JSON.stringify(newFileContents));
                        logInfo(logger, 'Fetched token');
                        resolve(browser);
                    }
                });
            }
        }).listen(1000, async () => {
            try {
                //#region puppeteer
                browser = await puppeteer.launch({ headless: false });
                const page = await browser.newPage();
                await page.goto(authUri);
                await page.mainFrame().waitForSelector('#identifierId');
                const config = { username: 'srisringerisharadamath@gmail.com', password: 'Sharada123@' };
                console.log('typing email...');
                await page.type('#identifierId', config.username);
                await page.mainFrame().waitForSelector('#identifierNext');
                console.log('clicking next button...');
                await page.click('#identifierNext');
                console.log('waiting for password field...');
                await page.mainFrame().waitForSelector('#password input[type="password"]', { visible: true });
                console.log('typing password...');
                await page.type('#password input[type="password"]', config.password, { delay: 100 });
                console.log('clicking sign in button...');
                await page.click('#passwordNext', { delay: 100 });
                await page.mainFrame().waitForSelector('#submit_approve_access');
                await page.click('#submit_approve_access');
                console.log('Obtained auth code');
                //#endregion

                //#region opn
                // opn(authUri, { wait: false }).then(cp => cp.unref());
                //#endregion
            }
            catch (err) {
                reject(err);
            }
        });
    });
}

const logError = (logger, err) => {
    console.log(err);
    logger.fatal(err);
}
const logInfo = (logger, info) => {
    console.log(info);
    logger.info(info);
}
