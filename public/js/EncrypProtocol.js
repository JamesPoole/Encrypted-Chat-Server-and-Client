// starts the protocol off by creating private and public keys
// then sends the public key off to the other client
function initiateProtocol(socket) {
  socket.on('startRSA', function(msg) {
    generateRSA().then((key) => {
      rsaPublicKey = key.publicKey;
      rsaPrivateKey = key.privateKey;
      // export the public key and send it
      exportRSA(rsaPublicKey).then((key) => {
        var rsaExportedKey = key;
        socket.emit('sendPublicKey', rsaExportedKey);
      });
    });
  });
}

// receive other clients public key
function getRemotePublicKey(socket) {
  socket.on('receivePublicKey', function(msg) {
    var rsaExportedKey_2 = msg;
    importRSA_OAEP(rsaExportedKey_2).then((key) => {
      rsaPublicKey_2 = key;
    });
  });
}

// completes step1 of encryption protocol
function step1(socket) {
  socket.on('step1', function(msg) {
    passA = window.crypto.getRandomValues(new Uint8Array(6)); // random number challenge
    hashSHA(passA).then((hashed) => { // H(passA) hashed challenge
      signRSA(rsaPrivateKey, hashed).then((signedHash) => { // { H(passA) }ka-1 signed hash with my private key
        var combinedArray = new Uint8Array(passA.length + signedHash.length);
        combinedArray.set(passA);
        combinedArray.set(signedHash, passA.length);
        var splitCombinedArray = combinedArray.slice(0, 190);
        var splitCombinedArray_2 = combinedArray.slice(190, combinedArray.length);
        encryptRSA(rsaPublicKey_2, splitCombinedArray).then((data) => {
          encryptRSA(rsaPublicKey_2, splitCombinedArray_2).then((data_2) => {
            var combinedArray = new Uint8Array(data.length + data_2.length); // { passA,{ H(passA) }ka-1 }kb
            combinedArray.set(data);
            combinedArray.set(data_2, data.length);
            var message = combinedArray;
            socket.emit('getResponseStep2', message);
          });
        });
      });
    });
  });
}

// completes step 2 of encryption protocol
function step2(socket) {
  socket.on('step2', function(msg) {
    combinedArray = new Uint8Array(Object.values(msg));
    exportPrivateRSA(rsaPrivateKey).then((exportedRSAKey) => {
      importPrivateRSA_OAEP(exportedRSAKey).then((importedRSAKey) => {
        var splitCombinedArray = combinedArray.slice(0, 256);
        var splitCombinedArray_2 = combinedArray.slice(256, 512);
        decryptRSA(importedRSAKey, splitCombinedArray).then((data) => {
          decryptRSA(importedRSAKey, splitCombinedArray_2).then((data_2) => {
            var combinedArray = new Uint8Array(data.length + data_2.length); // { passA,{ H(passA) }ka-1 }kb
            combinedArray.set(data);
            combinedArray.set(data_2, data.length);
            var message = combinedArray;
            var passA = message.slice(0, 6); // PassA
            var signature = message.slice(6, 262);
            hashSHA(passA).then((hashed) => { // H(PassA)
              exportRSA(rsaPublicKey_2).then((exportedPublicRSAKey) => {
                importRSA_PSS(exportedPublicRSAKey).then((importedPublicRSAKey) => {
                  verifyRSA(importedPublicRSAKey, signature, hashed).then((isvalid) => {
                    if (isvalid) {
                      var passB = window.crypto.getRandomValues(new Uint8Array(6)); // Create random number PassB
                      console.log("Pass B");
                      console.log(passB);
                      var aesKey = new Uint8Array(passA.length + passB.length);
                      aesKey.set(passA);
                      aesKey.set(passB, passA.length); // PassA||PassB
                      console.log("Aes Key:")
                      console.log(aesKey);
                      hashSHA(aesKey).then((hashed) => { // hash newly created AES Key
                        aesKeyHash = hashed; // Kab = H(PassA || PassB)
                        console.log("Hashed AES Key:");
                        console.log(aesKeyHash);
                        step3(passA, passB, aesKeyHash, socket);
                      });
                    }
                  });
                });
              });
            });
          });
        });
      });
    });
  });
}

