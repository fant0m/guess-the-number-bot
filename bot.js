const VERIFY_TOKEN = 'dont_worry_its_correct';
const express = require('express');
const app = express();

app.listen(3000);

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