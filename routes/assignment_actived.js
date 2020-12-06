var express = require('express');
const useAuthCheck = require('./middlewares/authCheck');
var router = express.Router();

/** actived 과제 생성 */
router.post('/', useAuthCheck, (req, res, next) => {
    if (req.verified.userType !== 'teachers')
        return res.status(403).json({ code: 'not-allowed-user-type', message: 'unauthorized-access :: not allowed user type.' });

    const academy_code = req.verified.academyCode;
    const teacher_id = req.verified.authId;

    const { class_number, assignment_number, due_date, title, description, time_limit, eyetrack, file_url } = req.body;
    let { contents_data } = req.body;
    contents_data = `'${contents_data.replace(/\\/gi, '\\\\').replace(/\'/gi, "\\'")}'`;

    let sql = `INSERT INTO 
                assignment_actived(
                    class_number,
                    assignment_number,
                    teacher_id,
                    academy_code,
                    title,
                    description,
                    time_limit,
                    eyetrack,
                    contents_data,
                    file_url,
                    due_date)
                VALUES(
                        ${class_number},
                        ${assignment_number},
                        '${teacher_id}',
                        '${academy_code}',
                        '${title.replace(/\\/gi, '\\\\').replace(/\'/gi, "\\'")}',
                        '${description.replace(/\\/gi, '\\\\').replace(/\'/gi, "\\'")}',
                        ${time_limit},
                        ${eyetrack},
                        ${contents_data},
                        '${file_url}',
                        '${due_date}')`;

    dbctrl((connection) => {
        connection.query(sql, (error, results, fields) => {
            connection.release();
            if (error) {
                console.error('에러 !!!', error);
                res.status(400).json(error);
            } else res.json(results);
        });
    });
});

/** 과제 수행을 위한 데이터 조회 */
router.get('/:class/:id', useAuthCheck, (req, res, next) => {
    const academyCode = req.verified.academyCode;
    const activeId = req.params.id;
    // 클래스 번호 같은 경우는 추후 다른 인원과의 고의적인 충돌을 방지하기 위해 매커니즘을 변경할 필요 있음!
    const activeClassNumber = req.params.class;

    let sql = `SELECT idx, title, description, time_limit, eyetrack, contents_data, due_date, created, updated FROM assignment_actived WHERE idx=${activeId} AND class_number=${activeClassNumber} AND academy_code='${academyCode}'`;
    dbctrl((connection) => {
        connection.query(sql, (error, results, fields) => {
            connection.release();
            if (error) res.status(400).json(error);
            else res.json(results[0]);
        });
    });
});

/** 클래스 내의 전체 데이터 조회 */
router.get('/:class', useAuthCheck, (req, res, next) => {
    const academyCode = req.verified.academyCode;
    const classNumber = req.params.class;
    const authId = req.verified.authId;
    const userType = req.verified.userType;

    let sql = `SELECT actived.idx, actived.title, actived.assignment_number, actived.description, actived.time_limit, actived.eyetrack, actived.contents_data, actived.due_date, actived.created,
                (SELECT COUNT(*) FROM assignment_result AS result
                INNER JOIN students_in_class AS in_class
                ON result.student_id=in_class.student_id AND in_class.class_number=${classNumber} AND result.tries>0
                WHERE result.actived_number=actived.idx)
                AS submitted_number 
                FROM assignment_actived AS actived
                ${
                    userType === 'students'
                        ? `INNER JOIN students_in_class AS in_class
                ON in_class.class_number=actived.class_number AND in_class.student_id='${authId}'`
                        : ''
                }
                WHERE actived.class_number=${classNumber} AND actived.academy_code='${academyCode}' ORDER BY actived.updated desc`;
    dbctrl((connection) => {
        connection.query(sql, (error, results, fields) => {
            connection.release();
            if (error) res.status(400).json(error);
            else res.json(results);
        });
    });
});

/** 특정 actived 과제 완료 */
router.patch('/', useAuthCheck, (req, res, next) => {
    if (req.verified.userType !== 'teachers')
        return res.status(403).json({ code: 'not-allowed-user-type', message: 'unauthorized-access :: not allowed user type.' });

    const { now, idx } = req.body;

    let sql = `UPDATE
                    assignment_actived
                SET
                    due_date = "${now}"
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

/** 특정 actived 과제 삭제 */
router.delete('/:idx', useAuthCheck, (req, res, next) => {
    if (req.verified.userType !== 'teachers')
        return res.status(403).json({ code: 'not-allowed-user-type', message: 'unauthorized-access :: not allowed user type.' });

    const sql = `DELETE FROM assignment_actived WHERE idx=${req.params.idx}`;

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
