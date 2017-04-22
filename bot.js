const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const request = require('request');
const mongoose = require('mongoose');

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
        sendTextMessage(senderID, messageText);
    }
}

function sendGenericMessage(recipientId, messageText) {
    var messageData = {
        recipient: {
            id: recipientId
        },
        message: {
            attachment: {
                type: "template",
                payload: {
                    template_type: "generic",
                    elements: [{
                        title: "rift",
                        subtitle: "Next-generation virtual reality",
                        item_url: "https://www.oculus.com/en-us/rift/",               
                        image_url: "http://messengerdemo.parseapp.com/img/rift.png",
                        buttons: [{
                            type: "web_url",
                            url: "https://www.oculus.com/en-us/rift/",
                            title: "Open Web URL"
                        }, {
                            type: "postback",
                            title: "Call Postback",
                            payload: "Payload for first bubble",
                        }],
                    }, {
                        title: "touch",
                        subtitle: "Your Hands, Now in VR",
                        item_url: "https://www.oculus.com/en-us/touch/",               
                        image_url: "http://messengerdemo.parseapp.com/img/touch.png",
                        buttons: [{
                            type: "web_url",
                            url: "https://www.oculus.com/en-us/touch/",
                            title: "Open Web URL"
                        }, {
                            type: "postback",
                            title: "Call Postback",
                            payload: "Payload for second bubble",
                        }]
                    }]
                }
            }
        }
    };  

    callSendAPI(messageData);
}

function sendTextMessage(recipientId, messageText) {
    var messageResult = 'Hmm.';

    User.findOne({id: recipientId}, function(user) {
        if (user) {
            messageResult = checkMessage(messageText, user.number);

            if (parseInt(messageText) === user.number) {
                sendGenericMessage();
                user.generateNumber();
                user.save();
            }
        } else {
            User.create({id: recipientId}).then(function(user) {
                user.generateNumber();

                messageResult = checkMessage(messageText, user.number);
                if (parseInt(messageText) === user.number) {
                    sendGenericMessage();
                    user.generateNumber();
                }

                user.save();
            });
        }
    });

    var messageData = {
        recipient: {
            id: recipientId
        },
        message: {
            text: messageResult
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

function checkMessage(message, number) {
    console.log(message+","+number);
    var message = parseInt(message);

    if (!message || isNan(message)) {
        return 'Please guess the number between 1 and 1000.';
    } else if (message < number) {
        return 'Your number is smaller than the chosen one.';
    } else if (message > number) {
        return 'Your number is bigger than the chosen one.';
    } else if (message == number) {
        return 'Well played! You have successfully guessed the right number.';
    }

    return 'Hmm.';
}