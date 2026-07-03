const { Pool } = require("pg");

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false
    }
});

pool.on("connect", (client) => {
    client.query("SET TIME ZONE 'America/Mexico_City'");
});

module.exports = pool;