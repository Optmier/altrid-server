var express = require('express');
const { setCookie, deleteCookie } = require('../modules/cookieController');
var router = express.Router();
const { issueToken } = require('../modules/encryption');
const useAuthCheck = require('./middlewares/authCheck');

const tasksAuthLoginCheckDatabase = (res, authId, email, userType) =>
    new Promise((resolve, reject) => {
        dbctrl((connection) => {
            let sql = `SELECT COUNT(*) AS is_exists, approved, name FROM ${userType} WHERE `;
            if (userType === 'students' || userType === 'teachers')
                sql = `SELECT COUNT(*) AS is_exists, academy_code, approved, name FROM ${userType} WHERE `;
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
                        resolve({
                            authId: email || authId,
                            name: results[0].name,
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
    const { authId, name, userType, academyCode, res } = data;
    if (userType) {
        const { auth, token } = issueToken(authId + '', name, userType, academyCode, 'altrid.optmier.com', '24h');
        /** 클라이언트로 sid 토큰값 쿠키 저장 및 json으로 인증정보 전송*/
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

/** 관리자 로그인 */
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

/** 선생님 로그인 */
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

/** 학생 로그인 */
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

/** 민감한 정보 접근을 위한 임시 토큰 발급 */
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
    /** 클라이언트로 sid 토큰값 쿠키 저장 및 json으로 인증정보 전송*/
    setCookie(res, 'tmp', token);
    res.status(201).json({
        auth: auth,
        token: token,
    });
});

/** 임시 토큰 삭제 */
router.delete('/temp', (req, res, next) => {
    console.warn('쿠키값 지우기');
    deleteCookie(res, 'tmp');
    res.status(204).json();
});

/** 인증 토큰 유효 여부 확인 */
router.get('/', useAuthCheck, (req, res, next) => {
    console.log(req.verified);
    // delete req.verified.authId;
    res.json(req.verified);
});

/** 인증 토큰 재발급 */
router.patch('/', useAuthCheck, (req, res, next) => {
    const { authId, userName, userType } = req.verified;
    let { academyCode } = req.verified;

    req.body ? (academyCode = req.body.academyCode) : '';

    tasksAuthLoginAfterCheck({
        authId: authId,
        name: userName,
        userType: userType,
        academyCode: academyCode,
        res: res,
    });
});

/** 이메일 본인 확인 */
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

/* 통합 로그아웃 */
router.delete('/', (req, res, next) => {
    /** 쿠키 값 지우고 로그아웃 메시지 전송 */
    console.warn('쿠키값 지우기');
    deleteCookie(res, 'sid');
    res.status(204).json();
});

/** 서버 시간 반환 */
router.get('/datetime', (req, res, next) => {
    const currentTime = new Date().getTime();
    res.json(currentTime);
});

module.exports = router;
