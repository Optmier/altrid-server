var express = require('express');
const useAuthCheck = require('./middlewares/authCheck');
var router = express.Router();

// 현재 내 세팅값에서 특정키 가져오기
router.get('/my/:class_number/:key_name', useAuthCheck, (req, res, next) => {
    const { class_number, key_name } = req.params;
    const { academyCode, authId } = req.verified;
    const sql = `SELECT value, user_id, created, updated FROM personal_settings
                WHERE academy_code='${academyCode}' AND class_number=${class_number} AND user_id='${authId}' AND key_name='${key_name}'`;

    dbctrl((connection) => {
        connection.query(sql, (error, results, fields) => {
            connection.release();
            if (error) res.status(400).json(error);
            else res.json(results[0]);
        });
    });
});

// 현재 내 세팅값에 특정 키 추가
router.post('/my/:class_number/:key_name', useAuthCheck, (req, res, next) => {
    const { class_number, key_name } = req.params;
    const { value } = req.body;
    const { academyCode, authId } = req.verified;
    const sql = `INSERT INTO personal_settings (key_name, value, user_id, academy_code, class_number) 
                VALUES ('${key_name}', ${value === null ? null : `'${value}'`}, '${authId}', '${academyCode}', ${class_number})`;

    dbctrl((connection) => {
        connection.query(sql, (error, results, fields) => {
            connection.release();
            if (error) res.status(400).json(error);
            else res.status(201).json(results);
        });
    });
});

// 현재 내 세팅값에 특정 키 수정
router.patch('/my/:class_number/:key_name', useAuthCheck, (req, res, next) => {
    const { class_number, key_name } = req.params;
    const { value } = req.body;
    const { academyCode, authId } = req.verified;
    const sql = `UPDATE personal_settings SET value='${value}'
                WHERE academy_code='${academyCode}' AND class_number=${class_number} AND user_id='${authId}' AND key_name='${key_name}'`;

    dbctrl((connection) => {
        connection.query(sql, (error, results, fields) => {
            connection.release();
            if (error) res.status(400).json(error);
            else res.json(results);
        });
    });
});

// 현재 태 세팅값에 특정 키 삭제
router.delete('/my/:class_number/:key_name', useAuthCheck, (req, res, next) => {
    const { class_number, key_name } = req.params;
    const { academyCode, authId } = req.verified;
    const sql = `DELETE FROM personal_settings
                WHERE academy_code='${academyCode}' AND class_number=${class_number} AND user_id='${authId}' AND key_name='${key_name}'`;

    dbctrl((connection) => {
        connection.query(sql, (error, results, fields) => {
            connection.release();
            if (error) res.status(400).json(error);
            else res.status(204).json(results);
        });
    });
});

router.get('/:academy_code/:class_number/:user_id/:key_name', useAuthCheck, (req, res, next) => {
    const { academy_code, class_number, user_id, key_name } = req.params;
    const sql = `SELECT value, user_id, created, updated FROM personal_settings
                WHERE academy_code='${academy_code}' AND class_number=${class_number} AND user_id='${user_id}' AND key_name='${key_name}'`;

    dbctrl((connection) => {
        connection.query(sql, (error, results, fields) => {
            connection.release();
            if (error) res.status(400).json(error);
            else res.json(results[0]);
        });
    });
});

module.exports = router;
