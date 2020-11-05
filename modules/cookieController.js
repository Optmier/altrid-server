/**
 *
 * @param {*} res res
 * @param {*} key 키 이름
 * @param {*} value 값
 */
const setCookie = (res, key, value) => {
    res.cookie(key, value, { httpOnly: true, secure: process.env.RUN_MODE === 'dev' ? false : true, signed: true });
};
/**
 *
 * @param {*} res res
 * @param {*} key 키 이름
 */
const deleteCookie = (res, key) => {
    res.clearCookie(key, { httpOnly: true, secure: process.env.RUN_MODE === 'dev' ? false : true, signed: true });
};

module.exports = { setCookie, deleteCookie };
