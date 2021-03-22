var express = require('express');
const useAuthCheck = require('./middlewares/authCheck');
var router = express.Router();

// 1. stdNums : 선생님별 학생 인원
router.get('/students-num', useAuthCheck, (req, res, next) => {
    const academy_code = req.verified.academyCode;
    const teacher_id = req.verified.authId;

    let sql = `SELECT
                    COUNT(DISTINCT student_id) AS studentNums
                FROM
                    students_in_class AS sic
                JOIN
                    classes AS c
                ON
                    sic.class_code = c.class_code
                WHERE
                    sic.academy_code = '${academy_code}' AND c.teacher_id = '${teacher_id}'`;

    dbctrl((connection) => {
        connection.query(sql, (error, results, fields) => {
            connection.release();
            if (error) res.status(400).json(error);
            else res.json(results);
        });
    });
});

// 2. teacherNums : 학원별 선생님 인원
router.get('/teachers-num', useAuthCheck, (req, res, next) => {
    const academy_code = req.verified.academyCode;

    let sql = `SELECT COUNT(*) as teacherNums
                FROM teachers
                WHERE academy_code = '${academy_code}'`;

    dbctrl((connection) => {
        connection.query(sql, (error, results, fields) => {
            connection.release();
            if (error) res.status(400).json(error);
            else res.json(results);
        });
    });
});

// 3. fileCounts : 월별 파일 업로드 수
router.get('/assignment-drafts', useAuthCheck, (req, res, next) => {
    const academy_code = req.verified.academyCode;
    const teacher_id = req.verified.authId;

    let sql = `SELECT COUNT(*) as fileCounts
                FROM assignment_draft
                WHERE file_url IS NOT NULL AND teacher_id = '${teacher_id}' AND created <(
                    SELECT
                        IF(
                            DAY(plan_start) >= 28,
                            LAST_DAY(plan_start + INTERVAL 1 MONTH),
                            DATE_ADD(plan_start, INTERVAL +1 MONTH)
                        )
                    FROM
                        order_history
                    WHERE
                        academy_code = '${academy_code}'
                ) AND created >=(
                SELECT
                    plan_start
                FROM
                    order_history
                WHERE
                    academy_code = '${academy_code}')`;

    dbctrl((connection) => {
        connection.query(sql, (error, results, fields) => {
            connection.release();
            if (error) res.status(400).json(error);
            else res.json(results);
        });
    });
});

// 4. eyetrackAssigments : 시선흐름 과제 수
router.get('/assignment-actived', useAuthCheck, (req, res, next) => {
    const academy_code = req.verified.academyCode;
    const teacher_id = req.verified.authId;

    let sql = `SELECT
                    COUNT(*) as eyetrackAssigments
                FROM
                    assignment_actived
                WHERE
                    teacher_id = '${teacher_id}' AND academy_code = '${academy_code}' AND eyetrack = 1`;

    dbctrl((connection) => {
        connection.query(sql, (error, results, fields) => {
            connection.release();
            if (error) res.status(400).json(error);
            else res.json(results);
        });
    });
});

module.exports = router;
