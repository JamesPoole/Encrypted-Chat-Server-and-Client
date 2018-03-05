var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io').listen(http);
var SocketIOFile = require('socket.io-file');
var chatEncrypted = false;
var userCount = 0;

app.get('/', function(req, res) {
 res.sendfile('index.html');
});

app.use(express.static(__dirname + '/public'));

app.get('/socket.io-file-client.js', (req, res, next) => {
    return res.sendFile(__dirname + '/node_modules/socket.io-file-client/socket.io-file-client.js');
});

app.get('/download/:path', function(req, res){
  var file = __dirname + '/data/' + req.params.path;
  res.download(file); // Set disposition and send it.
});

http.listen(3000, "0.0.0.0", function() {
 console.log('listening on *:3000');
});

io.on('connection', function(socket) {
 userCount += 1;
 if (userCount == 2) {
  io.emit('startRSA');

 }

 var uploader = new SocketIOFile(socket, {
   uploadDir: 'data',
   chunkSize: 10240,
   transmissionDelay: 0,
   overwrite: true
 });

    uploader.on('start', (fileInfo) => {
        console.log('Start uploading');
        console.log(fileInfo);
    });
    uploader.on('stream', (fileInfo) => {
        console.log(`${fileInfo.wrote} / ${fileInfo.size} byte(s)`);
    });
    uploader.on('complete', (fileInfo) => {
        console.log('Upload Complete.');
        console.log(fileInfo.name);
        io.emit('file', fileInfo.data + '$' + fileInfo.name);
    });
    uploader.on('error', (err) => {
        console.log('Error!', err);
    });
    uploader.on('abort', (fileInfo) => {
        console.log('Aborted: ', fileInfo);
    });

 // send normal message to everyone
 socket.on('normalMessage', function(msg) {
  io.emit('normalMessage', msg);
 });

 // send encrypted message to everyone
 socket.on('encryptedMessage', function(msg) {
  if (chatEncrypted) {
   io.emit('encryptedMessage', msg);
  } else {
   console.log("Chat not encrypted yet");
  }
 });

 // User started the encrypt protocol
 socket.on('encryptProtocol', function(msg) {
  console.log("Encryption protocol started");
  socket.broadcast.emit('encryptedMessage', 'Encryption protocol Started by other client');
  socket.broadcast.emit('step1'); // Start step 1
  chatEncrypted = true; // when we have a sucessful encrypted pipe
 });

 // swap RSA public keys
 socket.on('sendPublicKey', function(msg) {
  socket.broadcast.emit('receivePublicKey', msg);
 });

 // Step 2
 socket.on('getResponseStep2', function(msg) {
  socket.broadcast.emit('step2', msg);
 });

 // Step 3
 socket.on('getResponseStep3', function(msg) {
  socket.broadcast.emit('step3', msg);
 });

 // Step 4
 socket.on('getResponseStep4', function(msg) {
  socket.broadcast.emit('step4', msg);
 });

 // User uploads a file
 socket.on('file', function(msg) {
  console.log("file uploaded")
  io.emit('file', 'File Uploaded');
 });

 socket.on('disconnect', function() {
  //console.log('user disconnected');
  userCount += -1;
 });
});
