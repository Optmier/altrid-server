var express = require('express');
const useAuthCheck = require('./middlewares/authCheck');
var router = express.Router();

/** 클래스별 학생 조회 */
router.get('/', useAuthCheck, (req, res, next) => {
    if (req.verified.usertype !== 'teachers' && req.verified.usertype !== 'admins')
        return res.status(403).json({ code: 'not-allowed-user-type', message: 'unauthorized-access :: not allowed user type.' });

    let sql = `SELECT * FROM students_in_class`;
    if (req.verified.usertype === 'teachers') sql += ` WHERE academy_code='${req.verified.academyCode}'`;
    sql += ' GROUP BY class_number';
    dbctrl((connection) => {
        connection.query(sql, (error, results, fields) => {
            connection.release();
            if (error) res.status(400).json(error);
            else res.json(results);
        });
    });
});

/** 특정 클래스 학생 조회 */
router.get('/:class_number', useAuthCheck, (req, res, next) => {
    if (req.verified.usertype !== 'teachers' && req.verified.usertype !== 'admins')
        return res.status(403).json({ code: 'not-allowed-user-type', message: 'unauthorized-access :: not allowed user type.' });

    let sql = `SELECT
    students_in_class.idx,
    students_in_class.class_number,
    students_in_class.academy_code,
    students_in_class.student_id,
    students.name,
    FROM students_in_class AS students_in_class
    JOIN students AS students
    ON students_in_class.student_id=students.email OR students_in_class.student_id=students.auth_id
    WHERE class_number=${req.params.class_number}`;
    if (req.verified.usertype === 'teachers') sql += ` AND academy_code='${req.verified.academyCode}'`;
    dbctrl((connection) => {
        connection.query(sql, (error, results, fields) => {
            connection.release();
            if (error) res.status(400).json(error);
            else res.json(results);
        });
    });
});

/** 클래스에 학생 목록 추가 */
router.post('/', useAuthCheck, (req, res, next) => {
    if (req.verified.usertype !== 'teachers' && req.verified.usertype !== 'admins')
        return res.status(403).json({ code: 'not-allowed-user-type', message: 'unauthorized-access :: not allowed user type.' });

    const classNumber = req.body.classNumber;
    const academyCode = req.verified.academyCode;
    const students = req.body.students.map((data) => [classNumber, academyCode, data.student_id]);
    let sql = 'INSERT INTO students_in_class (class_number, academy_code, student_id) VALUES ?';
    dbctrl((connection) => {
        connection.query(sql, [students], (error, results, fields) => {
            connection.release();
            if (error) res.status(400).json(error);
            else res.status(201).json(results);
        });
    });
});

/** 특정 클래스 학생 목록 제거 */
router.delete('/:class', useAuthCheck, (req, res, next) => {
    if (req.verified.usertype !== 'teachers' && req.verified.usertype !== 'admins')
        return res.status(403).json({ code: 'not-allowed-user-type', message: 'unauthorized-access :: not allowed user type.' });

    let sql = `DELETE FROM students_in_class WHERE class_number=${req.params.class_number}`;
    if (req.verified.usertype === 'teachers') sql += ` AND academy_code='${req.verified.academyCode}'`;
    dbctrl((connection) => {
        connection.query(sql, (error, results, fields) => {
            connection.release();
            if (error) res.status(400).json(error);
            else res.status(204).json(results);
        });
    });
});

module.exports = router;
