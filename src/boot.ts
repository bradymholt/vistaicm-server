import config from "./config.json";
import fs from "fs";

import ICM from "./ICM";
import webServer from "./webServer";

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
webServer.start(config.web_listen_ports, icm);
