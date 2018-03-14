// receive and parse unencrypted messages
function unencryptedMessageReceive(socket) {
  socket.on('normalMessage', function(msg) {
    if ($('#encryptChat').is(":checked") == true) {
      $('#encryptChat').click(); // ensure the encrypted button is in sync
    }
    var append_string = "";
    incoming_nickname = msg.substr(0, msg.indexOf('-'));
    var first_letter_nickname = msg.charAt(0);
    current_nickname = $('#nick').val();
    msg = msg.split('-')[1];

    if (incoming_nickname == current_nickname) {
      append_string = '<div style="float:right;"><div class="removemargin talk-bubble tri-right right-top"><div class="talktext"><p>' + msg + '</p></div></div><div class="circle">' + first_letter_nickname + '</div></div><div class="clear"></div>'
    } else {
      append_string = '<div class="circle">' + first_letter_nickname + '</div><div class="removemargin talk-bubble tri-right left-top"><div class="talktext"><p>' + msg + '</p></div></div><div class="clear"></div>'
    }
    $('#messages').append($(append_string));
    $("#messages").scrollTop($("#messages")[0].scrollHeight);
  });
}

// receive and parse encrypted messages
function encryptedMessageReceive(socket) {
  socket.on('encryptedMessage', function(msg) {
    var dec = new TextDecoder();
    if ($('#encryptChat').is(":checked") == false) {
      $('#encryptChat').click(); // ensure the encrypted button is in sync
    }
    if (msg != null) { // Decrypt the encrypted message
      msg = new Uint8Array(Object.values(msg));
      console.log("Message before decrypting:");
      console.log(msg);
      decryptAES(aesKab, iv, msg).then((message) => {
        message = dec.decode(message);

        var append_string = "";
        incoming_nickname = message.substr(0, message.indexOf('-'));
        var first_letter_nickname = message.charAt(0);
        current_nickname = $('#nick').val();
        message = message.split('-')[1];

        if (incoming_nickname == current_nickname) {
          append_string = '<div style="float:right;"><div class="removemargin talk-bubble tri-right right-top"><div class="talktext"><p>SECURE -> ' + message + '</p></div></div><div class="circle">' + first_letter_nickname +
            '</div></div><div class="clear"></div>'
        } else {
          append_string = '<div class="circle">' + first_letter_nickname + '</div><div class="removemargin talk-bubble tri-right left-top"><div class="talktext"><p>SECURE -> ' + message + '</p></div></div><div class="clear"></div>'
        }

        $('#messages').append($(append_string));
        $("#messages").scrollTop($("#messages")[0].scrollHeight);

      });
    } else { // Encryption started o tell the user
      message = "Other User turned on Encrption";
      var first_letter_nickname = "Sys";
      append_string = '<div class="circle">' + first_letter_nickname + '</div><div class="removemargin talk-bubble tri-right left-top"><div class="talktext"><p>SECURE -> ' + message + '</p></div></div><div class="clear"></div>'
      $('#messages').append($(append_string));
      $("#messages").scrollTop($("#messages")[0].scrollHeight);
    }
  });
}

// send message (For both encrypted and unencrypted)
function sendMessage(socket) {
  $('#chatBox').submit(function() {
    if ($('#encryptChat').is(":checked")) {
      if (aesKab == null) {
        socket.emit('encryptProtocol', "Start chat encryption");
      } else {
        var enc = new TextEncoder("utf-8");
        var message = $('#nick').val() + "-" + $('#m').val();
        message = enc.encode(message);
        encryptAES(aesKab, iv, message).then((encryptedMsg) => {
          console.log("Encrypted Message Data");
          console.log(encryptedMsg);
          socket.emit('encryptedMessage', encryptedMsg);
        });
      }
    } else {
      socket.emit('normalMessage', $('#nick').val() + "-" + $('#m').val());
    }
    $('#m').val('');
    return false;
  });
}

