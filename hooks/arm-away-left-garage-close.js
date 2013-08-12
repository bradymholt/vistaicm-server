module.exports = function (ICM) {
	ICM.events.on('zoneStatusChanged', function(zoneNumber, isFaulted){
		if (zoneNumber == 17 && !isFaulted && ICM.armStatus == 0) {
			var now = new Date();
			var isWeekDay = (now.getDay() >= 1 && now.getDay() <= 5);
			var hour = now.getHours();
			if (isWeekDay && hour >= 8 && hour <= 16) { //8-5PM, M-F
				console.log('Sending F2 command (ARM AWAY): Zone 18 unfaulted, 8-5PM M-F')
				ICM.executeCommand('F2'); //arm away
			}
   	 	}
	});
};

