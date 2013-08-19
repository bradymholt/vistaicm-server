var cronJob = require('cron').CronJob;

module.exports = function (ICM) {
	//ARM nightly at 11PM
	//new cronJob('0 0 24 * * *', function(){
    //	ICM.executeCommand('F4'); //F4 = Function Key #4 on Keypad
	//}).start();

	//Disarm Sunday mornings at 9:30 AM
	//new cronJob('0 30 9 * * 0', function(){
    //	ICM.executeCommand('5-5-5-5-1'); // Simulate pressing 5,5,5,5,1 on Keypad.   
	//}).start();
};

