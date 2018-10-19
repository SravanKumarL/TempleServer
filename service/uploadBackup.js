const { getDriveClient, searchDrive, getFilesFilterClause } = require('./driveHelpers');
const { cloneErrorObject } = require('../src/server/constants/constants');
const fs = require('fs');
const path = require('path');
const folderMimeType = 'application/vnd.google-apps.folder';
const templeFolderName = 'temple backup';

console.log('gdrive backup process forked');
process.on('message', messageObj => {
    const { credentialsFilePath, dates } = messageObj;
    const backupDir = path.resolve(__dirname, '../backupdumps');
    const drive = getDriveClient(credentialsFilePath);
    drive.files.list({ q: `mimeType = '${folderMimeType}' and name = '${templeFolderName}' and trashed = false` },
        (listingError, response) => {
            if (listingError) {
                process.send({ error: cloneErrorObject(listingError) });
            }
            else {
                new Promise((resolve, reject) => {
                    if (!response.data.incompleteSearch && response.data.files.length === 0) {
                        createNewFolder(drive, templeFolderName, resolve, reject);
                    } else {
                        createFolder(drive, response.data.files, resolve, reject);
                    }
                }).then(folderId => {
                    fs.readdir(backupDir, (error, files) => {
                        if (error) {
                            process.send({ error: cloneErrorObject(error) });
                        }
                        else {
                            const errCb = error => process.send({ error: cloneErrorObject(error) });
                            const doneCb = gdriveFiles => {
                                const gdriveFileNames = gdriveFiles.map(gdriveFile => gdriveFile.name);
                                const toBeUploadedFiles = files.filter(fileName => {
                                    // dates.some(date => file.split('_')[2].indexOf(date) > -1)
                                    if (gdriveFiles.length === 0) {
                                        return true;
                                    }
                                    return gdriveFileNames.indexOf(fileName) === -1;
                                });
                                //Check if there is any file to upload at all
                                if (toBeUploadedFiles.length === 0) {
                                    process.send({ done: [] });
                                } else {
                                    Promise.all(toBeUploadedFiles.map(fileName =>
                                        readFileAndUploadToDrive(backupDir + '\\' + fileName, drive, fileName,
                                            folderId, msg => process.send(msg)))).then(filePaths => {
                                                process.send({ done: filePaths.filter(filePath => filePath) });
                                            }).catch(errors => errors.forEach(error => process.send(error)));
                                }
                            }
                            searchDrive(drive, getFilesFilterClause([], folderId), [], errCb, doneCb);
                        }
                    });
                }).catch(error => {
                    process.send({ error: cloneErrorObject(error) });
                });
            }
        });
    console.log('logging into drive');
});


const createFolder = (drive, folders, doneCb, errCb) => {
    let validFolderId;
    Promise.all(folders.map(folder =>
        new Promise((folderRes, folderRej) => {
            const errCb = error => errCb(error);
            const doneCb = files => {
                if (files.length > 0) {
                    validFolderId = folder.id;
                    folderRes(folder.id);
                } else {
                    //Clean all empty folders
                    drive.files.delete({ fileId: folder.id }, {
                        transformResponse: (data, headers) => {
                            folderRes(data);
                        }
                    });
                }
            };
            searchDrive(drive, getFilesFilterClause([], folder.id), [], errCb, doneCb);
        })
    )).then(folderRes => {
        if (validFolderId) {
            doneCb(validFolderId);
        }
        else {
            createNewFolder(drive, templeFolderName, doneCb, errCb);
        }
    }).catch(folderRej => errCb(folderRej));
}

const createNewFolder = (drive, folderName, doneCb, errCb) => drive.files
    .create({ requestBody: { mimeType: folderMimeType, name: folderName } }, (error, response) => {
        if (error) {
            errCb(error);
        }
        doneCb(response.data.id);
    });

const readFileAndUploadToDrive = (filePath, drive, fileName, folderId, fileMonitorCb) =>
    new Promise((resolve, reject) => fs.readFile(filePath, (error, data) => {
        if (error) {
            reject({ error: cloneErrorObject(error) });
        }
        else if (JSON.parse(data).length > 0) {
            fs.stat(filePath, async (fileSearchErr, fStat) => {
                if (fileSearchErr) {
                    reject({ error: cloneErrorObject(fileSearchErr) });
                }
                else {
                    try {
                        await uploadToDrive(drive, filePath, fileName, folderId, fStat.size, fileMonitorCb);
                        resolve(filePath);
                    }
                    catch (error) {
                        reject({ error: cloneErrorObject(error) });
                    }
                }
            });
        }
        else {
            resolve();
        }
    }));


const uploadToDrive = async (drive, filePath, fileName, folderId, fileSize, fileMonitorCb = (() => { })) => {
    // if (getCurrentDate(fStat.mtime) === getCurrentDate()) {
    await drive.files.create({
        media: {
            body: fs.createReadStream(filePath),
            mediaType: 'application/json'
        },
        requestBody: {
            mimeType: 'application/json',
            name: fileName,
            parents: [folderId]
        }
    },
        {
            onUploadProgress: event => {
                fileMonitorCb(`${fileName} upload : ${Math.round((event.bytesRead / fileSize) * 100)}% complete`);
            }
        });
    // }
}