// gets Url for file, also decrypts file before downlaod if encryption is
// enabled
function receiveFile(socket) {
  socket.on('file', function(msg) {
    var append_string = "";
    var file_message = "";
    var secureEnabled = "";
    var first_letter_nickname = "F";

    msg = msg.split('$')[1];
    file_message = msg.substring(0, 16) + "...";
    if ($('#encryptChat').is(":checked")) {
      secureEnabled = "SECURE -> ";
    }

    if (incoming_nickname == current_nickname) {
      append_string = '<div style="float:right;"><div class="removemargin talk-bubble tri-right right-top"><div class="talktext"><p>' + secureEnabled + '<a href="' + document.URL + 'download/' + msg + '">' + file_message + '</a></p></div></div><div class="circle">' +
        first_letter_nickname + '</div></div><div class="clear"></div>'
    } else {
      append_string = '<div class="circle">' + first_letter_nickname + '</div><div class="removemargin talk-bubble tri-right left-top"><div class="talktext"><p>' + secureEnabled + '<a href="' + document.URL + 'download/' + msg + '">' + file_message +
        '</a></p></div></div><div class="clear"></div>'
    }
    $('#messages').append(append_string);
    $("#messages").scrollTop($("#messages")[0].scrollHeight);

    // File decryption and download starts here
    // Downloads the file to the user's computer
    function saveData(data, fileName) {
      var a = document.createElement("a");
      document.body.appendChild(a);
      a.style = "display: none";
      url = window.URL.createObjectURL(data);
      a.href = url;
      a.download = fileName;
      a.click();
      window.URL.revokeObjectURL(url);
    };

    // Gets the encrypted file from server and puts it in a blob
    var xhr = new XMLHttpRequest();
    xhr.open("GET", document.URL + 'download/' + msg);
    xhr.responseType = "blob";
    xhr.onload = response;
    xhr.send();

    function response(e) {
      file = this.response;
      console.log("Encrypted File");
      console.log(file);

      // if chat is encrypted decrypt the file
      if ($('#encryptChat').is(":checked")) {
        var fileReader = new FileReader();
        fileReader.onload = async function() {
          var chunkSize = 10240;
          var enChunkSize = 10256;
          var cA1, cA2, cA3, cA4, cA5, cA6, cA7, cA8, cA9, cA10, cA11, cA12, cA13, cA14, cA15, cA16, cA17, cA18, cA19, cA20, cA21; // upto 215 KB file
          var i = 0;
          var arrayBuffer = this.result;
          for (var sent = 0; sent < file.size; sent = sent + enChunkSize) {
            var encryptedChunk = await arrayBuffer.slice(sent, sent + enChunkSize);
            var newChunk = await window.crypto.subtle.decrypt({
              name: "AES-GCM",
              iv: iv,
              tagLength: 128,
            }, aesKab, encryptedChunk).catch(function(err) {
              console.error(err);
            });
            if (i == 0) {
              cA1 = newChunk;
            } else if (i == 1) {
              cA2 = newChunk;
            } else if (i == 2) {
              cA3 = newChunk;
            } else if (i == 3) {
              cA4 = newChunk;
            } else if (i == 4) {
              cA5 = newChunk;
            } else if (i == 5) {
              cA6 = newChunk;
            } else if (i == 6) {
              cA7 = newChunk;
            } else if (i == 7) {
              cA8 = newChunk;
            } else if (i == 8) {
              cA9 = newChunk;
            } else if (i == 9) {
              cA10 = newChunk;
            } else if (i == 10) {
              cA11 = newChunk;
            } else if (i == 11) {
              cA12 = newChunk;
            } else if (i == 12) {
              cA13 = newChunk;
            } else if (i == 13) {
              cA14 = newChunk;
            } else if (i == 14) {
              cA15 = newChunk;
            } else if (i == 15) {
              cA16 = newChunk;
            } else if (i == 16) {
              cA17 = newChunk;
            } else if (i == 17) {
              cA18 = newChunk;
            } else if (i == 18) {
              cA19 = newChunk;
            } else if (i == 19) {
              cA20 = newChunk;
            } else if (i == 20) {
              cA21 = newChunk;
            }
            i++;
          }
          var blob = new Blob([cA1, cA2, cA3, cA4, cA5, cA6, cA7, cA8, cA9, cA10, cA11, cA12, cA13, cA14, cA15, cA16, cA17, cA18, cA19, cA20, cA21], { // upto 215 KB file
            type: file.type
          });
          console.log("Decrypted file");
          console.log(blob);
          saveData(blob, msg);
        };
        fileReader.readAsArrayBuffer(file);
      }
    }
  });
}

// upload file for both encrypted and decrypted comms
function uploadFile(socket, uploader, input) {
  // Eventhandler for file input.
  function openfile(evt) {
    var files = input.files;
    var nickname = $('#nick').val();
    var fileReader = new FileReader();
    fileReader.readAsDataURL(files[0]);
    fileReader.onload = function(e) {
      var uploadIds = uploader.upload(files, {
        data: nickname
      });
    }
  }
  // Eventlistener for file input.
  input.addEventListener('change', openfile, false);
}