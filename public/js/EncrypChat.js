// Generate The RSA keypair
function generateRSA() {
  return window.crypto.subtle.generateKey({
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
      return key;
    })
    .catch(function(err) {
      console.error(err);
    });
}

// RSA Sign
function signRSA() {
  return window.crypto.subtle.sign({
        name: "RSA-PSS",
        saltLength: 128, //the length of the salt
      },
      privateKey, //from generateKey or importKey above
      data //ArrayBuffer of data you want to sign
    )
    .then(function(signature) {
      //returns an ArrayBuffer containing the signature
      console.log(new Uint8Array(signature));
    })
    .catch(function(err) {
      console.error(err);
    });
}

// RSA verify
function verifyRSA() {
  return window.crypto.subtle.verify({
        name: "RSA-PSS",
        saltLength: 128, //the length of the salt
      },
      publicKey, //from generateKey or importKey above
      signature, //ArrayBuffer of the signature
      data //ArrayBuffer of the data
    )
    .then(function(isvalid) {
      //returns a boolean on whether the signature is true or not
      console.log(isvalid);
    })
    .catch(function(err) {
      console.error(err);
    });
}

// Generate AES Key
function generateAES() {
  return window.crypto.subtle.generateKey({
        name: "AES-GCM",
        length: 256, //can be  128, 192, or 256
      },
      true, //whether the key is extractable (i.e. can be used in exportKey)
      ["encrypt", "decrypt"] //can "encrypt", "decrypt", "wrapKey", or "unwrapKey"
    )
    .then(function(key) {
      //returns a key object
      //console.log(key);
      return key;
    })
    .catch(function(err) {
      console.error(err);
    });
}

function AESEncrypt(key, data) {
  var generatedIv = window.crypto.getRandomValues(new Uint8Array(12))
  return window.crypto.subtle.encrypt({
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
      return [key, data, generatedIv];
    })
    .catch(function(err) {
      console.error(err);
    });
}

function AESDecrypt(key, data, generatedIv) {
  return window.crypto.subtle.decrypt({
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
      var data = new Uint8Array(decrypted);
      return data
    })
    .catch(function(err) {
      console.error(err);
    });
}

//RSA
var rsaPublicKey;
var rsaPrivateKey;
generateRSA().then((key) => {
  rsaPublicKey = key.publicKey;
  rsaPrivateKey = key.privateKey;

  // console.log(rsaPublicKey);
  // console.log(rsaPrivateKey);
});

//AES
var aesKey;
generateAES().then((res) => {
  aesKey = res;
  // console.log(aesKey);
  var buffer = new ArrayBuffer(100);
  // console.log(buffer);

  AESEncrypt(aesKey, buffer).then((res) => {
    aesKey = res[0];
    var encryptedData = res[1];
    var generatedIv = res[2];
    // console.log(encryptedData);

    AESDecrypt(aesKey, encryptedData, generatedIv).then((res) => {
      var data = res;
      // console.log(data);
    });
  });
});

$(function() {
  // would like to put protocol here but it cant find socketio. @TODO
});