var express = require('express');
const { route } = require('./assignment_result');
const useAuthCheck = require('./middlewares/authCheck');
var router = express.Router();

/** 손든 문제들 추가 */
router.post('/', useAuthCheck, (req, res, next) => {
    const handsUpProblems = req.body;
    // console.log(handsUpProblems);
    let sql = `INSERT INTO hands_up (assignment_no, student_answer, correct_answer, student_id, question_id) VALUES ?`;
    dbctrl((connection) => {
        connection.query(sql, [handsUpProblems], (error, results, fields) => {
            connection.release();
            if (error) res.status(400).json(error);
            else {
                res.status(201).json(results);
            }
        });
    });
});

/** 손든 문제들 제거 */
router.delete('/', useAuthCheck, (req, res, next) => {
    const studentId = req.verified.authId;
    const problemIds = req.body.problemIds;
    // console.log(studentId, problemIds);
    let sql = `DELETE FROM hands_up WHERE student_id='${studentId}' AND question_id IN (${problemIds})`;
    dbctrl((connection) => {
        connection.query(sql, (error, results, fields) => {
            connection.release();
            if (error) res.status(400).json(error);
            else {
                res.json(results);
            }
        });
    });
});

/** 강사 문제 선택 및 해제 */
router.patch('/selected', useAuthCheck, (req, res, next) => {
    const selected = req.body.selected;
    const problemIds = req.body.problemIds;
    console.log(selected, problemIds);
    let sql = `UPDATE hands_up SET teacher_selected=${selected} WHERE question_id IN (${problemIds})`;
    dbctrl((connection) => {
        connection.query(sql, (error, results, fields) => {
            connection.release();
            if (error) res.status(400).json(error);
            else {
                res.json(results);
            }
        });
    });
});

