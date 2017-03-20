/**
 *  Vista-ICM Control
 *
 *  Copyright 2017 Brady Holt
 *
 *  Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except
 *  in compliance with the License. You may obtain a copy of the License at:
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 *  Unless required by applicable law or agreed to in writing, software distributed under the License is distributed
 *  on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License
 *  for the specific language governing permissions and limitations under the License.
 *
 */

preferences {
	input("ip", "text", title: "IP", description: "The IP of the REST endpoint (i.e. 192.168.1.110)", displayDuringSetup: true)
	input("port", "text", title: "Port", description: "The port of the REST endpoint. The default is 3000.", default: "3000", displayDuringSetup: true)
	input("armCommand", "text", title: "Arm Command", description: "The command to arm the alarm.", displayDuringSetup: true)
	input("disarmCommand", "text", title: "Disarm Command", description: "The command to disarm the alarm.", displayDuringSetup: true)
}

metadata {
	definition (name: "Vista-ICM Control", namespace: "bradyholt.vistaicmcontrol", author: "Brady Holt") {
		capability "Switch"
        capability "Refresh"
		capability "Polling"
	}

	simulator {
		// TODO: define status and reply messages here
	}

	tiles {
		standardTile("switch", "device.switch", width: 1, height: 1, canChangeIcon: true) {
			state "on", label:'${name}', action:"switch.off", icon:"st.switches.switch.on", backgroundColor:"#79b821"
			state "off", label:'${name}', action:"switch.on", icon:"st.switches.switch.off", backgroundColor:"#ffffff"
		}

    	standardTile("refresh", "device.refresh", inactiveLabel: false, decoration: "flat", width: 1, height: 1) {
			state("default", label:'refresh', action:"polling.poll", icon:"st.secondary.refresh-icon")
		}

		main "switch"
		details (["switch", "refresh"])
	}
}

def poll() {
	log.debug "Executing 'poll'"
	updateState();
}

def refresh() {
	log.debug "Executing 'refresh'"
	poll();
}

def on() {
	log.debug "Executing 'on'"
	setDeviceState('on');
}

def off() {
	log.debug "Executing 'off'"
	setDeviceState('off');
}

def setDeviceState(state) {
	log.debug "Executing 'setDeviceState'"
	def command = status ? $settings.armCommand : $settings.disarmCommand;
    executeRequest("/execute?command=$command", "GET", false);
}

def updateState(){
	log.debug "Executing 'updateState'"
    executeRequest("/status", "GET", false);
}

def setUI(status){
    def switchState = status ? "on" : "off";
    log.debug "New state is: " + switchState;

    sendEvent(name: "switch", value: switchState);
}

def executeRequest(path, method, body) {
	log.debug "The " + method + " path is: " + path;

    storeNetworkDeviceId();

    def headers = [:]
    headers.put("HOST", "$settings.ip:$settings.port");
    headers.put("Content-Type", "application/json");

    try {
    	def hubAction = new physicalgraph.device.HubAction(
            method: method,
            path: path,
            body: body,
            headers: headers);

   		return hubAction;
    }
    catch (Exception e) {
        log.debug "Hit Exception $e on $hubAction"
    }
}

def parse(String description) {
	log.debug "Parsing '${description}'";
	def msg = parseLanMessage(description);
	log.debug "Header data: " + msg.header;
    log.debug "Body data: " + msg.body;

    def response = new groovy.json.JsonSlurper().parseText(msg.body);
    setUI(response.status);
}

private storeNetworkDeviceId(){
    def iphex = convertIPtoHex(settings.ip).toUpperCase();
    def porthex = convertPortToHex(settings.port);
    device.deviceNetworkId = "$iphex:$porthex";
    log.debug "deviceNetworkId set to: $device.deviceNetworkId"
}

private String convertIPtoHex(ipAddress) {
    String hex = ipAddress.tokenize( '.' ).collect {  String.format( '%02x', it.toInteger() ) }.join()
    return hex;
}

private String convertPortToHex(port) {
    String hexport = port.toString().format( '%04x', port.toInteger() );
    log.debug hexport;
    return hexport;
}
