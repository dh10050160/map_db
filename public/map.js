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

            // 創建一個物件來存儲各個 caseseq 的 featureGroup
            const caseseqGroups = {};

            //將空間數據加到地圖
            resultRows.forEach((feature, index) => {

                const geometry = JSON.parse(feature.geomjson);
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

            // 將每個 caseseq 的 featureGroup 添加到 Layer Control
            Object.keys(caseseqGroups).forEach(caseseq => {
                // 找到相應的 feature 對象
                const correspondingFeature = detailsData.find(feature => feature.caseseq === parseInt(caseseq));
                // 獲取 casename 和 color
                // const casename = correspondingFeature ? correspondingFeature.casename : `Case ${caseseq}`;
                // const color = getColorForCase(caseseq);  // 這裡應根據 caseseq 獲取顏色的方法，可以自己實現
                const casename = correspondingFeature ? correspondingFeature.casename : `Case ${caseseq}`;
                // 添加 GeoJSON 圖層到 featureGroup
                // layerControl.addOverlay(caseseqGroups[caseseq], `red: ${casename}`);
                layerControl.addOverlay(caseseqGroups[caseseq], casename);
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


/*

addEventListener("change", function (event) {

        //重置layerControl
        if (layerControl) {
            map.removeControl(layerControl);
            layerControl = L.control.layers(baseMaps).addTo(map);
            // console.log("重置 layerControl: ");
            // // 使用 Object.keys 取得物件的所有 key
            // Object.keys(layerControl).forEach(key => {
            //     console.log(`${key}:`, layerControl[key]);
            // });
        }

        //kmlFile0Name = select的選項名稱
        var kmlFile0Name = select.options[select.selectedIndex].text;

        if (event.target === select) { //如果是選擇kmlFileSelect
            //取得第一層 Region 的 value
            const selectregion = document.getElementById("Region");
            const selectedOption = selectregion.options[selectregion.selectedIndex];
            const selectedOptionValue = selectedOption.value;
            // console.log("selectedOptionValue from map: " + selectedOptionValue);
            let region; 
            switch (selectedOptionValue) {
                case "6300065000":
                    region = "Taipei";
                    // console.log("region是台北");
                    break;
                case "64000":
                    region = "Kaohsiung";
                    // console.log("region是高雄");
                    break;
                default:
                    region = null;
                    break;
            };

            //fetch('leaflet-kml-master/assets/Kaohsiung/1100731.kml')
            fetch('leaflet-kml-master/assets/' + region + '/' + select.value)
                .then(res => res.text())
                .then(kmltext => {
                    // Create new kml overlay
                    const parser = new DOMParser();
                    const kml = parser.parseFromString(kmltext, 'text/xml');
                    const track = new L.KML(kml);
                    map.addLayer(track);

                    // 將新的 KML 圖層加到 kmlLayers 中
                    kmlLayers0 = track;

                    // console.log("map-kmlLayers0:"+kmlLayers0);
                    layerControl.addOverlay(kmlLayers0, 'KML Layer Red: ' + kmlFile0Name);

                    // console.log("layerControl 一 一 一: ");
                    // // 使用 Object.keys 取得物件的所有 key
                    // Object.keys(layerControl).forEach(key => {
                    //     console.log(`${key}:`, layerControl[key]);
                    // });

                    // Adjust map to show the kml
                    const bounds = track.getBounds();
                    map.fitBounds(bounds);
                });


            let compareTOP3 = [];
            let kmlFile1, kmlFile2, kmlFile3;
            console.log("主事件 region: " + region);
            function handleDataUpdate(region) {
                console.log("進入handleDataUpdate");
                if (window.compare && window.compare.arrcase) {
                    //初始化compareTOP3
                    compareTOP3 = [];
                    compareTOP3 = window.compare.arrcase;
                    // console.log("map-top3:"+compareTOP3);

                    let json = window.load.data;
                    // console.log("map-json:" + json);

                    kmlFile1 = json[compareTOP3[0] - 1].kml;
                    kmlFile2 = json[compareTOP3[1] - 1].kml;
                    kmlFile3 = json[compareTOP3[2] - 1].kml;
                    // console.log("kmlFile1:" + kmlFile1);
                    // console.log("kmlFile2:" + kmlFile2);
                    // console.log("kmlFile3:" + kmlFile3);
                    var kmlFile1Name = json[compareTOP3[0] - 1].name;
                    var kmlFile2Name = json[compareTOP3[1] - 1].name;
                    var kmlFile3Name = json[compareTOP3[2] - 1].name;

                    // Load kml file 相似事件1
                    console.log("相似事件1 2 3 region: " + region);
                    fetch('leaflet-kml-master/assets/' + region + '/' + kmlFile1)
                        .then(res => res.text())
                        .then(kmltext => {
                            // console.log('KML data for 相似事件1:', kmltext);  // 檢查KML內容
                            // Create new kml overlay
                            const parser = new DOMParser();
                            const kml = parser.parseFromString(kmltext, 'text/xml');
                            const track = new L.KML(kml);
                            track.setStyle({ color: 'orange' });//改顏色
                            //track.setStyle({opacity: 0.5});//改透明度
                            map.addLayer(track);

                            // 將新的 KML 圖層加到 kmlLayers 中
                            kmlLayers1 = track;
                            // console.log("map-kmlLayers1:" + kmlLayers1); 
                            layerControl.addOverlay(kmlLayers1, 'KML Layer Orange: ' + kmlFile1Name); //加入layerControl

                            // Adjust map to show the kml
                            const bounds = track.getBounds();
                            map.fitBounds(bounds);
                        })

                    // Load kml file 相似事件2
                    fetch('leaflet-kml-master/assets/' + region + '/' + kmlFile2)
                        .then(res => res.text())
                        .then(kmltext => {
                            // Create new kml overlay
                            const parser = new DOMParser();
                            const kml = parser.parseFromString(kmltext, 'text/xml');
                            const track = new L.KML(kml);
                            track.setStyle({ color: 'blue' });//改顏色
                            map.addLayer(track);

                            // 將新的 KML 圖層加到 kmlLayers 中
                            kmlLayers2 = track;
                            // console.log("map-kmlLayers2:" + kmlLayers2);
                            layerControl.addOverlay(kmlLayers2, 'KML Layer Blue: ' + kmlFile2Name);

                            // Adjust map to show the kml
                            const bounds = track.getBounds();
                            map.fitBounds(bounds);
                        })

                    // Load kml file 相似事件3
                    fetch('leaflet-kml-master/assets/' + region + '/' + kmlFile3)
                        .then(res => res.text())
                        .then(kmltext => {
                            // Create new kml overlay
                            const parser = new DOMParser();
                            const kml = parser.parseFromString(kmltext, 'text/xml');
                            const track = new L.KML(kml);
                            track.setStyle({ color: 'green' });//改顏色
                            map.addLayer(track);

                            // 將新的 KML 圖層加到 kmlLayers 中
                            kmlLayers3 = track;
                            // console.log("map-kmlLayers3:" + kmlLayers3);
                            layerControl.addOverlay(kmlLayers3, 'KML Layer Green: ' + kmlFile3Name);

                            // Adjust map to show the kml
                            const bounds = track.getBounds();
                            map.fitBounds(bounds);
                        })
                };

            }

        }
    }
});
*/