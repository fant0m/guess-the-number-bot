const express = require('express');
const app = express();

const port = process.env.PORT || 8080;
const VERIFY_TOKEN = 'dont_worry_its_correct';

app.listen(port);

app.get('/', function(req, res) {
    res.send('it works');
});

app.get('/webhook', function (req, res) {
    if (req.query['hub.verify_token'] === VERIFY_TOKEN) {
        res.send(req.query['hub.challenge']);
    } else {
        res.send('Error, wrong validation token');    
    }
});