var express = require('express');
const useAuthCheck = require('./middlewares/authCheck');
var router = express.Router();

/** 프로필 조회 */
router.get('/profile', useAuthCheck, (req, res, next) => {
    const authId = req.verified.authId;
    const userType = req.verified.userType;

    const sql = `select t.email, t.auth_with
                from ${userType} as t
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
    const userType = req.verified.userType;
    const name = req.body.name;
    const image = req.body.image;

    const sql = `update ${userType}
                    set name="${name}", image=${!image ? null : '"' + image + '"'}
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

router.delete('/profile', useAuthCheck, (req, res, next) => {
    const authId = req.verified.authId;
    const userType = req.verified.userType;

    const sql = `delete from ${userType} where auth_id="${authId}"`;

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
