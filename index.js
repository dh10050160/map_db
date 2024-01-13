const express = require('express'); // import express
const { Pool } = require('pg'); // import pg module
const app = express(); // initialize express
// const port = 3000; //localhost
const port = process.env.PORT || 5000; //heroku

// 配置 PostgreSQL 連接(localhost)
// const pool = new Pool({
//     user: 'ann',
//     host: '150.116.67.217',
//     database: 'flood',
//     password: '0000',
//     port: 5432, // PostgreSQL port
// });

// 配置 PostgreSQL 連接(gcp)
const pool = new Pool({
    user: 'postgres',
    host: '34.31.70.151',
    database: 'flooddb',
    password: '0000',
    port: 5432, // PostgreSQL port
});

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
app.get('/details', async (req, res) => {
    try {
        const selectedRegion = req.query.region;
        const selectedCase = req.query.case;
        const result = await pool.query(`
            SELECT view_24hr_max.casename,view_24hr_max.caseseq, hr1, hr3, hr6, hr12, hr24,depth,ROUND((R1.ha::NUMERIC),1) AS ha, view_24hr_max.regioncode AS region
            FROM view_24hr_max,floodcase,(
                SELECT regioncode,floodarea.caseseq,sum(ST_Area(geom::geography))/10000 as ha
                FROM floodarea
                GROUP BY regioncode,caseseq
                ORDER BY regioncode,caseseq) R1
            WHERE  view_24hr_max.caseseq = floodcase.seq
            AND R1.regioncode = view_24hr_max.regioncode
            AND R1.caseseq = view_24hr_max.caseseq
            AND view_24hr_max.regioncode = $1
            AND view_24hr_max.caseseq <= $2
            ORDER BY ABS(hr24 - (SELECT hr24 FROM view_24hr_max WHERE regioncode = $1 AND caseseq = $2 ))
            LIMIT 4;
        `, [selectedRegion, selectedCase]);

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
            select caseseq,tag,ST_AsGeoJSON(geom) as geomjson
            from floodarea
            where regioncode = $1
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
    console.log(`Server is running at http://localhost:${port}`); //localhost
});