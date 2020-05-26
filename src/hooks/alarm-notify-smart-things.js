const config = require("../config.json");
const request = require("request");
const path = require("path");

const smartThingsApiURL = "https://api.smartthings.com/v1";
const securityAlarmDeviceId = config.smart_things.alarm_device_id;
const commandUrl = `${smartThingsApiURL}/devices/${securityAlarmDeviceId}/commands`;
const onCommand = { component: "main", capability: "switch", command: "on" };

module.exports = function (ICM) {
  ICM.events.on("alarmStatusChanged", function (alarmStatus) {
    if (alarmStatus == 1 || alarmStatus == 2) {
      // security or fire alarm

      const currentFileName = path.basename(__filename);
      console.log(
        `(hook) ${currentFileName}: Sending command request to SmartThings API: ${commandUrl}`
      );

      request(
        {
          url: commandUrl,
          method: "POST",
          headers: {
            Authorization: `Bearer ${config.smart_things.api_access_token}`,
          },
          json: {
            commands: [onCommand],
          },
        },
        function (err, res, body) {
          if (err) {
            console.log(
              `(hook) ${currentFileName}: Error when notifying SmartThings of Alarm: ${err}`
            );
          } else {
            console.log(
              `(hook) ${currentFileName}: Response when notifiying SmartThings of Alarm: ${res.statusCode.toString()}`
            );
          }
        }
      );
    }
  });
};
