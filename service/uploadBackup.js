const { getDriveClient } = require('./driveHelpers');
const { cloneErrorObject } = require('../src/server/constants/constants');
const fs = require('fs');
const path = require('path');

console.log('gdrive backup process forked');
process.on('message', messageObj => {
    const { credentialsFilePath, dates } = messageObj;
    const backupDir = path.resolve(__dirname, '../backupdumps');
    const folderMimeType = 'application/vnd.google-apps.folder';
    const folderName = 'temple backup';
    const drive = getDriveClient(credentialsFilePath);
    drive.files.list({ q: `mimeType = '${folderMimeType}' and name = '${folderName}'` }, (listingError, response) => {
        if (listingError) {
            process.send({ error: cloneErrorObject(listingError) });
        }
        else {
            new Promise((resolve, reject) => {
                if (!response.data.incompleteSearch && response.data.files.length === 0) {
                    drive.files.create({ requestBody: { mimeType: folderMimeType, name: folderName } },
                        (error, response) => {
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
                        files.filter(file => dates.some(date => file.split('_')[2].indexOf(date) > -1))
                            .forEach(file => {
                                const filePath = backupDir + '\\' + file;
                                fs.readFile(filePath, (error, data) => {
                                    if (error) {
                                        process.send({ error: cloneErrorObject(error) });
                                    }
                                    else if (Object.keys(JSON.parse(data)) > 0) {
                                        fs.stat(filePath, async (fileSearchErr, fStat) => {
                                            if (fileSearchErr) {
                                                process.send({ error: cloneErrorObject(fileSearchErr) });
                                            }
                                            else {
                                                try {
                                                    await uploadToDrive(drive, filePath, file, folderId, fStat.size);
                                                }
                                                catch (error) {
                                                    process.send({ error: cloneErrorObject(error) });
                                                }
                                            }
                                        });
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

const uploadToDrive = async (drive, filePath, file, folderId, fileSize) => {
    // if (getCurrentDate(fStat.mtime) === getCurrentDate()) {
    await drive.files.create({
        media: {
            body: fs.createReadStream(filePath),
            mediaType: 'application/json'
        },
        requestBody: {
            mimeType: 'application/json',
            name: file,
            parents: [folderId]
        }
    },
        {
            onUploadProgress: event => {
                process.send(`${file} upload : ${Math.round((event.bytesRead / fileSize) * 100)}% complete`);
            }
        });
    // }
}
