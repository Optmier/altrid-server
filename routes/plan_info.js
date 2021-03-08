var express = require('express');
const useAuthCheck = require('./middlewares/authCheck');
var router = express.Router();

router.get('/students-num', useAuthCheck, (req, res, next) => {
    const teacher_id = req.verified.authId; // 1523016414

    let sql = `SELECT
    COUNT(DISTINCT student_id) AS studentNums
FROM
    students_in_class
WHERE
    academy_code = 'code_optmier'    
    `;

    dbctrl((connection) => {
        connection.query(sql, (error, results, fields) => {
            connection.release();
            if (error) res.status(400).json(error);
            else res.json(results);
        });
    });
});
