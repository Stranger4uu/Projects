const express = require('express')
const pool = require('./db')


const app = express()
const port = 3000



app.get('/health', (req, res) => {
    res.status(200).json({
        status: 'ok'
    })
})

/* 
async = allows the handler to wait for database work.

pool.query(...) = sends the SQL to PostgreSQL using the pool from db.js.

await = waits for PostgreSQL’s reply before continuing.

result.rows = contains the restaurant objects. res.json(...) sends them to Postman.
*/

app.get('/v1/restaurants', async (req, res) => {
    const result = await pool.query(
        'SElECT id, name, area, cuisine FROM restaurants ORDER BY id'
    )
    res.status(200).json(result.rows)
})

// API for one restaurant 

/* 
:id = is a route parameter. For /v1/restaurants/1, Express puts "1" in req.params.id.

$1 = is a PostgreSQL placeholder. [id] supplies its value safely; don’t build SQL by joining user input into the string.

rows[0] = returns one restaurant; an empty rows array means no restaurant matched.

404 = tells the client that restaurant wasn’t found.
*/

app.get('/v1/restaurants/:id', async (req, res) => {
    const id = req.params.id

    if(!/^[1-9][0-9]*$/.test(id) || id.length > 19 || BigInt(id) > 9223372036854775807n) {
        return res.status(400).json({ error: 'Invalid restaurant ID' })
    }

    /* req.params.id = is text from the URL.
    /^[1-9][0-9]*$/ = checks that the entire value is a positive whole number, without leading zeroes.
    .test(id) = returns true or false.
    ! = means “if it did not pass.”
*/

    const result = await pool.query(
        'SELECT id, name, area, cuisine FROM restaurants WHERE id=$1',
        [id]
    )

    if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Restaurant not found' })
    }

    return res.status(200).json(result.rows[0])
})

// shared error handler

app.use((error, req, res, next) => {
    console.log(error)


    if (res.headersSent){
        return next(error)
    }

    res.status(500).json({error : 'Internal server error'})
})

app.listen(port, () => {
    console.log(`server is running on http://localhost:${port}`)
})