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

const parserHelper = (unparsed, defaultValue, onSuccess, onError) => {
    let parsed = defaultValue;
    try {
        unparsed = unparsed
            .replace(/\\n/g, '\\n')
            .replace(/\\'/g, "\\'")
            .replace(/\\"/g, '\\"')
            .replace(/\\&/g, '\\&')
            .replace(/\\r/g, '\\r')
            .replace(/\\t/g, '\\t')
            .replace(/\\b/g, '\\b')
            .replace(/\\f/g, '\\f');
        unparsed = unparsed.replace(/[\u0000-\u0019]+/g, '');
        parsed = JSON.parse(unparsed);
        onSuccess(parsed);
    } catch (parseError) {
        console.error(parseError);
        onError(parseError);
    }
};

// 캠 스터디 개설
router.post('/', useAuthCheck, (req, res, next) => {
    const { title, description, rules, publicState, invitationIds, maxJoins, password, sessionEndDate } = req.body;
    const { academyCode } = req.verified;
    const studentId = req.verified.authId;

    Axios.post(
        `${apiServer}/room`,
        {},
        {
            headers: GOOROOMEE_HEADERS,
            params: {
                roomTitle: title,
                roomType: 'edu',
                roomUrlId: null,
                liveMode: false,
                maxJoinCount: maxJoins,
                passwd: password,
                endDate: new Date(sessionEndDate).toUTCString(),
            },
        },
    )
        .then((afterRoomMade) => {
            const resultCode = afterRoomMade.data.resultCode;
            if (resultCode !== 'GRM_200') {
                res.status(standardStatusCode(resultCode, 201)).json(afterRoomMade.data);
                return;
            }
            const resData = afterRoomMade.data.data.room;
            const sql = `INSERT INTO cam_studies (room_id, title, description, rules, max_joins, public_state, academy_code, invitation_ids, session_enddate, creator)
                     VALUES ('${resData.roomId}', '${title}', '${description}', '${rules.replace(/\\/gi, '\\\\').replace(/\'/gi, "\\'")}'
                     , ${maxJoins}, ${publicState}, '${academyCode}', '${invitationIds
                .replace(/\\/gi, '\\\\')
                .replace(/\'/gi, "\\'")}', '${sessionEndDate}', '${studentId}')`;

            dbctrl((connection) => {
                connection.query(sql, (error, results, fields) => {
                    connection.release();
                    if (error) res.status(400).json(error);
                    else res.status(201).json({ ...results, ...resData });
                });
            });
        })
        .catch((e) => {
            console.error(e);
            res.status(e.response.status).json(e);
        });
});

// 캠 스터디 참여자 otp 생성
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

// 내 목록 가져오기
router.get('/mine', useAuthCheck, (req, res, next) => {
    const { academyCode } = req.verified;
    const studentId = req.verified.authId;
    const sql = `SELECT cam_studies.*, students.name FROM cam_studies
    JOIN students ON students.auth_id=cam_studies.creator
    WHERE creator='${studentId}' AND cam_studies.academy_code='${academyCode}' AND force_closed=0 AND CURDATE() <= cam_studies.session_enddate 
    ORDER BY idx DESC`;

    dbctrl((connection) => {
        connection.query(sql, (error, results, fields) => {
            connection.release();
            if (error) res.status(400).json(error);
            else
                res.json(
                    results.map((data) => {
                        const r = {
                            ...data,
                        };
                        r.rules = {};
                        r.invitation_ids = [];
                        parserHelper(
                            data.rules,
                            {},
                            (parsedRules) => {
                                r.rules = parsedRules;
                            },
                            (parsedRulesError) => {
                                res.status(400).json(parsedRulesError);
                            },
                        );
                        parserHelper(
                            data.invitation_ids,
                            [],
                            (parsedInvitationIds) => {
                                r.invitation_ids = parsedInvitationIds;
                            },
                            (parsedRulesError) => {
                                res.status(400).json(parsedRulesError);
                            },
                        );
                        return r;
                    }),
                );
        });
    });
});

// 내가 초대된 목록 가져오기
router.get('/invited', useAuthCheck, (req, res, next) => {
    const { academyCode } = req.verified;
    const studentId = req.verified.authId;
    const sql = `SELECT cam_studies.*, students.name FROM cam_studies
    JOIN students ON students.auth_id=cam_studies.creator
    WHERE public_state=2 AND cam_studies.academy_code='${academyCode}' AND force_closed=0 AND CURDATE() <= cam_studies.session_enddate
    ORDER BY idx DESC`;

    dbctrl((connection) => {
        connection.query(sql, (error, results, fields) => {
            connection.release();
            if (error) res.status(400).json(error);
            else {
                const filtered = results
                    .map((data) => {
                        const r = {
                            ...data,
                        };
                        r.rules = {};
                        r.invitation_ids = [];
                        parserHelper(
                            data.rules,
                            {},
                            (parsedRules) => {
                                r.rules = parsedRules;
                            },
                            (parsedRulesError) => {
                                res.status(400).json(parsedRulesError);
                            },
                        );
                        parserHelper(
                            data.invitation_ids,
                            [],
                            (parsedInvitationIds) => {
                                r.invitation_ids = parsedInvitationIds;
                            },
                            (parsedRulesError) => {
                                res.status(400).json(parsedRulesError);
                            },
                        );
                        return r;
                    })
                    .filter(({ invitation_ids }) => {
                        return invitation_ids.includes(studentId);
                    });
                res.json(filtered);
            }
        });
    });
});

// 나와 초대됨을 제외한 전체 가져오기
router.get('/total', useAuthCheck, (req, res, next) => {
    const { academyCode } = req.verified;
    const studentId = req.verified.authId;
    const { limit, page } = req.query;
    const sql = `SELECT cam_studies.*, students.name FROM cam_studies
    JOIN students ON students.auth_id=cam_studies.creator
    WHERE public_state!=2 AND cam_studies.academy_code='${academyCode}' AND creator!='${studentId}' AND force_closed=0 AND CURDATE() <= cam_studies.session_enddate
    ORDER BY idx DESC LIMIT ${limit ? limit : 0} OFFSET ${page ? page * limit : 0}`;

    dbctrl((connection) => {
        connection.query(sql, (error, results, fields) => {
            connection.release();
            if (error) res.status(400).json(error);
            else
                res.json(
                    results.map((data) => {
                        const r = {
                            ...data,
                        };
                        r.rules = {};
                        r.invitation_ids = [];
                        parserHelper(
                            data.rules,
                            {},
                            (parsedRules) => {
                                r.rules = parsedRules;
                            },
                            (parsedRulesError) => {
                                res.status(400).json(parsedRulesError);
                            },
                        );
                        parserHelper(
                            data.invitation_ids,
                            [],
                            (parsedInvitationIds) => {
                                r.invitation_ids = parsedInvitationIds;
                            },
                            (parsedRulesError) => {
                                res.status(400).json(parsedRulesError);
                            },
                        );
                        return r;
                    }),
                );
        });
    });
});

// 전체 방 불러오기
router.get('/all', useAuthCheck, (req, res, next) => {
    const academyCode = req.verified.academyCode;
    const sql = `SELECT * FROM cam_studies WHERE DATE(session_enddate) > NOW() AND academy_code = '${academyCode}'`;

    dbctrl((connection) => {
        connection.query(sql, (error, results, fields) => {
            connection.release();
            if (error) res.status(400).json(error);
            else res.json(results);
        });
    });
});

// 일부 항목 수정하기
router.patch('/:room_id', useAuthCheck, (req, res, next) => {
    const { academyCode } = req.verified;
    const studentId = req.verified.authId;
    const roomId = req.params.room_id;
    const { description, rules } = req.body;
    const sql = `UPDATE cam_studies SET description='${description}', rules='${rules
        .replace(/\\/gi, '\\\\')
        .replace(/\'/gi, "\\'")}' WHERE room_id='${roomId}'`;

    dbctrl((connection) => {
        connection.query(sql, (error, results, fields) => {
            connection.release();
            if (error) res.status(400).json(error);
            else res.json(results);
        });
    });
});

// 캠 스터디 세션 종료
router.delete('/:room_id', useAuthCheck, (req, res, next) => {
    const roomId = req.params.room_id;
    const sql = `UPDATE cam_studies set force_closed=1 WHERE room_id='${roomId}'`;

    dbctrl((connection) => {
        connection.query(sql, (error, results, fields) => {
            connection.release();
            if (error) res.status(400).json(error);
            else res.status(204).json(results);
        });
    });
    Axios.delete(`${apiServer}/room/${roomId}`, { headers: GOOROOMEE_HEADERS })
        .then((afterRoomClosed) => {
            const resultCode = afterRoomClosed.data.resultCode;
            if (resultCode !== 'GRM_200') {
                res.status(standardStatusCode(resultCode, 204)).json(afterRoomClosed.data);
                return;
            }
        })
        .catch((e) => {
            res.status(e.response.status).json(e);
        });
});

// 참여자 강제 퇴장
router.post('/kick', useAuthCheck, (req, res, next) => {
    Axios.post(`${apiServer}/room/user/kick`, {}, { headers: GOOROOMEE_HEADERS, params: { ...req.body } })
        .then((afterKickUser) => {
            const resultCode = afterKickUser.data.resultCode;
            res.status(standardStatusCode(resultCode, 204)).json(afterKickUser.data);
        })
        .catch((e) => {
            res.status(e.response.status).json(e);
        });
});

// 세션별 실시간 접속자 수
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

module.exports = router;
