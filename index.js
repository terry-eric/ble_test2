var battery_Characteristic, accelerometer_Characteristic, magnetometer_Characteristic, gyroscope_Characteristic, temperature_Characteristic;
const batteryData = [], accelerometerData = [], gyroscopeData = [], magnetometerData = [];
let startBtn = document.querySelector('#start');
let stopBtn = document.querySelector('#stop');
let chartType = "accelerometerChart";
let chartData = [];
let flag = false;

startBtn.addEventListener("click", onStartButtonClick);
stopBtn.addEventListener("click", onStopButtonClick);

function log(text) {
  let log_ele = document.querySelector("#log")
  if (log_ele.value.length > 20000)
    log_ele.value = ""
  log_ele.value += text + "\n"
}

// add new
let serviceUuid = "00000000-0001-11e1-9ab4-0002a5d5c51b";
let batteryUuid = "00020000-0001-11e1-ac36-0002a5d5c51b";
let accelerometerUuid = "00800000-0001-11e1-ac36-0002a5d5c51b";
let accelerometer_eventUuid = "00000400-0001-11e1-ac36-0002a5d5c51b";//n
let magnetometerUuid = "00200000-0001-11e1-ac36-0002a5d5c51b";
let gyroscopeUuid = "00400000-0001-11e1-ac36-0002a5d5c51b";
let temperatureUuid = "00040000-0001-11e1-ac36-0002a5d5c51b";
let pressureUuid = "00100000-0001-11e1-ac36-0002a5d5c51b";
// 宣告一個包含四個 UUID 的陣列
let UuidTargets = [batteryUuid, accelerometerUuid, magnetometerUuid, gyroscopeUuid];
let server;
let service;

async function onStartButtonClick() {
  try {
    log('Requesting Bluetooth Device...');
    const device = await navigator.bluetooth.requestDevice({
      // add newDD
      optionalServices: [serviceUuid, batteryUuid, accelerometerUuid, magnetometerUuid, gyroscopeUuid],
      acceptAllDevices: true
    });

    log('Connecting to GATT Server...');
    server = await device.gatt.connect();

    log('Getting Service...');
    service = await server.getPrimaryService(serviceUuid);

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

      flag = true
    }

    log('> Notifications started');
  } catch (error) {
    log('Argh! ' + error);
  }
}

async function onStopButtonClick() {
  flag = false
  try {
    // 停止所有 characteristic 的通知功能
    for (const [index, UuidTarget] of UuidTargets.entries()) {
      const characteristicTarget = await service.getCharacteristic(UuidTarget);
      await characteristicTarget.stopNotifications();
      characteristicTarget.removeEventListener('characteristicvaluechanged',
        callback);
    }
    await server.disconnect(); // 需要手動斷開 GATT 伺服器的連線

    log('> Notifications stopped');
    const sensordata = [accelerometerData, gyroscopeData, magnetometerData];
    // const sensordata = [magnetometerData];
    for (i of sensordata) {
      let header = ["timestamp", "x", "y", "z"].join(",")
      let csv = i.map(row => {
        let data = row.slice(1)
        data.join(',')
        return data
      }).join('\n');
      csv = `${header}\n${csv}`

      document.querySelector("#log").innerHTML = '';
      log(csv);
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      // a.download = 'output.csv';
      a.download = `${i[0][0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  } catch (error) {
    console.log(error)
    log('Argh! ' + error);
  }
}

function callback(event) {
  // console.log(event.currentTarget)
  // console.log(event.currentTarget.uuid)
  if (event.currentTarget.uuid === accelerometerUuid ||
    event.currentTarget.uuid === magnetometerUuid ||
    event.currentTarget.uuid === gyroscopeUuid) {

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

    if (event.currentTarget.uuid === accelerometerUuid) {
      document.getElementById("accX").innerHTML = x;
      document.getElementById("accY").innerHTML = y;
      document.getElementById("accZ").innerHTML = z;
      accelerometerData.push(["accelerometer", Timestamp, x, y, z]);
      if (chartType === "accelerometerChart") { chartData = [x, y, z] };
    }
    if (event.currentTarget.uuid === magnetometerUuid) {
      document.getElementById("magnX").innerHTML = x;
      document.getElementById("magnY").innerHTML = y;
      document.getElementById("magnZ").innerHTML = z;
      magnetometerData.push(["magnetometer", Timestamp, x, y, z])
      if (chartType === "magnetometerChart") { chartData = [x, y, z] };
    }
    if (event.currentTarget.uuid === gyroscopeUuid) {
      x = x / 10; y = y / 10; z = z / 10;
      document.getElementById("gyroX").innerHTML = x;
      document.getElementById("gyroY").innerHTML = y;
      document.getElementById("gyroZ").innerHTML = z;
      gyroscopeData.push(["gyroscope", Timestamp, x, y, z]);
      if (chartType === "gyroscopeChart") { chartData = [x, y, z] };
    }
    // log(chartData.toString());
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

var select = document.getElementById('dataChart');
// 當選取選單時，設定要顯示的圖表類型
select.addEventListener('change', (event) => {
  chartType = event.target.value;
  myChart.data.datasets.forEach(dataset => {
    dataset.data = []
    dataPoints = 0
  })
});


var ctx = document.getElementById('myChart');
var maxDataPoints = 100; // 最多顯示1000筆資料
const labels = [];
for (let i = 0; i <= maxDataPoints; i++) {
  labels.push(i.toString());
}
var myChart = new Chart(ctx, {
  type: 'line',
  data: {
    labels: labels,
    datasets: [
      {
        label: 'X',
        borderColor: 'red',
        backgroundColor: 'rgba(255, 0, 0, 0.1)',
        borderWidth: 1,
        data: [],
        tension: 0.4,
        cubicInterpolationMode: 'cubic'
      },
      {
        label: 'Y',
        borderColor: 'green',
        backgroundColor: 'rgba(0, 255, 0, 0.1)',
        borderWidth: 1,
        data: [],
        tension: 0.5,
        cubicInterpolationMode: 'cubic'
      },
      {
        label: 'Z',
        borderColor: 'blue',
        backgroundColor: 'rgba(0, 0, 255, 0.1)',
        borderWidth: 1,
        data: [],
        tension: 0.6,
        cubicInterpolationMode: 'cubic'
      },
    ]
  },
  options: {
    animation: false,
    scales: {
      yAxes: [{
        ticks: {
          beginAtZero: true
        }
      }]
    }
  }
});

var dataPoints = 0; // 紀錄資料筆數
const intervalID = setInterval(() => {
  if (flag) {
    // 如果已經有1000筆資料，則刪除第一筆資料
    if (dataPoints >= maxDataPoints) {
      myChart.data.datasets.forEach(dataset => {
        dataset.data.shift(); // 刪除第一筆資料
      });
    } else {
      dataPoints++;
    }

    // 新增新的數據
    myChart.data.datasets.forEach((dataset, index) => {
      dataset.data.push(chartData[index]);
    });
    myChart.update(); // 更新圖表
  }
  else { }
}, 50);

