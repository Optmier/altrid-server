var express = require('express');
const { isEmail } = require('../modules/regex');
const useAuthCheck = require('./middlewares/authCheck');
const useAuthCheckTemp = require('./middlewares/authCheckTemp');
var router = express.Router();

/** 모든 선생님 정보 조회 */
router.get('/', useAuthCheck, (req, res, next) => {
    if (req.verified.userType !== 'teachers' || req.verified.userType !== 'admins')
        return res.status(403).json({ code: 'not-allowed-user-type', message: 'unauthorized-access :: not allowed user type.' });

    let sql = `SELECT * FROM teachers WHERE 1 `;
    const qApproved = req.query.approved;
    const qAuthWith = req.query.authwith || '';
    const qStartDate = req.query.startdate || '';
    const qEndDate = req.query.enddate || '';
    if (qApproved !== null && qApproved !== undefined) sql += `AND approved=${qApproved} `;
    if (qAuthWith) sql += `AND auth_with='${qAuthWith}' `;
    if (qStartDate) sql += `AND created >= '${qStartDate}' `;
    if (qEndDate) sql += `AND created <= '${qEndDate}' `;
    if (req.verified.userType === 'teachers') sql += `AND academy_code='${req.verified.academyCode}'`;
    dbctrl((connection) => {
        connection.query(sql, (error, results, fields) => {
            connection.release();
            if (error) res.status(400).json(error);
            else res.json(results);
        });
    });
});

/** 특정 선생님 조회 */
router.get('/:id', useAuthCheck, (req, res, next) => {
    if (req.verified.userType !== 'teachers' || req.verified.userType !== 'admins')
        return res.status(403).json({ code: 'not-allowed-user-type', message: 'unauthorized-access :: not allowed user type.' });

    const authId = req.params.id === 'current' ? req.verified.authId : req.params.id;
    let sql = `SELECT * FROM teachers WHERE `;
    if (authId) sql += `auth_id='${authId}'`;
    else
        return res.status(400).json({
            code: 'no-auth-info',
            message: 'No email or authId.',
        });
    if (req.verified.userType === 'teachers') sql += ` AND academy_code='${req.verified.academyCode}'`;
    dbctrl((connection) => {
        connection.query(sql, (error, results, fields) => {
            connection.release();
            if (error) res.status(400).json(error);
            else res.json(results[0]);
        });
    });
});

/** 특정 선생님 존재 여부 확인 */
router.get('/exists/:id', (req, res, next) => {
    const authId = req.params.id || '';
    let sql = `SELECT COUNT(*) as is_exists FROM teachers WHERE `;
    if (authId) sql += `auth_id='${authId}'`;
    else
        return res.status(400).json({
            code: 'no-auth-info',
            message: 'No email or authId.',
        });
    dbctrl((connection) => {
        connection.query(sql, (error, results, fields) => {
            connection.release();
            if (error) res.status(400).json(error);
            else res.json(results[0].is_exists);
        });
    });
});

/** 회원가입을 위한 학원별 선생님 목록 조회 */
router.get('/in-class/:code', useAuthCheckTemp, (req, res, next) => {
    const code = req.params.code || '';
    let sql = `SELECT name, email, auth_id FROM teachers WHERE academy_code='${code}' AND approved=1`;
    dbctrl((connection) => {
        connection.query(sql, (error, results, fields) => {
            connection.release();
            if (error) res.status(400).json(error);
            else res.json(results);
        });
    });
});

/** 학원별 선생님 존재 여부 확인 */
router.get('/in-class/:code/:teacher_id', useAuthCheck, (req, res, next) => {
    const academyCode = req.params.code === 'current' ? req.verified.academyCode : req.params.code;
    let sql = `SELECT COUNT(*) AS is_exists, auth_id FROM teachers WHERE academy_code='${academyCode}' AND email='${req.params.teacher_id}'`;
    dbctrl((connection) => {
        connection.query(sql, (error, results, fields) => {
            connection.release();
            if (error) res.status(400).json(error);
            else res.json(results[0]);
        });
    });
});

