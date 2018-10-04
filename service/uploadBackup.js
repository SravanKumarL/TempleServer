const { getCurrentDate } = require('../src/server/constants/constants');
const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');
console.log('child process forked');
process.on('message', credentialsFilePath => {
    const { client_id, client_secret, api_key, token } = JSON.parse(fs.readFileSync(credentialsFilePath));
    const authClient = new google.auth.OAuth2(client_id, client_secret, 'http://localhost:1000');
    // authClient.apiKey = api_key;
    authClient.setCredentials({ refresh_token: token.refresh_token });
    const drive = google.drive({ version: 'v3', auth: authClient });
    const backupDir = path.resolve(__dirname, '../backupdumps');
    const folderMimeType = 'application/vnd.google-apps.folder';
    const folderName = 'temple backup';
    drive.files.list({ q: `mimeType = '${folderMimeType}' and name = '${folderName}'` }, (listingError, response) => {
        if (listingError) {
            process.send({ error: cloneErrorObject(listingError) });
        }
        else {
            new Promise((resolve, reject) => {
                if (!response.data.incompleteSearch && response.data.files.length === 0) {
                    drive.files.create({ requestBody: { mimeType: folderMimeType, name: folderName } }, (error, response) => {
                        if (error) {
                            reject(error);
                        }
                        resolve(response.data.id);
                    });
                }
                else {
                    resolve(response.data.files[0].id);
                }
            }).then(folderId => {
                fs.readdir(backupDir, (error, files) => {
                    if (error) {
                        process.send({ error: cloneErrorObject(error) });
                    }
                    else {
                        files.forEach(file => {
                            const filePath = backupDir + '\\' + file;
                            fs.stat(filePath, async (fileSearchErr, fStat) => {
                                if (fileSearchErr) {
                                    process.send({ error: cloneErrorObject(fileSearchErr) });
                                }
                                else {
                                    try {
                                        if (getCurrentDate(fStat.mtime) === getCurrentDate()) {
                                            await drive.files.create({
                                                media: { body: fs.createReadStream(filePath), mediaType: 'application/json' },
                                                requestBody: { mimeType: 'application/json', name: file, parents: [folderId] }
                                            }, {
                                                    onUploadProgress: event => {
                                                        process.send(`${file} upload : ${Math.round((event.bytesRead / fStat.size) * 100)}% complete`);
                                                    }
                                                });
                                        }
                                    }
                                    catch (error) {
                                        process.send({ error: cloneErrorObject(error) });
                                    }
                                }
                            });
                        });
                    }
                });
            }).catch(error => {
                process.send({ error: cloneErrorObject(error) });
            });
        }
    });
    console.log('logging into drive');
});

const cloneErrorObject = error => {
    // const errorClone = new error.constructor();
    // Object.keys(error).forEach(key => {
    //     if (error.hasOwnProperty(key)) {
    //         errorClone[key] = error[key];
    //     }
    // });
    // return errorClone;
    return { message: error.message, stack: error.stack };
}