var express = require('express');
const { setCookie, deleteCookie } = require('../modules/cookieController');
var router = express.Router();
const { issueToken } = require('../modules/encryption');
const useAuthCheck = require('./middlewares/authCheck');

const tasksAuthLoginCheckDatabase = (res, email, authId, usertype) =>
    new Promise((resolve, reject) => {
        dbctrl((connection) => {
            let sql = `SELECT COUNT(*) AS is_exists, approved, name FROM ${usertype} WHERE `;
            if (usertype === 'students' || usertype === 'teachers')
                sql = `SELECT COUNT(*) AS is_exists, academy_code, approved, name FROM ${usertype} WHERE `;
            let _email = '';
            if (email) {
                sql += `email='${email}'`;
                _email = email;
            } else if (authId) {
                sql += `auth_id='${authId}'`;
                _email = authId;
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
                            email: _email,
                            name: results[0].name,
                            usertype: usertype,
                            academyCode: usertype === 'admins' ? '' : results[0].academy_code,
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
    const { email, name, usertype, academyCode, res } = data;
    if (usertype) {
        const { auth, token } = issueToken(email + '', name, usertype, academyCode, 'altrid.optmier.com', '24h');
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

    tasksAuthLoginCheckDatabase(res, email, authId, 'admins').then(tasksAuthLoginAfterCheck).catch(tasksAuthLoginFailed);
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

    tasksAuthLoginCheckDatabase(res, email, authId, 'teachers').then(tasksAuthLoginAfterCheck).catch(tasksAuthLoginFailed);
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

    tasksAuthLoginCheckDatabase(res, email, authId, 'students').then(tasksAuthLoginAfterCheck).catch(tasksAuthLoginFailed);
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

    const { auth, token } = issueToken(email || authId, '', 'temp', '', 'altrid.optmier.com', '30m');
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

/* 인증 토큰 유효 여부 확인 */
router.get('/', useAuthCheck, (req, res, next) => {
    delete req.verified.email;
    res.json(req.verified);
});

/* 통합 로그아웃 */
router.delete('/', useAuthCheck, (req, res, next) => {
    /** 쿠키 값 지우고 로그아웃 메시지 전송 */
    console.warn('쿠키값 지우기');
    deleteCookie(res, 'sid');
    res.status(204).json();
});

module.exports = router;
