var express = require('express');
const { variance } = require('mathjs');
const useAuthCheck = require('./middlewares/authCheck');
var router = express.Router();

const getDistance = (pos1, pos2) => {
    const distX = Math.abs(pos1.x - pos2.x);
    const distY = Math.abs(pos1.y - pos2.y);
    return Math.sqrt(distX * distX + distY * distY);
};

const getVelocity = (pos1, pos2, diffTime) => {
    const distX = Math.abs(pos1.x - pos2.x);
    const distY = Math.abs(pos1.y - pos2.y);
    const dist = Math.sqrt(distX * distX + distY * distY);
    const toSecondDivide = diffTime / 1000;

    return dist / toSecondDivide || 0;
};

const getDraftId = (activedNumber) => {
    return new Promise((resolve, reject) => {
        let sql = `SELECT draft.idx FROM assignment_draft AS draft
        INNER JOIN assignment_actived as actived
        ON draft.idx=actived.assignment_number
        INNER JOIN assignment_result as result
        ON actived.idx=result.actived_number
        WHERE result.actived_number=${activedNumber} LIMIT 1 OFFSET 0`;
        dbctrl((connection) => {
            connection.query(sql, (error, results, fields) => {
                connection.release();
                if (error) reject(error);
                else resolve(results[0].idx);
            });
        });
    });
};

