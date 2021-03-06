var express = require('express');
const useAuthCheck = require('./middlewares/authCheck');
var router = express.Router();

/** 클래스 번호로 클래스 이름 조회 */
router.get('/infos/:class_number', useAuthCheck, (req, res, next) => {
    const academyCode = req.verified.academyCode;
    const classNum = req.params.class_number;
    console.log(classNum, academyCode);
    const sql = `SELECT * FROM classes WHERE idx=${classNum} AND academy_code='${academyCode}'`;
    dbctrl((connection) => {
        connection.query(sql, (error, results, fields) => {
            connection.release();
            if (error) res.status(400).json(error);
            else res.json(results[0]);
        });
    });
});

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
                classes.class_day,
                teachers.name AS teacher_name,
                max(assignment_actived.due_date) as max_due_date,
                COUNT(assignment_actived.class_number) AS class_count,
                (SELECT COUNT(*) FROM students_in_class WHERE classes.idx=students_in_class.class_number AND classes.academy_code=students_in_class.academy_code)
                AS num_of_students,
                classes.created,
                classes.updated
            FROM students_in_class
            INNER JOIN classes
            ON students_in_class.class_number=classes.idx
            INNER JOIN teachers
            ON classes.teacher_id=teachers.auth_id
            LEFT JOIN assignment_actived AS assignment_actived
            ON classes.idx = assignment_actived.class_number
            WHERE student_id='${id}' AND students_in_class.academy_code='${academyCode}'
            GROUP BY classes.idx
            ORDER BY classes.created desc`;
        else if (userType === 'teachers')
            sql = `SELECT
                        classes.idx,
                        classes.name,
                        classes.description,
                        classes.class_day,
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
                        classes.created DESC `;
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
    const days = req.body.days;
    const class_code = req.body.class_code;
    const teacherId = req.verified.authId;
    const academyCode = req.verified.academyCode;
    let sql = `INSERT INTO 
                classes (name, description, class_day, class_code, teacher_id, academy_code) 
                VALUES ('${name}', '${description}', '${days}', '${class_code}', '${teacherId}', '${academyCode}')`;

    console.log(sql);
    dbctrl((connection) => {
        connection.query(sql, (error, results, fields) => {
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
    const academyCode = req.verified.academyCode;
    const authId = req.verified.authId;
    const userType = req.verified.userType;

    let sql = `SELECT
                classes.idx,
                classes.name as class_name,
                classes.description,
                classes.teacher_id,
                classes.class_day,
                classes.class_code,
                teachers.name as teacher_name
            FROM classes AS classes
            JOIN teachers AS teachers
            ON classes.teacher_id = teachers.auth_id
            ${
                userType === 'students'
                    ? `INNER JOIN students_in_class AS in_class
            ON in_class.class_number=classes.idx AND in_class.student_id='${authId}'`
                    : ''
            }
            WHERE classes.idx=${req.params.class_number}`;

    dbctrl((connection) => {
        connection.query(sql, (error, results, fields) => {
            connection.release();
            if (error) res.status(400).json(error);
            else res.json(results);
        });
    });
});

/**클래스 코드로  클래스 존재 여부 */
router.get('/class-code/:class_code', useAuthCheck, (req, res, next) => {
    if (req.verified.userType !== 'teachers' && req.verified.userType !== 'students')
        return res.status(403).json({ code: 'not-allowed-user-type', message: 'unauthorized-access :: not allowed user type.' });

    let sql = `SELECT COUNT(*) AS is_exists, idx, academy_code FROM classes WHERE class_code='${req.params.class_code}'`;

    dbctrl((connection) => {
        connection.query(sql, (error, results, fields) => {
            connection.release();
            if (error) res.status(400).json(error);
            else res.json(results);
        });
    });
});

/** class 정보 수정 */
router.patch('/:class', useAuthCheck, (req, res, next) => {
    if (req.verified.userType !== 'teachers')
        return res.status(403).json({ code: 'not-allowed-user-type', message: 'unauthorized-access :: not allowed user type.' });

    const academy_code = req.verified.academyCode;
    const teacher_id = req.verified.authId;
    const { name, description, class_day } = req.body;
    const idx = req.params.class;

    let sql = `UPDATE
                    classes
                SET
                    name = "${name}",
                    description = "${description}",
                    teacher_id = "${teacher_id}",
                    class_day = "${class_day}",
                    academy_code = "${academy_code}"
                WHERE
                    idx = ${idx}`;

    dbctrl((connection) => {
        connection.query(sql, (error, results, fields) => {
            connection.release();
            if (error) {
                res.status(400).json(error);
            } else res.json(results);
        });
    });
});

/** class 삭제 */
/** 특정 클래스 학생 목록 제거 */
router.delete('/:class', useAuthCheck, (req, res, next) => {
    if (req.verified.userType !== 'teachers' && req.verified.userType !== 'admins')
        return res.status(403).json({ code: 'not-allowed-user-type', message: 'unauthorized-access :: not allowed user type.' });

    let sql = `DELETE FROM classes WHERE idx=${req.params.class}`;

    dbctrl((connection) => {
        connection.query(sql, (error, results, fields) => {
            connection.release();
            if (error) res.status(400).json(error);
            else res.status(204).json(results);
        });
    });
});

module.exports = router;
