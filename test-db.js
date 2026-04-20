const pool = require("./data/database");

async function testDB() {

    const result = await pool.query("SELECT NOW()");

    console.log("Conexión exitosa:", result.rows[0]);

    process.exit();
}

testDB();