/** RESTful API 디자인 가이드
 *
 *  get - select절 (사용자 검색)
 *  post - insert into절 (회원 가입)
 *  patch - (회원정보 수정)
 *  delete - (회원 탈퇴)
 *
 */

// 중간 반영
const express = require('express');
const router = express.Router();
const mysql = require('mysql');
const crypts = require('../modules/encryption');
const dbconfig = require('../configs/dbconfig');
const { verifyToken } = require('../modules/encryption');
const socketIO = require('socket.io');
router.io = socketIO();
const io_vidLecture = router.io.of('/vid_lecture');
const io_camStudy = router.io.of('cam_study');

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

io_vidLecture.on('connection', (socket) => {
    console.log('connected!');
    socket.emit('connected', socket.id);
    socket.on('join', ({ groupId, data }) => {
        console.log('joined >> ', { groupId, data });
        try {
            socket.join(groupId);
            io_vidLecture.to(groupId).emit('joined', data);
        } catch (error) {
            socket.emit('onError', error);
        }
    });
    socket.on('detectEyetrack', ({ groupId, data }) => {
        console.log(groupId, data);
        io_vidLecture.to(groupId).emit('eyetrackFeedback', data);
    });
    socket.on('leave', ({ groupId, data }) => {
        console.log('leaved >> ', { groupId, data });
        io_vidLecture.to(groupId).emit('leaved', data);
        socket.leave(groupId);
    });
    socket.on('disconnect', () => {
        console.log('disconneted');
    });
});

io_camStudy.on('connection', (socket) => {
    console.log('connected!');
    socket.emit('connected', socket.id);
    socket.on('join', ({ groupId, data }) => {
        console.log('joined >> ', { groupId, data });
        try {
            socket.join(groupId);
            io_camStudy.to(groupId).emit('joined', data);
        } catch (error) {
            socket.emit('onError', error);
        }
    });
    socket.on('detectEyetrack', ({ groupId, data }) => {
        console.log(groupId, data);
        io_camStudy.to(groupId).emit('eyetrackFeedback', data);
    });
    socket.on('leave', ({ groupId, data }) => {
        console.log('leaved >> ', { groupId, data });
        io_camStudy.to(groupId).emit('leaved', data);
        socket.leave(groupId);
    });
    socket.on('disconnect', () => {
        console.log('disconneted');
    });
});

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
