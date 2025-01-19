const crypto = require('crypto');

const tokenUserDataEncKey = () =>
    crypto.scryptSync(
        global.ENCRYPTION_SECRET.TOKEN_USER_DATA,
        crypto.scryptSync(global.ENCRYTION_SALT.SECONDARY_PASSWORD, global.ENCRYTION_SALT.SECONDARY_SALT, 64, { N: 1024 }),
        64,
        { N: 1024 },
    );
const jwtSecretKey = () =>
    crypto.scryptSync(
        global.ENCRYPTION_SECRET.JWT_SECRET,
        crypto.scryptSync(global.ENCRYTION_SALT.SECONDARY_PASSWORD, global.ENCRYTION_SALT.SECONDARY_SALT, 64, { N: 1024 }),
        64,
        { N: 1024 },
    );
const testUIDSecretKey = () =>
    crypto.scryptSync(
        global.ENCRYPTION_SECRET.TEST_UID_SECRET,
        crypto.scryptSync(global.ENCRYTION_SALT.SECONDARY_PASSWORD, global.ENCRYTION_SALT.SECONDARY_SALT, 64, { N: 1024 }),
        64,
        { N: 1024 },
    );

module.exports = { tokenUserDataEncKey, jwtSecretKey, testUIDSecretKey };
