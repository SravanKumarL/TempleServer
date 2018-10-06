const { getDriveClient } = require('./driveHelpers');
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
                process.send({ files });
            }).catch(error => {
                process.send({ error: cloneErrorObject(error) });
            });

            getFilesInFolder(drive, { q: getFilterClause(dates, response.data.files[0].id) }, [],
                errCb, doneCb);
        }
    });
});

const getFilesInFolder = (drive, query, allFiles = [], errCb, doneCb) => {
    drive.files.list(query, (error, response) => {
        if (error) {
            errCb(error);
        }
        const { nextPageToken, files } = response.data;
        if (nextPageToken) {
            getFilesInFolder(drive, { ...query, nextPageToken }, [...allFiles, ...files], errCb, doneCb);
        }
        else {
            doneCb(allFiles);
        }
    });
}

const getFilterClause = (dates, folderId) => {
    let dateFilterClause = '';
    if (dates && dates.length > 0) {
        dateFilterClause += ' and (';
        dates.forEach(date => dateFilterClause += `name contains '${date}' or `);
        dateFilterClause = dateFilterClause.slice(0, dateFilterClause.lastIndexOf(' or '));
        dateFilterClause += ')';
    }
    return `'${folderId}' in parents${dateFilterClause}`;
}