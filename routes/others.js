var express = require('express');
const useAuthCheck = require('./middlewares/authCheck');
var router = express.Router();

/** 시도횟수 조회 */
router.get('/assignment-tries/:class', useAuthCheck, (req, res, next) => {
    const classNumber = req.params.class;
    const studentId = req.verified.authId;
    console.log(classNumber, studentId);

    let sql = `SELECT actived.idx, result.tries FROM assignment_actived AS actived
                LEFT JOIN assignment_result AS result
                ON actived.idx=result.actived_number AND result.student_id='${studentId}'
                WHERE actived.class_number=${classNumber}`;
    dbctrl((connection) => {
        connection.query(sql, (error, results, fields) => {
            connection.release();
            if (error) res.status(400).json(error);
            else res.json(results);
        });
    });
});

module.exports = router;
