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
                        "${teacher_id}",
                        "${academy_code}",
                        "${title}",
                        "${description}",
                        ${time_limit},
                        ${eyetrack},
                        ${contents_data},
                        "${file_url}",
                        "${due_date}")`;

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

    let sql = `SELECT idx, title, assignment_number, description, time_limit, eyetrack, contents_data, due_date, created FROM assignment_actived WHERE class_number=${classNumber} AND academy_code='${academyCode}' ORDER BY due_date desc`;

    setTimeout(function () {
        dbctrl((connection) => {
            connection.query(sql, (error, results, fields) => {
                connection.release();
                if (error) res.status(400).json(error);
                else res.json(results);
            });
        });
    }, 1000);
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

    setTimeout(function () {
        dbctrl((connection) => {
            connection.query(sql, (error, results, fields) => {
                connection.release();
                if (error) {
                    res.status(400).json(error);
                } else res.json(results);
            });
        });
    }, 1000);
});

module.exports = router;
