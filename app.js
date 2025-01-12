global.__path = __dirname + '/';

APP_PORT = 9000;
SECURE = false;
SECURE_FILE_PATH = '';
SECURE_PASSWORD = '';
CLIENT_HOST = 'https://lms.altridedge.com';
TOSS_PAYMENTS_SECRET = '';
AUTO_PAYMENT_CONFIG = {
    CHECK_COUNTS: 5,
    UPDATE_INTERVAL: 3,
};
GOOROOMEE_AUTH_TOKEN = '';
MAIL_EMAIL = '';
MAIL_PASSWORD = '';
DB_CONFIG = {
    HOST: '',
    PORT: 3306,
    USER: '',
    PASSWORD: '',
    DATABASE: '',
    CONNECTION_LIMIT: 1,
    MULTIPLE_STATEMENTS: true,
};
ENCRYPTION_SECRET = {
    TOKEN_USER_DATA: '',
    JWT_SECRET: '',
    TEST_UID_SECRET: '',
};
ENCRYTION_SALT = {
    SECONDARY_PASSWORD: '',
    SECONDARY_SALT: '',
};

const fs = require('fs');

// config injection
let configPath = '';

if (fs.existsSync(__path + 'configs/config.json')) {
    let config_data = null;
    const data = fs.readFileSync(__path + 'configs/config.json', 'utf8');

    if (data !== '') {
        config_data = JSON.parse(data);
    }

    if (config_data) {
        configPath = __path + 'configs/config.json';
        for (const attr in config_data) {
            if ((config_data[attr] || typeof config_data[attr] === 'boolean') && config_data[attr] !== 'undefined') {
                global[attr] = config_data[attr];
            }
        }
    }
}

var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
const indexRouter = require('./routes/index');

/** ALTR!D */
const __files = require('./routes/_files');
const userStudents = require('./routes/students');
const userTeachers = require('./routes/teachers');
const userAdmins = require('./routes/admins');
const academies = require('./routes/academies');
const auth = require('./routes/auth');
const studentsInTeacher = require('./routes/students_in_teacher');
const studentsInClass = require('./routes/students_in_class');
const classes = require('./routes/classes');
const assignment_draft = require('./routes/assignment_draft');
const assignmentAdmin = require('./routes/assignment_admin');
const assignmentActived = require('./routes/assignment_actived');
const assignmentResult = require('./routes/assignment_result');
const assignmentReport = require('./routes/assignment_report');
const datasForAnalytics = require('./routes/datas_for_analytics');
const gooroomeeMeetingRoom = require('./routes/meeting_room');
const myPage = require('./routes/my_page');
const others = require('./routes/others');
const planInfo = require('./routes/plan_info');
const payments = require('./routes/payments');
const handsUp = require('./routes/hands-up');
const optimer = require('./routes/optimer');
const vocas = require('./routes/vocas');

const camStudy = require('./routes/cam_study');
const personalSettings = require('./routes/personal_settings');
const calendarEvents = require('./routes/calendar_events');

var app = express();
var cors = require('cors');

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(logger('dev'));
app.use(express.json({ limit: '128mb' }));
app.use(express.urlencoded({ extended: false, limit: '128mb' }));
app.use(cookieParser(global.SECURE_PASSWORD));
app.use(express.static(path.join(__dirname, 'public')));

app.use(
    cors({
        origin: CLIENT_HOST,
        credentials: true,
    }),
);

app.use('/', indexRouter);
/** ALTR!D */
// 파일 라우터
app.use('/files', __files);
// 학생 테이블 관리
app.use('/students', userStudents);
// 강사 테이블 관리
app.use('/teachers', userTeachers);
// 관리자 테이블 관리
app.use('/admins', userAdmins);
// 계약 학원 테이블 관리
app.use('/academies', academies);
// 로그인 및 인증 관련
app.use('/auth', auth);
// 선생님별 학생들 관련
app.use('/students-in-teacher', studentsInTeacher);
// 클래스별 학생들 관련
app.use('/students-in-class', studentsInClass);
// 클래스 관련
app.use('/classes', classes);
// 생성된 과제 관련
app.use('/assignment-admin', assignmentAdmin);
// 과제 수행 정보 관련
app.use('/assignment-result', assignmentResult);
// 과제 보고서 관련
app.use('/assignment-report', assignmentReport);
// assignment draft 과제 관련
app.use('/assignment-draft', assignment_draft);
// assignment actived 과제 관련
app.use('/assignment-actived', assignmentActived);
// 분석 데이터 테이블
app.use('/data-analytics', datasForAnalytics);
//Gooroomee apis
app.use('/meeting-room', gooroomeeMeetingRoom);
// 결제 관련
app.use('/payments', payments);
// 마이 페이지
app.use('/my-page', myPage);
// 기타
app.use('/others', others);
// 회원별 플랜 정보
app.use('/plan-info', planInfo);
// 손들기 기능
app.use('/hands-up', handsUp);
// 학습타이머
app.use('/optimer', optimer);
// 단어장
app.use('/vocas', vocas);
// 캠 스터디
app.use('/cam-study', camStudy);
// 개인 설정
app.use('/personal-settings', personalSettings);
// 캘린더 이벤트
app.use('/calendar-events', calendarEvents);
app.io = indexRouter.io;

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
