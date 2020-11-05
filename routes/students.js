var express = require('express');
const { isEmail } = require('../modules/regex');
const useAuthCheck = require('./middlewares/authCheck');
var router = express.Router();

/** 모든 학원생 정보 조회 */
router.get('/', useAuthCheck, (req, res, next) => {
    if (req.verified.usertype !== 'teachers' || req.verified.usertype !== 'admins')
        return res.status(403).json({ code: 'not-allowed-user-type', message: 'unauthorized-access :: not allowed user type.' });

    let sql = `SELECT * FROM students WHERE 1 `;
    const qApproved = req.query.approved;
    const qAuthWith = req.query.authwith || '';
    const qStartDate = req.query.startdate || '';
    const qEndDate = req.query.enddate || '';
    if (qApproved !== null && qApproved !== undefined) sql += `AND approved=${qApproved} `;
    if (qAuthWith) sql += `AND auth_with='${qAuthWith}' `;
    if (qStartDate) sql += `AND created >= '${qStartDate}' `;
    if (qEndDate) sql += `AND created <= '${qEndDate}' `;
    if (req.verified.usertype === 'teachers') sql += `AND academy_code='${req.verified.academyCode}'`;
    dbctrl((connection) => {
        connection.query(sql, (error, results, fields) => {
            connection.release();
            if (error) res.status(400).json(error);
            else res.json(results);
        });
    });
});

/** 특정 학원생 조회 (usertype이 student인 경우에는 자기 자신만 조회 가능) */
router.get('/:id', useAuthCheck, (req, res, next) => {
    if (req.verified.usertype !== 'students' || req.verified.usertype !== 'teachers' || req.verified.usertype !== 'admins')
        return res.status(403).json({ code: 'not-allowed-user-type', message: 'unauthorized-access :: not allowed user type.' });
    if (req.verified.usertype === 'students' && req.params.id !== req.verified.email)
        return res.status(403).json({ code: 'not-allowed-user', message: 'unauthorized-access :: not allowed user.' });

    let email = '';
    let authId = '';
    if (req.params.id === 'current') {
        email = isEmail(req.verified.email) ? req.verified.email : '';
        authId = !isEmail(req.verified.email) ? req.verified.email : '';
    } else {
        email = isEmail(req.params.id) ? req.params.id : '';
        authId = !isEmail(req.params.id) ? req.params.id : '';
    }
    let sql = `SELECT * FROM students WHERE `;
    if (email) sql += `email='${email}'`;
    else if (authId) sql += `auth_id='${authId}'`;
    else
        return res.status(400).json({
            code: 'no-auth-info',
            message: 'No email or authId.',
        });
    if (req.verified.usertype === 'teachers') sql += ` AND academy_code='${req.verified.academyCode}'`;
    dbctrl((connection) => {
        connection.query(sql, (error, results, fields) => {
            connection.release();
            if (error) res.status(400).json(error);
            else res.json(results[0]);
        });
    });
});

