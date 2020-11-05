var express = require('express');
const useAuthCheck = require('./middlewares/authCheck');
const useAuthCheckTemp = require('./middlewares/authCheckTemp');
var router = express.Router();

/** 선생님별 학생 목록 추가 */
router.post('/', useAuthCheck, (req, res, next) => {
    const teacherId = req.body.teacherId;
    let sql = `INSERT INTO students_in_teacher (teacher_id, student_id, academy_code) VALUES (?)`;
    dbctrl((connection) => {
        connection.query(sql, [[teacherId, req.verified.email, req.verified.academyCode]], (error, results, fields) => {
            connection.release();
            if (error) res.status(400).json(error);
            else res.status(201).json(results);
        });
    });
});

/** 선생님별 학생 목록 추가 (최초 등록시) */
router.post('/first', useAuthCheckTemp, (req, res, next) => {
    const teachers = req.body.teachers;
    let sql = `INSERT INTO students_in_teacher (teacher_id, student_id, academy_code) VALUES ?`;
    dbctrl((connection) => {
        connection.query(sql, [teachers], (error, results, fields) => {
            connection.release();
            if (error) res.status(400).json(error);
            else res.status(201).json(results);
        });
    });
});

/** 선생님별 학생 목록 조회 */
router.get('/:teacher_id', useAuthCheck, (req, res, next) => {
    if (req.verified.usertype !== 'teachers' && req.verified.usertype !== 'admins')
        return res.status(403).json({ code: 'not-allowed-user-type', message: 'unauthorized-access :: not allowed user type.' });

    const teacherId = req.params.teacher_id === 'current' ? req.verified.email : req.params.teacher_id;
    let sql = `SELECT
    students_in_teacher.student_id ,
    students.name
    FROM students_in_teacher AS students_in_teacher
    JOIN students AS students
    ON students_in_teacher.student_id=students.email OR students_in_teacher.student_id=students.auth_id
    WHERE teacher_id='${teacherId}'`;

    dbctrl((connection) => {
        connection.query(sql, (error, results, fields) => {
            connection.release();
            if (error) res.status(400).json(error);
            else res.json(results);
        });
    });
});

module.exports = router;
