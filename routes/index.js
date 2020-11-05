/** RESTful API 디자인 가이드
 *
 *  get - select절 (사용자 검색)
 *  post - insert into절 (회원 가입)
 *  patch - (회원정보 수정)
 *  delete - (회원 탈퇴)
 *
 */

const express = require('express');
const router = express.Router();
const mysql = require('mysql');
const crypts = require('../modules/encryption');
const dbconfig = require('../configs/dbconfig');
const { verifyToken } = require('../modules/encryption');
const socketIO = require('socket.io');
router.io = socketIO();
const rtcUsers = {};

router.io.on('connection', (socket) => {
    if (!rtcUsers[socket.id]) {
        rtcUsers[socket.id] = socket.id;
    }

    socket.emit('yourId', socket.id);

    socket.on('changeId', (changedId) => {
        rtcUsers[socket.id] = changedId;
        console.log(changedId, rtcUsers);
        router.io.sockets.emit('allUsers', rtcUsers);
    });

    router.io.sockets.emit('allUsers', rtcUsers);

    socket.on('callUser', (data) => {
        router.io.to(data.userToCall).emit('hey', {
            signal: data.signalData,
            from: data.from,
        });
    });

    socket.on('acceptCall', (data) => {
        router.io.to(data.to).emit('callAccepted', data.signal);
    });

    socket.on('disconnect', () => {
        delete rtcUsers[socket.id];
    });
});

const dbPool = mysql.createPool(dbconfig);
global.dbctrl = (callback) => {
    dbPool.getConnection((err, conn) => {
        if (!err) {
            callback(conn);
        } else {
            console.log(new Error(err));
        }
    });
};

/* GET home page. */
router.get('/', function (req, res, next) {
    res.render('index', { title: 'Eduity API' });
    // res.send('hello');
    // json형태 데이터 보낼꺼면 res.json({})
});

router.get('/web-logs', (req, res, next) => {
    database((connection) => {
        connection.query('SELECT * FROM web_logs', (error, results, fields) => {
            connection.release();

            if (error) {
                res.json(error);
            } else {
                res.json(results);
            }
        });
    });
});

router.post('/web-logs', (req, res, next) => {
    const verified = verifyToken(req.signedCookies);
    const { code, message, data, createdAt } = req.body;
    const userEmail = verified.error ? 'unknown' : verified.email;

    database((connection) => {
        connection.query(
            `INSERT INTO web_logs VALUES('${code}', '${message}', '${data}', '${userEmail}', '${createdAt}')`,
            (error, results, fields) => {
                connection.release();
                if (error) {
                    res.json(error);
                } else {
                    res.json(results);
                }
            },
        );
    });
});

module.exports = router;
