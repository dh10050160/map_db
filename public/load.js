//製作chart
const myChart = new Chart(document.getElementById("myChart"), {
    type: 'bar',
    data: {
        labels: ['1', '3', '6', '12', '24'],
        datasets: [
            {
                label: '',
                data: [],
                borderWidth: 1,
                backgroundColor: 'rgba(255, 0, 0, 0.8)',//紅色
            },
            {
                label: '',
                data: [],
                borderWidth: 1,
                backgroundColor: 'rgb(255,140,0,0.8)'//橘色
            },
            {
                label: '',
                data: [],
                borderWidth: 1,
                backgroundColor: 'rgba(0, 0, 255, 0.8)'//藍色
            },
            {
                label: '',
                data: [],
                borderWidth: 1,
                backgroundColor: 'rgba(0,100,0,0.8)'//深綠色
            }
        ]
    },
    options: {
        maintainAspectRatio: false,
        title: {
            display: true,
            text: '累積雨量',
            fontSize: "20"
        },
        scales: {
            //坐標軸標題
            xAxes: [{
                scaleLabel: {
                    display: true,
                    labelString: '時間(小時)'
                }
            }],
            yAxes: [{
                scaleLabel: {
                    display: true,
                    labelString: '雨量(mm)'
                },
                ticks: {
                    suggestedMax: 1000
                }
            }]
        }
    }
});

// Fetch regions and populate the "Choose Region" dropdown
fetch('/regions')
.then(response => response.json())
.then(data => {
    const regionSelect = document.getElementById('Region');
    data.forEach(region => {
        const option = document.createElement('option');
        option.value = region.code; 
        option.text = region.regionname;
        regionSelect.appendChild(option);
    });
});

const regionSelect = document.getElementById('Region'); 
const caseSelect = document.getElementById('Case');
const townSelect = document.getElementById('Town');

// Event listener for region selection
regionSelect.addEventListener('change', function () {
    const selectedRegion = encodeURIComponent(regionSelect.options[regionSelect.selectedIndex].text);
    // console.log("selectedRegion: "+selectedRegion);

    const table = document.querySelector(".table")
    initTableAndChart(table,myChart);
    // Fetch cases for the selected region
    fetch(`/cases?region=${selectedRegion}`)
        .then(response => response.json())
        .then(data => {
            // Clear existing options
            // console.log(data);
            caseSelect.innerHTML = '<option selected>Choose Case</option>';
            townSelect.innerHTML = '<option selected>Choose Town</option>'; //初始化Town

            // Populate the "Choose Case" dropdown with the retrieved cases
            data.forEach(caseData => {
                const option = document.createElement('option');
                option.value = caseData.caseseq;
                option.text = caseData.casename;
                caseSelect.appendChild(option);
                // console.log(`caseData.caseseq: ${caseData.caseseq}`);
                // console.log(`option.value: ${option.value}`);
            });
        })
        .catch(error => console.error('Error fetching cases', error));
});

// Event listener for case selection
caseSelect.addEventListener('change', function () {
    const selectedRegion = regionSelect.value; //取得選取的region
    const selectedCase = caseSelect.value; //取得選取的case

    const table = document.querySelector(".table")
    initTableAndChart(table,myChart);
    fetchDetails();
    // Fetch towns for the selected case in the selected region
    fetch(`/towns?region=${selectedRegion}&case=${selectedCase}`)
        .then(response => response.json())
        .then(data => {
            // console.log(data);
            // Clear existing options
            townSelect.innerHTML = '<option selected>Choose Town</option>';

            // Populate the "Choose Town" dropdown with the retrieved towns
            data.forEach(town => {
                const option = document.createElement('option');
                option.value = town.town;
                option.text = town.town;
                townSelect.appendChild(option);
            });

        })
        .catch(error => console.error('Error fetching towns', error));
});

// Event listener for town selection
townSelect.addEventListener('change', function () {
    fetchDetails();
    initTableAndChart(document.querySelector(".table"), myChart);
    console.log("here townSelect 這裡這裡");
});

