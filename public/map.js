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

caseSelect.addEventListener('change', function(){
    //async
    initMAP();
    const selectedRegion = regionSelect.value;
    const selectedCase = caseSelect.value;

    // try{
    //     const response = await fetch(`/spatial?region=${selectedRegion}&case=${selectedCase}`);
    //     const data = await response.json();

    //     const resultRows = data.resultRows;
    //     const detailsData = data.detailsData;

    // 延遲 fetch 請求，等待其他事件處理完成
    setTimeout(function () {
        fetch(`/spatial?region=${selectedRegion}&case=${selectedCase}`)
        .then(response => response.json())
        .then(data => {
            const resultRows = data.resultRows;
            const detailsData = data.detailsData;
            // console.log("resultRows: "+resultRows); //[object Object]
            // 創建一個物件來存儲各個 caseseq 的 featureGroup
            const caseseqGroups = {};

            //將空間數據加到地圖
            resultRows.forEach((feature, index) => {
                const geometry = JSON.parse(feature.geomjson);
                // console.log("geometry: "+geometry);
                let color;
                // 根據 case 設置不同的顏色
                if (feature.caseseq == selectedCase){
                    color = 'red';
                }else if (feature.caseseq == detailsData[1].caseseq){
                    color = 'orange';
                }else if (feature.caseseq == detailsData[2].caseseq){
                    color = 'blue';
                }else if (feature.caseseq == detailsData[3].caseseq){
                    color = 'green';
                }else {
                    color = 'gray'; // 預設為灰色
                    console.log("feature.caseseq: "+feature.caseseq);
                }
                /*方法1*/
                // let tag = feature.tag;
                // L.geoJSON(geometry, {
                //     style: {
                //         color: color,
                //         weight: 2,
                //         opacity: 1
                //     },
                //     onEachFeature: function (feature, layer) {
                //         // 為每個圖層添加點擊事件
                //         // console.log("feature.tag: "+feature.tag); // undefined
                //         layer.on('click', function (e) {
                //             // 使用 openPopup() 顯示 tag
                //             layer.bindPopup(tag).openPopup();
                //         });
                //     }
                // }).addTo(map);

                // 如果還沒有為該 caseseq 創建 featureGroup，就創建一個
                if (!caseseqGroups[feature.caseseq]) {
                    caseseqGroups[feature.caseseq] = L.featureGroup.subGroup();
                    // 將 featureGroup 添加到地圖
                    caseseqGroups[feature.caseseq].addTo(map);
                }

                /*方法2*/
                const geoJSONLayer = L.geoJSON(geometry, {
                    style: {
                        color: color,
                        weight: 2,
                        opacity: 1
                    }
                }).bindPopup(feature.tag)
                    // function (layer) {
                    // console.log("layer.feature.properties.description: "+feature.tag);    
                    // return feature.tag;
                    // })
                ;

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
    // }catch(error){
    //     console.error('Error fetching cases', error);
    // }
        });
    }, 100); // 這裡的 1000 表示延遲 1 秒，您可以根據實際需要調整延遲時間
    
});

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