// completes step 3 of encryption protocol
function step3(passA, passB, aesKeyHash, socket) {
  iv = crypto.getRandomValues(new Uint8Array(12));
  importAES(aesKeyHash, iv).then((Kab) => { //Kab key object
    aesKab = Kab;
    encryptAES(Kab, iv, passA).then((encryptedPassA) => { //{PassA}Kab
      var combinedArray = new Uint8Array(passB.length + encryptedPassA.length);
      combinedArray.set(passB);
      combinedArray.set(encryptedPassA, passB.length);
      hashSHA(combinedArray).then((hashed) => { // H(PassB,{PassA}Kab)
        signRSA(rsaPrivateKey, hashed).then((signedHash) => { //{H(PassB,{PassA}Kab)}Kb-1
          var combinedArray = new Uint8Array(passB.length + encryptedPassA.length + signedHash.length);
          combinedArray.set(passB);
          combinedArray.set(encryptedPassA, passB.length);
          combinedArray.set(signedHash, passB.length + encryptedPassA.length);
          var splitCombinedArray = combinedArray.slice(0, 190);
          var splitCombinedArray_2 = combinedArray.slice(190, combinedArray.length);
          exportRSA(rsaPublicKey_2).then((exportedPublicRSAKey) => {
            importRSA_OAEP(exportedPublicRSAKey).then((importedPublicOAEPKey) => {
              encryptRSA(importedPublicOAEPKey, splitCombinedArray).then((encryptedData) => { //{PassB, {PassA}Kab,{H(PassB,{PassA}Kab)}kb-1}Ka
                encryptRSA(importedPublicOAEPKey, splitCombinedArray_2).then((encryptedData_2) => {
                  var message = new Uint8Array(iv.length + encryptedData.length + encryptedData_2.length);
                  message.set(iv);
                  message.set(encryptedData, iv.length);
                  message.set(encryptedData_2, (iv.length + encryptedData.length));
                  socket.emit('getResponseStep4', message);
                });
              });
            });
          });
        });
      });
    });
  });
}

// completes step 4 of encryption protocol
function step4(socket) {
  socket.on('step4', function(msg) {
    combinedArray = new Uint8Array(Object.values(msg)); // { passB, {passB}kab , { H(passB, {passA}kab ) }kb-1 }ka
    iv = combinedArray.slice(0, 12);
    exportPrivateRSA(rsaPrivateKey).then((exportedRSAKey) => {
      importPrivateRSA_OAEP(exportedRSAKey).then((importedRSAKey) => {
        var splitCombinedArray = combinedArray.slice(12, 268);
        var splitCombinedArray_2 = combinedArray.slice(268, 524);
        decryptRSA(importedRSAKey, splitCombinedArray).then((data) => {
          decryptRSA(importedRSAKey, splitCombinedArray_2).then((data_2) => {
            var combinedArray = new Uint8Array(data.length + data_2.length); //  passB, {passB}kab , { H(passB, {passA}kab ) }kb-1
            combinedArray.set(data);
            combinedArray.set(data_2, data.length);
            var message = combinedArray;
            var passB = message.slice(0, 6); // PassB
            console.log("Pass B :");
            console.log(passB);
            console.log("Pass A :");
            console.log(passA);
            var encryptedPassA = message.slice(6, 28); // {passB}kab
            var signature = message.slice(28, 284);
            var combinedArray = new Uint8Array(passB.length + encryptedPassA.length);
            combinedArray.set(passB);
            combinedArray.set(encryptedPassA, passB.length);
            hashSHA(combinedArray).then((hashed) => { // H(PassB, {passA}kab )
              exportRSA(rsaPublicKey_2).then((exportedPublicRSAKey) => {
                importRSA_PSS(exportedPublicRSAKey).then((importedPublicRSAKey) => {
                  verifyRSA(importedPublicRSAKey, signature, hashed).then((isvalid) => {
                    if (isvalid) {
                      console.log("Signature is vaild continue:");
                      var aesKey = new Uint8Array(passA.length + passB.length);
                      aesKey.set(passA);
                      aesKey.set(passB, passA.length); // PassA||PassB
                      hashSHA(aesKey).then((hashed) => { // hash newly created AES Key
                        aesKeyHash = hashed; // Kab = H(PassA || PassB)
                        console.log("Hashed AES Key:");
                        console.log(aesKeyHash);
                        importAES(aesKeyHash, iv).then((Kab) => { //Kab key object
                          aesKab = Kab;
                          decryptAES(Kab, iv, encryptedPassA).then((newPassA) => { //{PassA}Kab
                            console.log("Decrypted PassA");
                            console.log(newPassA);
                            if (newPassA.sort().join(',') === passA.sort().join(',')) {
                              console.log("Encrption Protocol has run Successfully!");
                              socket.emit('encryptionSuccessful');
                            } else {
                              console.log("Protocol failed: PassA's are NOT the same");
                            }
                          });
                        });
                      });
                    }
                  });
                });
              });
            });
          });
        });
      });
    });
  });
}
