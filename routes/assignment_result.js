var express = require('express');
const useAuthCheck = require('./middlewares/authCheck');
var router = express.Router();

/** 수강생 관리를 위한 데이터 가져오기*/
router.get('/report-students/:class_number', useAuthCheck, (req, res, next) => {
    if (req.verified.userType !== 'teachers' && req.verified.userType !== 'admins')
        return res.status(403).json({ code: 'not-allowed-user-type', message: 'unauthorized-access :: not allowed user type.' });

    let sql = `SELECT sic.class_number, sic.student_id, s.name, a.title, a.idx AS actived_number, r.idx
                FROM students_in_class AS sic
                INNER JOIN students AS s
                ON sic.student_id = s.auth_id
                LEFT JOIN assignment_actived AS a
                ON sic.class_number = a.class_number
                LEFT JOIN assignment_result AS r
                ON (sic.student_id = r.student_id AND a.idx = r.actived_number)
                WHERE sic.class_number = ${req.params.class_number}
                ORDER BY s.name desc, a.idx`;

    dbctrl((connection) => {
        connection.query(sql, (error, results, fields) => {
            connection.release();
            if (error) res.status(400).json(error);
            else res.json(results);
        });
    });
});

/** 나의 아이트랙 데이터 가져오기 */
router.get('/eyetrack-data/:actived_number', useAuthCheck, (req, res, next) => {
    const activedNumber = req.params.actived_number;
    const userId = req.query.userId;

    let sql = `SELECT eyetrack_data FROM assignment_result WHERE actived_number='${activedNumber}' AND student_id='${userId}'`;
    dbctrl((connection) => {
        connection.query(sql, (error, results, fields) => {
            connection.release();
            if (error) res.status(400).json(error);
            else {
                res.json(results[0]);
            }
        });
    });
});

