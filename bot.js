const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const request = require('request');
const mongoose = require('mongoose');
mongoose.Promise = global.Promise;

require('dotenv').config();

const port = process.env.PORT || 8080;
const VERIFY_TOKEN = process.env.VERIFY_TOKEN;
const ACCESS_TOKEN = process.env.ACCESS_TOKEN;

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.listen(port);

mongoose.connect(process.env.MONGODB_URI);

var userSchema = mongoose.Schema({
    id: String,
    number: Number
});
userSchema.methods.generateNumber = function() {
    this.number = Math.floor(Math.random() * 1000) + 1;
};
var User = mongoose.model('User', userSchema);

app.get('/', function(req, res) {
    res.send('it works');
});

app.get('/webhook', function(req, res) {
    if (req.query['hub.mode'] === 'subscribe' &&
        req.query['hub.verify_token'] === VERIFY_TOKEN) {
        res.status(200).send(req.query['hub.challenge']);
    } else {
        res.sendStatus(403);          
    }  
});

app.post('/webhook', function (req, res) {
    var data = req.body;

    if (data.object === 'page') {
        data.entry.forEach(function(entry) {
            var pageID = entry.id;
            var timeOfEvent = entry.time;

            entry.messaging.forEach(function(event) {
                if (event.message) {
                    receivedMessage(event);
                }
            });
        });

        res.sendStatus(200);
    }
});
  
function receivedMessage(event) {
    var senderID = event.sender.id;
    var recipientID = event.recipient.id;
    var timeOfMessage = event.timestamp;
    var message = event.message;

    var messageId = message.mid;
    var messageText = message.text;
    var messageAttachments = message.attachments;

    if (messageText) {
        getUser(senderID, function(user) {
            checkUserMessage(user, messageText);
        });
    }
}

function getUser(recipientId, callback) {
    User.findOne({id: recipientId}).then(user => {
        if (user) {
            callback(user);
        } else {
            User.create({id: recipientId}).then(user => {
                user.generateNumber();
                user.save().then(user => {
                    callback(user);
                });
            });
        }
    });
}

function checkUserMessage(user, messageText) {
    var check = parseInt(messageText);

    if (!check || isNaN(check)) {
        sendTextMessage(user.id, 'Please guess the number between 1 and 1000.');
    } else if (check < user.number) {
        sendTextMessage(user.id, 'Your number is smaller than the chosen one.');
    } else if (check > user.number) {
        sendTextMessage(user.id, 'Your number is bigger than the chosen one.');
    } else if (check === user.number) {
        sendGenericMessage(user.id);
        user.generateNumber();
        user.save();
        sendTextMessage(user.id, 'Well played! You have successfully guessed the right number. New number has been generated.');
    } else {
        sendTextMessage(user.id, 'Hmm.');
    }
}

function sendGenericMessage(recipientId) {
    var messageData = {
        recipient: {
            id: recipientId
        },
        message: {
            attachment: {
                type: 'image',
                payload: {
                    'url': 'https://pbs.twimg.com/profile_images/665915626850902016/Zp5lUnYl.jpg'
                }
            }
        }
    };  

    callSendAPI(messageData);
}

function sendTextMessage(recipientId, messageText) {
    var messageData = {
        recipient: {
            id: recipientId
        },
        message: {
            text: messageText
        }
    };

    callSendAPI(messageData);
}

function callSendAPI(messageData) {
    request({
        uri: 'https://graph.facebook.com/v2.6/me/messages',
        qs: { access_token: ACCESS_TOKEN },
        method: 'POST',
        json: messageData
    }, function (error, response, body) {
        if (!error && response.statusCode == 200) {
            var recipientId = body.recipient_id;
            var messageId = body.message_id;

            console.log('Successfully sent generic message with id %s to recipient %s', 
                messageId, recipientId);
        } else {
            console.error('Unable to send message.');
            console.error(response);
            console.error(error);
        }
    });  
}
