import config from "./config.json";
import fs from "fs";

import ICM from "./ICM";
import web from "./web";
import api from "./api";

function loadHooks(icm: ICM) {
  console.log("Loading hooks");
  const hookFiles = fs.readdirSync(__dirname + "/hooks/");
  for (let file of hookFiles) {
    if (file.includes(".js")) {
      process.stdout.write("   " + file);
      require(__dirname + "/hooks/" + file)(icm);
      console.log(" [ok]");
    }
  }
}

console.log("Booting vistaicm-server");

const icm = new ICM();

icm.initialize();
loadHooks(icm);

// Web interface
const webInterface = new web(config.web_interface_port, icm);
webInterface.startup();

// Rest APIs
for (let port of config.api_listen_ports) {
  const apiServer = new api(port, icm);
  apiServer.startup();
}
