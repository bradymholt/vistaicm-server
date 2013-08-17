var cronJob = require('cron').CronJob;

module.exports = function (ICM) {
	var job = new cronJob('0 0 23 * * *', function(){ //11PM
    	ICM.executeCommand('F4'); //arm night
	});

	job.start();
};

