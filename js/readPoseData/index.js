const DATA_LIST = [{
    fileName:'data',
    scaleNum:380
},{
    fileName:'data2',
    scaleNum:420
}]
let scaleNum = 380

const getTextData = (dataIndex) => {
    return new Promise((resolve, reject) => {
        
        const data = DATA_LIST[dataIndex]
        scaleNum = data.scaleNum

        fetch(`/js/readPoseData/${data.fileName}.txt`).then(res => {
            return res.text()
        }).then(data => {

            const list = data.split(/\r\n|\n/);
            const new_list = []
            list.forEach(ele => {
                if (ele) {
                    new_list.push(JSON.parse(JSON.parse(ele)))
                }
            })
            resolve(new_list)
        })
    })
}

const getTransformData = (data)=>{ 
    // 数据的x,y,z坐标跟threejs的坐标系不一样，需要转换
    return {
        z:data[0] * scaleNum,
        x:data[1] * scaleNum,
        y:data[2] * scaleNum,
        isValid:!!data[3]
    }
}

const getHipRotation = (point1,point2,point3)=>{
    // console.log("point1",point1)
    if(!point1.isValid || !point2.isValid || !point3.isValid){
        return {
            x:0,
            y:0,
            z:0,
            isValid: false
        }
    }

    // 
    var pointA = new THREE.Vector3(point1.x, point1.y, point1.z);
    var pointB =new THREE.Vector3(point2.x, point2.y, point2.z);
    // 脖子
    var pointC = new THREE.Vector3(point3.x, point3.y, point3.z);

    // 计算两个向量，vectorAB 从点A到点B，vectorAC 从点A到点C
    var vectorAB = new THREE.Vector3().subVectors(pointB, pointA);
    var vectorAC = new THREE.Vector3().subVectors(pointC, pointA);

    // 计算法线向量
    var normal = new THREE.Vector3().crossVectors(vectorAB, vectorAC).normalize();
    // normal.negate(); // 反向
    
    // 使用一个Object3D来帮助我们计算旋转值
    let helperObject = new THREE.Object3D();
    helperObject.lookAt(normal); // 对齐到前方向量
    let rotation = helperObject.rotation; // 获取旋转值（欧拉角）
    return {
        x:rotation.x,
        y:rotation.y,
        z:rotation.z,
        isValid: true
    } 
    
  
} 

const cleanData = (data) => {
    const person_key_point = data.person_key_point
    const person_one = person_key_point[0]
    let hip_data = [-1,-1,-1,0]
    
    // console.log("hip.rotation 是否合法",person_one[8][3].toFixed(2), person_one[11][3].toFixed(2), person_one[0][3].toFixed(2))
    if(person_one[8][3] && person_one[11][3]){  // hip 位置根据2个胯部的位置计算
        hip_data = person_one[8].map((item,index)=>(item + person_one[11][index])/2)
    }

    let point3 = person_one[0]
    if(!point3[3]){ // 如果脖子的位置不合法，则使用肩膀的位置
        point3 = person_one[2]
    }
    if(!point3[3]){ // 如果肩膀的位置不合法，则使用另外一个肩膀的位置
        point3 = person_one[5]
    }

    const right_hand_data = person_one[4]
    const left_hand_data = person_one[7]
    const right_foot_data = person_one[10]
    const left_foot_data = person_one[13]

    return {
        hip:{
            ...getTransformData(hip_data),
            rotation:getHipRotation(getTransformData(person_one[8]),getTransformData(person_one[11]),getTransformData(point3))
        },
        right_hand:getTransformData(right_hand_data),
        left_hand:getTransformData(left_hand_data),
        right_foot:getTransformData(right_foot_data),
        left_foot:getTransformData(left_foot_data),
    }
}

const playData = (ik_list,row)=>{
    // console.log("curData",row)
    // console.log("curData",row.person_key_point[0])
    const res = cleanData(row)
    const {hip,right_hand,left_hand,right_foot,left_foot} = res
    // console.log('hip',hip)
    if(hip.isValid){
        ik_list[0].position.x = hip.x
        ik_list[0].position.y = hip.y
        ik_list[0].position.z = hip.z
        // console.log("转向",hip.rotation.y)
       
    }
    if(hip.rotation && hip.rotation.isValid){
        // console.log("转向角度",  (hip.rotation.x * (180 / Math.PI)).toFixed(1),(hip.rotation.y * (180 / Math.PI)).toFixed(1),(hip.rotation.z * (180 / Math.PI)).toFixed(1))
        // console.log("转向角度",  hip.rotation.x.toFixed(2),hip.rotation.y.toFixed(2),hip.rotation.z.toFixed(2))
        console.log("转向角度",  (hip.rotation.x * (180 / Math.PI)).toFixed(1),(hip.rotation.y * (180 / Math.PI)).toFixed(1),(hip.rotation.z * (180 / Math.PI)).toFixed(1))
        $model.major_bone_list["J_Bip_C_Hips"].rotation.x = hip.rotation.x
        $model.major_bone_list["J_Bip_C_Hips"].rotation.y = hip.rotation.y
        $model.major_bone_list["J_Bip_C_Hips"].rotation.z = hip.rotation.z
    }else{
        console.log("缺少合理的转向参数")
    }
    if(right_hand.isValid){
        ik_list[1].position.x = right_hand.x
        ik_list[1].position.y = right_hand.y
        ik_list[1].position.z = right_hand.z
    }
    if(left_hand.isValid){
        ik_list[2].position.x = left_hand.x
        ik_list[2].position.y = left_hand.y
        ik_list[2].position.z = left_hand.z
    }
    if(right_foot.isValid){
        ik_list[3].position.x = right_foot.x
        ik_list[3].position.y = right_foot.y
        ik_list[3].position.z = right_foot.z
    }
    if(left_foot.isValid){
        ik_list[4].position.x = left_foot.x
        ik_list[4].position.y = left_foot.y
        ik_list[4].position.z = left_foot.z
    }
}

let poseTimer = null
let poseData = []
let curIndex = 0
getTextData(1).then((data)=>{
    // console.log("data",data)
    poseData = data

    startPoseAnimate()
})

function selectData(index){
    getTextData(index).then((data)=>{
    // console.log("data",data)
    poseData = data

    startPoseAnimate()
})
}

var poseTimeout; // 定义一个变量来保存setTimeout的ID

function clearPoseTimer(){
    if(poseTimeout){
        clearTimeout(poseTimeout); // 清除setTimeout
    }
}

function performAnimationStep() {
    if (curIndex >= poseData.length) {
        curIndex = 0; // 如果到达数据末尾，则重置索引
    }
    
    const curData = poseData[curIndex]; // 获取当前的姿势数据
    playData($scene.all_ik_list, curData); // 播放当前数据
    curIndex += 1; // 移动到下一个数据索引
    
    // 设置下一步的动画
    poseTimeout = setTimeout(performAnimationStep, 30);
}

let intervalTimer = 0  // 用于页面加载后，自动播放动画

const clertIntervalTimer = ()=>{
    if(intervalTimer) clearInterval(intervalTimer)
}

function startPoseAnimate(){
    curIndex = 0; // 重置索引到起始位置
    if(poseData.length > 0 && window.$scene){
        clertIntervalTimer()  // 清除自动播放动画的定时器
        performAnimationStep(); // 开始动画
    }
}

intervalTimer = setInterval(()=>{
    startPoseAnimate()
},300)
