/** Gooroomee meeting room apis
 * https://sites.google.com/gooroomee.com/gooroomee-api-docs/home/video-communication?authuser=0
 */
const express = require('express');
const useAuthCheck = require('./middlewares/authCheck');
const router = express.Router();
const { default: Axios } = require('axios');
const apiServer = 'https://bizapi.gooroomee.com/api/v1';
const GOOROOMEE_HEADERS = require('../configs/modes').GOOROOMEE_HEADERS;
const dateformat = require('../modules/dateformat');
Date.prototype.format = dateformat;

const standardStatusCode = (resultCode, override) => {
    switch (resultCode) {
        case 'GRM_400':
            return 400;
        case 'GRM_401':
            return 401;
        case 'GRM_500':
            return 500;
        case 'GRM_600':
            return 404;
        case 'GRM_700':
            return 404;
        case 'GRM_701':
            return 409;
        default:
            return override;
    }
};

const toTimestamp = (isoDateStr) => {
    let original = isoDateStr;
    const decimalEnds = original.indexOf('Z');
    const decimalStarts = decimalEnds - 4;
    return original.replace('T', ' ').substring(0, decimalStarts);
};

// 미팅룸 개설
router.post('/', useAuthCheck, (req, res, next) => {
    const roomTitle = req.body.roomTitle.replace(/\\/gi, '\\\\').replace(/\'/gi, "\\'") || 'Untitled';
    const roomType = req.body.roomType || 'edu';
    const roomUrlId = req.body.roomUrlId;
    const liveMode = req.body.liveMode || false;
    const maxJoinCount = req.body.maxJoinCount;
    const liveMaxJoinCount = req.body.liveMaxJoinCount;
    const passwd = req.body.passwd;
    const startDate = req.body.startDate || new Date().toUTCString();
    const endDate = req.body.endDate;
    const durationMinutes = req.body.durationMinutes;

    const description = req.body.description.replace(/\\/gi, '\\\\').replace(/\'/gi, "\\'") || '';
    const classNumber = req.body.classNumber || 0;
    const eyetrack = req.body.eyetrack || false;

    const timezoneOffset = new Date().getTimezoneOffset() * 60000;

    Axios.post(
        `${apiServer}/room`,
        {},
        {
            headers: GOOROOMEE_HEADERS,
            params: {
                roomTitle: roomTitle,
                roomType: roomType,
                roomUrlId: roomUrlId,
                liveMode: liveMode,
                maxJoinCount: maxJoinCount,
                liveMaxJoinCount: liveMaxJoinCount,
                passwd: passwd,
                startDate: startDate,
                endDate: endDate,
                durationMinutes: durationMinutes,
            },
        },
    )
        .then((r) => {
            const resultCode = r.data.resultCode;
            if (resultCode !== 'GRM_200') {
                res.status(standardStatusCode(resultCode, 201)).json(r.data);
                return;
            }
            // 데이터베이스에 생성한 미팅룸 정보 저장
            let sql = `INSERT INTO video_lectures (room_id, title, description, creator_id, academy_code, class_number, live_mode, max_joins, eyetrack, start_at, end_at) VALUES ('${
                r.data.data.room.roomId
            }', '${roomTitle}', '${description}', '${req.verified.authId}', '${req.verified.academyCode}', ${classNumber}, ${liveMode}, ${
                liveMode ? liveMaxJoinCount : maxJoinCount
            }, ${eyetrack}, '${toTimestamp(new Date(new Date(startDate).getTime() - timezoneOffset).toISOString())}', '${toTimestamp(
                new Date(new Date(r.data.data.room.endDate).getTime() - timezoneOffset).toISOString(),
            )}')`;
            dbctrl((connection) => {
                connection.query(sql, (error, results, fields) => {
                    connection.release();
                    if (error) res.status(400).json(error);
                    else res.status(201).json({ ...results, ...r.data.data });
                });
            });
        })
        .catch((e) => {
            console.error(e);
            res.status(e.response.status).json(e);
        });
});

// 미팅룸 목록 가져오기
router.get('/', useAuthCheck, (req, res, next) => {
    const creatorId = req.query.creatorId === null || req.query.creatorId === undefined ? '1' : `creator_id='${req.query.creatorId}'`;
    const classNumber =
        req.query.classNumber === null || req.query.classNumber === undefined ? '1' : `class_number=${req.query.classNumber}`;
    const academyCode = req.verified.academyCode;
    let sql = `SELECT * FROM video_lectures WHERE academy_code='${academyCode}' AND ${creatorId} AND ${classNumber}`;
    dbctrl((connection) => {
        connection.query(sql, (error, results, fields) => {
            connection.release();
            if (error) res.status(400).json(error);
            else res.json(results);
        });
    });
});

// 현재 진행중인 강의
router.get('/livelecture', useAuthCheck, (req, res, next) => {
    const classNumber =
        req.query.classNumber === null || req.query.classNumber === undefined ? '1' : `class_number=${req.query.classNumber}`;
    const academyCode = req.verified.academyCode;
    let sql = `SELECT * FROM video_lectures WHERE academy_code = '${academyCode}'  AND ${classNumber} AND NOW() > DATE(start_at) AND NOW() <DATE(end_at) AND force_closed = 0`;
    dbctrl((connection) => {
        connection.query(sql, (error, results, fields) => {
            connection.release();
            if (error) res.status(400).json(error);
            else res.json(results);
        });
    });
});

// 미팅룸 가장 최신 항목 가져오기
router.get('/last', useAuthCheck, (req, res, next) => {
    const creatorId = req.query.creatorId === null || req.query.creatorId === undefined ? '1' : `creator_id='${req.query.creatorId}'`;
    const classNumber =
        req.query.classNumber === null || req.query.classNumber === undefined ? '0' : `class_number=${req.query.classNumber}`;
    const academyCode = req.verified.academyCode;
    let sql = `SELECT * FROM video_lectures WHERE academy_code='${academyCode}' AND ${creatorId} AND ${classNumber} ORDER BY created DESC LIMIT 1 OFFSET 0`;
    console.log(sql);
    dbctrl((connection) => {
        connection.query(sql, (error, results, fields) => {
            connection.release();
            if (error) res.status(400).json(error);
            else res.json(results[0]);
        });
    });
});

// 참여자를 위한 otp 생성
router.post('/otp', useAuthCheck, (req, res, next) => {
    Axios.post(
        `${apiServer}/room/user/otp`,
        {},
        {
            headers: GOOROOMEE_HEADERS,
            params: {
                roomId: req.body.roomId,
                username: req.body.username,
                roleId: req.body.roleId,
                ignorePasswd: req.body.ignorePasswd,
                apiUserId: req.body.apiUserId,
            },
        },
    )
        .then((r) => {
            // console.log(r);
            const resultCode = r.data.resultCode;
            res.status(standardStatusCode(resultCode, 201)).json(r.data);
        })
        .catch((e) => {
            res.status(e.response.status).json(e);
        });
});

// 참여자 강제 퇴장
router.post('/kick', useAuthCheck, (req, res, next) => {
    Axios.post(`${apiServer}/room/user/kick`, {}, { headers: GOOROOMEE_HEADERS, params: { ...req.body } })
        .then((r) => {
            const resultCode = r.data.resultCode;
            res.status(standardStatusCode(resultCode, 204)).json(r.data);
        })
        .catch((e) => {
            res.status(e.response.status).json(e);
        });
});

// 미팅룸 개설 및 종료 이력
router.get('/log', useAuthCheck, (req, res, next) => {
    const date = req.params.date || new Date().format('yyyymmdd');
    Axios.get(`${apiServer}/log/room`, { params: { date: date }, headers: GOOROOMEE_HEADERS })
        .then((r) => {
            const resultCode = r.data.resultCode;
            res.status(standardStatusCode(resultCode, 200)).json(r.data);
        })
        .catch((e) => {
            res.status(e.response.status).json(e);
        });
});

// 미팅룸 참여자 입/퇴장 이력
router.get('/log/users', useAuthCheck, (req, res, next) => {
    const type = req.query.type || 'roomId';
    const roomIds = req.query.roomId || '';
    const date = req.query.date || new Date().format('yyyyMMdd');
    console.log(roomIds);
    Axios.get(`${apiServer}/log/room/roomUser`, {
        params: {
            type: type,
            roomId: roomIds,
            date: date,
        },
        headers: GOOROOMEE_HEADERS,
    })
        .then((r) => {
            const resultCode = r.data.resultCode;
            res.status(standardStatusCode(resultCode, 200)).json(r.data);
        })
        .catch((e) => {
            res.status(e.response.status).json(e);
        });
});

// 그룹별 실시간 접속자 수
router.get('/live-counts', useAuthCheck, (req, res, next) => {
    Axios.get(`${apiServer}/room/currentRoomUserCnt`, { headers: GOOROOMEE_HEADERS })
        .then((r) => {
            const resultCode = r.data.resultCode;
            res.status(standardStatusCode(resultCode, 200)).json(r.data);
        })
        .catch((e) => {
            res.status(e.response.status).json(e);
        });
});

// 방 별 실시간 접속자 수
router.get('/live-counts/:room_id', useAuthCheck, (req, res, next) => {
    const type = 'roomId';
    const roomIds = req.params.room_id || '';
    const date = new Date().format('yyyyMMdd');
    Axios.get(`${apiServer}/log/room/roomUser`, {
        params: {
            type: type,
            roomId: roomIds,
            date: date,
        },
        headers: GOOROOMEE_HEADERS,
    })
        .then((r) => {
            const _o = {};
            const resultCode = r.data.resultCode;
            if (resultCode !== 'GRM_200') {
                res.status(standardStatusCode(resultCode, 200)).json(r.data);
                return;
            }
            const logs = r.data.data.logList[0].logs;
            logs.forEach(({ apiUserId, logType }, i) => {
                switch (logType) {
                    case 'join':
                        _o[apiUserId] = 1;
                        return;
                    case 'leave':
                        _o[apiUserId] = 0;
                        return;
                    default:
                        _o[apiUserId] = 0;
                        return;
                }
            });
            let counts = 0;
            Object.keys(_o).forEach((key) => {
                counts += _o[key];
            });
            res.json(counts);
        })
        .catch((e) => {
            res.status(e.response.status).json(e);
        });
});

// 미팅룸들(여러개) 종료
router.delete('/', useAuthCheck, (req, res, next) => {
    const roomIds = req.query.roomIds;
    // 데이터베이스에서 강제 폐쇄
    let sql = `DELETE FROM video_lectures WHERE room_id in (${roomIds.map((d) => `'${d}'`)})`;
    dbctrl((connection) => {
        connection.query(sql, (error, results, fields) => {
            connection.release();
            if (error) res.status(400).json(error);
            else res.status(204).json(results);
        });
    });
    roomIds.forEach((roomId) =>
        Axios.delete(`${apiServer}/room/${roomId}`, { headers: GOOROOMEE_HEADERS })
            .then((r) => {
                const resultCode = r.data.resultCode;
                if (resultCode !== 'GRM_200') {
                    res.status(standardStatusCode(resultCode, 204)).json(r.data);
                    return;
                }
            })
            .catch((e) => {
                res.status(e.response.status).json(e);
            }),
    );
});

// 미팅룸 종료
router.delete('/:room_id', useAuthCheck, (req, res, next) => {
    const roomId = req.params['room_id'];
    // 데이터베이스에서 강제 폐쇄
    let sql = `UPDATE video_lectures SET force_closed=1 WHERE room_id='${roomId}'`;
    dbctrl((connection) => {
        connection.query(sql, (error, results, fields) => {
            connection.release();
            if (error) res.status(400).json(error);
            else res.status(204).json(results);
        });
    });
    Axios.delete(`${apiServer}/room/${roomId}`, { headers: GOOROOMEE_HEADERS })
        .then((r) => {
            const resultCode = r.data.resultCode;
            if (resultCode !== 'GRM_200') {
                res.status(standardStatusCode(resultCode, 204)).json(r.data);
                return;
            }
        })
        .catch((e) => {
            res.status(e.response.status).json(e);
        });
});

router.post('/test', useAuthCheck, (req, res, next) => {
    res.status(200).json('success!');
});

module.exports = router;
