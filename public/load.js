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
    const selectedRegion = regionSelect.value;
    const selectedCase = caseSelect.value;
    // console.log("selectedRegion: "+selectedRegion);
    // console.log("selectedCase: "+selectedCase);
    
    const table = document.querySelector(".table")
    initTableAndChart(table,myChart);
    // Fetch details for the selected case in the selected region
    fetch(`/details?region=${selectedRegion}&case=${selectedCase}`)
        .then(response => response.json())
        .then(details => {
            // console.log(details);
            
            // console.log(details.length); // 4
            for (let i = 1; i <= details.length; i++) {
                // Populate the table with the retrieved details
                table.rows[i].cells[1].textContent = details[i-1].casename;
                table.rows[i].cells[2].textContent = details[i-1].hr24;
                table.rows[i].cells[3].textContent = details[i-1].ha;
                table.rows[i].cells[4].textContent = details[i-1].depth;

                // Populate the chart with the retrieved details
                myChart.data.datasets[i-1].label = details[i-1].casename;
                myChart.data.datasets[i-1].data = [details[i-1].hr1, details[i-1].hr3, details[i-1].hr6, details[i-1].hr12, details[i-1].hr24];
            }

            myChart.update();
        })
        .catch(error => console.error('Error fetching case details', error));
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