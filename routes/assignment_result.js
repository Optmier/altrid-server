var express = require('express');
const useAuthCheck = require('./middlewares/authCheck');
var router = express.Router();

/** 보고서를 위한 데이터 가져오기 */
router.get('/:actived_number', useAuthCheck, (req, res, next) => {
    const academyCode = req.verified.academyCode;
    const activedNumber = req.params.actived_number;

    let sql = `SELECT actived.idx AS actived_number, students.name, students.auth_id AS student_id, actived.teacher_id, result.actived_number AS submitted, result.score_percentage, result.score_points, result.eyetrack, result.user_data, result.eyetrack_data, actived.contents_data, result.num_of_fixs, result.avg_of_fix_durs, result.avg_of_fix_vels, result.num_of_sacs, result.var_of_sac_vels, result.cluster_area, result.cluster_counts, result.num_of_regs, result.tries, result.time, result.created, result.updated
        FROM students_in_class AS in_class
        LEFT JOIN students
        ON in_class.student_id=students.auth_id AND in_class.academy_code=students.academy_code
        JOIN assignment_actived AS actived
        ON in_class.class_number=actived.class_number
        LEFT JOIN assignment_result AS result
        ON actived.idx=result.actived_number AND students.auth_id=result.student_id
        WHERE in_class.academy_code='${academyCode}' AND actived.idx=${activedNumber}`;
    dbctrl((connection) => {
        connection.query(sql, (error, results, fields) => {
            connection.release();
            if (error) res.status(400).json(error);
            else
                res.json(
                    results.map((d, idx) => {
                        return { ...d, idx: idx };
                    }),
                );
        });
    });
});

/** 보고서를 위한 학생별 데이터 가져오기 */
router.get('/:actived_number/:student_id', useAuthCheck, (req, res, next) => {
    const academyCode = req.verified.academyCode;
    const activedNumber = req.params.actived_number;
    const studentId = req.params.student_id;

    let sql = `SELECT actived.idx AS actived_number, students.name, students.auth_id AS student_id, actived.teacher_id, result.actived_number AS submitted, result.score_percentage, result.score_points, result.eyetrack, result.user_data, result.eyetrack_data, actived.contents_data, result.num_of_fixs, result.avg_of_fix_durs, result.avg_of_fix_vels, result.num_of_sacs, result.var_of_sac_vels, result.cluster_area, result.cluster_counts, result.num_of_regs, result.tries, result.time, result.created, result.updated
        FROM students_in_class AS in_class
        LEFT JOIN students
        ON in_class.student_id=students.auth_id AND in_class.academy_code=students.academy_code
        JOIN assignment_actived AS actived
        ON in_class.class_number=actived.class_number
        LEFT JOIN assignment_result AS result
        ON actived.idx=result.actived_number AND students.auth_id=result.student_id
        WHERE in_class.academy_code='${academyCode}' AND actived.idx=${activedNumber} AND students.auth_id='${studentId}'`;
    dbctrl((connection) => {
        connection.query(sql, (error, results, fields) => {
            connection.release();
            if (error) res.status(400).json(error);
            else
                res.json(
                    results.map((d, idx) => {
                        return { ...d, idx: idx };
                    }),
                );
        });
    });
});

/** 전체 가져오기 */
router.get('/', useAuthCheck, (req, res, next) => {
    const academyCode = req.verified.academyCode;
    const limit = req.query.limit;
    const offset = req.query.offset;
    const order = 0; // 0: asc, 1: desc

    let sql = `SELECT actived.idx AS actived_number, actived.created, students.name, students.auth_id AS student_id, actived.teacher_id, result.actived_number AS submitted, result.score_percentage, result.score_points, result.eyetrack, result.user_data, result.eyetrack_data, result.num_of_fixs, result.avg_of_fix_durs, result.avg_of_fix_vels, result.num_of_sacs, result.var_of_sac_vels, result.cluster_area, result.cluster_counts, result.num_of_regs, result.tries, result.time, result.created, result.updated
        FROM students_in_class AS in_class
        LEFT JOIN students
        ON in_class.student_id=students.auth_id AND in_class.academy_code=students.academy_code
        JOIN assignment_actived AS actived
        ON in_class.class_number=actived.class_number
        LEFT JOIN assignment_result AS result
        ON actived.idx=result.actived_number AND students.auth_id=result.student_id
        WHERE in_class.academy_code='${academyCode}' ORDER BY actived.created DESC`;
    //  GROUP BY actived.idx`;
    // if(order !== undefined && order !== null) sql += ` ORDER BY actived.created ${!order ? 'ASC' : 'DESC'}`;
    // if(limit !== undefined && limit !== null && offset !== undefined && offset !== null) sql += ` LIMIT ${limit} OFFSET ${offset}`;
    dbctrl((connection) => {
        connection.query(sql, (error, results, fields) => {
            console.log(results);
            connection.release();
            if (error) res.status(400).json(error);
            else {
                const obj = {};
                results.map((data) => {
                    !obj[data.actived_number] && (obj[data.actived_number] = []);
                    obj[data.actived_number].push(data);
                });

                if (Object.keys(obj).length > 1) {
                    const dk = Object.keys(obj);
                    res.json(obj[dk[dk.length - 2]]);
                } else {
                    const first = Object.keys(obj)[0];
                    res.json(obj[first]);
                }
            }
        });
    });
});

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
