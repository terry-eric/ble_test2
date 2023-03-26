var battery_Characteristic, accelerometer_Characteristic, magnetometer_Characteristic, gyroscope_Characteristic, temperature_Characteristic;
const batteryData = [], accelerometerData = [], gyroscopeData = [], magnetometerData = [];


let startBtn = document.querySelector('#start');
let stopBtn = document.querySelector('#stop');

startBtn.addEventListener("click", onStartButtonClick);
stopBtn.addEventListener("click", onStopButtonClick);

function log(text) {
  document.querySelector("#log").value += text + "\n"
}

async function onStartButtonClick() {
  // add new
  let serviceUuid = "00000000-0001-11e1-9ab4-0002a5d5c51b";
  let batteryUuid = "00020000-0001-11e1-ac36-0002a5d5c51b";
  let accelerometerUuid = "00800000-0001-11e1-ac36-0002a5d5c51b";
  let accelerometer_eventUuid = "00000400-0001-11e1-ac36-0002a5d5c51b";//n
  let magnetometerUuid = "00200000-0001-11e1-ac36-0002a5d5c51b";
  let gyroscopeUuid = "00400000-0001-11e1-ac36-0002a5d5c51b";
  let temperatureUuid = "00040000-0001-11e1-ac36-0002a5d5c51b";
  let pressureUuid = "00100000-0001-11e1-ac36-0002a5d5c51b";

  try {
    log('Requesting Bluetooth Device...');
    // 宣告一個包含四個 UUID 的陣列
    let UuidTargets = [batteryUuid, accelerometerUuid, magnetometerUuid, gyroscopeUuid];
    const device = await navigator.bluetooth.requestDevice({
      // add newDD
      optionalServices: [serviceUuid, batteryUuid, accelerometerUuid, magnetometerUuid, gyroscopeUuid],
      acceptAllDevices: true
    });

    log('Connecting to GATT Server...');
    const server = await device.gatt.connect();

    log('Getting Service...');
    const service = await server.getPrimaryService(serviceUuid);

    log('Getting Characteristic...');
    // add new

    // 使用 for...of 迴圈遍歷陣列中的元素，取得每個 UUID 對應的 characteristic 並啟用通知
    for (const [index, UuidTarget] of UuidTargets.entries()) {

      // 使用 service.getCharacteristic() 方法來取得指定 UUID 對應的 characteristic
      let characteristicTarget = await service.getCharacteristic(UuidTarget);

      // 當 characteristic 的值發生改變時，執行 callback 函數
      characteristicTarget.addEventListener("characteristicvaluechanged", callback);

      // 啟用 characteristic 的通知功能，這樣當 characteristic 的值改變時，就會發送通知
      await characteristicTarget.startNotifications();
    }

    log('> Notifications started');
  } catch (error) {
    log('Argh! ' + error);
  }
}

function callback(event) {
  console.log(event.currentTarget)
  console.log(event.currentTarget.uuid)
  if (event.currentTarget.uuid === (accelerometerUuid || magnetometerUuid || gyroscopeUuid)){
    let value = event.currentTarget.value;
    let a = [];
    for (let i = 0; i < value.byteLength; i++) {
      a.push('0x' + ('00' + value.getUint8(i).toString(16)).slice(-2));
    }
    let bytes = a;
  
    let Timestamp = bytes2int16([bytes[0], bytes[1]])
    let x = bytes2int16([bytes[2], bytes[3]])
    let y = bytes2int16([bytes[4], bytes[5]])
    let z = bytes2int16([bytes[6], bytes[7]])
    if (event.currentTarget.uuid === accelerometerUuid){
      document.getElementById("accX").innerHTML = x;
      document.getElementById("accY").innerHTML = y;
      document.getElementById("accZ").innerHTML = z;
      accelerometerData.push(["accelerometer", Timestamp, x, y, z])
    }
    if (event.currentTarget.uuid === magnetometerUuid){
      document.getElementById("magnX").innerHTML = x;
      document.getElementById("magnY").innerHTML = y;
      document.getElementById("magnZ").innerHTML = z;
      magnetometerData.push(["accelerometer", Timestamp, x, y, z])
    }
    if (event.currentTarget.uuid === gyroscopeUuid){
      document.getElementById("gyroX").innerHTML = x/10;
      document.getElementById("gyroY").innerHTML = y/10;
      document.getElementById("gyroZ").innerHTML = z/10;
      gyroscopeData = ["gyroscope", Timestamp, x, y, z]
    }
  }
}
async function onStopButtonClick() {

  try {
    // 停止所有 characteristic 的通知功能
    for (const [index, UuidTarget] of UuidTargets.entries()) {
      await characteristicTarget.stopNotifications();
      characteristicTarget.removeEventListener('characteristicvaluechanged',
        callback);
    }

    log('> Notifications stopped');
    const sensordata = [batteryData, accelerometerData, gyroscopeData, magnetometerData];
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
// function bytes2int16(high, low) {
//   return (low << 8) | high
// }
function bytes4int32(one, two, three, four) {
  return (((four << 8) | three) << 16) | ((two << 8) | one)
}





var canvas = document.getElementById('myChart');
var select = document.getElementById('dataChart');

// 當選取選單時
select.addEventListener('change', (event) => {
  const chartType = event.target.value;
  if (chartType === "accelerometerChart") {
    var dataChart = accelerometerData;
  }
  if (chartType === "gyroscopeChart") {
    var dataChart = gyroscopeData;
  }
  if (chartType === "magnetometerChart") {
    var dataChart = magnetometerData;
  }
  var chart = new Chart(canvas, {
    type: 'line',
    data: {
      datasets: [
        {
          label: 'X',
          data: dataChart[2],
          borderColor: 'red',
          backgroundColor: 'rgba(255, 0, 0, 0.1)',
          fill: false,
        },
        {
          label: 'Y',
          data: dataChart[3],
          borderColor: 'green',
          backgroundColor: 'rgba(0, 255, 0, 0.1)',
          fill: false,
        },
        {
          label: 'Z',
          data: dataChart[4],
          borderColor: 'blue',
          backgroundColor: 'rgba(0, 0, 255, 0.1)',
          fill: false,
        },
      ],
    },
    options: {
      animation: {
        duration: 0, // 關閉動畫效果
      },
      scales: {
        xAxes: [
          {
            type: 'time',
            time: {
              displayFormats: {
                second: 'HH:mm:ss',
              },
            },
          },
        ],
        yAxes: [
          {
            ticks: {
              beginAtZero: true,
            },
          },
        ],
      },
      showLines: true,
    },
  });
});








