var express = require('express');
const useAuthCheck = require('./middlewares/authCheck');
var router = express.Router();

/** 학원 코드로 클래스 목록 조회 */
router.get('/:code', useAuthCheck, (req, res, next) => {
    const academyCode = req.params.code === 'current' ? req.verified.academyCode : req.params.code;
    let sql = `SELECT
            classes.idx,
            classes.name,
            classes.description,
            teachers.name AS teacher_name,
            (SELECT COUNT(*) FROM students_in_class WHERE classes.idx=students_in_class.class_number AND classes.academy_code=students_in_class.academy_code)
            AS num_of_students,
            classes.created,
            classes.updated
        FROM classes AS classes
        JOIN teachers AS teachers
        ON classes.teacher_id=teachers.auth_id
        WHERE classes.academy_code='${academyCode}'
        ORDER BY classes.updated desc`;
    if (req.params.code === 'current') {
        const userType = req.verified.userType;
        const id = req.verified.authId;
        if (userType === 'students')
            sql = `SELECT
                classes.idx,
                classes.name,
                classes.description,
                teachers.name AS teacher_name,
                (SELECT COUNT(*) FROM students_in_class WHERE classes.idx=students_in_class.class_number AND classes.academy_code=students_in_class.academy_code)
                AS num_of_students,
                classes.created,
                classes.updated
            FROM students_in_class
            INNER JOIN classes
            ON students_in_class.class_number=classes.idx
            INNER JOIN teachers
            ON classes.teacher_id=teachers.auth_id
            WHERE student_id='${id}' AND students_in_class.academy_code='${academyCode}'`;
        else if (userType === 'teachers')
            sql = `SELECT
                        classes.idx,
                        classes.name,
                        classes.description,
                        teachers.name AS teacher_name,
                        max(assignment_actived.due_date) as max_due_date,
                        COUNT(assignment_actived.class_number) AS class_count,
                        (
                        SELECT
                            COUNT(*)
                        FROM
                            students_in_class
                        WHERE
                            classes.idx = students_in_class.class_number AND classes.academy_code = students_in_class.academy_code
                    ) AS num_of_students,
                    classes.created,
                    classes.updated
                    FROM
                        classes AS classes
                    JOIN
                        teachers AS teachers
                    ON
                        classes.teacher_id = teachers.auth_id
                    LEFT JOIN
                        assignment_actived AS assignment_actived
                    ON
                        classes.idx = assignment_actived.class_number
                    WHERE
                        classes.academy_code = '${academyCode}' AND classes.teacher_id = '${id}'
                    GROUP BY
                        classes.idx
                    ORDER BY
                        classes.updated DESC `;
    }
    dbctrl((connection) => {
        connection.query(sql, (error, results, fields) => {
            connection.release();
            if (error) res.status(400).json(error);
            else res.json(results);
        });
    });
});

/** 클래스 만들기 */
router.post('/', useAuthCheck, (req, res, next) => {
    if (req.verified.userType !== 'teachers' && req.verified.userType !== 'admins')
        return res.status(403).json({ code: 'not-allowed-user-type', message: 'unauthorized-access :: not allowed user type.' });

    const name = req.body.name;
    const description = req.body.description;
    const teacherId = req.verified.authId;
    const academyCode = req.verified.academyCode;
    let sql = 'INSERT INTO classes (name, description, teacher_id, academy_code) VALUES (?, ?, ?, ?)';
    dbctrl((connection) => {
        connection.query(sql, [name, description, teacherId, academyCode], (error, results, fields) => {
            connection.release();
            if (error) res.status(400).json(error);
            else res.status(201).json(results);
        });
    });
});

/**클래스 번호로 클래스 정보 및 선생님 이름 조회 */
router.get('/class/:class_number', useAuthCheck, (req, res, next) => {
    if (req.verified.userType !== 'teachers' && req.verified.userType !== 'students')
        return res.status(403).json({ code: 'not-allowed-user-type', message: 'unauthorized-access :: not allowed user type.' });

    let sql = `SELECT
                classes.idx,
                classes.name as class_name,
                classes.description,
                classes.teacher_id,
                teachers.name as teacher_name
            FROM classes AS classes
            JOIN teachers AS teachers
            ON classes.teacher_id = teachers.auth_id
            WHERE classes.idx=${req.params.class_number}`;

    console.log(sql);
    dbctrl((connection) => {
        connection.query(sql, (error, results, fields) => {
            connection.release();
            if (error) res.status(400).json(error);
            else res.json(results);
        });
    });
});

module.exports = router;