/** 선생님 추가 */
router.post('/', (req, res, next) => {
    const { email, name, authId, authWith, academyCode, phone, approved, image } = req.body;
    let sql = `INSERT INTO teachers (email, name, auth_id, auth_with, academy_code, phone, approved, image) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;
    dbctrl((connection) => {
        connection.query(sql, [email, name, authId, authWith, academyCode, phone, approved, image], (error, results, fields) => {
            connection.release();
            if (error) res.status(400).json(error);
            else res.status(201).json(results);
        });
    });
});

/** 특정 선생님 승인 */
router.patch('/approval/:id/true', useAuthCheck, (req, res, next) => {
    if (req.verified.userType !== 'teachers' || req.verified.userType !== 'admins')
        return res.status(403).json({ code: 'not-allowed-user-type', message: 'unauthorized-access :: not allowed user type.' });

    const authId = req.params.id || '';
    let sql = `UPDATE teachers SET approved=1 WHERE `;
    if (authId) sql += `auth_id='${authId}'`;
    else
        return res.status(400).json({
            code: 'no-auth-info',
            message: 'No email or authId.',
        });
    if (req.verified.userType === 'teachers') sql += ` AND academy_code='${req.verified.academyCode}'`;
    dbctrl((connection) => {
        connection.query(sql, (error, results, fields) => {
            connection.release();
            if (error) res.status(400).json(error);
            else res.json(results);
        });
    });
});

/** 특정 선생님 승인 거부 */
router.patch('/approval/:id/false', useAuthCheck, (req, res, next) => {
    if (req.verified.userType !== 'teachers' || req.verified.userType !== 'admins')
        return res.status(403).json({ code: 'not-allowed-user-type', message: 'unauthorized-access :: not allowed user type.' });

    const authId = req.params.id || '';
    let sql = `UPDATE teachers SET approved=0 WHERE `;
    if (authId) sql += `auth_id='${authId}'`;
    else
        return res.status(400).json({
            code: 'no-auth-info',
            message: 'No email or authId.',
        });
    if (req.verified.userType === 'teachers') sql += ` AND academy_code='${req.verified.academyCode}'`;
    dbctrl((connection) => {
        connection.query(sql, (error, results, fields) => {
            connection.release();
            if (error) res.status(400).json(error);
            else res.json(results);
        });
    });
});

/** 특정 선생님 정보 변경 */
router.patch('/:id', useAuthCheck, (req, res, next) => {
    if (req.verified.userType !== 'teachers' || req.verified.userType !== 'admins')
        return res.status(403).json({ code: 'not-allowed-user-type', message: 'unauthorized-access :: not allowed user type.' });

    const { name, phone } = req.body;
    const authId = req.params.id === 'current' ? req.verified.authId : req.params.id;
    let sql = `UPDATE teachers SET name='${name}', phone='${phone}' WHERE `;
    if (authId) sql += `auth_id='${authId}'`;
    else
        return res.status(400).json({
            code: 'no-auth-info',
            message: 'No email or authId.',
        });
    if (req.verified.userType === 'teachers') sql += ` AND academy_code='${req.verified.academyCode}'`;
    dbctrl((connection) => {
        connection.query(sql, (error, results, fields) => {
            connection.release();
            if (error) res.status(400).json(error);
            else res.json(results);
        });
    });
});

/** 특정 선생님 삭제 */
router.delete('/:id', useAuthCheck, (req, res, next) => {
    if (req.verified.userType !== 'teachers' || req.verified.userType !== 'admins')
        return res.status(403).json({ code: 'not-allowed-user-type', message: 'unauthorized-access :: not allowed user type.' });

    const authId = req.params.id === 'current' ? req.verified.authId : req.params.id;
    let sql = `DELETE FROM teachers WHERE `;
    if (authId) sql += `auth_id='${authId}'`;
    else
        return res.status(400).json({
            code: 'no-auth-info',
            message: 'No email or authId.',
        });
    if (req.verified.userType === 'teachers') sql += `AND academy_code='${req.verified.academyCode}'`;
    dbctrl((connection) => {
        connection.query(sql, (error, results, fields) => {
            connection.release();
            if (error) res.status(400).json(error);
            else res.status(204).json();
        });
    });
});

module.exports = router;
