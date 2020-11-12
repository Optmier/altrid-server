var express = require('express');
const useAuthCheck = require('./middlewares/authCheck');
var router = express.Router();

/** 보고서를 위한 데이터 가져오기 */
router.get('/:actived_number', useAuthCheck, (req, res, next) => {
    const academyCode = req.verified.academyCode;
    const activedNumber = req.params.actived_number;

    let sql = `SELECT result.*, students.name FROM assignment_result AS result
        INNER JOIN assignment_actived AS actived
        ON result.actived_number=actived.idx AND actived.academy_code='${academyCode}'
        INNER JOIN students
        ON result.student_id=students.auth_id
        WHERE result.actived_number=${activedNumber}`;
    dbctrl(connection => {
        connection.query(sql, (error, results, fields) => {
            connection.release();
            if(error) res.status(400).json(error);
            else res.json(results);
        })
    })
})

/** 초기화 */
router.post('/', useAuthCheck, (req, res, next) => {
    const activedNumber = req.body.activedNumber;
    const eyetrack = req.body.eyetrack;
    const studentId = req.verified.authId;

    let sql = `SELECT COUNT(*) AS is_exists, user_data, eyetrack_data, tries, time FROM assignment_result WHERE actived_number=${activedNumber} && student_id='${studentId}'`;
    dbctrl((connection) => {
        connection.query(sql, (error, res1, fields) => {
            console.log(res1);
            if (error) {
                connection.release();
                res.status(400).json(error);
            } else if (res1[0].is_exists > 0) {
                // update
                connection.release();
                res.json({ savedData: res1[0] });
            } else {
                // insert
                let insert = `INSERT INTO assignment_result (actived_number, student_id, eyetrack, tries) VALUES (?, ?, ?, ?)`;
                connection.query(insert, [activedNumber, studentId, eyetrack, 0], (error, res2, fields) => {
                    connection.release();
                    if (error) res.status(400).json(error);
                    else res.status(201).json(res2);
                });
            }
        });
    });
});

/** 시도횟수 증가 */
router.patch('/tries', useAuthCheck, (req, res, next) => {
    const activedNumber = req.body.activedNumber;
    const studentId = req.verified.authId;

    let update = `UPDATE assignment_result SET tries=tries+1 WHERE actived_number=${activedNumber} && student_id='${studentId}'`;
    dbctrl((connection) => {
        connection.query(update, (error, results, fields) => {
            connection.release();
            if (error) res.status(400).json(error);
            else res.json(results);
        });
    });
});

/** 사용자 진행 사항 업데이트 */
router.patch('/', useAuthCheck, (req, res, next) => {
    const studentId = req.verified.authId;
    const activedNumber = req.body.activedNumber;
    const scorePercentage = req.body.scorePercentage;
    const scorePoints = req.body.scorePoints;
    const userData = req.body.userData.replace(/\\/gi, '\\\\').replace(/\'/gi, "\\'");
    const eyetrackData = req.body.eyetrackData.replace(/\\/gi, '\\\\').replace(/\'/gi, "\\'");
    const numOfFixs = req.body.numOfFixs;
    const avgOfFixDurs = req.body.avgOfFixDurs;
    const avgOfFixVels = req.body.avgOfFixVels;
    const numOfSacs = req.body.numOfSacs;
    const varOfSacVels = req.body.varOfSacVels;
    const clusterArea = req.body.clusterArea;
    const clusterCounts = req.body.clusterCounts;
    const numOfRegs = req.body.numOfRegs;
    const time = req.body.time;

    let sql = `UPDATE assignment_result SET score_percentage=${scorePercentage}, score_points=${scorePoints}, user_data='${userData}', eyetrack_data='${eyetrackData}', num_of_fixs=${numOfFixs}, avg_of_fix_durs=${avgOfFixDurs}, avg_of_fix_vels=${avgOfFixVels}, num_of_sacs=${numOfSacs}, var_of_sac_vels=${varOfSacVels}, cluster_area=${clusterArea}, cluster_counts=${clusterCounts}, num_of_regs=${numOfRegs}, time=${time} WHERE actived_number=${activedNumber} && student_id='${studentId}'`;

    dbctrl((connection) => {
        connection.query(sql, (error, results, fields) => {
            connection.release();
            if (error) res.status(400).json(error);
            else res.json(results);
        });
    });
});

module.exports = router;
