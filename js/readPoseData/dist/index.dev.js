"use strict";

function ownKeys(object, enumerableOnly) { var keys = Object.keys(object); if (Object.getOwnPropertySymbols) { var symbols = Object.getOwnPropertySymbols(object); if (enumerableOnly) symbols = symbols.filter(function (sym) { return Object.getOwnPropertyDescriptor(object, sym).enumerable; }); keys.push.apply(keys, symbols); } return keys; }

function _objectSpread(target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i] != null ? arguments[i] : {}; if (i % 2) { ownKeys(source, true).forEach(function (key) { _defineProperty(target, key, source[key]); }); } else if (Object.getOwnPropertyDescriptors) { Object.defineProperties(target, Object.getOwnPropertyDescriptors(source)); } else { ownKeys(source).forEach(function (key) { Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(source, key)); }); } } return target; }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

var DATA_LIST = [{
  fileName: 'data',
  scaleNum: 380
}, {
  fileName: 'data2',
  scaleNum: 420
}];
var scaleNum = 380;

var getTextData = function getTextData(dataIndex) {
  return new Promise(function (resolve, reject) {
    var data = DATA_LIST[dataIndex];
    scaleNum = data.scaleNum;
    fetch("/js/readPoseData/".concat(data.fileName, ".txt")).then(function (res) {
      return res.text();
    }).then(function (data) {
      var list = data.split(/\r\n|\n/);
      var new_list = [];
      list.forEach(function (ele) {
        if (ele) {
          new_list.push(JSON.parse(JSON.parse(ele)));
        }
      });
      resolve(new_list);
    });
  });
};

var getTransformData = function getTransformData(data) {
  // 数据的x,y,z坐标跟threejs的坐标系不一样，需要转换
  return {
    z: data[0] * scaleNum,
    x: data[1] * scaleNum,
    y: data[2] * scaleNum,
    isValid: !!data[3]
  };
};

var getHipRotation = function getHipRotation(point1, point2, point3) {
  // console.log("point1",point1)
  if (!point1.isValid || !point2.isValid || !point3.isValid) {
    return {
      x: 0,
      y: 0,
      z: 0,
      isValid: false
    };
  } // 


  var pointA = new THREE.Vector3(point1.x, point1.y, point1.z);
  var pointB = new THREE.Vector3(point2.x, point2.y, point2.z); // 脖子

  var pointC = new THREE.Vector3(point3.x, point3.y, point3.z); // 计算两个向量，vectorAB 从点A到点B，vectorAC 从点A到点C

  var vectorAB = new THREE.Vector3().subVectors(pointB, pointA);
  var vectorAC = new THREE.Vector3().subVectors(pointC, pointA); // 计算法线向量

  var normal = new THREE.Vector3().crossVectors(vectorAB, vectorAC).normalize(); // normal.negate(); // 反向
  // 使用一个Object3D来帮助我们计算旋转值

  var helperObject = new THREE.Object3D();
  helperObject.lookAt(normal); // 对齐到前方向量

  var rotation = helperObject.rotation; // 获取旋转值（欧拉角）

  return {
    x: rotation.x,
    y: rotation.y,
    z: rotation.z,
    isValid: true
  };
};

var cleanData = function cleanData(data) {
  var person_key_point = data.person_key_point;
  var person_one = person_key_point[0];
  var hip_data = [-1, -1, -1, 0]; // console.log("hip.rotation 是否合法",person_one[8][3].toFixed(2), person_one[11][3].toFixed(2), person_one[0][3].toFixed(2))

  if (person_one[8][3] && person_one[11][3]) {
    // hip 位置根据2个胯部的位置计算
    hip_data = person_one[8].map(function (item, index) {
      return (item + person_one[11][index]) / 2;
    });
  }

  var point3 = person_one[0];

  if (!point3[3]) {
    // 如果脖子的位置不合法，则使用肩膀的位置
    point3 = person_one[2];
  }

  if (!point3[3]) {
    // 如果肩膀的位置不合法，则使用另外一个肩膀的位置
    point3 = person_one[5];
  }

  var right_hand_data = person_one[4];
  var left_hand_data = person_one[7];
  var right_foot_data = person_one[10];
  var left_foot_data = person_one[13];
  return {
    hip: _objectSpread({}, getTransformData(hip_data), {
      rotation: getHipRotation(getTransformData(person_one[8]), getTransformData(person_one[11]), getTransformData(point3))
    }),
    right_hand: getTransformData(right_hand_data),
    left_hand: getTransformData(left_hand_data),
    right_foot: getTransformData(right_foot_data),
    left_foot: getTransformData(left_foot_data)
  };
};