/** 현 과제 컨텐츠 데이터 가져오기 */
router.get('/contents-data/:actived_number', useAuthCheck, (req, res, next) => {
    const academyCode = req.verified.academyCode;
    const activedNumber = req.params.actived_number;
    const classNumber = req.query.classNumber;

    let sql = `SELECT actived.contents_data
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
            else {
                console.log(results[0]);
                res.json(results[0]);
            }
        });
    });
});

/** 보고서를 위한 데이터 가져오기 */
router.get('/:actived_number', useAuthCheck, (req, res, next) => {
    const academyCode = req.verified.academyCode;
    const activedNumber = req.params.actived_number;
    const classNumber = req.query.classNumber;

    let sql;
    if (!classNumber)
        sql = `SELECT actived.idx AS actived_number, students.name, students.auth_id AS student_id, actived.teacher_id, result.actived_number AS submitted, result.score_percentage, result.score_points, result.eyetrack, result.user_data, result.eyetrack_data, actived.contents_data, result.num_of_fixs, result.avg_of_fix_durs, result.avg_of_fix_vels, result.num_of_sacs, result.var_of_sac_vels, result.cluster_area, result.cluster_counts, result.num_of_regs, result.tries, result.time, result.created, result.updated
        FROM students_in_class AS in_class
        LEFT JOIN students
        ON in_class.student_id=students.auth_id AND in_class.academy_code=students.academy_code
        JOIN assignment_actived AS actived
        ON in_class.class_number=actived.class_number
        LEFT JOIN assignment_result AS result
        ON actived.idx=result.actived_number AND students.auth_id=result.student_id
        WHERE in_class.academy_code='${academyCode}' AND actived.idx=${activedNumber}`;
    else
        sql = `SELECT actived.idx AS actived_number,  actived.title AS title, students.name, students.auth_id AS student_id, actived.teacher_id, result.actived_number AS submitted, result.score_percentage, result.score_points, result.eyetrack, result.user_data, result.num_of_fixs, result.avg_of_fix_durs, result.avg_of_fix_vels, result.num_of_sacs, result.var_of_sac_vels, result.cluster_area, result.cluster_counts, result.num_of_regs, result.tries, result.time, result.created, result.updated
        FROM students_in_class AS in_class
        LEFT JOIN students
        ON in_class.student_id=students.auth_id AND in_class.academy_code=students.academy_code
        JOIN assignment_actived AS actived
        ON in_class.class_number=actived.class_number
        LEFT JOIN assignment_result AS result
        ON actived.idx=result.actived_number AND students.auth_id=result.student_id
        WHERE in_class.academy_code='${academyCode}' AND (actived.idx=(SELECT MAX(idx) FROM assignment_actived WHERE idx<${activedNumber} AND academy_code='${academyCode}' AND class_number=${classNumber}) OR actived.idx=${activedNumber})`;
    dbctrl((connection) => {
        connection.query(sql, (error, results, fields) => {
            connection.release();
            if (error) res.status(400).json(error);
            else
                res.json({
                    curr: results
                        .filter((r) => r.actived_number == activedNumber)
                        .sort((a, b) => {
                            if (a.updated === b.updated) {
                                return 0;
                            } else if (!a.updated) {
                                return 1;
                            } else if (!b.updated) {
                                return -1;
                            } else {
                                return a.updated < b.updated ? 1 : -1;
                            }
                        })
                        .map((d, idx) => ({ ...d, idx: idx })),
                    prev: results
                        .filter((r) => r.actived_number != activedNumber)
                        .sort((a, b) => {
                            if (a.updated === b.updated) {
                                return 0;
                            } else if (!a.updated) {
                                return 1;
                            } else if (!b.updated) {
                                return -1;
                            } else {
                                return a.updated < b.updated ? 1 : -1;
                            }
                        })
                        .map((d, idx) => ({ ...d, idx: idx })),
                });
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

    let sql = `SELECT COUNT(*) AS is_exists, user_data, eyetrack_data, tries, is_submitted, time, vocas FROM assignment_result WHERE actived_number=${activedNumber} && student_id='${studentId}'`;
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
                let insert = `INSERT INTO assignment_result (actived_number, student_id, eyetrack, tries, is_submitted, updated) VALUES (?, ?, ?, ?, ?, ?)`;
                connection.query(insert, [activedNumber, studentId, eyetrack, 0, 0, null], (error, res2, fields) => {
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
    const isSubmitted = req.body.isSubmitted;
    const vocas = req.body.vocas;

    let sql = `UPDATE assignment_result 
    SET score_percentage=${scorePercentage}, score_points=${scorePoints}, user_data='${userData}', eyetrack_data='${eyetrackData}', num_of_fixs=${numOfFixs}, avg_of_fix_durs=${avgOfFixDurs}, avg_of_fix_vels=${avgOfFixVels}, num_of_sacs=${numOfSacs}, var_of_sac_vels=${varOfSacVels}, cluster_area=${clusterArea}, cluster_counts=${clusterCounts}, num_of_regs=${numOfRegs}, time=${time}, is_submitted=${isSubmitted}, vocas='${vocas}'
    WHERE actived_number=${activedNumber} && student_id='${studentId}'`;

    dbctrl((connection) => {
        connection.query(sql, (error, results, fields) => {
            connection.release();
            if (error) res.status(400).json(error);
            else res.json(results);
        });
    });
});

/** 사용자 리포트 삭제 */
router.delete('/:actived_number/:student_id', useAuthCheck, (req, res, next) => {
    const activedNumber = req.params.actived_number;
    const studentId = req.params.student_id;

    let sql = `DELETE FROM assignment_result WHERE actived_number='${activedNumber}' AND student_id='${studentId}'`;
    dbctrl((connection) => {
        connection.query(sql, (error, results, fields) => {
            connection.release();
            if (error) res.status(400).json(error);
            else res.status(204).json(results);
        });
    });
});

module.exports = router;
