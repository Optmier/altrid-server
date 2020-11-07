const { RUN_MODE } = require('./configs/modes');
process.env.RUN_MODE = RUN_MODE;

var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
const indexRouter = require('./routes/index');
/** ALTR!D */
const userStudents = require('./routes/students');
const userTeachers = require('./routes/teachers');
const userAdmins = require('./routes/admins');
const academies = require('./routes/academies');
const auth = require('./routes/auth');
const studentsInTeacher = require('./routes/students_in_teacher');
const studentsInClass = require('./routes/students_in_class');
const classes = require('./routes/classes');
const assignment_draft = require('./routes/assignment_draft');

const secret = require('./configs/encryptionKey').certsPassword;

var app = express();
var cors = require('cors');

const whitelists = require('./configs/whitelists');

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(logger('dev'));
app.use(express.json({ limit: '128mb' }));
app.use(express.urlencoded({ extended: false, limit: '128mb' }));
app.use(cookieParser(secret));
app.use(express.static(path.join(__dirname, 'public')));

app.use(
    cors({
        origin: whitelists,
        credentials: true,
    }),
);

app.use('/altrid', indexRouter);
/** ALTR!D */
// 학생 테이블 관리
app.use('/altrid/students', userStudents);
// 강사 테이블 관리
app.use('/altrid/teachers', userTeachers);
// 관리자 테이블 관리
app.use('/altrid/admins', userAdmins);
// 계약 학원 테이블 관리
app.use('/altrid/academies', academies);
// 로그인 및 인증 관련
app.use('/altrid/auth', auth);
// 선생님별 학생들 관련
app.use('/altrid/students-in-teacher', studentsInTeacher);
// 클래스별 학생들 관련
app.use('/altrid/students-in-class', studentsInClass);
// 클래스 관련
app.use('/altrid/classes', classes);
app.io = indexRouter.io;
// assignment draft 과제 관련
app.use('/altrid/assignment-draft', assignment_draft);

// catch 404 and forward to error handler
app.use(function (req, res, next) {
    next(createError(404));
});

// error handler
app.use(function (err, req, res, next) {
    // set locals, only providing error in development
    res.locals.message = err.message;
    res.locals.error = req.app.get('env') === 'development' ? err : {};

    // render the error page
    res.status(err.status || 500);
    res.render('error');
});

module.exports = app;