var playData = function playData(ik_list, row) {
  // console.log("curData",row)
  // console.log("curData",row.person_key_point[0])
  var res = cleanData(row);
  var hip = res.hip,
      right_hand = res.right_hand,
      left_hand = res.left_hand,
      right_foot = res.right_foot,
      left_foot = res.left_foot; // console.log('hip',hip)

  if (hip.isValid) {
    ik_list[0].position.x = hip.x;
    ik_list[0].position.y = hip.y;
    ik_list[0].position.z = hip.z; // console.log("转向",hip.rotation.y)
  }

  if (hip.rotation && hip.rotation.isValid) {
    // console.log("转向角度",  (hip.rotation.x * (180 / Math.PI)).toFixed(1),(hip.rotation.y * (180 / Math.PI)).toFixed(1),(hip.rotation.z * (180 / Math.PI)).toFixed(1))
    // console.log("转向角度",  hip.rotation.x.toFixed(2),hip.rotation.y.toFixed(2),hip.rotation.z.toFixed(2))
    console.log("转向角度", (hip.rotation.x * (180 / Math.PI)).toFixed(1), (hip.rotation.y * (180 / Math.PI)).toFixed(1), (hip.rotation.z * (180 / Math.PI)).toFixed(1));
    $model.major_bone_list["J_Bip_C_Hips"].rotation.x = hip.rotation.x;
    $model.major_bone_list["J_Bip_C_Hips"].rotation.y = hip.rotation.y;
    $model.major_bone_list["J_Bip_C_Hips"].rotation.z = hip.rotation.z;
  } else {
    console.log("缺少合理的转向参数");
  }

  if (right_hand.isValid) {
    ik_list[1].position.x = right_hand.x;
    ik_list[1].position.y = right_hand.y;
    ik_list[1].position.z = right_hand.z;
  }

  if (left_hand.isValid) {
    ik_list[2].position.x = left_hand.x;
    ik_list[2].position.y = left_hand.y;
    ik_list[2].position.z = left_hand.z;
  }

  if (right_foot.isValid) {
    ik_list[3].position.x = right_foot.x;
    ik_list[3].position.y = right_foot.y;
    ik_list[3].position.z = right_foot.z;
  }

  if (left_foot.isValid) {
    ik_list[4].position.x = left_foot.x;
    ik_list[4].position.y = left_foot.y;
    ik_list[4].position.z = left_foot.z;
  }
};

var poseTimer = null;
var poseData = [];
var curIndex = 0;
getTextData(1).then(function (data) {
  // console.log("data",data)
  poseData = data;
  startPoseAnimate();
});

function selectData(index) {
  getTextData(index).then(function (data) {
    // console.log("data",data)
    poseData = data;
    startPoseAnimate();
  });
}

var poseTimeout; // 定义一个变量来保存setTimeout的ID

function clearPoseTimer() {
  if (poseTimeout) {
    clearTimeout(poseTimeout); // 清除setTimeout
  }
}

function performAnimationStep() {
  if (curIndex >= poseData.length) {
    curIndex = 0; // 如果到达数据末尾，则重置索引
  }

  var curData = poseData[curIndex]; // 获取当前的姿势数据

  playData($scene.all_ik_list, curData); // 播放当前数据

  curIndex += 1; // 移动到下一个数据索引
  // 设置下一步的动画

  poseTimeout = setTimeout(performAnimationStep, 30);
}

var intervalTimer = 0; // 用于页面加载后，自动播放动画

var clertIntervalTimer = function clertIntervalTimer() {
  if (intervalTimer) clearInterval(intervalTimer);
};

function startPoseAnimate() {
  curIndex = 0; // 重置索引到起始位置

  if (poseData.length > 0 && window.$scene) {
    clertIntervalTimer(); // 清除自动播放动画的定时器

    performAnimationStep(); // 开始动画
  }
}

intervalTimer = setInterval(function () {
  startPoseAnimate();
}, 300);