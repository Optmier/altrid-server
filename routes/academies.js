var express = require('express');
const useAuthCheck = require('./middlewares/authCheck');
var router = express.Router();

/** 모든 계약 학원 조회 */
router.get('/', useAuthCheck, (req, res, next) => {
    if (req.verified.userType !== 'admin')
        return res.status(403).json({ code: 'not-allowed-user-type', message: 'unauthorized-access :: not allowed user type.' });

    let sql = `SELECT * FROM academies WHERE 1`;
    const qCode = req.query.code || '';
    const qName = req.query.name || '';
    const qStartDate = req.query.startdate || '';
    const qEndDate = req.query.enddate || '';
    if (qCode) sql += ` AND code LIKE '%${qCode}%'`;
    if (qName) sql += ` AND name LIKE '%${qName}%'`;
    if (qStartDate) sql += ` AND created >= '${qStartDate}'`;
    if (qEndDate) sql += ` AND created <= '${qEndDate}'`;
    dbctrl((connection) => {
        connection.query(sql, (error, results, fields) => {
            connection.release();
            if (error) res.status(400).json(error);
            else res.json(results);
        });
    });
});

/** 특정 계약 학원 조회 */
router.get('/:code', useAuthCheck, (req, res, next) => {
    if (req.verified.userType !== 'teachers' && req.verified.userType !== 'admins')
        return res.status(403).json({ code: 'not-allowed-user-type', message: 'unauthorized-access :: not allowed user type.' });
    if (req.verified.userType === 'teachers' && req.params.code !== 'current' && req.params.code !== req.verified.academyCode)
        return res.status(403).json({ code: 'not-allowed-user', message: 'unauthorized-access :: not allowed user.' });

    let sql = `SELECT * FROM academies WHERE code='${req.params.code === 'current' ? req.verified.academyCode : req.params.code}'`;
    dbctrl((connection) => {
        connection.query(sql, (error, results, fields) => {
            connection.release();
            if (error) res.status(400).json(error);
            else res.json(results[0]);
        });
    });
});

/** 특정 계약 학원 이름만 조회 */
router.get('/:code/name', useAuthCheck, (req, res, next) => {
    // if (req.verified.userType !== 'teachers' && req.verified.userType !== 'admins')
    //     return res.status(403).json({ code: 'not-allowed-user-type', message: 'unauthorized-access :: not allowed user type.' });
    if (req.verified.userType === 'teachers' && req.params.code !== 'current' && req.params.code !== req.verified.academyCode)
        return res.status(403).json({ code: 'not-allowed-user', message: 'unauthorized-access :: not allowed user.' });

    let sql = `SELECT name FROM academies WHERE code='${req.params.code === 'current' ? req.verified.academyCode : req.params.code}'`;
    dbctrl((connection) => {
        connection.query(sql, (error, results, fields) => {
            connection.release();
            if (error) res.status(400).json(error);
            else res.json(results[0]);
        });
    });
});

/** 학원 존재 여부 확인 */
router.get('/exists/:code', (req, res, next) => {
    let sql = `SELECT COUNT(*) as is_exists, name, address FROM academies WHERE code='${req.params.code}'`;
    dbctrl((connection) => {
        connection.query(sql, (error, results, fields) => {
            connection.release();
            if (error) res.status(400).json(error);
            else res.json(results[0]);
        });
    });
});

/** 계약 학원 추가 */
router.post('/', useAuthCheck, (req, res, next) => {
    if (req.verified.userType !== 'admin')
        return res.status(403).json({ code: 'not-allowed-user-type', message: 'unauthorized-access :: not allowed user type.' });

    const { code, name, address, email, phone, numOfStudents } = req.body;
    let sql = `INSERT INTO academies (code, name, email, phone, num_of_students) VALUES (?, ?, ?, ?, ?, ?)`;
    dbctrl((connection) => {
        connection.query(sql, [code, name, address, email, phone, numOfStudents], (error, results, fields) => {
            connection.release();
            if (error) res.status(400).json(error);
            else res.status(201).json(results);
        });
    });
});

/** 계약 학원 정보 변경 (계약 학생 수 변경 시 별도 문의) */
router.patch('/:code', useAuthCheck, (req, res, next) => {
    if (req.verified.userType !== 'teachers' || req.verified.userType !== 'admins')
        return res.status(403).json({ code: 'not-allowed-user-type', message: 'unauthorized-access :: not allowed user type.' });

    const { name, address, email, phone, numOfStudents } = req.body;
    let sql = `UPDATE academies SET name='${name}', address='${address}', email='${email}', phone='${phone}', num_of_students=${numOfStudents} WHERE code='${req.params.code}'`;
    if (req.verified.userType === 'teachers')
        sql = `UPDATE academies SET name='${name}', address='${address}', email='${email}', phone='${phone}' WHERE code='${req.params.code}'`;
    dbctrl((connection) => {
        connection.query(sql, (error, results, fields) => {
            connection.release();
            if (error) res.status(400).json(error);
            else res.json(results);
        });
    });
});

/** 계약 학원 삭제 */
router.delete('/:code', useAuthCheck, (req, res, next) => {
    if (req.verified.userType !== 'admin')
        return res.status(403).json({ code: 'not-allowed-user-type', message: 'unauthorized-access :: not allowed user type.' });

    let sql = `DELETE FROM academies WHERE code='${req.params.code}'`;
    dbctrl((connection) => {
        connection.query(sql, (error, results, fields) => {
            connection.release();
            if (error) res.status(400).json(error);
            else res.status(204).json(results);
        });
    });
});

module.exports = router;
