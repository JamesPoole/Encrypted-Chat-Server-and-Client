// Generate The RSA keypair
function generateRSA() {
  window.crypto.subtle.generateKey({
        name: "RSA-PSS",
        modulusLength: 2048, //can be 1024, 2048, or 4096
        publicExponent: new Uint8Array([0x01, 0x00, 0x01]),
        hash: {
          name: "SHA-256"
        }, //can be "SHA-1", "SHA-256", "SHA-384", or "SHA-512"
      },
      false, //whether the key is extractable (i.e. can be used in exportKey)
      ["sign", "verify"] //can be any combination of "sign" and "verify"
    )
    .then(function(key) {
      //returns a keypair object
      console.log(key);
      console.log(key.publicKey);
      console.log(key.privateKey);
    })
    .catch(function(err) {
      console.error(err);
    });
}

// Generate AES Key
function generateAES() {
  window.crypto.subtle.generateKey({
        name: "AES-GCM",
        length: 256, //can be  128, 192, or 256
      },
      true, //whether the key is extractable (i.e. can be used in exportKey)
      ["encrypt", "decrypt"] //can "encrypt", "decrypt", "wrapKey", or "unwrapKey"
    )
    .then(function(key) {
      //returns a key object
      //console.log(key);
      var exportedKey = exportAES(key);
      var buffer = new ArrayBuffer(100);
      //console.log(buffer);
      var encryptedData = AESEncrypt(key, buffer);
      //console.log(encryptedData[0]);
      //AESDecrypt(key, encryptedData[0], encryptedData[1]);
      return exportedKey;
    })
    .catch(function(err) {
      console.error(err);
    });
}

function exportAES(key) {
  var result = window.crypto.subtle.exportKey(
      "jwk", //can be "jwk" or "raw"
      key //extractable must be true
    )
    .then(function(keydata) {
      //returns the exported key data
      console.log(keydata);
    })
    .catch(function(err) {
      console.error(err);
    });
  return result;
}

function AESEncrypt(key, data) {
  var generatedIv = window.crypto.getRandomValues(new Uint8Array(12))
  var result = window.crypto.subtle.encrypt({
        name: "AES-GCM",

        //Don't re-use initialization vectors!
        //Always generate a new iv every time your encrypt!
        //Recommended to use 12 bytes length
        iv: generatedIv,

        //Additional authentication data (optional)
        // additionalData: ArrayBuffer,

        //Tag length (optional)
        tagLength: 128, //can be 32, 64, 96, 104, 112, 120 or 128 (default)
      },
      key, //from generateKey or importKey above
      data //ArrayBuffer of data you want to encrypt
    )
    .then(function(encrypted) {
      //returns an ArrayBuffer containing the encrypted data
      var data = new Uint8Array(encrypted);
      console.log(data);
      AESDecrypt(key, data, generatedIv);
      return [data, generatedIv];
    })
    .catch(function(err) {
      console.error(err);
    });
}

function AESDecrypt(key, data, generatedIv) {
  window.crypto.subtle.decrypt({
        name: "AES-GCM",
        iv: generatedIv, //The initialization vector you used to encrypt
        //additionalData: ArrayBuffer, //The addtionalData you used to encrypt (if any)
        tagLength: 128, //The tagLength you used to encrypt (if any)
      },
      key, //from generateKey or importKey above
      data //ArrayBuffer of the data
    )
    .then(function(decrypted) {
      //returns an ArrayBuffer containing the decrypted data
      console.log(new Uint8Array(decrypted));
    })
    .catch(function(err) {
      console.error(err);
    });
}

// generateRSA();
//generateAES();
var key = generateAES();
console.log(key);
// AESEncrypt(key, "BALLS");