/**
 *  Vista ICM Device Handler
 *
 *  Copyright 2020 Brady Holt
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
  input('ip', 'text', title: 'IP', description: 'The IP of the REST endpoint (i.e. 192.168.1.110)', displayDuringSetup: true)
  input('port', 'text', title: 'Port', description: 'The port of the REST endpoint. The default is 3000.', default: '3000', displayDuringSetup: true)
  input('onCommand', 'text', title: 'On Command', description: 'The command to turn the device on.', displayDuringSetup: true)
  input('offCommand', 'text', title: 'Off Command', description: 'The command to turn the device off.', displayDuringSetup: true)
  input('onStatus', 'text', title: 'On Status', description: 'The status value that indicates the device is on.', displayDuringSetup: true)
  input('offStatus', 'text', title: 'Off Status', description: 'The status value that indicates the device is off.', displayDuringSetup: true)
}

metadata {
  definition (name: 'Vista ICM', namespace: 'bradymholt.vistaicm', author: 'Brady Holt') {
    capability 'Switch'
    capability 'Refresh'
    capability 'Polling'
  }

  simulator { }

  tiles {
    standardTile('switch', 'device.switch', width: 1, height: 1, canChangeIcon: true) {
      state 'on', label:'${name}', action:'switch.off', icon:'st.switches.switch.on', backgroundColor:'#79b821'
      state 'off', label:'${name}', action:'switch.on', icon:'st.switches.switch.off', backgroundColor:'#ffffff'
    }

    standardTile('refresh', 'device.refresh', inactiveLabel: false, decoration: 'flat', width: 1, height: 1) {
      state('default', label:'refresh', action:'polling.poll', icon:'st.secondary.refresh-icon')
    }

    main 'switch'
    details (['switch', 'refresh'])
  }
}

def initialize() {
  storeNetworkDeviceId()
  runEvery1Minutes(poll)
}

def poll() {
  log.debug "Executing 'poll'"
  sendNetworkRequest('/status', 'GET', false)
}

def refresh() {
  log.debug "Executing 'refresh'"
  poll()
}

def on() {
  log.debug "Executing 'on'"

  if (!settings.onCommand) {
    log.debug "There is no onCommand parameter specified for this switch so it will not be turned on."
    return 
  }

  // Update status to 'on' right away
  changeState(true)

  sendNetworkRequest("/execute/?command=$settings.onCommand", 'GET', false)
}

def off() {
  log.debug  "Executing 'off'"

  // Update status to 'off' right away
  changeState(false)

  sendNetworkRequest("/execute/?command=$settings.offCommand", 'GET', false)
}


def changeState(isOn) {
  log.debug "changeState: ${isOn}"

  if (isOn) {
    sendEvent(name: 'switch', value: 'on')
  } else {
    sendEvent(name: 'switch', value: 'off')
  }  
}

def sendNetworkRequest(path, method, body) {
  log.debug "executeRequest: ${method} ${path} (${body})"

  storeNetworkDeviceId()

  def headers = [:]
  headers.put('HOST', "$settings.ip:$settings.port")
  headers.put('Content-Type', 'application/json')

  try {
    def hubAction = new physicalgraph.device.HubAction(
      method: method,
      path: path,
      body: body,
      headers: headers)

    log.debug 'Sending network message...'
    sendHubCommand(hubAction)
  }
  catch (Exception e) {
    log.debug "Hit exception $e on $hubAction"
  }
}

def parse(String description) {
  log.debug "Parsing '${description}'"
  def response = parseLanMessage(description)
  log.debug "Network message received:\n  Header data: '${response.header}'\n  Body data: '${response.body}'"

  if (response.body != null) {
    def responseData = new groovy.json.JsonSlurper().parseText(response.body)
    def isOn = responseData.status == settings.onStatus;
    changeState(isOn)
  }
}

private storeNetworkDeviceId() {
  def iphex = convertIPtoHex(settings.ip).toUpperCase()
  def porthex = convertPortToHex(settings.port)
  device.deviceNetworkId = "$iphex:$porthex"
  log.debug "deviceNetworkId set to: $device.deviceNetworkId"
}

private String convertIPtoHex(ipAddress) {
  String hex = ipAddress.tokenize( '.' ).collect {  String.format( '%02x', it.toInteger() ) }.join()
  return hex
}

private String convertPortToHex(port) {
  String hexport = port.toString().format( '%04x', port.toInteger() )
  return hexport
}
