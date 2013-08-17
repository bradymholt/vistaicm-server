/*

var prowl = require('prowler');
var prowlApiKey = 'prowlKeyHere';
var notification = new prowl.connection(prowlApiKey);

module.exports = function (ICM) {
	ICM.events.on('alarmStatusChanged', function(alarmStatus){
	   if (alarmStatus == 1 || alarmStatus == 2) {
		   notification.send({
			        'application': 'alarm',
			        'event': alarmStatus == 1 ? '*** Security Alarm ***' : '*** Fire Alarm ***',
			        'description': ICM.getAlarmStatusDetail(false),
			        'priority' : 2
		    });
	    
	    	console.log('Prowl notification sent.');
	    	
	    }
	});
};

*/
