var express = require('express');
const useAuthCheck = require('./middlewares/authCheck');
var router = express.Router();

/** 프로필 조회 */
router.get('/profile', useAuthCheck, (req, res, next) => {
    const authId = req.verified.authId;

    console.log(req.verified.image);

    const sql = `select t.auth_id, t.email, t.name, t.auth_with, t.academy_code, a.name as academy_name
                from teachers as t
                left join academies as a
                on t.academy_code = a.code
                where t.auth_id = "${authId}"`;
    dbctrl((connection) => {
        connection.query(sql, (error, results, fields) => {
            connection.release();
            if (error) {
                res.status(400).json(error);
            } else res.json({ ...results[0], image: req.verified.image });
        });
    });
});

/** 프로필 수정 */
router.put('/profile', useAuthCheck, (req, res, next) => {
    const authId = req.verified.authId;
    const name = req.body.name;

    const sql = `update teachers
                    set name="${name}"
                    where auth_id="${authId}"`;

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
