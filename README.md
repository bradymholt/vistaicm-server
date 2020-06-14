# vistaicm-server

![Screenshot](https://raw.github.com/bradyholt/vistaicm-server/gh-pages/screenshot.png)

A Node.js app that works with the [VISTA-ICM](http://controlworks.com/modules/Product.aspx?pid=80) module to control VISTA (10/15/20/21/50/128/250) alarm panels. It provides a **clean web interface** and **event handling** through a hook architecture.

Although the VISTA-ICM itself comes with a web interface, it requires Internet Explorer and is painful to use. Also, the VISTA-ICM originally supported sending emails upon events (faults, alarms) but this service has been discontinued. vistaicm-server provides a clean, easily modifiable, mobile ready web interface and allows easy extensibility through a hook architecture which opens up interesting possibilities (i.e. auto arm daily at 11PM, trigger X10 relay at time of arm, send iOS notifications through Prowl on alarm events, etc.), requiring little effort.

## Features

- Mobile ready **web interface** that shows real-time display updates and allows for keypad input.
- **Send commands** to the ICM including anything you can send with a keypad including digits, relay activation and functions (ARM-AWAY, STAY, FIRE, etc.).
- **Send external commands** to other systems to support a unified and integrated interface.
- **Listen and respond to events** with a _hook_ architecture. For instance, you can send a SMS message or email when an alarm event occurs.
- **Schedule commands** to be executed at certain times. For instance, ARM-STAY nightly at 11PM.

## Requirements

- A VISTA-ICM module.  This product has been discontinued from the manufacturer.
- Node.js >= 9.9.0

## Setup

1. Run `./run init`. This will install dependencies and create `server/config.json`.
1. Update `aladdin_connect_username` and `aladdin_connect_password` values in `server/config.json` with your Aladdin Connect authentication credentails.
1. Run `./run` to start the server
1. Open http://localhost:3905/ in a browser.

This will open the web interface which should auto-detect your VISTA-ICM on the network and begin to show display updates (i.e. "Ready to Arm"). You can then click numbers on the keypad to control the VISTA-ICM.

## Deployment

Run `./run deploy username@hostname`. It is assumed _username_ has sudo access on _hostname_.

To see log output on the deployed host, run `sudo journalctl -u vistaicm-server`. Add `-f` argument to follow the log.

## Commands

Commands can be sent to the VISTA panel by using the format **ICM.executeCommand("5");** This would simulate pressing the _5_ key on a keypad. If you want to send multiple commands to be executed in serial order, you can separate the commands with a _-_ (dash). For example, **ICM.executeCommand("1-2-3-4-5");** would simulate pressing these 5 keys on the keypad, in the order listed.

To issue commands from the web interface, you need to create an element that has the class **button**. The **id** of the button will be the command(s) sent to the VISTA panel. For instance, adding the following button to the index.html file:

     <button class="button" id="3-5-3-5">Click Me</button>

and clicking it through a browser, would send the commands 3,5,3,5 to the VISTA.

### Auxiliary Commands

Some VISTA key sequences require the disarm code to be entered prior to other keys, such as when you are turning a relay on or off. For instance, if you have a X10 module configured and you want to turn a light on by triggering relay #1, you would press the following keys on a keypad: 1,2,3,4,Pound,7,0,1 (1,2,3,4 being your disarm code, and Pound,7,0,1 being the VISA keypad sequence to turn relay #1 on\*. If you wanted to add a button on the web interface to turn on or off a relay, you would not want to put your disarm code in the index.html file because it could easily be read by anyone who has access to your web address. Instead, vistaicm-server provides the **A** psuedo command which, if used, will be replaced by the commands specified in the **pound_commands** variable, located in the root folder **config.js** file. If you want to use an auxiliary command, you need to change the value of pound_commands in the config.js to match your disarm code. For instance, if you updated the config.js file to read:

    pound_commands : ["5","2","5","2"]

and added the following button the www/index.html:
  
 <button class="button" id="A-Pound-7-0-1">Den Light</button>

clicking the "Open Garage" button would result in the following commands being sent to you VISTA panel: 5,2,5,2,Pound,7,0,1

\*_More information on keypad sequences for relays can be found in your VISTA manual._

### External Commands

Buttons with a command starting with "E-" are considered external commands. When these commands are sent to the server, the `externalCommand` event will be triggered and nothing will be sent to the VISTA-ICM itself. Hooks can tap into the `externalCommand` event to provide appropriate handlers, such as sending a command to another system that is capable of opening and closing Garage Doors. The following button is an example of an external command button:

    <button class="button" id="E-abc123">Open Garage</button>

When the above button command is sent to the server, the `externalCommand` event will be emitted with `abc123` as the first (and only) parameter.

## Hooks

Hooks allow you to easily tap into VISTA-ICM events that occur, such as arming, alarms, and faulted zones. With these hooks, you can respond to the events in many interesting ways such as sending SMS, email. iOS / Android notifications. In addition, with the help of the node-cron module, you can write hooks that will execute commands a certain times, such as auto arming the alarm nightly at 11PM, or arming the alarm after the garage door closes (if you have a garage door zone setup).

The available events include:

- _displayChanged_ (keypad display updated)
- _armStatusChanged_ (armed / disarmed)
- _readyChanged_ (faulted or ready to arm)
- _zoneStatusChanged_ (single zone faulted / unfaulted)
- _alarmStatusChanged_ (security or fire alarm triggered)

To use a hook, you need to add a .js file in the **hooks** folder and restart node. The hook should be in the following format:

    module.exports = function (ICM) {
        ICM.events.on('alarmStatusChanged', function(alarmStatus){
           //Alarm is going off!!  Respond to it here by sending SMS, email, etc.
        }
    }

There are example hooks in the **hooks_examples** folder. To use these, you will need to modify and copy to the hooks folder and restart node.

### Cron hooks

In addition to event based hooks, you can use cron hooks to schedule time based execution. At the time of execution, you can send commands to the VISTA-ICM or do anything else you want to. An example to arm the arm each night at 11PM, your hook would look like this:

    var cronJob = require('cron').CronJob;
    module.exports = function (ICM) {
    var job = new cronJob('0 0 23 * * *', function(){ //11PM
          ICM.executeCommand('F4'); //F4 is function key #4 on keypad
      });

      job.start();
    };

As a convenience, a predefined cron.js hook is already present in the hooks folder which you modify and/or add to.

## SmartThings Setup

### Device Handler

1. Login to [https://graph.api.smartthings.com/](https://graph.api.smartthings.com/)
1. Go to: My Device Handlers > Create New Device Handler > From Code
1. Paste contents of `support/vistaicm-device-handler.groovy`
1. Click: Create, Publish > For Me

### Device Setup

1. Login to [https://graph.api.smartthings.com/](https://graph.api.smartthings.com/)
2. Go to: My Devices > New Device
3. Specify: Name, Device Network Id (arbitrary), Location, Hub, Type ("Vista ICM")
4. Click: Create, Preferences > edit
5. Specify: IP, Port, armCommand, disarmCommand
6. Click: Save

## Credit

Major credit is due to [Tomi Blinnikka](https://twitter.com/docBliny) and his [Honeywell/Ademco Vista ICM](http://bliny.net/blog/post/HoneywellAdemco-Vista-ICM-network.aspx) post which provided the technical information needed to properly interface with the ICM.