/** 강사가 선택한 문제 보기 */
router.get('/selected/:assignmentNo', useAuthCheck, (req, res, next) => {
    const assignmentNo = req.params.assignmentNo;
    console.log(assignmentNo);
    let getContentsSql = `SELECT contents_data FROM assignment_actived WHERE idx=${assignmentNo}`;
    let getSelectedHandsUpSql = `SELECT * FROM hands_up WHERE assignment_no=${assignmentNo}
                                    GROUP BY question_id HAVING hands_up.teacher_selected=1`;
    dbctrl((connection) => {
        connection.query(getContentsSql, (errorGetContents, resultsGetContents, fieldsGetContents) => {
            if (errorGetContents) {
                connection.release();
                res.status(400).json(errorGetContents);
            } else {
                connection.query(getSelectedHandsUpSql, (errorGetSelectedHandsUp, resultsGetSelectedHandsUp, fieldsGetSelectedHandsUp) => {
                    connection.release();
                    if (errorGetSelectedHandsUp) res.status(400).json(errorGetSelectedHandsUp);
                    else {
                        const obj = {};
                        let contentsData = null;
                        try {
                            contentsData = JSON.parse(
                                resultsGetContents[0].contents_data
                                    .replace(/\\n/g, '\\n')
                                    .replace(/\\'/g, "\\'")
                                    .replace(/\\"/g, '\\"')
                                    .replace(/\\&/g, '\\&')
                                    .replace(/\\r/g, '\\r')
                                    .replace(/\\t/g, '\\t')
                                    .replace(/\\b/g, '\\b')
                                    .replace(/\\f/g, '\\f')
                                    .replace(/[\u0000-\u0019]+/g, ''),
                            );
                        } catch (parseError) {
                            res.status(400).json(parseError);
                        }
                        for (let p of resultsGetSelectedHandsUp) {
                            if (!obj[p.question_id]) obj[p.question_id] = [];
                            let found = false;
                            let absoluteProblemIdx = 0;
                            const contentsCounts = contentsData.length;
                            for (let i = 0; i < contentsCounts; i++) {
                                const problemsCounts = contentsData[i].problemDatas.length;
                                for (let j = 0; j < problemsCounts; j++) {
                                    const currentProblemData = contentsData[i].problemDatas[j];
                                    if (currentProblemData.uuid === p.question_id) {
                                        found = true;
                                        obj[p.question_id].push({
                                            passageUid: contentsData[i].uuid,
                                            passageIdx: i,
                                            problemIdx: j,
                                            problemAbsIdx: absoluteProblemIdx,
                                        });
                                        break;
                                    }
                                    absoluteProblemIdx++;
                                }
                                if (found) break;
                            }
                        }
                        res.json(obj);
                    }
                });
            }
        });
    });
});

/** 특정 학생 손든 문제 보기 */
router.get('/:studentId/:assignmentNo', useAuthCheck, (req, res, next) => {
    const studentId = req.params.studentId;
    const assignmentNo = req.params.assignmentNo;
    console.log(studentId, assignmentNo);
    let getContentsSql = `SELECT contents_data FROM assignment_actived WHERE idx=${assignmentNo}`;
    let getHandsUpSql = `SELECT * FROM hands_up WHERE assignment_no=${assignmentNo} AND student_id='${studentId}'`;
    dbctrl((connection) => {
        connection.query(getContentsSql, (errorGetContents, resultsGetContents, fieldsGetContents) => {
            if (errorGetContents) {
                connection.release();
                res.status(400).json(errorGetContents);
            } else {
                connection.query(getHandsUpSql, (errorGetHandsUp, resultsGetHandsUp, fieldsGetHandsUp) => {
                    connection.release();
                    if (errorGetHandsUp) res.status(400).json(errorGetHandsUp);
                    else {
                        // console.log(resultsGetContents, resultsGetHandsUp);
                        const obj = {};
                        let contentsData = null;
                        try {
                            contentsData = JSON.parse(
                                resultsGetContents[0].contents_data
                                    .replace(/\\n/g, '\\n')
                                    .replace(/\\'/g, "\\'")
                                    .replace(/\\"/g, '\\"')
                                    .replace(/\\&/g, '\\&')
                                    .replace(/\\r/g, '\\r')
                                    .replace(/\\t/g, '\\t')
                                    .replace(/\\b/g, '\\b')
                                    .replace(/\\f/g, '\\f')
                                    .replace(/[\u0000-\u0019]+/g, ''),
                            );
                        } catch (parseError) {
                            res.status(400).json(parseError);
                        }
                        for (let p of resultsGetHandsUp) {
                            if (!obj[p.question_id]) obj[p.question_id] = [];
                            let found = false;
                            let absoluteProblemIdx = 0;
                            const contentsCounts = contentsData.length;
                            for (let i = 0; i < contentsCounts; i++) {
                                const problemsCounts = contentsData[i].problemDatas.length;
                                for (let j = 0; j < problemsCounts; j++) {
                                    const currentProblemData = contentsData[i].problemDatas[j];
                                    if (currentProblemData.uuid === p.question_id) {
                                        found = true;
                                        obj[p.question_id].push({
                                            idx: p.idx,
                                            assignmentNo: p.assignment_no,
                                            studentAnswer: p.student_answer,
                                            correctAnswer: p.correctAnswer,
                                            studentId: p.student_id,
                                            questionId: p.question_id,
                                            teacherSelected: !!p.teacher_selected,
                                            passageUid: contentsData[i].uuid,
                                            passageIdx: i,
                                            problemIdx: j,
                                            problemAbsIdx: absoluteProblemIdx,
                                        });
                                        break;
                                    }
                                    absoluteProblemIdx++;
                                }
                                if (found) break;
                            }
                        }
                        res.json(obj);
                    }
                });
            }
        });
    });
});

/** 손든 문제들 전체 보기 */
router.get('/:assignmentNo', useAuthCheck, (req, res, next) => {
    const assignmentNo = req.params.assignmentNo;
    // console.log(assignmentNo);
    let getContentsSql = `SELECT contents_data FROM assignment_actived WHERE idx=${assignmentNo}`;
    let getHandsUpSql = `SELECT hands_up.*, students.name FROM hands_up 
                            JOIN students ON hands_up.student_id=students.auth_id 
                            WHERE assignment_no=${assignmentNo}`;
    dbctrl((connection) => {
        connection.query(getContentsSql, (errorGetContents, resultsGetContents, fieldsGetContents) => {
            if (errorGetContents) {
                connection.release();
                res.status(400).json(errorGetContents);
            } else {
                connection.query(getHandsUpSql, (errorGetHandsUp, resultsGetHandsUp, fieldsGetHandsUp) => {
                    connection.release();
                    if (errorGetHandsUp) res.status(400).json(errorGetHandsUp);
                    else {
                        // console.log(resultsGetContents, resultsGetHandsUp);
                        const obj = {};
                        let contentsData = null;
                        try {
                            contentsData = JSON.parse(
                                resultsGetContents[0].contents_data
                                    .replace(/\\n/g, '\\n')
                                    .replace(/\\'/g, "\\'")
                                    .replace(/\\"/g, '\\"')
                                    .replace(/\\&/g, '\\&')
                                    .replace(/\\r/g, '\\r')
                                    .replace(/\\t/g, '\\t')
                                    .replace(/\\b/g, '\\b')
                                    .replace(/\\f/g, '\\f')
                                    .replace(/[\u0000-\u0019]+/g, ''),
                            );
                        } catch (parseError) {
                            res.status(400).json(parseError);
                        }
                        for (let p of resultsGetHandsUp) {
                            if (!obj[p.question_id]) obj[p.question_id] = [];
                            let found = false;
                            let absoluteProblemIdx = 0;
                            const contentsCounts = contentsData.length;
                            for (let i = 0; i < contentsCounts; i++) {
                                const problemsCounts = contentsData[i].problemDatas.length;
                                for (let j = 0; j < problemsCounts; j++) {
                                    const currentProblemData = contentsData[i].problemDatas[j];
                                    if (currentProblemData.uuid === p.question_id) {
                                        found = true;
                                        obj[p.question_id].push({
                                            idx: p.idx,
                                            assignmentNo: p.assignment_no,
                                            studentAnswer: p.student_answer,
                                            correctAnswer: p.correct_answer,
                                            studentId: p.student_id,
                                            studentName: p.name,
                                            questionId: p.question_id,
                                            teacherSelected: !!p.teacher_selected,
                                            passageUid: contentsData[i].uuid,
                                            passageIdx: i,
                                            problemIdx: j,
                                            problemAbsIdx: absoluteProblemIdx,
                                        });
                                        break;
                                    }
                                    absoluteProblemIdx++;
                                }
                                if (found) break;
                            }
                        }
                        res.json(Object.keys(obj).map((k) => obj[k]));
                    }
                });
            }
        });
    });
});

module.exports = router;
