'use strict';

var dgram = require('dgram')
  , http = require('http')
  , evt = require('events')
  , http = require('http')
  , fs = require('fs')
  , io = require('socket.io')
  , nstatic = require('node-static')
  , config = require('./config');

var udpListenPort = 3947;
var udpClient = dgram.createSocket('udp4');
var fileServer = new nstatic.Server(__dirname + '/www/');
var webServer = http.createServer(serverHandler);
var webSocketServer = io.listen(webServer);

var ICM = {
  ipAddress: null,
  armStatus: 0,  //0=Disarmed, 1=ArmedStay, 2=ArmedAway 
  alarmStatus: 0, //0=NoAlarm, 1=SecurityAlarm, 2=FireAlarm
  isReady: true,
  lastDisplayText: '',
  zones: {},
  events: new evt.EventEmitter(),
  executeCommand: function (command) {
    if (command !== undefined) {
      if (command.indexOf('A-') == 0) {
        // Auxiliary command: command comes in as "A-Pound-7-0-1" and will be translated to "1-2-3-4-Pound-7-0-1" where 1-2-3-4 is config.pound_commands
        ICM.events.emit('auxiliaryCommand', command);
        command = command.replace('A-', config.pound_commands.join('-').concat('-'));
      } else if (command.indexOf('E-') == 0) {
        var externalCommand = command.replace('E-', '');
        // External command: just emit an event and stop
        ICM.events.emit('externalCommand', externalCommand);
        return;
      }

      var commandParts = command.split('-');
      ICM.executeComands(commandParts);
    }
    else {
      console.log('error: command undefined');
    }
  },
  executeComands: function (commands) {
    var command = commands.shift();
    var commandUrl = 'http://' + ICM.ipAddress + '/cmd?cmd=' + command;
    console.log('Executing Command: GET ' + commandUrl);
    http.get(commandUrl, function (res) {
      console.log("Got response: " + res.statusCode);
      if (commands.length > 0) {
        ICM.executeComands(commands);
      }
    }).on('error', function (e) {
      console.log("Got error: " + e.message);
    });
  },
  getAlarmStatusDetail: function (html) {
    var detail = '';
    if (ICM.lastDisplayText.toUpperCase().indexOf('ALARM') >= 0) {
      detail += ICM.lastDisplayText;
    }
    detail += ICM.getZoneFaultList(html);
    return detail;
  },
  getZoneFaultList: function (html) {
    var list = '';
    Object.keys(ICM.zones).forEach(function (key) {
      if (ICM.zones[key] == true) {
        list += html ? '<br/>' : '\n';
        list += 'Zone ' + key + ': Faulted';
      }
    });
    return list;
  }
};

var UI = {
  buttons: [],
  addButton: function (label, command, isAuxiliary, isExternal) {
    if (isAuxiliary) {
      command = 'A-' + command;
    }
    else if (isExternal) {
      command = 'E-' + command;
    }

    UI.buttons.push({ label: label, command: command, is_aux: isAuxiliary, is_ext: isExternal })
  }
};

ICM.events.on('readyChanged', function (isReady) {
  // zoneStatusChanged events are slow from the ICM but readyChanged event is quick so we'll
  // use it as an indirect way to detect zoneStatusChanged (unfaulted).
  Object.keys(ICM.zones).forEach(function (key) {
    if (ICM.zones[key] == true) {
      ICM.zones[key] = false;
      ICM.events.emit('zoneStatusChanged', key, false);
    }
  });
});

