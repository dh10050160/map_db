const express = require('express'); // import express
const { Pool } = require('pg'); // import pg module
const app = express(); // initialize express

// const port = process.env.PORT || 5000; //heroku
const port = 3000;
const host = 'localhost';
// 配置 PostgreSQL local-local
// const pool = new Pool({
//     user: 'ann',
//     host: 'localhost',
//     database: 'flood',
//     password: '0000',
//     port: 5432, // PostgreSQL port
// });

// 配置 PostgreSQL local-vm
const pool = new Pool({
    user: 'postgres',
    host: '34.171.145.183',
    database: 'gcp_flooddb',
    password: '',
    port: 5432, // PostgreSQL port
});
// const host = '34.171.145.183';
// 配置 PostgreSQL vm-vm
// const pool = new Pool({
//     user: 'postgres',
//     host: 'localhost',
//     database: 'gcp_flooddb',
//     password: '',
//     port: 5432, // PostgreSQL port
// });

// 定義全局變量來存儲數據
let detailsData = null;

app.use(express.static('public'));

app.get('/regions', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM region');
        res.json(result.rows);
    } catch (error) {
        console.error('Error executing query', error);
        res.status(500).send('Internal Server Error');
    }
});

// Add this route after the '/regions' route
app.get('/cases', async (req, res) => {
    try {
        const selectedRegion = req.query.region;
        const result = await pool.query(`
            SELECT regionname,CAST(caseseq AS INTEGER) AS caseseq,casename,casedate
            FROM floodarea, floodcase, region
            WHERE floodarea.regioncode = region.code
            AND floodarea.caseseq = floodcase.seq
            AND regionname = $1
            GROUP BY regionname,casedate,casename,caseseq
            ORDER BY  floodcase.casedate;
        `, [selectedRegion]);
        res.json(result.rows);
    } catch (error) {
        console.error('Error executing query', error);
        res.status(500).send('Internal Server Error');
    }
});

// Add this route after the '/cases' route
app.get('/towns', async (req, res) => {
    try {
        const selectedRegion = req.query.region;
        const selectedCase = req.query.case;
        const result = await pool.query(`
            SELECT rain.town AS town,count(*)
            FROM rain,rainstation
            WHERE rain.stationcode = rainstation.stationcode
            AND rain.regioncode = $1
            AND rain.caseseq = $2
            GROUP BY town;
        `, [selectedRegion, selectedCase]);
        res.json(result.rows);
    } catch (error) {
        console.error('Error executing query', error);
        res.status(500).send('Internal Server Error');
    }
});

// Add this route after the '/town' route
app.get('/details', async (req, res) => {
    try {
        const selectedRegion = req.query.region;
        const selectedCase = req.query.case;
        const selectedTown = req.query.town;
        const selectedRadio = req.query.compare;
        
        console.log("Details 後端:", {
            selectedRegion,
            selectedCase,
            selectedTown,
            selectedRadio
        });
        let viewName;
        let compareMode;
        if (selectedRadio === 'hr3') {
            viewName = 'view_3hr_max';
            compareMode = 'hr3';
        } else if (selectedRadio === 'hr24') {
            viewName = 'view_24hr_max';
            compareMode = 'hr24';
        } else {
            viewName = 'view_24hr_max';
            compareMode = 'hr24';
        }
        console.log("viewName: "+viewName);
        console.log("compareMode: "+compareMode);
        
        // 檢查有沒有選 town
        if (selectedTown === 'Choose Town') {
            result = await pool.query(`
            SELECT ${viewName}.casename,${viewName}.caseseq, hr1, hr3, hr6, hr12, hr24,depth,ROUND((R1.ha::NUMERIC),1) AS ha, ${viewName}.regioncode AS region,stationname
            FROM ${viewName},floodcase,(
                SELECT regioncode,floodarea.caseseq,sum(ST_Area(geom::geography))/10000 as ha
                FROM floodarea
                GROUP BY regioncode,caseseq
                ORDER BY regioncode,caseseq) R1
            WHERE  ${viewName}.caseseq = floodcase.seq
            AND R1.regioncode = ${viewName}.regioncode
            AND R1.caseseq = ${viewName}.caseseq
            AND ${viewName}.regioncode = $1
            AND ${viewName}.caseseq <= $2
            ORDER BY ABS(hr24 - (SELECT hr24 FROM ${viewName} WHERE regioncode = $1 AND caseseq = $2 ))
            LIMIT 4;
            `, [selectedRegion, selectedCase]);
        } else {
        result = await pool.query(`
        SELECT s.regioncode AS regioncode,s.caseseq AS caseseq,casename,stationname,stationcode, hr1, hr3, hr6, hr12, hr24, depth,town,ROUND((area_summary_view.ha::NUMERIC),1) AS ha
        FROM(
            SELECT rain.regioncode,rain.caseseq, rainstation.stationname,rain.stationcode, hr1, hr3, hr6, hr12, hr24, depth,rain.town,
            ROW_NUMBER() OVER (PARTITION BY rain.caseseq ORDER BY rain.${compareMode} DESC) AS row_num
            FROM rain,rainstation
            WHERE rain.stationcode = rainstation.stationcode
            AND rain.regioncode = $1
            AND rain.caseseq <= $2
            AND rain.town = $3
        ) AS s, floodcase,area_summary_view
        WHERE s.caseseq = floodcase.seq 
        AND area_summary_view.regioncode = s.regioncode
        AND area_summary_view.caseseq =  s.caseseq
        AND row_num = 1
        ORDER BY  ABS(${compareMode} - (
            SELECT ${compareMode}
            FROM (
                SELECT rain.${compareMode}
                FROM rain
                WHERE rain.regioncode = $1
                AND rain.caseseq = $2
                AND rain.town = $3
                ORDER BY  rain.${compareMode} DESC
                LIMIT 1
            )
        ))
        LIMIT 4
        `, [selectedRegion, selectedCase, selectedTown]);
    }
        // 存儲數據到全局變量
        detailsData = result.rows;
        
        res.json(result.rows);
    } catch (error) {
        console.error('Error executing query', error);
        res.status(500).send('Internal Server Error');
    }
});

app.get('/spatial', async (req, res) => {
    try {
        console.log("spatial spatial")
        // 等待 detailsData 數據更新
        await new Promise(resolve => setTimeout(resolve, 200)); // 延遲 ? 毫秒

        const selectedRegion = req.query.region;
        // const selectedCase = req.query.case;
        // console.log("selectedRegion: "+selectedRegion);
        // console.log("selectedCase: "+selectedCase);
        const caseseqs = detailsData.map(item => item.caseseq).join(','); // Array
        // console.log("detailsData: "+detailsData[0].caseseq);
        console.log("caseseqs: "+caseseqs);
        const result = await pool.query(`
            select caseseq,tag,ST_AsGeoJSON(geom) as geomjson,ha,casename
            from floodarea,floodcase
            where regioncode = $1
            and floodarea.caseseq = floodcase.seq
            and caseseq IN (${caseseqs});
        `, [selectedRegion]);
        // console.log("result: "+result.rows);
        res.json({resultRows: result.rows, detailsData: detailsData});
    } catch (error) {
        console.error('Error executing query', error);
        res.status(500).send('Internal Server Error');
    }
});

app.listen(port, () => {
    console.log(`Server is running at http://${host}:${port}`); //localhost
});