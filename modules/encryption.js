const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const tokenEncKey = require('../configs/encryptionKey').tokenUserDataEncKey();
const jwtSecret = require('../configs/encryptionKey').jwtSecretKey();
const testUIDSecretKey = require('../configs/encryptionKey').testUIDSecretKey();
const _buffer64 = Buffer.alloc(64);

const encryptTokenUserData = (email) => {
    const cipher = crypto.createCipher('aes-256-gcm', tokenEncKey);
    let result = cipher.update(email, 'utf8', 'base64');
    return (result += cipher.final('base64'));
};

const decrpytTokenUserData = (data) => {
    const decipher = crypto.createDecipher('aes-256-gcm', tokenEncKey);
    let result = decipher.update(data, 'base64', 'utf8');
    return result;
};

const createSalt = () => crypto.randomFillSync(_buffer64).toString('hex');

/**
 * 비밀번호 암호화 실시
 * @param {*} password 패스워드(필수)
 * @param {*} salt 패스워드 솔트 값(기본 랜덤 64바이트 문자열 생성)
 * @param {*} keyLength 키 길이 바이트 수(기본 64)
 * @param {*} options 옵션(암호화 방법 등등, 기본 {N: 64})
 */
const encryptPassword = (password, salt = createSalt(), keyLength = 64, options = { N: 1024 }) => {
    return {
        password: crypto.scryptSync(password, salt, keyLength, options).toString('hex'),
        salt: salt,
    };
};

/**
 * 비밀번호 검증
 * @param {*} password 입력한 패스워드(필수)
 * @param {*} comparePassword 비교할 패스워드(필수)
 * @param {*} salt 패스워드 솔트 값(필수)
 * @param {*} keyLength 키 길이 바이트 수(기본 64)
 * @param {*} options 옵션(암호화 방법 등등, 기본 {N: 64})
 */
const verifyPassword = (password, comparePassword, salt, keyLength = 64, options = { N: 1024 }) =>
    crypto.scryptSync(password, salt, keyLength, options).toString('hex') === comparePassword;

/**
 * 사용자 토큰 발급
 * @param {*} email 사용자 원본 이메일(필수)
 * @param {*} username 사용자 성함(필수)
 * @param {*} usertype 사용자 유형(기본 고객)
 * @param {*} issuer 발급자(팔수)
 * @param {*} expiresIn 만료 시간(기본 10분)
 * @param {*} options 옵션
 */
const issueToken = (email, username, usertype = 'customer', academyCode = '', issuer, expiresIn = '10m', options = {}) => {
    const token = jwt.sign(
        { email: encryptTokenUserData(email), username: username, usertype: usertype, academyCode: academyCode },
        jwtSecret,
        {
            expiresIn: expiresIn,
            issuer: issuer,
            ...options,
        },
    );
    const verified = jwt.verify(token, jwtSecret);
    delete verified.email;
    return { auth: verified, token: token };
};

/**
 * 사용자 토큰 검증
 * @param {*} tokenValue 원래 토큰 값
 */
const verifyToken = (tokenValue) => {
    try {
        const verified = jwt.verify(tokenValue, jwtSecret);
        verified.email = decrpytTokenUserData(verified.email);
        return verified;
    } catch (error) {
        error.code = error.name;
        return { error: error };
    }
};

/**
 * 시선흐름 분석 시험 UID 발급
 * @param {*} email 사용자 원본 이메일(필수)
 * @param {*} username 사용자 성함(필수)
 * @param {*} issuer 발급자(팔수)
 * @param {*} expiresIn 만료 시간(기본 10분)
 * @param {*} options 옵션
 */
const issueTestUID = (email, username, issuer, expiresIn = '24h', options = {}) => {
    const token = jwt.sign({ email: encryptTokenUserData(email), username: username }, testUIDSecretKey, {
        expiresIn: expiresIn,
        issuer: issuer,
        ...options,
    });
    const verified = jwt.verify(token, testUIDSecretKey);
    delete verified.email;
    delete verified.username;
    return { auth: verified, token: token };
};

/**
 * 시선흐름 분석 시험 UUID 검증
 * @param {*} tokenValue 원래 토큰 값
 */
const verifyTestUID = (tokenValue) => {
    try {
        const verified = jwt.verify(tokenValue, testUIDSecretKey);
        verified.email = decrpytTokenUserData(verified.email);
        return verified;
    } catch (error) {
        error.code = error.name;
        return { error: error };
    }
};

module.exports = { encryptPassword, verifyPassword, issueToken, verifyToken, issueTestUID, verifyTestUID };
