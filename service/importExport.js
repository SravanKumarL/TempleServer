const { Constants } = require('../src/server/constants/constants');
const { getCurrentDate } = require('../src/server/constants/constants');
const { logError, attachEventHandlers } = require('./helper');
const backupModel = require('../src/server/models/backup');
const restoreModel = require('../src/server/models/restore');
const { spawn } = require('child_process');
const path = require('path');
const logger = require(__dirname + path.sep + 'helper').getLogger('backup.log');
const fs = require('fs');
const { authAndForkDriveProcess } = require('./driveHelpers');

const dirName = 'backupdumps';
if (!fs.existsSync(`./${dirName}`)) {
    fs.mkdirSync(`./${dirName}`);
}
const credentialsFilePath = __dirname + '/assets/client_id.json';

//#region Backup
module.exports.backup = (dates = [getCurrentDate()]) => {
    // let isBackupSetup = false;
    
    //Check for backup collection if it exists
    // backupModel.estimatedDocumentCount((err, count) => {
    //     isBackupSetup = count > 0;
    Promise.all([Constants.Transactions, Constants.Users, Constants.poojaCollection].map(collection => {
        return new Promise(resolve => {
            const backupFilePath = `${dirName}/backup_${collection}_${dates.join('_')}.json`;
            const exportargs = ['-d', 'temple', '-c', collection, '--jsonArray',
                '-o', backupFilePath];
            //If already present
            // if (isBackupSetup) {
            exportargs.push('-q', `"{createdDate: {$in: ['${dates}']}}"`);
            // }
            const backupProcess = spawn('mongoexport', exportargs);
            const onBackupComplete = () => resolve(backupFilePath);
            attachEventHandlers(backupProcess, logger, collection, 'Backup', onBackupComplete);
        });
    })).then((backupFilePaths) => {
        //gDriveBackup
        authAndForkDriveProcess(credentialsFilePath, logger, __dirname + '\\uploadBackup.js', dates);

        backupFilePaths.forEach(backupFilePath => new backupModel({ createdDate: new Date(), backupFilePath })
            .save(err => {
                if (err) {
                    logError(logger, `Error occured while saving to backup collection : ${err}`);
                }
            }));
    });
    // });
}
//#endregion


//#region Restore
module.exports.restore = (dates = []) => {
    try {
        //Clean up combined.json files
        const files = fs.readdirSync(`./${dirName}`);
        files.filter(file => file.indexOf('combined') > -1).forEach(file => fs.unlinkSync(`./${dirName}/${file}`));


        new Promise((resolve, reject) => {
            const localBackupFiles = fs.readdirSync(dirName).map(file => path.resolve(`./${dirName}/${file}`))
                .filter(file => dates.some(date => file.split('_')[2].indexOf(date) > -1));
            if (localBackupFiles.length > 0) {
                resolve(localBackupFiles);
            }
            else {
                const onDownloadComplete = ({ files }) => resolve(files);
                authAndForkDriveProcess(credentialsFilePath, logger, __dirname + '\\downloadBackup.js',
                    dates, onDownloadComplete);
            }
        }).then(backupFiles => {
            if (backupFiles.length > 0) {
                const fileCollsPromise = backupFiles.reduce((acc, file) => {
                    //Each backup file is in format : backup_<collection name>_<date stamp>.json
                    const collection = file.split('_')[1];
                    return {
                        ...acc, [collection]: acc[collection].then(json => {
                            return Promise.resolve([...json, ...JSON.parse(fs.readFileSync(file))]);
                        })
                    };
                },
                    {
                        [Constants.poojaCollection]: Promise.resolve([]),
                        [Constants.Users]: Promise.resolve([]),
                        [Constants.Transactions]: Promise.resolve([])
                    });
                forkImportProcess(fileCollsPromise);
            }
        }).catch(error => {
            logError(logger, error);
        });
    }
    catch (error) {
        logError(logger, error);
    }
}

const forkImportProcess = fileCollsPromise => {
    Promise.all(Object.keys(fileCollsPromise).map(collection => {
        //Combine all backups to one single file and execute import
        return fileCollsPromise[collection].then(jsonContent => {
            if (Object.keys(jsonContent) > 0) {
                const fileName = `./${dirName}/${collection}_combined.json`;
                fs.writeFileSync(fileName, JSON.stringify(jsonContent));
                const importargs = ['-d', 'temple', '--collection', collection, '--file', fileName,
                    '--mode', 'upsert', '--jsonArray'];
                const restoreProcess = spawn('mongoimport', importargs);
                attachEventHandlers(restoreProcess, logger, collection, 'Restore', () => fs.unlinkSync(fileName));
            }
        }).catch(error => {
            logError(logger, error);
        });
    })).then(() => {
        new restoreModel({ restoredDate: new Date() }).save(err => {
            if (err) {
                logError(logger, `Error occured while saving to restore collection : ${err}`);
            }
        });
    });
}

//#endregion
