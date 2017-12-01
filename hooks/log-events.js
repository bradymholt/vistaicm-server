var cronJob = require("cron").CronJob;

module.exports = function(ICM) {
  ICM.events.on("displayChanged", function(display) {
    // Not logging displayChanged because it is *very* chatty
    // console.log('Display: ' + display);
  });

  ICM.events.on("armStatusChanged", function(armStatus) {
    console.log("Arm Status: " + armStatus);
  });

  ICM.events.on("readyChanged", function(isReady) {
    console.log("Ready: " + isReady);
  });

  ICM.events.on("alarmStatusChanged", function(alarmStatus) {
    console.log("Alarm Status: " + alarmStatus);
  });

  ICM.events.on("zoneStatusChanged", function(zoneNumber, isFaulted) {
    console.log("Zone: " + zoneNumber + ", " + isFaulted);
  });

  ICM.events.on("statusEvent", function(statusEvent) {
    console.log("Status Event: ", statusEvent);
  });
};
