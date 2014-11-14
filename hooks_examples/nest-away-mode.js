var nest = require('unofficial-nest-api');

module.exports = function (ICM) {
	ICM.events.on('armStatusChanged', function(armStatus){
	   if (armStatus == 1 || armStatus == 0) {
		nest.login('john.doe@gmail.com', 'secretPasswordHere', function(){
  			nest.fetchStatus(function(){
        			nest.setAway(armStatus==1);
  			});
		});
	    }
	});
};
