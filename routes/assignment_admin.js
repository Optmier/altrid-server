var express = require('express');
const useAuthCheck = require('./middlewares/authCheck');
var router = express.Router();

/** 관리자 - 컨텐츠 제작 요청 목록 조회 */
router.get('/', useAuthCheck, (req, res, next) => {
    if (req.verified.userType !== 'admins')
        return res.status(403).json({ code: 'not-allowed-user-type', message: 'unauthorized-access :: not allowed user type.' });

    let sql = `SELECT assigns.idx, assigns.title, teachers.name AS teacher_name, academies.name AS academy_name, assigns.contents_data, assigns.file_url, assigns.created, assigns.updated FROM assignment_draft AS assigns LEFT JOIN teachers ON assigns.teacher_id=teachers.auth_id LEFT JOIN academies ON teachers.academy_code=academies.code ORDER BY assigns.created DESC`;
    dbctrl((connection) => {
        connection.query(sql, (error, results, fields) => {
            connection.release();
            if (error) res.status(400).json(error);
            else res.json(results);
        });
    });
});

/** 관리자 - 문제 컨텐츠 상세 보기 */
router.get('/:id', useAuthCheck, (req, res, next) => {
    if (req.verified.userType !== 'admins')
        return res.status(403).json({ code: 'not-allowed-user-type', message: 'unauthorized-access :: not allowed user type.' });

    let sql = `SELECT * FROM assignment_draft WHERE idx=${req.params.id}`;
    dbctrl((connection) => {
        connection.query(sql, (error, results, fields) => {
            connection.release();
            console.log(results);
            if (error) res.status(400).json(error);
            else res.json(results[0]);
        });
    });
});

/** 관리자 - 컨텐츠만 업데이트 */
router.patch('/:id', useAuthCheck, (req, res, next) => {
    if (req.verified.userType !== 'admins')
        return res.status(403).json({ code: 'not-allowed-user-type', message: 'unauthorized-access :: not allowed user type.' });

    let data = req.body.contentsData.replace(/\\/gi, '\\\\').replace(/\'/gi, "\\'");
    console.log(data);
    let sql = `UPDATE assignment_draft SET contents_data='${data}' WHERE idx=${req.params.id}`;
    dbctrl((connection) => {
        connection.query(sql, (error, results, fields) => {
            connection.release();
            if (error) res.status(400).json(error);
            else res.json(results);
        });
    });
});

/** 관리자 - 과제 컨텐츠 전체 삭제 */
router.delete('/:id', useAuthCheck, (req, res, next) => {
    if (req.verified.userType !== 'admins')
        return res.status(403).json({ code: 'not-allowed-user-type', message: 'unauthorized-access :: not allowed user type.' });

    let sql = `DELETE FROM assignment_draft WHERE idx=${req.params.id}`;
    dbctrl((connection) => {
        connection.query(sql, (error, results, fields) => {
            connection.release();
            if (error) res.status(400).json(error);
            else res.status(204).json(results);
        });
    });
});

module.exports = router;
