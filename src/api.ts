import config from "./config.json";

import http from "http";
import ICM, { AlarmStatus, ArmStatus } from "./ICM";
import { IncomingMessage, ServerResponse } from "http";

export default class API {
  port: number;
  ui: any;
  icm: ICM;

  constructor(port: number, icm: ICM) {
    this.port = port;
    this.icm = icm;
  }

  startup() {
    const server = http.createServer(this.handleWebRequest.bind(this));
    server.listen(this.port, () => {
      console.log(`API server listening on http://0.0.0.0:${this.port} ...`);
    });
  }

  handleWebRequest(req: IncomingMessage, res: ServerResponse) {
    if (req.url!.indexOf("/execute") == 0) {
      // Execute command
      var url = require("url");
      var url_parts = url.parse(req.url, true);
      var query = url_parts.query;
      this.icm.executeCommand(query.command);

      res.writeHead(200);
      res.end();
    } else if (req.url!.indexOf("/status") > -1) {
      // Return status
      var status = "";

      if (this.icm.alarmStatus != AlarmStatus.NoAlarm) {
        // If alarm is faulted, return the alarmStatus
        switch (this.icm.alarmStatus) {
          case AlarmStatus.SecurityAlarm:
            status = "alarm_security";
            break;
          case AlarmStatus.FireAlarm:
            status = "alarm_fire";
            break;
        }
      } else {
        // Otherwise, return the armStatus
        switch (this.icm.armStatus) {
          case ArmStatus.Disarmed:
            status = "disarmed";
            break;
          case ArmStatus.ArmedStay:
            status = "armed_stay";
            break;
          case ArmStatus.ArmedAway:
            status = "armed_away";
            break;
        }
      }

      res.setHeader("Content-Type", "application/json");
      res.writeHead(200);
      res.end(JSON.stringify({ status }));
    }
  }
}
