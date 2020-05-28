const config = require("../config.json");
const request = require("request");
const path = require("path");

const smartThingsApiURL = "https://api.smartthings.com/v1";
const onCommand = { component: "main", capability: "switch", command: "on" };
const currentFileName = path.basename(__filename);

// SmartThings API Reference: https://smartthings.developer.samsung.com/docs/api-ref/st-api.html

module.exports = function (ICM) {
  ICM.events.on("alarmStatusChanged", function (alarmStatus) {
    // Only handle security or fire alarms
    if (
      alarmStatus != ICM.AlarmStatus.SecurityAlarm &&
      alarmStatus != ICM.AlarmStatus.FireAlarm
    ) {
      return;
    }

    const alarmDeviceId =
      alarmStatus == ICM.AlarmStatus.SecurityAlarm
        ? config.smart_things.device_ids.security_alarm
        : config.smart_things.device_ids.fire_alarm;

    const commandUrl = `${smartThingsApiURL}/devices/${alarmDeviceId}/commands`;

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
  });
};
