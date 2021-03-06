var express = require('express');
const useAuthCheck = require('./middlewares/authCheck');
var router = express.Router();

/** 클래스별 학생 조회 */
router.get('/', useAuthCheck, (req, res, next) => {
    if (req.verified.userType !== 'teachers' && req.verified.userType !== 'admins')
        return res.status(403).json({ code: 'not-allowed-user-type', message: 'unauthorized-access :: not allowed user type.' });

    let sql = `SELECT * FROM students_in_class`;
    if (req.verified.userType === 'teachers') sql += ` WHERE academy_code='${req.verified.academyCode}'`;
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
    if (req.verified.userType !== 'teachers' && req.verified.userType !== 'admins' && req.verified.userType !== 'students')
        return res.status(403).json({ code: 'not-allowed-user-type', message: 'unauthorized-access :: not allowed user type.' });

    let sql = `SELECT
    students_in_class.idx,
    students_in_class.class_number,
    students_in_class.academy_code,
    students_in_class.student_id,
    students.name
    FROM students_in_class AS students_in_class
    JOIN students AS students
    ON students_in_class.student_id=students.email OR students_in_class.student_id=students.auth_id
    WHERE students_in_class.class_number=${req.params.class_number}`;
    if (req.verified.userType === 'teachers') sql += ` AND students_in_class.academy_code='${req.verified.academyCode}'`;

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
    const class_number = req.body.class_number;
    const student_id = req.body.student_id;
    const class_code = req.body.class_code;
    const academy_code = req.body.academy_code;

    let sql = `INSERT INTO
                students_in_class(
                        class_number,
                        student_id,
                        class_code,
                        academy_code
                    )
                VALUES(
                    '${class_number}',
                    '${student_id}',
                    '${class_code}',
                    '${academy_code}')`;

    dbctrl((connection) => {
        connection.query(sql, (error, results, fields) => {
            connection.release();
            if (error) res.status(400).json(error);
            else res.status(201).json(results);
        });
    });
});

/** 특정 클래스 학생 목록 제거 */
router.delete('/:class', useAuthCheck, (req, res, next) => {
    if (req.verified.userType !== 'teachers' && req.verified.userType !== 'admins')
        return res.status(403).json({ code: 'not-allowed-user-type', message: 'unauthorized-access :: not allowed user type.' });

    let sql = `DELETE FROM students_in_class WHERE class_number=${req.params.class}`;
    if (req.verified.userType === 'teachers') sql += ` AND academy_code='${req.verified.academyCode}'`;
    dbctrl((connection) => {
        connection.query(sql, (error, results, fields) => {
            connection.release();
            if (error) res.status(400).json(error);
            else res.status(204).json(results);
        });
    });
});

/** 특정 클래스 학생 여러명 삭제 */
router.delete('/students/:class_number', useAuthCheck, (req, res, next) => {
    if (req.verified.userType !== 'teachers' && req.verified.userType !== 'admins')
        return res.status(403).json({ code: 'not-allowed-user-type', message: 'unauthorized-access :: not allowed user type.' });

    let sql = `DELETE FROM students_in_class
             WHERE class_number=${req.params.class_number} and student_id IN(${req.body.students})`;

    dbctrl((connection) => {
        connection.query(sql, (error, results, fields) => {
            connection.release();
            if (error) res.status(400).json(error);
            else res.status(204).json(results);
        });
    });
});

/** 특정 클래스 내 특정 학생 특이사항 업데이트 */
router.patch('/notes/:class_number/:student_id', useAuthCheck, (req, res, next) => {
    const { class_number, student_id } = req.params;
    const { notes } = req.body;
    const sql = `UPDATE students_in_class SET notes='${notes}' WHERE class_number=${class_number} AND student_id='${student_id}'`;

    dbctrl((connection) => {
        connection.query(sql, (error, results, fields) => {
            connection.release();
            if (error) res.status(400).json(error);
            else res.json(results);
        });
    });
});

module.exports = router;
