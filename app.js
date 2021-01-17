//requires
const Discord = require('discord.js');
const prompt = require('prompt-sync')();

//Discord API
const client = new Discord.Client();
client.login("Nzk5ODI0ODE0MjQ0MjMzMjQ2.YAJM5w.wSOLlQjA3__Hf9CwmNbUiNXyDzc");

const botID = 799824814244233246;


//Computer Vision API

var key = "";

while (key.length < 10) {
    key = prompt('Cognitive key: ');
}
    
const endpoint = 'https://discription.cognitiveservices.azure.com/';

const async = require('async');
const fs = require('fs');
const https = require('https');
const path = require("path");
const createReadStream = require('fs').createReadStream;
const sleep = require('util').promisify(setTimeout);
const ComputerVisionClient = require('@azure/cognitiveservices-computervision').ComputerVisionClient;
const ApiKeyCredentials = require('@azure/ms-rest-js').ApiKeyCredentials;

const STATUS_SUCCEEDED = "succeeded";
const STATUS_FAILED = "failed"

const computerVisionClient = new ComputerVisionClient(
    new ApiKeyCredentials({ inHeader: { 'Ocp-Apim-Subscription-Key': key } }), endpoint);

//see if the bot is active or toggled off
var isActive = true;

var imageURL;

var imageCaption = "Null description!";
var textCaption;
var textinImage = "";
var textinImgMsg = "";

client.on('ready', () => {
    console.log(`Discription ready!`); 
});



client.on('message', msg => {

    var Attachment = (msg.attachments).array();

    if (msg.content.startsWith('>')) {
        if (msg.content.includes("toggle")) {
            isActive = !isActive;

            if (isActive) {
                msg.channel.send('Discription is now active!');
            }
            else {
                msg.channel.send('Discription is now inactive! See you later!');
            }

        }
        else {
            msg.channel.send("Command not recognized! Maybe you meant the toggle command? (>toggle)");
        }
    }
    else if ((msg.attachments.size > 0) && (isActive) && (msg.author.id != botID)) {

        imageURL = Attachment[0].attachment;

        computerVision(imageURL, msg);

    }
});

function computerVision(describeURL, msg) {
    async.series([
        async function () {

            let imageCaption = (await computerVisionClient.describeImage(describeURL)).captions[0].text;
            let textCaption = (await readTextFromURL(computerVisionClient, describeURL));

            printRecText(textCaption);

            if (textinImage != "NULLVOID") {
                textinImgMsg = "The picture has the following text: " + textinImage;
            }

            msg.channel.send(msg.author.username + " sent a picture of " + imageCaption + ". " + textinImgMsg, {
                tts: true
            })

            imageCaption = "";
            textinImage = "";
            textinImgMsg = "";
            
        },
        function () {
            return new Promise((resolve) => {
                resolve();
            })
        }
    ], (err) => {
            console.log(err);
            
    });
}

//this is from Azure's Cognitive Services tutorial
async function readTextFromURL(client, url) {
    // To recognize text in a local image, replace client.read() with readTextInStream() as shown:
    let result = await client.read(url);
    // Operation ID is last path segment of operationLocation (a URL)
    let operation = result.operationLocation.split('/').slice(-1)[0];

    // Wait for read recognition to complete
    // result.status is initially undefined, since it's the result of read
    while (result.status !== STATUS_SUCCEEDED) { await sleep(1000); result = await client.getReadResult(operation); }
    return result.analyzeResult.readResults; // Return the first page of result. Replace [0] with the desired page if this is a multi-page file such as .pdf or .tiff.
}

function printRecText(readResults) {
    for (const page in readResults) {
        if (readResults.length > 1) {
            console.log(`==== Page: ${page}`);
        }
        const result = readResults[page];
        if (result.lines.length) {
            for (const line of result.lines) {
                textinImage += (line.words.map(w => w.text).join(' ') + " ");
            }
        }
        else { textinImage = "NULLVOID" }
    }
}
