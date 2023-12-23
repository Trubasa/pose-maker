const getTextData = () => {
    return new Promise((resolve, reject) => {
        fetch("/js/readPoseData/data.txt").then(res => {
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

const scaleNum = 360
const getTransformData = (data)=>{ 
    // 数据的x,y,z坐标跟threejs的坐标系不一样，需要转换
    return {
        z:data[0] * scaleNum,
        x:data[1] * scaleNum,
        y:data[2] * scaleNum,
        isValid:!!data[3]
    }
}

const cleanData = (data) => {
    const person_key_point = data.person_key_point
    const person_one = person_key_point[0]
    let hip_data = [-1,-1,-1,0]
    if(person_one[8][3] && person_one[11][3]){  // hip 位置根据2个胯部的位置计算
        hip_data = person_one[8].map((item,index)=>(item + person_one[11][index])/2)
    }
    const right_hand_data = person_one[4]
    const left_hand_data = person_one[7]
    const right_foot_data = person_one[10]
    const left_foot_data = person_one[13]

    return {
        hip:getTransformData(hip_data),
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
    console.log('hip',hip)
    if(hip.isValid){
        ik_list[0].position.x = hip.x
        ik_list[0].position.y = hip.y
        ik_list[0].position.z = hip.z
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
getTextData().then((data)=>{
    // console.log("data",data)
    poseData = data

    startPoseAnimate()
})

function clearPoseTimer(){
    if(poseTimer){
        clearInterval(poseTimer)
    }
}

function startPoseAnimate(){
    if(poseData.length > 0){
        poseTimer = setInterval(()=>{
            const curData = poseData[curIndex]
            playData($scene.all_ik_list,curData)
            curIndex+=1
            if(curIndex >= poseData.length){
                curIndex = 0
            }
        },15)
    }
}