function formatTableNumbers() {
    const table = document.querySelector('.table tbody');
    const rows = table.querySelectorAll('tr');

    rows.forEach(row => {
        // 獲取<->最後三個<td>元素
        const cells = row.querySelectorAll('td');
        const lastThreeCells = [cells[cells.length - 3], cells[cells.length - 2], cells[cells.length - 1]];
        lastThreeCells.forEach(cell => {
            // 1.轉成浮點數2.格是化成小受點後一位
            let num = parseFloat(cell.innerText);
            if (!isNaN(num)) {
                cell.innerText = num.toFixed(1);
            }
        });
    });
}

// // 在DOM加載完成後調用formatTableNumbers初始化表格
// document.addEventListener('DOMContentLoaded', (event) => {
//     formatTableNumbers();
// });

// fetchDetails().then(() => {
//     // 在 fetchDetails 完成後初始化表格
//     formatTableNumbers();
// });

function fetchDetails() {

    const selectedRegion = regionSelect.value;
    const selectedCase = caseSelect.value;
    const selectedTown = townSelect.value;
    const selectedRadio = document.querySelector('input[name="compare"]:checked').value;
    // console.log("selectedRegion: "+selectedRegion);
    // console.log("selectedCase: "+selectedCase);
    // console.log("selectedTown: "+selectedTown);
    // console.log("selectedRadio: "+selectedRadio);

    if (!selectedRegion || !selectedCase || !selectedTown || !selectedRadio) {
        return; // 確保所有選項都被選取
    }

    console.log("Fetching details for:", {
        selectedRegion,
        selectedCase,
        selectedTown,
        selectedRadio
    });

    fetch(`/details?region=${selectedRegion}&case=${selectedCase}&town=${selectedTown}&compare=${selectedRadio}`)
        .then(response => response.json())
        .then(details => {
            console.log(details);

            const table = document.querySelector(".table");
            // console.log(details.length); // 4
            for (let i = 1; i <= details.length; i++) {
                // Populate the table with the retrieved details
                table.rows[i].cells[1].textContent = details[i-1].casename;
                table.rows[i].cells[2].textContent = details[i-1].hr24;
                table.rows[i].cells[3].textContent = details[i-1].ha;
                table.rows[i].cells[4].textContent = details[i-1].depth;

                // Populate the chart with the retrieved details
                myChart.data.datasets[i-1].label = details[i-1].casename+"("+details[i-1].stationname+")"; //增加雨量站名稱
                myChart.data.datasets[i-1].data = [details[i-1].hr1, details[i-1].hr3, details[i-1].hr6, details[i-1].hr12, details[i-1].hr24];
            }

            myChart.update();

            // fetchDetails完成後調用formatTableNumbers初始化表格
            formatTableNumbers();
        })
        .catch(error => console.error('Error fetching case details', error));
}

// Event listener for compare mode selection
const compareRadioButtons = document.getElementsByName('compare');

compareRadioButtons.forEach(button => {
    button.addEventListener('change', function () {
        fetchDetails();
    //     const selectedRegion = regionSelect.value;
    //     const selectedCase = caseSelect.value;
    //     const selectedTown = townSelect.value;
    //     console.log("here compare  compare");

    //     // Fetch details for the selected case in the selected region with the new compare mode
    //     fetch(`/details?region=${selectedRegion}&case=${selectedCase}&town=${selectedTown}&compare=${button.value}`)
    //         .then(response => response.json())
    //         .then(details => {
    //             console.log(details);
    //             // Update your page content, e.g., table and chart

    //             // Trigger the spatial event
    //             caseSelect.dispatchEvent(new Event('change'));
    //         })
    //         .catch(error => console.error('Error fetching case details', error));
    });
});

function initTableAndChart(table,myChart) {
    for (let i = 1; i < 5; i++) {
        //初始化表格
        table.rows[i].cells[1].textContent = "x";
        table.rows[i].cells[2].textContent = "x";
        table.rows[i].cells[3].textContent = "x";
        table.rows[i].cells[4].textContent = "x";

        //初始化chart
        myChart.data.datasets[i-1].label = "";
        myChart.data.datasets[i-1].data = [];
    }
    myChart.update();
}