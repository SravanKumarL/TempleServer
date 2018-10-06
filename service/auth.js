const http = require('http');
const fs = require('fs');
const url = require('url');
const { google } = require('googleapis');
const querystring = require('querystring');
const puppeteer = require('puppeteer');
const { logError, logInfo } = require('./helper');
// const opn = require('opn');

module.exports.authorizeGAccount = (credentialsFilePath, logger) => {
    return new Promise((resolve, reject) => {
        fs.readFile(credentialsFilePath, async (err, content) => {
            let browser = null;
            try {
                if (err) {
                    reject(err);
                }
                const { client_id, client_secret, scopes, token } = JSON.parse(content);
                let tokenAvailable = false;
                if (token) {
                    const { access_token, refresh_token, expiry_date } = token;
                    tokenAvailable = (access_token && Date.parse(expiry_date) - Date.now() > 1) || refresh_token;
                }
                const authClient = new google.auth.OAuth2(client_id, client_secret, 'http://localhost:1000');
                const authUri = authClient.generateAuthUrl({ access_type: 'offline', scope: scopes[0] });
                if (tokenAvailable) {
                    resolve(browser);
                }
                else {
                    browser = await login(authClient, authUri, content, credentialsFilePath, logger);
                    resolve(browser);
                }
            }
            catch (exception) {
                reject(exception);
            }
        });
    })
}

const login = (authClient, authUri, content, credentialsFilePath, logger) => {
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