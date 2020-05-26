import config from "./config.json";
import evt from "events";
import http from "http";
import dgram, { RemoteInfo } from "dgram";

// The Vista-ICM broadcasts UDP packets on this port.
const udpListenPort = 3947;

export enum ArmStatus {
  Disarmed = 0,
  ArmedStay = 1,
  ArmedAway = 2,
}

export enum AlarmStatus {
  NoAlarm = 0,
  SecurityAlarm = 1,
  FireAlarm = 2,
}

export enum ReadyStatus {
  NotReady = "0",
  Ready = "1",
}

export enum StatusEvent {
  LowBattery = 1,
  PowerFailure = 2,
  PowerReturned = 3,
}

export default class ICM {
  ipAddress: string | null = null;
  armStatus: ArmStatus = ArmStatus.Disarmed;
  alarmStatus: AlarmStatus = AlarmStatus.NoAlarm;
  isReady = true;
  lastDisplayText = "";
  zones = {} as { [key: string]: boolean };
  events = new evt.EventEmitter();

  executeCommand(command: string) {
    if (command !== undefined) {
      if (command.indexOf("A-") == 0) {
        // Auxiliary command: command comes in as "A-Pound-7-0-1" and will be translated to "1-2-3-4-Pound-7-0-1" where 1-2-3-4 is config.poundCommands
        this.events.emit("auxiliaryCommand", command);
        command = command.replace(
          "A-",
          config.pound_commands.join("-").concat("-")
        );
      } else if (command.indexOf("E-") == 0) {
        const externalCommand = command.replace("E-", "");
        // External command: just emit an event and stop
        this.events.emit("externalCommand", externalCommand);
        return;
      }

      const commandParts = command.split("-");
      this.executeComands(commandParts);
    } else {
      console.log("error: command undefined");
    }
  }

  executeComands(commands: string[]) {
    var command = commands.shift();
    var commandUrl = `http://${this.ipAddress}/cmd?cmd=${command}`;
    console.log("Executing Command: GET " + commandUrl);

    http
      .get(commandUrl, (res) => {
        console.log("Got response: " + res.statusCode);
        if (commands.length > 0) {
          this.executeComands(commands);
        }
      })
      .on("error", function (e) {
        console.log("Got error: " + e.message);
      });
  }

  getAlarmStatusDetail(htmlFormatted: boolean) {
    var detail = "";
    if (this.lastDisplayText.toUpperCase().indexOf("ALARM") >= 0) {
      detail += this.lastDisplayText;
    }
    detail += this.getZoneFaultList(htmlFormatted);
    return detail;
  }

  getZoneFaultList(htmlFormatted: boolean) {
    var list = "";
    Object.keys(this.zones).forEach((key) => {
      if (this.zones[key] == true) {
        list += htmlFormatted ? "<br/>" : "\n";
        list += "Zone " + key + ": Faulted";
      }
    });
    return list;
  }

