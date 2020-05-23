import config from "./config.json";

import fs from "fs";
import nstatic from "node-static";
import http from "http";
import io from "socket.io";
import ICM, { AlarmStatus, ArmStatus } from "./ICM";
import { IncomingMessage, ServerResponse } from "http";

const fileServer = new nstatic.Server(__dirname + "/www/");

export default class Server {
  static generatedIndexHtml = false;
  port: number;
  ui: any;
  icm: ICM;

  constructor(port: number, icm: ICM) {
    this.port = port;
    this.icm = icm;
  }

  initialize() {
    if (!Server.generatedIndexHtml) {
      Server.generateIndexHtml();
      Server.generatedIndexHtml = true;
    }

    const webServer = http.createServer(this.handleWebRequest);
    const webSocketServer = io.listen(webServer);
    webServer.listen(this.port, () => {
      console.log(`Listening on http://0.0.0.0:${this.port} ...`);
      this.setupSockerServerHandlers(webSocketServer);
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
      res.end("Command Executed: " + query.command);
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
    } else {
      // Serve files
      req
        .addListener("end", function () {
          fileServer.serve(req, res);
        })
        .resume();
    }
  }

  setupSockerServerHandlers(socketServer: io.Server) {    

    socketServer.of("/command").on("connection", (socket) => {
      socket.on("execute", (command) => {
        this.icm.executeCommand(command);
      });
    });

    socketServer.of("/display").on("connection", (socket) => {
      socket.emit("updated", { text: this.icm.lastDisplayText });
    });

    this.icm.events.on("displayChanged", function (displayText) {
      socketServer.of("/display").emit("updated", { text: displayText });
    });

    console.log(" [ok]");
  }

  static generateIndexHtml() {
    // generate index.html
    process.stdout.write("Generating index.html");

    var templateFileContent = fs
      .readFileSync(__dirname + "/www/index.template.html")
      .toString();

    fs.writeFileSync(__dirname + "/www/index.html", templateFileContent);
    console.log(" [ok]");
  }

  static start(ports: number[], icm: ICM) {
    for (let port of ports) {
      const server = new Server(port, icm);
      server.initialize();
    }
  }
}
