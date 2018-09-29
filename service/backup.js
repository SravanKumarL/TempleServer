const { Constants } = require('../src/server/constants/constants');
const { getCurrentDate } = require('../src/server/constants/constants');
var { spawn } = require('child_process');
const path = require('path');
const logger = require(__dirname + path.sep + 'helper').getLogger('backup.log');
var fs = require('fs');
const dirName = 'backupdumps';
if (!fs.existsSync(`./${dirName}`)) {
    fs.mkdirSync(`./${dirName}`);
}
module.exports.backup = () => {
    [Constants.Transactions, Constants.Users, Constants.Poojas].forEach(collection => {
        // const yesterday = new Date();
        // yesterday.setDate(yesterday.getDate() - 1);
        const dates = [getCurrentDate()/* , getCurrentDate(yesterday) */];
        // const backupProcess = exec(`mongoexport -d temple -c transactions -q "{createdDate: {$in: ['${dates}']}}"` +
        //     ` -o backupdump_${dates.join('_')}.json`);
        const backupProcess = spawn('mongoexport', ['-d', 'temple', '-c', collection,
            '-q', `"{createdDate: {$in: ['${dates}']}}"`, '-o',
            `/${dirName}/backup_${collection}dump_${dates.join('_')}.json`]);
        backupProcess.stdout.on('data', (data) => {
            logger.info(data.toString());
        });
        backupProcess.stderr.on('data', (data) => {
            logger.error(data.toString());
        });
        backupProcess.on('exit', (code) => {
            logger.info(`Backup of ${collection} ${code === 0 ? 'completed' : 'exited'} with code ${code}`);
        });
        backupProcess.on('error', err => logger.error(err));
        backupProcess.on('exit', code =>
            logger.fatal(`Backup of ${collection} ${code === 0 ? 'completed' : 'exited'} with code ${code}`));
        backupProcess.on('message', msg => logger.info(msg));
    });
}

