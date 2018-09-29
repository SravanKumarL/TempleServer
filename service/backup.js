const { getCurrentDate } = require('../src/server/constants/constants');
var { spawn } = require('child_process');
const path = require('path');
const logger = require(__dirname + path.sep + 'helper').getLogger('backup.log');
module.exports.backup = () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const dates = [getCurrentDate()/* , getCurrentDate(yesterday) */];
    // const backupProcess = spawn(`mongoexport -d temple -c transactions -q "{createdDate: {$in: ['${dates}']}}"` +
    //     ` -o backupdump_${dates.join('_')}.json`);
    const backupProcess = spawn('mongoexport', ['-d', 'temple', '-c', 'transactions',
        '-q', `"{createdDate: {$in: ['${dates}']}}"`, '-o', `backupdump_${dates.join('_')}.json`]);
    backupProcess.stdout.on('data', (data) => {
        logger.info(data.toString());
    });

    backupProcess.stderr.on('data', (data) => {
        logger.error(data.toString());
    });
    backupProcess.on('exit', (code) => {
        logger.info(`Backup ${code === 0 ? 'completed' : 'exited'} with code ${code}`);
    });
    backupProcess.on('error', err => logger.error(err));
    backupProcess.on('exit', code => logger.fatal(`Backup ${code === 0 ? 'completed' : 'exited'} with code ${code}`));
    backupProcess.on('message', msg => logger.info(msg));
}
// const offset = new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate(), 22, 22, 0, 0).getTime()
//     - Date.now();
// setTimeout(backup, offset);

