var express = require('express');
const useAuthCheck = require('./middlewares/authCheck');
var router = express.Router();

router.get('/students-num', useAuthCheck, (req, res, next) => {
    const academy_code = req.verified.academyCode;

    let sql = `SELECT COUNT(DISTINCT student_id) AS studentNums
                FROM students_in_class
                WHERE academy_code = '${academy_code}'`;

    dbctrl((connection) => {
        connection.query(sql, (error, results, fields) => {
            connection.release();
            if (error) res.status(400).json(error);
            else res.json(results);
        });
    });
});

router.get('/teachers-num', useAuthCheck, (req, res, next) => {
    const academy_code = req.verified.academyCode;

    let sql = `SELECT COUNT(*)
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

router.get('/assignment-drafts', useAuthCheck, (req, res, next) => {
    const academy_code = req.verified.academyCode;
    const teacher_id = req.verified.authId;

    let sql = `SELECT COUNT(*)
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

router.get('/assignment-actived', useAuthCheck, (req, res, next) => {
    const academy_code = req.verified.academyCode;
    const teacher_id = req.verified.authId;

    let sql = `SELECT
                    COUNT(*)
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
