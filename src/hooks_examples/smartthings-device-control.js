var request = require("request");

function sendRequest(method, path, body) {
  var request_url = `https://graph-na02-useast1.api.smartthings.com/api/smartapps/installations/[smartthings_installation]/${
    path
  }`;
  console.log(`Sending Request: ${method} ${request_url}`);

  request({
    url: request_url,
    method: method,
    headers: {
      Authorization: "Bearer [smartthings_access_token]"
    },
    json: true,
    body: body,
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
  });
}

module.exports = function(ICM, UI) {
  var commands = {
    d1e51918: {
      description: "OFFICE LIGHT ON",
      deviceId: "04941a94-b300-4803-91f5-4b7b87f5e8e9",
      deviceCommand: "on"
    },
    f9a90ef7: {
      description: "OFFICE LIGHT OFF",
      deviceId: "04941a94-b300-4803-91f5-4b7b87f5e8e9",
      deviceCommand: "off"
    },
    a7822b78: {
      description: "DEN LIGHT ON",
      deviceId: "b9e3765f-ebd0-4c6f-a88d-34fe6abc8f46",
      deviceCommand: "on"
    },
    "493be820": {
      description: "DEN LIGHT OFF",
      deviceId: "b9e3765f-ebd0-4c6f-a88d-34fe6abc8f46",
      deviceCommand: "off"
    }
  };

  // add buttons for each command
  Object.keys(commands).forEach(function(id) {
    var label = commands[id].description;
    UI.addButton(label, id, false, true);
  });

  // Handle commands
  ICM.events.on("externalCommand", function(id) {
    var command = commands[id];

    if (!command) {
      // Do nothing
    } else {
      console.log(command.description + ": sending command");
      sendRequest(
        "POST",
        `device/${command.deviceId}/command/${command.deviceCommand}`
      );
    }
  });
};
