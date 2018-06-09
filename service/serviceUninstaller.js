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
// Check if service was uninstalled correctly
svc.on('uninstall', () => logger.info('Temple Server service uninstalling complete.'));

try {
    logger.info('Uninstalling Temple Server service...');
    svc.uninstall();
}
catch (error) {
    logger.error('Uninstalling Temple Server service failed!');
    logger.error(error);
}