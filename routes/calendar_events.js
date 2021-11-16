var express = require('express');
const useAuthCheck = require('./middlewares/authCheck');
var router = express.Router();

// 시작 또는 종료 날짜가 현재 날짜 앞 뒤 1달의 기간에 포함된 이벤트를 가져옴
router.get('/my/:class_num', useAuthCheck, (req, res, next) => {
    const { authId, userType } = req.verified;
    const { class_num } = req.params;
    const { currentDate } = req.query;
    const sql = `SELECT * FROM ${userType === 'students' ? 'student_calendar_events' : 'teacher_shared_events'} 
                WHERE (LAST_DAY(starts - INTERVAL 2 MONTH) + INTERVAL 1 DAY <= '${currentDate}' AND '${currentDate}' < LAST_DAY(ends + INTERVAL 1 MONTH))
                AND ${userType === 'students' ? 'student_id' : 'teacher_id'}='${authId}' AND class_number=${class_num}`;

    dbctrl((connection) => {
        connection.query(sql, (error, results, fields) => {
            connection.release();
            if (error) res.status(400).json(error);
            else res.json(results);
        });
    });
});

// 클래스 공유된 이벤트 가져오기
router.get('/class-shared/:class_num', useAuthCheck, (req, res, next) => {
    const { authId, userType } = req.verified;
    const { class_num } = req.params;
    const { currentDate } = req.query;
    const sql = `SELECT * FROM teacher_shared_events
                WHERE (LAST_DAY(starts - INTERVAL 2 MONTH) + INTERVAL 1 DAY <= '${currentDate}' AND '${currentDate}' < LAST_DAY(ends + INTERVAL 1 MONTH))
                AND class_number=${class_num} AND shared=1`;

    dbctrl((connection) => {
        connection.query(sql, (error, results, fields) => {
            connection.release();
            if (error) res.status(400).json(error);
            else res.json(results);
        });
    });
});

// 현재 날짜 리스트 가져오기
router.get('/my/:class_num/current', (req, res, next) => {
    const { authId, userType } = req.verified;
    const { class_num } = req.params;
    const sql = `SELECT * FROM student_calendar_events
                WHERE (all_day=0 AND start <= CURRENT_TIMESTAMP AND CURRENT_TIMESTAMP < ends) OR 
                (all_day=1 AND (LAST_DAY(starts - INTERVAL 1 MONTH) + INTERVAL 1 DAY <= CURRENT_TIMESTAMP AND CURRENT_TIMESTAMP < LAST_DAY(ends)))
                AND student_id='${authId}' AND class_number=${class_num}`;

    dbctrl((connection) => {
        connection.query(sql, (error, results, fields) => {
            connection.release();
            if (error) res.status(400).json(errpr);
            else res.json(results);
        });
    });
});

// 학생 이벤트 추가
router.post('/students/my', useAuthCheck, (req, res, next) => {
    const studentId = req.verified.authId;
    const {
        calId,
        title,
        description,
        starts,
        ends,
        types,
        allDay,
        daysOfWeek,
        editable,
        startEditable,
        durationEditable,
        resourceEditable,
        colorSets,
        completed,
        classNumber,
    } = req.body;
    const sql = `INSERT INTO student_calendar_events (cal_id, title, description, starts, ends, types, all_day, days_of_week, editable, 
                start_editable, duration_editable, resource_editable, color_sets, completed, student_id, class_number)
                VALUES ('${calId}', '${title}', '${description}', '${starts}', '${ends}', ${types || 0}, ${allDay || 0}, ${
        daysOfWeek ? `'${daysOfWeek}'` : null
    }, ${editable || 0}, 
                ${startEditable || 1}, ${durationEditable || 1}, ${resourceEditable || 0}, '${colorSets}', ${
        completed || 0
    }, '${studentId}', ${classNumber})`;

    dbctrl((connection) => {
        connection.query(sql, (error, results, fields) => {
            connection.release();
            if (error) res.status(400).json(error);
            else res.status(201).json(results);
        });
    });
});

