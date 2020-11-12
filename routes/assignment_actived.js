var express = require('express');
const useAuthCheck = require('./middlewares/authCheck');
var router = express.Router();

/** 과제 수행을 위한 데이터 조회 */
router.get('/:class/:id', useAuthCheck, (req, res, next) => {
    const academyCode = req.verified.academyCode;
    const activeId = req.params.id;
    // 클래스 번호 같은 경우는 추후 다른 인원과의 고의적인 충돌을 방지하기 위해 매커니즘을 변경할 필요 있음!
    const activeClassNumber = req.params.class;

    let sql = `SELECT idx, title, description, time_limit, eyetrack, contents_data FROM assignment_actived WHERE idx=${activeId} AND class_number=${activeClassNumber} AND academy_code='${academyCode}'`;
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

    let sql = `SELECT idx, title, description, time_limit, eyetrack, contents_data FROM assignment_actived WHERE class_number=${classNumber} AND academy_code='${academyCode}'`;
    dbctrl((connection) => {
        connection.query(sql, (error, results, fields) => {
            connection.release();
            if (error) res.status(400).json(error);
            else res.json(results);
        });
    });
})

module.exports = router;
