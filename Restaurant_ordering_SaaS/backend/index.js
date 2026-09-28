const express = require('express')
const pool = require('./db')


const app = express()
const port = 3000

const restaurants =[
    {
        id : 1,
        name: 'Student cafe',
        area: 'Sitapura',
        cuisine: 'Cafe',
    },
    {
        id: 2,
        name: 'Oslo',
        area: 'Jagatpura',
        cuisine: 'Indian',
    }
]


app.get('/health',(req, res) => {
    res.status(200).json({
        status: 'ok'
    })
})

app.get('/v1/restaurants', (req, res) => {
    res.status(200).json(restaurants)
})

app.listen(port, () => {
    console.log(`server is running on http://localhost:${port}`)
})