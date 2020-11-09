var express = require('express');
const useAuthCheck = require('./middlewares/authCheck');
var router = express.Router();

/** actived 과제 조회 */
router.get('/', useAuthCheck, (req, res, next) => {
    if (req.verified.userType !== 'teachers')
        return res.status(403).json({ code: 'not-allowed-user-type', message: 'unauthorized-access :: not allowed user type.' });

    const teacher_id = req.verified.authId; // 1523016414

    let sql = `SELECT * FROM assignment_actived WHERE teacher_id='${teacher_id}' ORDER BY idx DESC`;

    dbctrl((connection) => {
        connection.query(sql, (error, results, fields) => {
            connection.release();
            if (error) res.status(400).json(error);
            else res.json(results);
        });
    });
});

/** actived 과제 생성 */
router.post('/', useAuthCheck, (req, res, next) => {
    if (req.verified.userType !== 'teachers')
        return res.status(403).json({ code: 'not-allowed-user-type', message: 'unauthorized-access :: not allowed user type.' });

    const academy_code = req.verified.academyCode;
    const teacher_id = req.verified.authId;
    const { class_number, assignment_number, title, description, time_limit, eyetrack, contents_data, file_url } = req.body;

    let sql = `
        INSERT INTO
            assignment_actived(class_number, academy_code,assignment_number, teacher_id, title, description, time_limit, eyetrack, contents_data, file_url)
        VALUES(${class_number},${academy_code},${assignment_number},${teacher_id},"${title}","${description}",${time_limit},${eyetrack},"${contents_data}","${file_url}")
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

/** actived 과제 수정 */
router.patch('/', useAuthCheck, (req, res, next) => {
    const teacher_id = req.verified.authId;
    res.json(teacher_id);
});

module.exports = router;
