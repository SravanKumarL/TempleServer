const { getDriveClient, searchDrive, getFilesFilterClause } = require('./driveHelpers');
const { cloneErrorObject } = require('../src/server/constants/constants');
const fs = require('fs');
const path = require('path');
console.log('gdrive download process forked');

process.on('message', messageObj => {
    const { credentialsFilePath, dates } = messageObj;
    const drive = getDriveClient(credentialsFilePath);
    const backupDir = path.resolve(__dirname, '../backupdumps');
    const folderMimeType = 'application/vnd.google-apps.folder';
    const folderName = 'temple backup';
    drive.files.list({ q: `mimeType = '${folderMimeType}' and name = '${folderName}'` }, (listingError, response) => {
        if (listingError) {
            process.send({ error: cloneErrorObject(listingError) });
        }
        else if (!response.data.incompleteSearch && response.data.files.length !== 0) {
            const errCb = error => process.send({ error: cloneErrorObject(error) });
            const doneCb = files => Promise.all(files.map(file => {
                return new Promise((resolve, reject) => {
                    drive.files.get({
                        fileId: file.id, alt: 'media'
                    }, {
                            onDownloadProgress: event => {
                                process.send(`${file} download : ${Math.round((event.bytesRead / file.size) * 100)}%`
                                    + 'complete');
                            }, transformResponse: (data, headers) => {
                                const fileName = backupDir + '\\' + file.name;
                                fs.writeFile(fileName, data, error => {
                                    if (error) {
                                        reject(error);
                                    }
                                    resolve(fileName);
                                });
                            }
                        });
                });
            })).then(files => {
                process.send({ done: files });
            }).catch(error => {
                process.send({ error: cloneErrorObject(error) });
            });

            searchDrive(drive, getFilesFilterClause(dates, response.data.files[0].id), [],
                errCb, doneCb);
        }
    });
});