const getDatasForAnalytics = (userId, userData, eyetrackData) => {
    const results = []; // 최종 결과 데이터
    const _groupedEyetrackData = []; // 문제 번호로 그룹화 된 시선추적 데이터
    const _groupedUserData = []; // 문제 번호로 그룹화 된 사용자 데이터
    // 문제별로 시선추적 데이터 그룹화
    eyetrackData.sequences.forEach((data) => {
        if (!_groupedEyetrackData[data.problemStep]) _groupedEyetrackData[data.problemStep] = [];
        _groupedEyetrackData[data.problemStep].push(data);
    });
    // 문제별로 사용자 데이터 그룹화
    userData.logs.forEach((data) => {
        if (!_groupedUserData[data.pid]) _groupedUserData[data.pid] = [];
        _groupedUserData[data.pid].push(data);
    });

    const _spentTimeAndChanges = []; // 문제별 풀이 소요시간 및 변경횟수(기본 1, 미선택시 0)
    // 문제별로 풀이 소요시간 및 변경횟수 계산
    _groupedUserData.forEach((g) => {
        const _results = {
            spentTime: 0,
            changes: 0,
        };
        let _tmpTime = 0;
        g.forEach((data) => {
            switch (data.action) {
                case 'begin':
                    _tmpTime = data.time;
                    break;
                case 'changed':
                    _results.changes += 1;
                    _results.spentTime += data.time - _tmpTime;
                    _tmpTime = data.time;
                    break;
                case 'end':
                    _results.spentTime += data.time - _tmpTime;
                    _tmpTime = 0;
                    break;
            }
        });
        _spentTimeAndChanges.push(_results);
    });

    const clusterCountsOfFixations = 3;
    const _eyetrackStates = []; // 문제별 시선흐름 데이터(num_of_fixs, avg_of_fix_durs, avg_of_fix_vels, num_of_sacs, var_of_sac_vels)
    _groupedEyetrackData.forEach((g) => {
        const _results = {
            numOfFixs: 0,
            avgOfFixDurs: 0,
            avgOfFixVels: 0,
            numOfSacs: 0,
            varOfSacVels: 0,
        };

        let clusterCounts = 0;
        let lastEyetrackTime = null;
        let currEyetrackTime = null;
        let lastSetNum = null;
        let currSetNum = null;
        let duration = 0;
        let totalDuration = 0;
        let totalFixationVelocity = 0;
        let lastX = null;
        let lastY = null;
        let numOfFixations = 0;
        let avgOfFixationDurations = 0;
        let avgOfFixationVelocities = 0;
        let numOfSaccades = 0;
        let saccadeVelocities = [];
        g.forEach((data, idx) => {
            if (lastEyetrackTime === null) lastEyetrackTime = data.eyetrackTime || data.elapsedTime;
            currEyetrackTime = data.eyetrackTime || data.elapsedTime;
            currSetNum = data.setNumber;
            let currX = data.x;
            let currY = data.y;
            if (lastX === null) lastX = currX;
            if (lastY === null) lastY = currY;

            if (!data.code) {
                // 클러스터링 영역 안에 들어오면
                if (lastSetNum === currSetNum) {
                    // 클러스터링 카운트 증가
                    clusterCounts++;
                    // 클러스터링 카운트가 최소 조건 만족하면 같은 영역으로 간주하여 duration 값 증가
                    if (clusterCounts >= clusterCountsOfFixations) {
                        duration += Math.abs(currEyetrackTime - lastEyetrackTime);
                    } else if (clusterCounts < 1) {
                    } else {
                    }
                }
                // 클러스터링 영역 밖을 벗어나면
                else {
                    const fixationVelocity = getVelocity(
                        { x: lastX, y: lastY },
                        { x: currX, y: currY },
                        Math.abs(currEyetrackTime - lastEyetrackTime),
                    );
                    // 속도가 1280px/s 이상이므로 saccade 로 간주
                    if (fixationVelocity >= 1280) {
                        saccadeVelocities.push(fixationVelocity);
                        // saccade 로 카운팅
                        numOfSaccades++;
                    } else {
                        // 이전 fixation duration 합산
                        totalDuration += duration;
                        // fixation duration 의 평균값 업데이트
                        avgOfFixationDurations = (totalDuration / numOfFixations) * 1.0;
                        // fixation 들의 속도 평균
                        totalFixationVelocity += fixationVelocity;
                        avgOfFixationVelocities = totalFixationVelocity / numOfFixations;
                        // fixation 으로 카운팅
                        numOfFixations++;
                    }
                    // 클러스터링 카운트, duration 초기화
                    clusterCounts = 0;
                    duration = 0;
                }
                lastEyetrackTime = data.eyetrackTime || data.elapsedTime;
                lastSetNum = data.setNumber;
                lastX = currX;
                lastY = currY;
            }
        });
        _results.numOfFixs = numOfFixations || 0;
        _results.avgOfFixDurs = avgOfFixationDurations || 0;
        _results.avgOfFixVels = avgOfFixationVelocities || 0;
        _results.numOfSacs = numOfSaccades || 0;
        _results.varOfSacVels = saccadeVelocities.length ? variance(saccadeVelocities) : 0;
        _eyetrackStates.push(_results);
    });

    // 최종 데이터 적재 및 반환
    userData.selections.forEach((data, idx) => {
        results.push([
            userId,
            data.pUUID,
            data.qUUID,
            data.category,
            data.correct,
            _spentTimeAndChanges[idx].spentTime,
            _spentTimeAndChanges[idx].changes,
            _eyetrackStates[idx].numOfFixs,
            _eyetrackStates[idx].avgOfFixDurs,
            _eyetrackStates[idx].avgOfFixVels,
            _eyetrackStates[idx].numOfSacs,
            _eyetrackStates[idx].varOfSacVels,
        ]);
    });
    return results;
};

router.post('/', useAuthCheck, (req, res, next) => {
    const { userData, eyetrackData } = req.body;
    const authId = req.verified.authId;
    // 데이터 추출 함수 만들고 불러와서 결과 데이터 저장
    let datas = getDatasForAnalytics(authId, userData, eyetrackData);
    let sql = `INSERT INTO datas_for_analytics (student_id, passage_id, question_id, question_category, correction, spent_time, changes, num_of_fixs, avg_of_fix_durs, avg_of_fix_vels, num_of_sacs, var_of_sac_vels) VALUES ?`;
    dbctrl((connection) => {
        connection.query(sql, [datas], (error, results, fields) => {
            connection.release();
            if (error) res.status(400).json(error);
            else res.status(201).json(results);
        });
    });
});

module.exports = router;
