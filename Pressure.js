var pressure_Characteristic;
const sensordata = [];

let startBtn = document.querySelector('#start');
let stopBtn = document.querySelector('#stop');
startBtn.addEventListener("click", onStartButtonClick)
stopBtn.addEventListener("click", onStopButtonClick)

function log(text) {
  document.querySelector("#log").value += text + "\n"
}

async function onStartButtonClick() {
  // add new
  let serviceUuid = "00000000-0001-11e1-9ab4-0002a5d5c51b";
  let pressureUuid = "00100000-0001-11e1-ac36-0002a5d5c51b";

  try {
    log('Requesting Bluetooth Device...');
    const device = await navigator.bluetooth.requestDevice({
      // add newDD
      optionalServices: [serviceUuid, pressureUuid],
      acceptAllDevices: true
    });

    log('Connecting to GATT Server...');
    const server = await device.gatt.connect();

    log('getting Service...');
    const service = await server.getPrimaryService(serviceUuid);

    log('getting Characteristic...');
    // add new
    pressure_Characteristic = await service.getCharacteristic(pressureUuid);
    // Acceleromter_event_Characteristic = await service.getCharacteristic(Acceleromter_eventUuid);
    await pressure_Characteristic.startNotifications();
    log('> Notifications started');
    // add new
    pressure_Characteristic.addEventListener('characteristicvaluechanged',
    pressure_func);

  } catch (error) {
    log('Argh! ' + error);
  }
}

async function onStopButtonClick() {

  try {
    await pressure_Characteristic.stopNotifications();
    pressure_Characteristic.removeEventListener('characteristicvaluechanged',
    pressure_func);
    log('> Notifications stopped');

    const csv = sensordata.map(row => row.join(',')).join('\n');
    document.querySelector("#log").innerHTML = '';
    log(csv);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'output.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

  } catch (error) {
    log('Argh! ' + error);
  }
}


function bytes2int16(bytes) {
  var view = new DataView(new ArrayBuffer(2));
  view.setUint8(0, bytes[0]);
  view.setUint8(1, bytes[1]);
  return view.getInt16(0, true); // true indicates little-endian byte order
}
// 0x00100000-0001-11e1-ac36-0002a5d5c51b
function pressure_func(event) {

  let value = event.target.value;
  let a = [];
  for (let i = 0; i < value.byteLength; i++) {
    a.push('0x' + ('00' + value.getUint8(i).toString(16)).slice(-2));
  }
  let bytes = a;
  // let bytes = a.toString();

  let Timestamp = bytes2int16(bytes[0], bytes[1])
  let pressure = bytes4int32(bytes[2], bytes[3], bytes[4], bytes[5]) / 100


  let output = ["pressure", Timestamp, pressure]
  log(JSON.stringify(output))
  sensordata.push(output);
  // if ((Timestamp + 100) > 65536){}

  // return {
  //   Timestamp: Timestamp,
  //   pressure: pressure,
  // }
}