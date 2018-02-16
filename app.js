var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io').listen(http);
var chatEncrypted = false;

app.get('/', function(req, res) {
  res.sendfile('index.html');
});

app.use(express.static(__dirname + '/public'));

http.listen(3000, "0.0.0.0", function() {
  console.log('listening on *:3000');
});

io.on('connection', function(socket) {

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
    console.log("protocol started");
    socket.broadcast.emit('getResponse1', 'Encryption protocol Started by other client');
    socket.broadcast.emit('encryptedMessage', 'Encryption protocol Started by other client');
    chatEncrypted = true; // when we have a sucessful encrypted pipe
  });


  socket.on('disconnect', function() {
    console.log('user disconnected');
  });
});