// 선생님 이벤트 추가
router.post('/teachers/my', useAuthCheck, (req, res, next) => {
    const teacherId = req.verified.authId;
    const {
        calId,
        title,
        description,
        starts,
        ends,
        types,
        allDay,
        daysOfWeek,
        editable,
        startEditable,
        durationEditable,
        resourceEditable,
        colorSets,
        completed,
        classNumber,
        shared,
    } = req.body;
    const sql = `INSERT INTO student_calendar_events (cal_id, title, description, starts, ends, types, all_day, days_of_week, editable, 
                start_editable, duration_editable, resource_editable, color_sets, completed, teacher_id, class_number, shared)
                VALUES ('${calId}', '${title}', '${description}', '${starts}', '${ends}', ${types || 0}, ${allDay || 0}, ${
        daysOfWeek ? `'${daysOfWeek}'` : null
    }, ${editable || 0}, 
                ${startEditable || 1}, ${durationEditable || 1}, ${resourceEditable || 0}, '${colorSets}', ${
        completed || 0
    }, '${teacherId}', ${classNumber}, ${shared || 0})`;

    dbctrl((connection) => {
        connection.query(sql, (error, results, fields) => {
            connection.release();
            if (error) res.status(400).json(error);
            else res.status(201).json(results);
        });
    });
});

// 학생 이벤트 수정
router.patch('/students/my/:cal_id', useAuthCheck, (req, res, next) => {
    const studentId = req.verified.authId;
    const { cal_id } = req.params;
    const {
        title,
        description,
        starts,
        ends,
        types,
        allDay,
        daysOfWeek,
        editable,
        startEditable,
        durationEditable,
        resourceEditable,
        colorSets,
        completed,
        classNumber,
    } = req.body;
    const sql = `UPDATE student_calendar_events SET title='${title}', description='${description}', starts='${starts}', ends='${ends}', types=${types}, all_day='${allDay}', days_of_week='${daysOfWeek}', editable=${editable}, 
                start_editable=${startEditable}, duration_editable=${durationEditable}, resource_editable=${resourceEditable}, color_sets='${colorSets}', completed='${completed}'
                WHERE student_id='${studentId}' AND class_number=${classNumber} AND cal_id='${cal_id}'`;

    dbctrl((connection) => {
        connection.query(sql, (error, results, fields) => {
            connection.release();
            if (error) res.status(400).json(error);
            else res.json(results);
        });
    });
});

// 선생님 이벤트 수정
router.patch('/teachers/my/:cal_id', useAuthCheck, (req, res, next) => {
    const teacherId = req.verified.authId;
    const { cal_id } = req.params;
    const {
        title,
        description,
        starts,
        ends,
        types,
        allDay,
        daysOfWeek,
        editable,
        startEditable,
        durationEditable,
        resourceEditable,
        colorSets,
        completed,
        classNumber,
        shared,
    } = req.body;
    const sql = `UPDATE teacher_calendar_events SET title='${title}', description='${description}', starts='${starts}', ends='${ends}', types=${types}, all_day='${allDay}', days_of_week='${daysOfWeek}', editable=${editable}, 
    start_editable=${startEditable}, duration_editable=${durationEditable}, resource_editable=${resourceEditable}, color_sets='${colorSets}', completed='${completed}', shared=${shared}
    WHERE teacher_id='${teacherId}' AND class_number=${classNumber} AND cal_id=${cal_id}`;

    dbctrl((connection) => {
        connection.query(sql, (error, results, fields) => {
            connection.release();
            if (error) res.status(400).json(error);
            else res.json(results);
        });
    });
});

// idx로 이벤트 삭제
router.delete('/:cal_id', useAuthCheck, (req, res, next) => {
    const { cal_id } = req.params;
    const sql = `DELETE FROM student_calendar_events WHERE cal_id=${cal_id}`;

    dbctrl((connection) => {
        connection.query(sql, (error, results, fields) => {
            connection.release();
            if (error) res.status(400).json(error);
            else res.status(204).json(results);
        });
    });
});

module.exports = router;