  handleUdpMessage(msg: Buffer, rinfo: RemoteInfo) {
    if (!this.ipAddress) {
      console.log("ICM discovered at: " + rinfo.address);
    }

    this.ipAddress = rinfo.address;

    //variable message
    if (msg[0] == 0x02 && msg[1] == 0x04) {
      var msgContent = msg.toString("ascii");
      var msgType = msgContent.substring(
        msgContent.lastIndexOf(".") + 1,
        msgContent.indexOf("=")
      );
      var msgValue = msgContent
        .substring(msgContent.indexOf("=") + 1)
        .replace(/[^0-9a-z ]/i, "");
      switch (msgType) {
        case "display":
          const displayText = msgValue.replace("\u0000", "");
          this.lastDisplayText = displayText;
          this.events.emit("displayChanged", displayText);
          break;
        case "ArmStatus":
          const newArmStatus = parseInt(msgValue) as ArmStatus;
          if (this.armStatus != newArmStatus) {
            this.armStatus = newArmStatus;
            this.events.emit("armStatusChanged", newArmStatus);
          }
          break;
        case "Ready":
          const isReady = msgValue == ReadyStatus.Ready;
          if (this.isReady != isReady) {
            this.isReady = isReady;
            this.events.emit("readyChanged", isReady);

            // zoneStatusChanged events are slow from the ICM but readyChanged event is quick so we'll
            // use it as as signal that all zones are unfaulted and set this as such.
            Object.keys(this.zones).forEach((key) => {
              if (this.zones[key] == true) {
                this.zones[key] = false;
                this.events.emit("zoneStatusChanged", key, false);
              }
            });
          }
          break;
        case "AlarmEvent":
          const newAlarmStatus =
            msgValue == "0" ? AlarmStatus.NoAlarm : AlarmStatus.SecurityAlarm;
          if (this.alarmStatus != newAlarmStatus) {
            this.alarmStatus = newAlarmStatus;
            this.events.emit("alarmStatussChanged", newAlarmStatus);
          }
          break;
        case "FireEvent":
          const newFireAlarmStatus =
            msgValue == "0" ? AlarmStatus.NoAlarm : AlarmStatus.FireAlarm;
          if (this.alarmStatus != newFireAlarmStatus) {
            this.alarmStatus = newFireAlarmStatus;
            this.events.emit("alarmStatusChanged", newFireAlarmStatus);
          }
          break;
        default:
          //ZS.3=0 // 0=NotFaulted,1,2=IsFaulted
          var zoneNumber = parseInt(msgType);
          if (!isNaN(zoneNumber)) {
            var isFaulted = msgValue != "0";

            if (this.zones[zoneNumber] != isFaulted) {
              this.zones[zoneNumber] = isFaulted;
              this.events.emit("zoneStatusChanged", zoneNumber, isFaulted);
            }
          }
          break;
      }
    } else if (msg[0] == 0x04 && msg[1] == 0x01) {
      //command message
      var msgContent = msg.toString("ascii");
      var msgValue = msgContent
        .substring(msgContent.lastIndexOf(":") + 1)
        .replace(/[^0-9a-z ]/i, "");
      switch (msgValue) {
        case "Alarm":
          if (this.alarmStatus != AlarmStatus.SecurityAlarm) {
            this.alarmStatus = AlarmStatus.SecurityAlarm;
            this.events.emit("alarmStatusChanged", this.alarmStatus);
          }
          break;
        case "Fire":
          if (this.alarmStatus != AlarmStatus.FireAlarm) {
            this.alarmStatus = AlarmStatus.FireAlarm;
            this.events.emit("alarmStatusChanged", this.alarmStatus);
          }
          break;
        case "Armed Away":
          if (this.armStatus != ArmStatus.ArmedAway) {
            this.armStatus = ArmStatus.ArmedAway;
            this.events.emit("armStatusChanged", this.armStatus);
          }
          break;
        case "Armed Stay":
          if (this.armStatus != ArmStatus.ArmedStay) {
            this.armStatus = ArmStatus.ArmedStay;
            this.events.emit("armStatusChanged", ArmStatus.ArmedStay);
          }
          break;
        case "Disarmed":
          if (this.armStatus != ArmStatus.Disarmed) {
            this.armStatus = ArmStatus.Disarmed;
            this.events.emit("armStatusChanged", this.armStatus);
          }
          break;
        case "Low Battery":
          this.events.emit("statusEvent", StatusEvent.LowBattery);
          break;
        case "Power Failure":
          this.events.emit("statusEvent", StatusEvent.PowerFailure);
          break;
        case "Power Returned":
          this.events.emit("statusEvent", StatusEvent.PowerReturned);
          break;
      }
    }
  }

  initialize() {
    const udpClient = dgram.createSocket("udp4");
    udpClient.bind(udpListenPort, () => {
      udpClient.on("message", this.handleUdpMessage.bind(this));
      console.log("UDP client listening on port " + udpListenPort);
    });
  }
}
