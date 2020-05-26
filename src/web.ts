import config from "./config.json";

import fs from "fs";
import nstatic from "node-static";
import http from "http";
import io from "socket.io";
import ICM from "./ICM";
import { IncomingMessage, ServerResponse } from "http";

const fileServer = new nstatic.Server(__dirname + "/www/");

export default class Web {
  port: number;
  ui: any;
  icm: ICM;

  constructor(port: number, icm: ICM) {
    this.port = port;
    this.icm = icm;
  }

  startup() {
    this.generateIndexHtml();

    const webServer = http.createServer(
      (req: IncomingMessage, res: ServerResponse) => {
        // Serve files
        req
          .addListener("end", function () {
            fileServer.serve(req, res);
          })
          .resume();
      }
    );

    const webSocketServer = io.listen(webServer);
    webServer.listen(this.port, () => {
      console.log(
        `Web interface server listening on http://0.0.0.0:${this.port} ...`
      );
      this.setupSockerServerHandlers(webSocketServer);
    });
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
  }

  generateIndexHtml() {
    // generate index.html
    process.stdout.write("Generating index.html");

    var templateFileContent = fs
      .readFileSync(__dirname + "/www/index.template.html")
      .toString();

    fs.writeFileSync(__dirname + "/www/index.html", templateFileContent);
    console.log(" [ok]");
  }
}
