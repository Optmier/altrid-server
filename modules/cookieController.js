/**
 *
 * @param {*} res res
 * @param {*} key 키 이름
 * @param {*} value 값
 */
const setCookie = (res, key, value) => {
    res.cookie(key, value, { httpOnly: true, secure: global.SECURE, signed: true });
};
/**
 *
 * @param {*} res res
 * @param {*} key 키 이름
 */
const deleteCookie = (res, key) => {
    res.clearCookie(key, { httpOnly: true, secure: global.SECURE, signed: true });
};

module.exports = { setCookie, deleteCookie };
