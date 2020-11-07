var express = require('express');
const useAuthCheck = require('./middlewares/authCheck');
var router = express.Router();

/** 선생님 id로 draft 과제 조회 */
router.get('/', useAuthCheck, (req, res, next) => {
    if (req.verified.userType !== 'teachers')
        return res.status(403).json({ code: 'not-allowed-user-type', message: 'unauthorized-access :: not allowed user type.' });

    const teacher_id = req.verified.authId;

    let sql = `SELECT * FROM assignment_draft WHERE teacher_id='${teacher_id}'`;

    dbctrl((connection) => {
        connection.query(sql, (error, results, fields) => {
            connection.release();
            if (error) res.status(400).json(error);
            else res.json(results);
        });
    });
});

/** 선생님 id로 draft 과제 생성 */
router.post('/', useAuthCheck, (req, res, next) => {
    const teacher_id = req.verified.authId;
    res.json(teacher_id);
});

/** 선생님 id로 draft 과제 수정 */
router.patch('/', useAuthCheck, (req, res, next) => {
    const teacher_id = req.verified.authId;
    res.json(teacher_id);
});

module.exports = router;
