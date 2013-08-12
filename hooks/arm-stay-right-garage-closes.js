module.exports = function (ICM) {
	ICM.events.on('zoneStatusChanged', function(zoneNumber, isFaulted){
		if (zoneNumber == 18 && !isFaulted && ICM.armStatus == 0) {
			var now = new Date();
			var isWeekDay = (now.getDay() >= 1 && now.getDay() <= 5);
			var hour = now.getHours();
			if (isWeekDay && hour >= 6 && hour <= 9) { //6-9AM, M-F
				console.log('Sending F1 command (ARM STAY): Zone 17 unfaulted, 6-9AM M-F')
				ICM.executeCommand('F1'); //arm stay
			}
   	 	}
	});
};

