const Service = require('node-windows').Service;
const logger = require('./helper').getLogger('installLog.log');
// Create a new service object
var svc = new Service({
    name: 'Temple Server',
    description: 'Service for Temple Server',
    script: __dirname + '/service.js',
    nodeOptions: [
        '--harmony',
        '--max_old_space_size=4096'
    ],
});

//Check if service was installed correctly
svc.on('install', function () {
    logger.info('Temple Server service install complete.');
});

try {
    logger.info('Installing Temple Server service...');
    svc.install();
}
catch (error) {
    logger.error('Installing Temple Server service failed!');
    logger.error(error);
}
