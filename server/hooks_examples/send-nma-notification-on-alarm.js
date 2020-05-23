var nma = require("nma");
var apiKey = "apiKeyHere";

module.exports = function(ICM) {
  ICM.events.on("alarmStatusChanged", function(alarmStatus) {
    if (alarmStatus == 1 || alarmStatus == 2) {
      nma(
        apiKey,
        "alarm",
        alarmStatus == 1 ? "*** Security Alarm ***" : "*** Fire Alarm ***",
        ICM.getAlarmStatusDetail(false),
        2,
        "http://mydomain.com"
      );

      console.log("nma notification sent.");
    }
  });
};
