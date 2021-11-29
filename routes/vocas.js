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

router.post('/', useAuthCheck, (req, res, next) => {
    const { vocas, assignmentNumber, classNumber } = req.body;
    const studentId = req.verified.authId;
    const savedata = vocas.map((d) => [d, studentId, assignmentNumber, classNumber]);
    const sql = `INSERT INTO vocas (word, student_id, assignment_id, class_number) VALUES ?`;

    dbctrl((connection) => {
        connection.query(sql, [savedata], (error, results, fields) => {
            connection.release();
            if (error) res.status(400).json(error);
            else res.status(201).json(results);
        });
    });
});

router.patch('/', useAuthCheck, (req, res, next) => {
    const studentId = req.verified.authId;
    const { idx, means, dist, counts, completed, classNum } = req.body;
    const sql = `UPDATE vocas SET means=${
        means !== null ? `'${means}'` : null
    }, dist=${dist}, counts=${counts}, completed=${completed} WHERE student_id='${studentId}' AND idx=${idx} AND class_number=${classNum}`;

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
    const { classNum } = req.query;
    const sql = `SELECT COUNT(*) as total, COUNT(IF(dist=2, 1, NULL)) as progress FROM vocas WHERE student_id='${studentId}' AND class_number=${classNum}`;

    dbctrl((connection) => {
        connection.query(sql, (error, results, fields) => {
            connection.release();
            if (error) res.status(400).json(error);
            else res.json(results[0]);
        });
    });
});

router.get('/random', useAuthCheck, (req, res, next) => {
    const studentId = req.verified.authId;
    const { classNum } = req.query;
    const sql = `SELECT word FROM vocas WHERE student_id = ${studentId} AND class_number = ${classNum} ORDER BY RAND() LIMIT 1`;

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
    const { limit, page, classNum } = req.query;
    const sql = `SELECT vocas.*, assignment_actived.title AS assignment_title FROM vocas 
                LEFT JOIN assignment_actived ON assignment_actived.idx=vocas.assignment_id
                WHERE vocas.student_id='${studentId}' AND vocas.dist=2 AND vocas.class_number=${classNum} ORDER BY vocas.idx LIMIT ${
        limit ? limit : 0
    } OFFSET ${page ? page * limit : 0}`;

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
    const { classNum } = req.query;
    const sql = `SELECT COUNT(*) AS max FROM vocas WHERE student_id='${studentId}' AND dist=2 AND class_number=${classNum}`;

    dbctrl((connection) => {
        connection.query(sql, (error, results, fields) => {
            connection.release();
            if (error) res.status(400).json(error);
            else res.json(results[0].max);
        });
        fffff;
    });
});

router.get('/completed/search', useAuthCheck, (req, res, next) => {
    const studentId = req.verified.authId;
    const { q, classNum } = req.query;
    const sql = `SELECT vocas.*, assignment_draft.title AS assignment_title FROM vocas
                LEFT JOIN assignment_draft ON assignment_draft.idx=vocas.assignment_id
                WHERE vocas.student_id='${studentId}' AND vocas.dist=2 AND vocas.class_number=${classNum} AND vocas.word LIKE '%${q}%' ORDER BY vocas.idx`;

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
    const { limit, classNum } = req.query;
    const sql = `SELECT vocas.*, assignment_draft.title AS assignment_title FROM vocas
                LEFT JOIN assignment_draft ON assignment_draft.idx=vocas.assignment_id 
                WHERE vocas.student_id='${studentId}' AND vocas.dist!=2 AND vocas.class_number=${classNum} ORDER BY vocas.idx LIMIT ${
        limit ? limit : 0
    } OFFSET 0`;

    dbctrl((connection) => {
        connection.query(sql, (error, results, fields) => {
            connection.release();
            if (error) res.status(400).json(error);
            else res.json(results);
        });
    });
});

module.exports = router;
