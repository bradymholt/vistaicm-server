vistaicm-server
==========

<img style="width:250px; float:right; border:solid 1px #c3c3c3; padding:1px; margin-left:10px" src="http://www.geekytidbits.com/wp-content/uploads/20110827-102534.jpg"/>
A Node.js server app that works with the [VISTA-ICM](http://controlworks.com/modules/Product.aspx?pid=80) module to control VISTA (10/15/20/21/50/128/250) alarm panels.  It provides a **clean web interface** and **event handling** through a hook architecture.

Although the VISTA-ICM itself comes with a web interface, it requires Internet Explorer and is painful to use.  Also, the VISTA-ICM originally supported sending emails upon events (faults, alarms) but this service has been discontinued.  vistaicm-server provides a clean, easily modifiable, mobile ready web interface and allows easy extensibility through a hook architecture which opens up interesting possibilities (i.e. auto arm daily at 11PM, trigger X10 relay at time of arm, send iOS notifications through Prowl on alarm events, etc.), requiring little effort. 

Features
------- 

- Mobile ready **web interface** that shows real-time display updates and allows for keypad input.
- **Send commands** to the ICM including anything you can send with a keypad including digits, relay activation and functions (ARM-AWAY, STAY, FIRE, etc.).
- **Listen and respond to events** with a *hook* architecture.  For instance, you can send a SMS message or email when an alarm event occurs.   
- **Schedule commands** to be executed at certain times.  For instance, ARM-STAY nightly at 11PM.

Quick Start
---------


1. Ensure [Node.js](http://nodejs.org/) is installed on the machine you will be running vistaicm-server.
2. Download the latest source into a directory on the target server.  You can [download the zip](https://github.com/bradyholt/vistaicm-server/archive/master.zip) and unzip or run **git clonehttps://github.com/bradyholt/vistaicm-server.git**.
3. Run **npm install** to install node package dependencies.
3. Run **node server.js** 
4. Open http://localhost:81/ in a browser.

This will open the web interface which should auto-detect your VISTA-ICM on the network and begin to show display updates (i.e. "Ready to Arm").  You can then click numbers on the keypad to control the VISTA-ICM.

Hooks
-----

Hooks allow you to easily tap into VISTA-ICM events that occur, such as arming, alarms, and faulted zones.  With these hooks, you can respond to the events in many interesting ways such as sending SMS, email. iOS / Android notifications.  In addition, with the help of the node-cron module, you can write hooks that will execute commands a certain times, such as auto arming the alarm nightly at 11PM, or arming the alarm after the garage door closes (if you have a garage door zone setup).

The available events include:

 - *displayChanged* (keypad display updated)
 - *armStatusChanged* (armed / disarmed)
 - *readyChanged* (faulted or ready to arm)
 - *zoneStatusChanged* (single zone faulted / unfaulted)
 - *alarmStatusChanged* (security or fire alarm triggered)

To use a hook, you need to add a .js file in the **hooks** folder and restart node.  The hook should be in the following format:

    module.exports = function (ICM) {
        ICM.events.on('alarmStatusChanged', function(alarmStatus){
           //Alarm is going off!!  Respond to it here by sending SMS, email, etc.
        }
    }

There are example hooks in the **hooks_examples** folder.  To use these, you will need to modify and copy to the hooks folder and restart node.

###Cron hooks
In addition to event based hooks, you can use hooks to schedule time based execution.  At the time of execution, you can send commands to the VISTA-ICM or do anything else you want to.  An example to arm the arm each night at 11PM, your hook would look like this:

    var cronJob = require('cron').CronJob;
    module.exports = function (ICM) {
	var job = new cronJob('0 0 23 * * *', function(){ //11PM
    	  ICM.executeCommand('F4'); //F4 is function key #4 on keypad
	  });

	  job.start();
    };



Credit
-----
Major credit is due to [Tomi Blinnikka](https://twitter.com/docBliny) and his [Honeywell/Ademco Vista ICM](http://bliny.net/blog/post/HoneywellAdemco-Vista-ICM-network.aspx) post which provided the technical information needed to properly interface with the ICM.