udpClient.on('message', function (msg, rinfo) {
  if (!ICM.ipAddress) {
    console.log("ICM discovered at: " + rinfo.address);
  }

  ICM.ipAddress = rinfo.address;

  //variable message
  if (msg[0] == 0x02 && msg[1] == 0x04) {
    var msgContent = msg.toString('ascii');
    var msgType = msgContent.substring(msgContent.lastIndexOf('.') + 1, msgContent.indexOf('='));
    var msgValue = msgContent.substring(msgContent.indexOf('=') + 1).replace(/[^0-9a-z ]/i, '');
    switch (msgType) {
      case 'display':
        var displayText = msgValue.replace('\u0000', '');
        ICM.lastDisplayText = displayText;
        ICM.events.emit('displayChanged', displayText);
        break;
      case 'ArmStatus': // this.ArmStatus = ArmStatus.Disarmed;,  0=Disarmed,1=ArmedStay,2=ArmedAway
        var armStatus = parseInt(msgValue);
        if (ICM.armStatus != armStatus) {
          ICM.armStatus = armStatus;
          ICM.events.emit('armStatusChanged', armStatus);
        }
        break;
      case 'Ready': //0=NotReady,1=Ready
        var isReady = (msgValue == '1');
        if (ICM.isReady != isReady) {
          ICM.isReady = isReady;
          ICM.events.emit('readyChanged', isReady);
        }
        break;
      case 'AlarmEvent':  //this.AlarmState = (count == 0 ? AlarmState.NoAlarm : AlarmState.Alarm);
        var alarmStatus = (msgValue == '0' ? 0 : 1);
        if (ICM.alarmStatus != alarmStatus) {
          ICM.alarmStatus = alarmStatus;
          ICM.events.emit('alarmStatussChanged', alarmStatus);
        }
        break;
      case 'FireEvent': //this.AlarmState = (count == 0 ? AlarmState.NoAlarm : AlarmState.Fire);
        var alarmStatus = (msgValue == '0' ? 1 : 2);
        if (ICM.alarmStatus != alarmStatus) {
          ICM.alarmStatus = alarmStatus;
          ICM.events.emit('alarmStatusChanged', alarmStatus);
        }
        break;
      default: //ZS.3=0 // 0=NotFaulted,1,2=IsFaulted
        var zoneNumber = parseInt(msgType);
        if (!isNaN(zoneNumber)) {
          var isFaulted = (msgValue != '0');

          if (ICM.zones[zoneNumber] != isFaulted) {
            ICM.zones[zoneNumber] = isFaulted;
            ICM.events.emit('zoneStatusChanged', zoneNumber, isFaulted);
          }
        }
        break;
    }
  }
  //command message
  else if (msg[0] == 0x04 && msg[1] == 0x01) {
    var msgContent = msg.toString('ascii');
    var msgValue = msgContent.substring(msgContent.lastIndexOf(':') + 1).replace(/[^0-9a-z ]/i, '');
    switch (msgValue) {
      case 'Alarm': // this.AlarmState = AlarmState.Alarm;
        if (ICM.alarmStatus != 1) {
          ICM.alarmStatus = 1;
          ICM.events.emit('alarmStatusChanged', ICM.alarmStatus);
        }
        break;
      case 'Fire': //this.AlarmState = AlarmState.Fire;
        if (ICM.alarmStatus != 2) {
          ICM.alarmStatus = 2;
          ICM.events.emit('alarmStatusChanged', ICM.alarmStatus);
        }
        break;
      case 'Armed Away': //this.ArmStatus = ArmStatus.ArmedAway;
        if (ICM.armStatus != 2) {
          ICM.armStatus = 2;
          ICM.events.emit('armStatusChanged', ICM.armStatus);
        }
        break;
      case 'Armed Stay': //this.ArmStatus = ArmStatus.ArmedStay;
        if (ICM.armStatus != 1) {
          ICM.armStatus = 1;
          ICM.events.emit('armStatusChanged', ICM.armStatus);
        }
        break;
      case 'Disarmed': //this.ArmStatus = ArmStatus.Disarmed;
        if (ICM.armStatus != 0) {
          ICM.armStatus = 0;
          ICM.events.emit('armStatusChanged', ICM.armStatus);
        }
        break;
      case 'Low Battery':
        ICM.events.emit('statusEvent', 1);
        break;
      case 'Power Failure':
        ICM.events.emit('statusEvent', 2);
        break;
      case 'Power Returned':
        ICM.events.emit('statusEvent', 3);
        break;
    }
  }
});

//http file server
function serverHandler(req, res) {
  if (req.url.indexOf('/execute') == 0) {
    var url = require('url');
    var url_parts = url.parse(req.url, true);
    var query = url_parts.query;
    ICM.executeCommand(query.command)

    res.writeHead(200);
    res.end('Command Executed: ' + query.command);
  }
  else {
    req.addListener('end', function () {
      fileServer.serve(req, res);
    }).resume();
  }
}

webSocketServer
  .of('/command')
  .on('connection', function (socket) {
    socket.on('execute', function (command) {
      ICM.executeCommand(command);
    });
  });

webSocketServer
  .of('/display')
  .on('connection', function (socket) {
    socket.emit('updated', { text: ICM.lastDisplayText });
  });

ICM.events.on('displayChanged', function (displayText) {
  webSocketServer
    .of('/display')
    .emit('updated', { text: displayText });
});

console.log("Booting vista-icm-server");
// load hooks
console.log('Loading hooks');
require('fs').readdirSync(__dirname + '/hooks/').forEach(function (file) {
  if (file.indexOf('.js') > -1) {
    process.stdout.write('   ' + file);
    require(__dirname + '/hooks/' + file)(ICM, UI);
    console.log(' [ok]');
  }
});

// generate index.html
process.stdout.write('Generating index.html');
var templateFile = './www/index.template.html';
var buttons_html = UI.buttons.map((btn) => {
  let btnClass = btn.is_aux || btn.is_ext ? "darkblue" : "blue";
  let btnStyle = btn.label.length > 5 ? "font-size: x-small;" : "";
  return `
<div class="button ${btnClass}" id="${btn.command}" style="${btnStyle}">
  ${btn.label}
</div>`;
});

var templateFileContent = fs.readFileSync(templateFile).toString();
templateFileContent = templateFileContent.replace("{{button_hooks}}", buttons_html.join('\n'));
fs.writeFileSync('./www/index.html', templateFileContent);
console.log(" [ok]");

udpClient.bind(udpListenPort, () => {
    console.log('UDP client listening on port ' + udpListenPort);
});
webServer.listen(config.http_listen_port, () => {
  console.log("HTTP server listening on port " + config.http_listen_port);
});
