var express = require('express');
const { setCookie, deleteCookie } = require('../modules/cookieController');
var router = express.Router();
const { issueToken } = require('../modules/encryption');
const useAuthCheck = require('./middlewares/authCheck');

const tasksAuthLoginCheckDatabase = (res, authId, email, userType) =>
    new Promise((resolve, reject) => {
        dbctrl((connection) => {
            let sql = `SELECT COUNT(*) AS is_exists, approved, name, image FROM ${userType} WHERE `;
            if (userType === 'students' || userType === 'teachers')
                sql = `SELECT COUNT(*) AS is_exists, academy_code, approved, name, image FROM ${userType} WHERE `;
            if (authId) {
                sql += `auth_id='${authId}'`;
            } else if (email) {
                sql += `email='${email}'`;
            } else {
                reject({
                    code: 'no-auth-info',
                    message: 'No email or authId.',
                });
            }

            connection.query(sql, (error, results, fields) => {
                connection.release();
                if (error) {
                    reject({ ...error, res: res });
                } else {
                    if (results[0].is_exists > 0 && results[0].approved) {
                        // console.log('results!!', results[0]);

                        resolve({
                            authId: email || authId,
                            name: results[0].name,
                            image: results[0].image,
                            userType: userType,
                            academyCode: userType === 'admins' ? '' : results[0].academy_code,
                            res: res,
                        });
                    } else if (results[0].is_exists < 1) {
                        reject({ code: 'not-in-database', message: 'Not in database. Please register first.', res: res });
                    } else {
                        reject({ code: 'not-approved', message: 'Your account is not approved.', res: res });
                    }
                }
            });
        });
    });

const tasksAuthLoginAfterCheck = (data) => {
    const { authId, name, userType, academyCode, res, image } = data;
    if (userType) {
        const { auth, token } = issueToken(authId + '', name, userType, image, academyCode, 'altrid.optmier.com', '24h');
        /** ?????????????????? sid ????????? ?????? ?????? ??? json?????? ???????????? ??????*/
        setCookie(res, 'sid', token);
        res.status(201).json({
            auth: auth,
            token: token,
        });
    }
};

const tasksAuthLoginFailed = (error) => {
    error.res.status(403).json({ ...error, res: null });
};

/** ????????? ????????? */
router.post('/admins', (req, res, next) => {
    const email = req.body.email || '';
    const authId = req.body.authId || '';

    if (!email && !authId) {
        return res.status(400).json({
            code: 'no-auth-info',
            message: 'No email or authId.',
        });
    }

    tasksAuthLoginCheckDatabase(res, null, email, 'admins').then(tasksAuthLoginAfterCheck).catch(tasksAuthLoginFailed);
});

/** ????????? ????????? */
router.post('/teachers', (req, res, next) => {
    const email = req.body.email || '';
    const authId = req.body.authId || '';

    if (!email && !authId) {
        return res.status(400).json({
            code: 'no-auth-info',
            message: 'No email or authId.',
        });
    }

    tasksAuthLoginCheckDatabase(res, authId, null, 'teachers').then(tasksAuthLoginAfterCheck).catch(tasksAuthLoginFailed);
});

/** ?????? ????????? */
router.post('/students', (req, res, next) => {
    const email = req.body.email || '';
    const authId = req.body.authId || '';

    if (!email && !authId) {
        return res.status(400).json({
            code: 'no-auth-info',
            message: 'No email or authId.',
        });
    }

    tasksAuthLoginCheckDatabase(res, authId, null, 'students').then(tasksAuthLoginAfterCheck).catch(tasksAuthLoginFailed);
});

/** ????????? ?????? ????????? ?????? ?????? ?????? ?????? */
router.post('/temp', (req, res, next) => {
    const email = req.body.email || '';
    const authId = req.body.authId || '';

    if (!email && !authId) {
        return res.status(400).json({
            code: 'no-auth-info',
            message: 'No email or authId.',
        });
    }

    const { auth, token } = issueToken(authId, '', 'temp', '', 'altrid.optmier.com', '30m');
    /** ?????????????????? sid ????????? ?????? ?????? ??? json?????? ???????????? ??????*/
    setCookie(res, 'tmp', token);
    res.status(201).json({
        auth: auth,
        token: token,
    });
});

/** ?????? ?????? ?????? */
router.delete('/temp', (req, res, next) => {
    console.warn('????????? ?????????');
    deleteCookie(res, 'tmp');
    res.status(204).json();
});

/** ?????? ?????? ?????? ?????? ?????? */
router.get('/', useAuthCheck, (req, res, next) => {
    // console.log('session : ', req.verified);
    // delete req.verified.authId;
    res.json(req.verified);
});

/** ?????? ?????? ????????? */
router.patch('/', useAuthCheck, (req, res, next) => {
    const { authId, userType } = req.verified; // session??? update ?????? ?????? ?????????
    let { academyCode, image, userName } = req.verified; // session??? update?????? ?????????

    req.body.academyCode ? (academyCode = req.body.academyCode) : null;
    req.body.image ? (image = req.body.image) : (image = null);
    req.body.userName ? (userName = req.body.userName) : null;

    tasksAuthLoginAfterCheck({
        authId: authId,
        name: userName,
        userType: userType,
        academyCode: academyCode,
        image: image,
        res: res,
    });
});

/** ????????? ?????? ?????? */
router.post('/check-email-self', useAuthCheck, (req, res, next) => {
    const currentAuthId = req.verified.authId;
    const requestEmail = req.body.email;
    const userType = req.verified.userType;

    let sql = `SELECT COUNT(*) AS ok FROM ${userType} WHERE auth_id='${currentAuthId}' AND email='${requestEmail}'`;
    dbctrl((connection) => {
        connection.query(sql, (error, results, fields) => {
            connection.release();
            if (error) res.status(400).json(error);
            else res.json(results[0]);
        });
    });
});

/* ?????? ???????????? */
router.delete('/', (req, res, next) => {
    /** ?????? ??? ????????? ???????????? ????????? ?????? */
    console.warn('????????? ?????????');
    deleteCookie(res, 'sid');
    res.status(204).json();
});

/** ?????? ?????? ?????? */
router.get('/datetime', (req, res, next) => {
    const currentTime = new Date().getTime();
    res.json(currentTime);
});

module.exports = router;
