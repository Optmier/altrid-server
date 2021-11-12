const express = require('express');
const useAuthCheck = require('./middlewares/authCheck');
const router = express.Router();

// 새 레코드 추가
router.post('/', useAuthCheck, (req, res, next) => {
    const studentId = req.verified.authId;
    const { classNum } = req.body;
    const sql = `INSERT INTO optimer (student_id, class_number) VALUES ('${studentId}', ${classNum})`;

    dbctrl((connection) => {
        connection.query(sql, (error, results, fields) => {
            connection.release();
            if (error) res.status(400).json(error);
            else res.status(201).json(results);
        });
    });
});

// 학습시간 데이터 업데이트
router.patch('/', useAuthCheck, (req, res, next) => {
    const dayCode = req.body.dayCode;
    const studyTime = req.body.studyTime;
    const classNum = req.body.classNum;
    const studentId = req.verified.authId;
    const sql = `UPDATE optimer SET time_${dayCode}=time_${dayCode}+${studyTime},
                time_total=time_mon+time_tue+time_wed+time_thu+time_fri+time_sat+time_sun
                WHERE student_id='${studentId}' AND class_number=${classNum} AND 
                created >= ADDDATE( CURDATE(), - WEEKDAY(CURDATE()) + 0 ) AND created < ADDDATE( CURDATE(), - WEEKDAY(CURDATE()) + 7 )`;

    dbctrl((connection) => {
        connection.query(sql, (error, results, fields) => {
            connection.release();
            if (error) res.status(400).json(error);
            else res.json(results);
        });
    });
});

// 특정 클래스 내 학생 순위 조회
router.get('/:classNum', useAuthCheck, (req, res, next) => {
    const classNum = req.params.classNum;
    const sql = `SELECT students.name, optimer.* FROM optimer
                LEFT JOIN students_in_class ON optimer.student_id=students_in_class.student_id
                JOIN students ON optimer.student_id=students.auth_id
                WHERE optimer.class_number=${classNum} AND 
                optimer.created >= ADDDATE( CURDATE(), - WEEKDAY(CURDATE()) + 0 ) AND optimer.created < ADDDATE( CURDATE(), - WEEKDAY(CURDATE()) + 7 )
                ORDER BY time_total DESC`;

    dbctrl((connection) => {
        connection.query(sql, (error, results, fields) => {
            connection.release();
            if (error) res.status(400).json(error);
            else res.json(results);
        });
    });
});

// 특정 학생 학습시간 데이터 조회
router.get('/:classNum/:studentId', useAuthCheck, (req, res, next) => {
    const classNum = req.params.classNum;
    const studentId = req.params.studentId;
    const sql = `SELECT students.name, optimer.* FROM optimer
    JOIN students_in_class ON optimer.student_id=students_in_class.student_id
    JOIN students ON optimer.student_id=students.auth_id
    WHERE students_in_class.class_number=${classNum} AND optimer.class_number=${classNum} AND optimer.student_id='${studentId}' AND
    optimer.created >= ADDDATE( CURDATE(), - WEEKDAY(CURDATE()) + 0 ) AND optimer.created < ADDDATE( CURDATE(), - WEEKDAY(CURDATE()) + 7 )
    ORDER BY time_total DESC`;

    dbctrl((connection) => {
        connection.query(sql, (error, results, fields) => {
            connection.release();
            if (error) res.status(400).json(error);
            else res.json(results[0]);
        });
    });
});

module.exports = router;