/** 특정 학원생 존재 여부 확인 */
router.get('/exists/:id', (req, res, next) => {
    const email = isEmail(req.params.id) ? req.params.id : '';
    const authId = !isEmail(req.params.id) ? req.params.id : '';
    let sql = `SELECT COUNT(*) as is_exists FROM students WHERE `;
    if (email) sql += `email='${email}'`;
    else if (authId) sql += `auth_id='${authId}'`;
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

/** 학원생 추가 */
router.post('/', (req, res, next) => {
    const { email, name, authId, authWith, academyCode, phone } = req.body;
    let sql = `INSERT INTO students (email, name, auth_id, auth_with, academy_code, phone) VALUES (?, ?, ?, ?, ?, ?)`;
    dbctrl((connection) => {
        connection.query(sql, [email, name, authId, authWith, academyCode, phone], (error, results, fields) => {
            connection.release();
            if (error) res.status(400).json(error);
            else res.status(201).json(results);
        });
    });
});

/** 특정 학원생 승인 */
router.patch('/approval/:id/true', useAuthCheck, (req, res, next) => {
    if (req.verified.usertype !== 'teachers' || req.verified.usertype !== 'admins')
        return res.status(403).json({ code: 'not-allowed-user-type', message: 'unauthorized-access :: not allowed user type.' });

    const email = isEmail(req.params.id) ? req.params.id : '';
    const authId = !isEmail(req.params.id) ? req.params.id : '';
    let sql = `UPDATE students SET approved=1 WHERE `;
    if (email) sql += `email='${email}'`;
    else if (authId) sql += `auth_id='${authId}'`;
    else
        return res.status(400).json({
            code: 'no-auth-info',
            message: 'No email or authId.',
        });
    if (req.verified.usertype === 'teachers') sql += ` AND academy_code='${req.verified.academyCode}'`;
    dbctrl((connection) => {
        connection.query(sql, (error, results, fields) => {
            connection.release();
            if (error) res.status(400).json(error);
            else res.json(results);
        });
    });
});

/** 특정 학원생 승인 거부 */
router.patch('/approval/:id/false', useAuthCheck, (req, res, next) => {
    if (req.verified.usertype !== 'teachers' || req.verified.usertype !== 'admins')
        return res.status(403).json({ code: 'not-allowed-user-type', message: 'unauthorized-access :: not allowed user type.' });

    const email = isEmail(req.params.id) ? req.params.id : '';
    const authId = !isEmail(req.params.id) ? req.params.id : '';
    let sql = `UPDATE students SET approved=0 WHERE `;
    if (email) sql += `email='${email}'`;
    else if (authId) sql += `auth_id='${authId}'`;
    else
        return res.status(400).json({
            code: 'no-auth-info',
            message: 'No email or authId.',
        });
    if (req.verified.usertype === 'students' || req.verified.usertype === 'teachers')
        sql += ` AND academy_code='${req.verified.academyCode}'`;
    dbctrl((connection) => {
        connection.query(sql, (error, results, fields) => {
            connection.release();
            if (error) res.status(400).json(error);
            else res.json(results);
        });
    });
});

/** 특정 학원생 정보 변경 (usertype이 student인 경우에는 자기 자신만 변경 가능) */
router.patch('/:id', useAuthCheck, (req, res, next) => {
    if (req.verified.usertype !== 'students' || req.verified.usertype !== 'teachers' || req.verified.usertype !== 'admins')
        return res.status(403).json({ code: 'not-allowed-user-type', message: 'unauthorized-access :: not allowed user type.' });
    if (req.verified.usertype === 'students' && req.params.id !== req.verified.email)
        return res.status(403).json({ code: 'not-allowed-user', message: 'unauthorized-access :: not allowed user.' });

    const { name, phone } = req.body;
    let email = '';
    let authId = '';
    if (req.params.id === 'current') {
        email = isEmail(req.verified.email) ? req.verified.email : '';
        authId = !isEmail(req.verified.email) ? req.verified.email : '';
    } else {
        email = isEmail(req.params.id) ? req.params.id : '';
        authId = !isEmail(req.params.id) ? req.params.id : '';
    }
    let sql = `UPDATE students SET name='${name}', phone='${phone}' WHERE `;
    if (email) sql += `email='${email}'`;
    else if (authId) sql += `auth_id='${authId}'`;
    else
        return res.status(400).json({
            code: 'no-auth-info',
            message: 'No email or authId.',
        });
    if (req.verified.usertype === 'students' || req.verified.usertype === 'teachers')
        sql += ` AND academy_code='${req.verified.academyCode}'`;
    dbctrl((connection) => {
        connection.query(sql, (error, results, fields) => {
            connection.release();
            if (error) res.status(400).json(error);
            else res.json(results);
        });
    });
});

/** 특정 학원생 삭제 (usertype이 student인 경우에는 자기 자신만 삭제 가능) */
router.delete('/:id', useAuthCheck, (req, res, next) => {
    if (req.verified.usertype !== 'students' || req.verified.usertype !== 'teachers' || req.verified.usertype !== 'admins')
        return res.status(403).json({ code: 'not-allowed-user-type', message: 'unauthorized-access :: not allowed user type.' });
    if (req.verified.usertype === 'students' && req.params.id !== req.verified.email)
        return res.status(403).json({ code: 'not-allowed-user', message: 'unauthorized-access :: not allowed user.' });

    let email = '';
    let authId = '';
    if (req.params.id === 'current') {
        email = isEmail(req.verified.email) ? req.verified.email : '';
        authId = !isEmail(req.verified.email) ? req.verified.email : '';
    } else {
        email = isEmail(req.params.id) ? req.params.id : '';
        authId = !isEmail(req.params.id) ? req.params.id : '';
    }
    let sql = `DELETE FROM teachers WHERE `;
    if (email) sql += `email='${email}'`;
    else if (authId) sql += `auth_id='${authId}'`;
    else
        return res.status(400).json({
            code: 'no-auth-info',
            message: 'No email or authId.',
        });
    if (req.verified.usertype === 'students' || req.verified.usertype === 'teachers')
        sql += `AND academy_code='${req.verified.academyCode}'`;
    dbctrl((connection) => {
        connection.query(sql, (error, results, fields) => {
            connection.release();
            if (error) res.status(400).json(error);
            else res.status(204).json();
        });
    });
});

module.exports = router;
