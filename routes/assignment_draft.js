var express = require('express');
const useAuthCheck = require('./middlewares/authCheck');
var router = express.Router();

/** 선생님 id로 draft 과제 조회 */
router.get('/', useAuthCheck, (req, res, next) => {
    if (req.verified.userType !== 'teachers')
        return res.status(403).json({ code: 'not-allowed-user-type', message: 'unauthorized-access :: not allowed user type.' });

    const teacher_id = req.verified.authId; // 1523016414

    let sql = `SELECT * FROM assignment_draft WHERE teacher_id='${teacher_id}' ORDER BY idx DESC`;

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
    if (req.verified.userType !== 'teachers')
        return res.status(403).json({ code: 'not-allowed-user-type', message: 'unauthorized-access :: not allowed user type.' });

    const academy_code = req.verified.academyCode;
    const teacher_id = req.verified.authId;
    const { title, description, time_limit, eyetrack } = req.body;
    let { contents_data, file_url } = req.body;

    if (contents_data !== null) {
        contents_data = `"` + contents_data;
        contents_data = contents_data + `"`;
    }
    if (file_url !== null) {
        file_url = `"` + file_url;
        file_url = file_url + `"`;
    }
    let sql = `
        INSERT INTO
            assignment_draft( academy_code, teacher_id, title, description, time_limit, eyetrack, contents_data, file_url)
        VALUES(${academy_code},${teacher_id},"${title}","${description}",${time_limit},${eyetrack},${contents_data},${file_url})
    `;

    dbctrl((connection) => {
        connection.query(sql, (error, results, fields) => {
            connection.release();
            if (error) {
                console.error('에러 !!!', error);
                res.status(400).json(error);
            } else res.json(results);
        });
    });
});

/** 선생님 id로 draft 과제 수정 */
router.patch('/', useAuthCheck, (req, res, next) => {
    if (req.verified.userType !== 'teachers')
        return res.status(403).json({ code: 'not-allowed-user-type', message: 'unauthorized-access :: not allowed user type.' });

    const { idx, title, description, time_limit, eyetrack } = req.body;
    let { contents_data, file_url } = req.body;

    if (contents_data !== null) {
        //contents_data = contents_data.replace(/\\/gi, '\\\\').replace(/\'/gi, "\\'");
        contents_data = `"` + contents_data;
        contents_data = contents_data + `"`;
    }
    if (file_url !== null) {
        //file_url = file_url.replace(/\\/gi, '\\\\').replace(/\'/gi, "\\'");
        contents_data = `"` + contents_data;
        contents_data = contents_data + `"`;
    }

    let sql = `UPDATE
                    assignment_draft
                SET
                    title = "${title}",
                    description = "${description}",
                    eyetrack = ${eyetrack},
                    time_limit = ${time_limit},
                    contents_data= ${contents_data},
                    file_url= ${file_url}
                WHERE
                    idx = ${idx}`;

    console.log(sql);
    dbctrl((connection) => {
        connection.query(sql, (error, results, fields) => {
            connection.release();
            if (error) {
                console.error('에러 !!!', error);
                res.status(400).json(error);
            } else res.json(results);
        });
    });
});

module.exports = router;
