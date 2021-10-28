const express = require('express');
const useAuthCheck = require('./middlewares/authCheck');
const router = express.Router();

/** https://snorlaxh.tistory.com/15 */
Array.prototype.division = function (n) {
    const arr = this;
    const length = arr.length;
    const cnt = Math.floor(length / n) + (Math.floor(length % n) > 0 ? 1 : 0);
    const result = [];
    for (let i = 0; i < cnt; i++) {
        result.push(arr.splice(0, n));
    }
    return result;
};

router.post('/', useAuthCheck, (req, res, next) => {});

router.patch('/', useAuthCheck, (req, res, next) => {
    const studentId = req.verified.authId;
    const { idx, means, dist, counts, completed } = req.body;
    const sql = `UPDATE vocas SET means=${
        means === null ? `'${means}'` : null
    }, dist=${dist}, counts=${counts}, completed=${completed} WHERE student_id='${studentId}' AND idx=${idx}`;

    dbctrl((connection) => {
        connection.query(sql, (error, results, fields) => {
            connection.release();
            if (error) res.status(400).json(error);
            else res.json(results);
        });
    });
});

router.get('/progress', useAuthCheck, (req, res, next) => {
    const studentId = req.verified.authId;
    const sql = `SELECT COUNT(*) as total, COUNT(IF(dist=2, 1, NULL)) as progress FROM vocas WHERE student_id='${studentId}'`;

    dbctrl((connection) => {
        connection.query(sql, (error, results, fields) => {
            connection.release();
            if (error) res.status(400).json(error);
            else res.json(results[0]);
        });
    });
});

router.get('/completed', useAuthCheck, (req, res, next) => {
    // const pagination = 10;
    const studentId = req.verified.authId;
    const { limit, page } = req.query;
    const sql = `SELECT * FROM vocas WHERE student_id='${studentId}' AND dist=2 ORDER BY idx LIMIT ${limit ? limit : 0} OFFSET ${
        page ? page * limit : 0
    }`;

    dbctrl((connection) => {
        connection.query(sql, (error, results, fields) => {
            connection.release();
            if (error) res.status(400).json(error);
            else res.json(results);
        });
    });
});

router.get('/completed/max', useAuthCheck, (req, res, next) => {
    const studentId = req.verified.authId;
    const sql = `SELECT COUNT(*) AS max FROM vocas WHERE student_id='${studentId}' AND dist=2`;

    dbctrl((connection) => {
        connection.query(sql, (error, results, fields) => {
            connection.release();
            if (error) res.status(400).json(error);
            else res.json(results[0].max);
        });
    });
});

router.get('/completed/search', useAuthCheck, (req, res, next) => {
    const studentId = req.verified.authId;
    const { q } = req.query;
    const sql = `SELECT * FROM vocas WHERE student_id='${studentId}' AND dist=2 AND word LIKE '%${q}%' ORDER BY idx`;

    dbctrl((connection) => {
        connection.query(sql, (error, results, fields) => {
            connection.release();
            if (error) res.status(400).json(error);
            else res.json(results);
        });
    });
});

router.get('/learning-list', useAuthCheck, (req, res, next) => {
    const studentId = req.verified.authId;
    const { limit } = req.query;
    const sql = `SELECT * FROM vocas WHERE student_id='${studentId}' AND dist!=2 ORDER BY idx LIMIT ${limit ? limit : 0} OFFSET 0`;

    dbctrl((connection) => {
        connection.query(sql, (error, results, fields) => {
            connection.release();
            if (error) res.status(400).json(error);
            else res.json(results);
        });
    });
});

module.exports = router;
