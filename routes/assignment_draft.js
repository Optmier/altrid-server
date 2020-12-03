var express = require('express');
const useAuthCheck = require('./middlewares/authCheck');
var router = express.Router();

/** 선생님 id로 draft 전체 과제 조회 */
router.get('/', useAuthCheck, (req, res, next) => {
    if (req.verified.userType !== 'teachers')
        return res.status(403).json({ code: 'not-allowed-user-type', message: 'unauthorized-access :: not allowed user type.' });

    const teacher_id = req.verified.authId; // 1523016414

    let sql = `SELECT
                    GROUP_CONCAT(classes.name) AS class_name,
                    COUNT(
                        assignment_actived.class_number
                    ) AS actived_count,
                    assignment_draft.*
                FROM
                    assignment_draft AS assignment_draft
                LEFT JOIN
                    assignment_actived AS assignment_actived
                ON
                    assignment_draft.idx = assignment_actived.assignment_number
                LEFT JOIN
                    classes AS classes
                ON
                    classes.idx = assignment_actived.class_number
                WHERE
                    assignment_draft.teacher_id = '${teacher_id}'
                GROUP BY
                    assignment_draft.idx
                ORDER BY
                    assignment_draft.updated
                DESC `;

    dbctrl((connection) => {
        connection.query(sql, (error, results, fields) => {
            connection.release();
            if (error) res.status(400).json(error);
            else res.json(results);
        });
    });
});

/** 선생님 id로 draft 특정 idx 과제 조회 */
router.get('/:idx', useAuthCheck, (req, res, next) => {});

/** 선생님 id로 draft 과제 생성 */
router.post('/', useAuthCheck, (req, res, next) => {
    if (req.verified.userType !== 'teachers')
        return res.status(403).json({ code: 'not-allowed-user-type', message: 'unauthorized-access :: not allowed user type.' });

    const academy_code = req.verified.academyCode;
    const teacher_id = req.verified.authId;
    const { title, description, time_limit, eyetrack } = req.body;
    let { contents_data } = req.body;

    if (contents_data !== null) {
        contents_data = `'${contents_data.replace(/\\/gi, '\\\\').replace(/\'/gi, "\\'")}'`;
    }

    let sql = `INSERT INTO
                assignment_draft( academy_code, teacher_id, title, description, time_limit, eyetrack, contents_data)
               VALUES('${academy_code}','${teacher_id}','${title.replace(/\\/gi, '\\\\').replace(/\'/gi, "\\'")}','${description
        .replace(/\\/gi, '\\\\')
        .replace(/\'/gi, "\\'")}',${time_limit},${eyetrack},${contents_data})`;

    dbctrl((connection) => {
        connection.query(sql, (error, result1, fields) => {
            if (error) {
                connection.release();
                res.status(400).json(error);
            } else {
                let selectIdx = `SELECT LAST_INSERT_ID()`;

                connection.query(selectIdx, (error, result2, fields) => {
                    connection.release();
                    if (error) res.status(400).json(error);
                    else {
                        res.status(201).json({ result2, academy_code, teacher_id });
                    }
                });
            }
        });
    });
});

/** 선생님 id로 draft 과제 수정 */
router.patch('/', useAuthCheck, (req, res, next) => {
    if (req.verified.userType !== 'teachers')
        return res.status(403).json({ code: 'not-allowed-user-type', message: 'unauthorized-access :: not allowed user type.' });

    const { idx, title, description, time_limit, eyetrack } = req.body;
    let { contents_data } = req.body;

    if (contents_data !== null) {
        contents_data = `'${contents_data.replace(/\\/gi, '\\\\').replace(/\'/gi, "\\'")}'`;
    }

    let sql = `UPDATE
                    assignment_draft
                SET
                    title = '${title.replace(/\\/gi, '\\\\').replace(/\'/gi, "\\'")}',
                    description = '${description.replace(/\\/gi, '\\\\').replace(/\'/gi, "\\'")}',
                    eyetrack = ${eyetrack},
                    time_limit = ${time_limit},
                    contents_data= ${contents_data}
                WHERE
                    idx = ${idx}`;

    dbctrl((connection) => {
        connection.query(sql, (error, results, fields) => {
            connection.release();
            if (error) {
                res.status(400).json(error);
            } else res.json(results);
        });
    });
});

/** 선생님 id로 draft 과제 삭제 */
router.delete('/:idx', useAuthCheck, (req, res, next) => {
    if (req.verified.userType !== 'teachers')
        return res.status(403).json({ code: 'not-allowed-user-type', message: 'unauthorized-access :: not allowed user type.' });

    const sql = `DELETE FROM assignment_draft WHERE idx=${req.params.idx}`;

    dbctrl((connection) => {
        connection.query(sql, (error, results, fields) => {
            connection.release();
            if (error) {
                res.status(400).json(error);
            } else res.json(results);
        });
    });
});

module.exports = router;
