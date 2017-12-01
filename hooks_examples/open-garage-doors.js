var request = require("request");
var dgram = require("dgram");
var relayApiIpAddress = null;
var relayApiPort = 3000;

module.exports = function(ICM, UI) {
  var commands = {
    f5e56965: { description: "LEFT GARAGE", relayNumber: "1" },
    b3915a31: { description: "RIGHT GARAGE", relayNumber: "2" }
  };

  // add buttons for each command
  Object.keys(commands).forEach(function(id) {
    var label = commands[id].description;
    UI.addButton(label, id, false, true);
  });

  ICM.events.on("externalCommand", function(id) {
    var command = commands[id];

    if (!relayApiIpAddress) {
      console.log(
        command.description + ": Error: Garage Door Relay API not discovered"
      );
      return;
    }

    var request_url = `http://${relayApiIpAddress}:${relayApiPort}/relays/${
      command.relayNumber
    }`;

    console.log(command.description + ": sending command");
    console.log("Executing Command: PUT " + request_url);

    request(
      { url: request_url, method: "PUT", json: { relay: { state: "closed" } } },
      function(error, response, body) {
        if (error) {
          console.log(command.description + error);
        } else if (!response.statusCode.toString().startsWith("2")) {
          console.log(
            command.description +
              " Error: Status Code returned was " +
              response.statusCode.toString()
          );
        } else {
          console.log("Got response: " + response.statusCode.toString());
          console.log(command.description + ": SUCCESS");
        }
      }
    );
  });

  // Setup UDP broadcast socket to discover API address
  var udpClient = dgram.createSocket("udp4");
  udpClient.bind(41234);
  udpClient.on("message", function(msg, rinfo) {
    if (!relayApiIpAddress) {
      console.log("Garage Door Relay API discovered at: " + rinfo.address);
    }

    relayApiIpAddress = rinfo.address;
  });
};
