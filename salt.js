const crypto = require('crypto');



const hashPassword = async (password) => {
    const {
        pbkdf2,
      } = await import('node:crypto');
      
    var salt = crypto.randomBytes(128).toString('base64');
    var iterations = 10000;
    var hash = pbkdf2(password, salt, iterations, 22, "sha512", (err, derivedKey) => {
        if (err) throw err;
        console.log("derivedKey :", derivedKey.toString('hex'));  // '3745e48...08d59ae'
      });

    console.log("---", salt, iterations, hash);

    return {
        salt: salt,
        hash: hash,
        iterations: iterations
    };
}

var x = hashPassword('123');

console.log("Result : ",);


