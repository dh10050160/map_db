var map = L.map('map').setView([23.6, 121.041976], 7); //經緯度, zoom
var osm = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    //maxZoom: 8,
    attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
}).addTo(map);

L.control.scale().addTo(map);

var baseMaps = {
    "OpenStreetMap": osm,
};
//初始化layerControl
var layerControl = L.control.layers(baseMaps).addTo(map);//https://leafletjs.com/examples/layers-control/

const regionSelect = document.getElementById('Region');
const caseSelect = document.getElementById('Case');
const townSelect = document.getElementById('Town');
const compareRadio = document.querySelectorAll('input[name="compare"]');

//事件監聽
regionSelect.addEventListener('change', handleSelectionChange);
caseSelect.addEventListener('change', handleSelectionChange);
townSelect.addEventListener('change', handleSelectionChange);
compareRadio.forEach(radio => radio.addEventListener('change', handleSelectionChange));

async function handleSelectionChange() {
    initMAP();

    const selectedRegion = regionSelect.value;
    const selectedCase = caseSelect.value;
    const selectedTown = townSelect.value;
    const selectedRadio = document.querySelector('input[name="compare"]:checked').value;

    try{
        //取得details
        const detailsResponse = await fetch(`/details?region=${selectedRegion}&case=${selectedCase}&town=${selectedTown}&compare=${selectedRadio}`);
        const detailsData = await detailsResponse.json();

        //取得spatial
        const spatialResponse = await fetch(`/spatial?region=${selectedRegion}&case=${selectedCase}`);
        const spatialData = await spatialResponse.json();

        //在map展示spatial
        addSpatialDataToMap(spatialData.resultRows, spatialData.detailsData, selectedCase);
        }catch(error){
            console.error('Error fetching cases', error);
    }
}

regionSelect.addEventListener('change',initMAP);

function initMAP() {
    // 清空地圖上的所有圖層
    map.eachLayer(function (layer) {
        if (layer instanceof L.GeoJSON) {
            map.removeLayer(layer);
        }
    });
    
    //清空 layerControl
    map.removeControl(layerControl);
    layerControl = L.control.layers(baseMaps).addTo(map);
    // console.log("重置 layerControl");
}

function addSpatialDataToMap(resultRows, detailsData, selectedCase) {
    // 創建一個物件來存儲各個 caseseq 的 featureGroup
    const caseseqGroups = {}; //function 

    //將空間數據加到地圖
    resultRows.forEach((feature, index) => {
        const geometry = JSON.parse(feature.geomjson);
        // console.log("geometry: "+geometry);
        let color;
        // 根據 case 設置不同的顏色
        if (feature.caseseq == selectedCase){
            color = 'red';
        }else if (feature.caseseq == detailsData[1].caseseq){
            color = '#ff8200';
        }else if (feature.caseseq == detailsData[2].caseseq){
            color = 'blue';
        }else if (feature.caseseq == detailsData[3].caseseq){
            color = 'green';
        }else {
            color = 'gray'; // 預設為灰色
            console.log("feature.caseseq: "+feature.caseseq);
        }

        // 如果還沒有為該 caseseq 創建 featureGroup，就創建一個
        if (!caseseqGroups[feature.caseseq]) {
            caseseqGroups[feature.caseseq] = L.featureGroup.subGroup();
            // 將 featureGroup 添加到地圖
            caseseqGroups[feature.caseseq].addTo(map);
        }
        console.log("hahaha= "+feature.ha);
        /*方法2*/
        const geoJSONLayer = L.geoJSON(geometry, {
            style: {
                color: color,
                weight: 2,
                opacity: 1
            }
        }).bindPopup("面積約: "+feature.ha.toFixed(3)+" 公頃");

        // 添加 GeoJSON 圖層到 featureGroup
        geoJSONLayer.addTo(caseseqGroups[feature.caseseq]);
    });

    // 計算包含子群組的座標
    function calculateBounds(group) {
        const groupBounds = L.latLngBounds();

        group.eachLayer(layer => {
            if (layer instanceof L.LayerGroup) {
                groupBounds.extend(calculateBounds(layer));
            } else {
                groupBounds.extend(layer.getBounds());
            }
        });

        return groupBounds;
    }

    // 將每個 caseseq 的 featureGroup 添加到 Layer Control
    Object.keys(caseseqGroups).forEach(caseseq => {
        const groupBounds = calculateBounds(caseseqGroups[caseseq]);
        
        // 找到相應的 feature 對象
        const correspondingFeature = detailsData.find(feature => feature.caseseq === parseInt(caseseq));
        // 獲取 casename
        const casename = correspondingFeature ? correspondingFeature.casename : `Case ${caseseq}`;
        // 獲取 color
        let casecolor;
        if (correspondingFeature && correspondingFeature.caseseq == selectedCase){
            casecolor = 'Red';
        } else if (correspondingFeature && correspondingFeature.caseseq == detailsData[1].caseseq){
            casecolor = 'Orange';
        } else if (correspondingFeature && correspondingFeature.caseseq == detailsData[2].caseseq){
            casecolor = 'Blue';
        } else if (correspondingFeature && correspondingFeature.caseseq == detailsData[3].caseseq){
            casecolor = 'Green';
        } else {
            casecolor = 'Gray'; // 預設為灰色
            console.log("feature.caseseq: "+correspondingFeature.caseseq);
        }
        // console.log("casecolor: "+casecolor);

        // 設定文字顏色
        const coloredText = `<span style="color: ${casecolor}">${casecolor}: ${casename}</span>`;

        // layerControl.addOverlay(caseseqGroups[caseseq],casecolor+": "+casename);
        layerControl.addOverlay(caseseqGroups[caseseq],coloredText);

        // 使用 fitBounds 縮放地圖
        map.fitBounds(groupBounds);
    });

}