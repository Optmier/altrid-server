const express = require('express');
const router = express.Router();
const useAuthCheck = require('./middlewares/authCheck');
const axios = require('axios').default;
const dateformat = require('../modules/dateformat');
Date.prototype.format = dateformat;
const paymentsSecretKey = require('../configs/encryptionKey')[
    process.env.RUN_MODE === 'dev' ? 'tossPaymentsTestSecretKey' : 'tossPaymentsSecretKey'
];
const tossPaymentsApiUrl = 'https://api.tosspayments.com';
/** https://github.com/jeanlescure/short-unique-id
 * Copyright (c) 2018-2020 Short Unique ID Contributors.
 * Licensed under the Apache License 2.0.
 */
const shortUniqueId = require('short-unique-id').default;

Date.prototype.eliminateTime = function () {
    this.setHours(0);
    this.setMinutes(0);
    this.setSeconds(0);
    this.setMilliseconds(0);

    return this;
};

const toTimestamp = (isoDateStr) => {
    let original = isoDateStr;
    const decimalEnds = original.indexOf('Z');
    const decimalStarts = decimalEnds - 4;
    return original.replace('T', ' ').substring(0, decimalStarts);
};

const makePlanOrderName = (month, planId, lang = 'ko') => {
    const plans = planId === 2 ? 'standard' : planId === 3 ? 'premium' : 'free';
    switch (lang) {
        case 'en':
            return `${month}월 ${plans} 플랜 이용료`;
        default:
            return `${month}월 ${plans} 플랜 이용료`;
    }
};

// 플랜 내역 조회
router.get('/order-history', useAuthCheck, (req, res, next) => {
    const academyCode = req.verified.academyCode;

    // 플랜 메뉴에서 이용기간 조회
    const planDurSql = `SELECT duration FROM plan_menus`;
    dbctrl((connection) => {
        connection.query(planDurSql, (errorPlanDur, resultsPlanDur) => {
            if (errorPlanDur) {
                connection.release();
                res.status(400).json(errorPlanDur);
            } else {
                if (resultsPlanDur && resultsPlanDur.length > 0) {
                    const currentDateTime = new Date().format('yyyy-MM-dd HH:mm:ss');
                    let nextDate = '';
                    let nextDateTime = '';
                    // 플랜 이용 기간이 30일, 한달이면
                    resultsPlanDur[0].duration = 30;
                    if (resultsPlanDur[0].duration === 30) {
                        nextDate += `DATE_ADD(plan_start, INTERVAL 1 MONTH)`;
                        nextDateTime += `DATE_ADD(DATE_ADD(plan_start, INTERVAL 1 MONTH), INTERVAL 18 HOUR)`;
                    } else {
                        nextDate += `DATE_ADD(plan_start, INTERVAL ${resultsPlanDur[0].duration} DAY)`;
                        nextDateTime += `DATE_ADD(DATE_ADD(plan_start, INTERVAL ${resultsPlanDur[0].duration} DAY), INTERVAL 18 HOUR)`;
                    }

                    const validPlanSql = `SELECT *, ${nextDate} AS billing_date, DATE_SUB(${nextDate}, INTERVAL 1 DAY) AS plan_end FROM order_history WHERE academy_code='${academyCode}' 
                    AND (TIMESTAMP(plan_start) <= TIMESTAMP('${currentDateTime}') AND TIMESTAMP('${currentDateTime}') < ${nextDateTime}) AND payment_status IS NULL`;

                    connection.query(validPlanSql, (errorValidPlan, resultsValidPlan) => {
                        connection.release();
                        if (errorValidPlan) {
                            res.status(400).json(errorValidPlan);
                        } else {
                            if (resultsValidPlan.length < 1) {
                                res.json(resultsValidPlan);
                            } else res.json(resultsValidPlan);
                        }
                    });
                } else {
                    connection.release();
                    res.status(400).json(resultsPlanDur);
                }
            }
        });
    });
});

// 현재 학원의 유효한 플랜 검사
router.get('/order-history/current-valid', useAuthCheck, (req, res, next) => {
    const academyPlanId = req.query.planId;
    const academyCode = req.verified.academyCode;

    // 플랜 메뉴에서 이용기간 조회
    const planDurSql = `SELECT duration FROM plan_menus WHERE idx=${academyPlanId}`;
    dbctrl((connection) => {
        connection.query(planDurSql, (errorPlanDur, resultsPlanDur) => {
            if (errorPlanDur) {
                connection.release();
                res.status(400).json(errorPlanDur);
            } else {
                if (resultsPlanDur && resultsPlanDur.length > 0) {
                    const currentDateTime = new Date().format('yyyy-MM-dd HH:mm:ss');
                    let nextDate = '';
                    let nextDateTime = '';
                    // 플랜 이용 기간이 30일, 한달이면
                    resultsPlanDur[0].duration = 30;
                    if (resultsPlanDur[0].duration === 30) {
                        nextDate += `DATE_ADD(plan_start, INTERVAL 1 MONTH)`;
                        nextDateTime += `DATE_ADD(DATE_ADD(plan_start, INTERVAL 1 MONTH), INTERVAL 18 HOUR)`;
                    } else {
                        nextDate += `DATE_ADD(plan_start, INTERVAL ${resultsPlanDur[0].duration} DAY)`;
                        nextDateTime += `DATE_ADD(DATE_ADD(plan_start, INTERVAL ${resultsPlanDur[0].duration} DAY), INTERVAL 18 HOUR)`;
                    }

                    const validPlanSql = `SELECT *, ${nextDate} AS billing_date, DATE_SUB(${nextDate}, INTERVAL 1 DAY) AS plan_end FROM order_history WHERE academy_code='${academyCode}' 
                    AND (TIMESTAMP(plan_start) <= TIMESTAMP('${currentDateTime}') AND TIMESTAMP('${currentDateTime}') < ${nextDateTime}) AND payment_status IS NULL`;

                    connection.query(validPlanSql, (errorValidPlan, resultsValidPlan) => {
                        connection.release();
                        if (errorValidPlan) {
                            res.status(400).json(errorValidPlan);
                        } else {
                            if (resultsValidPlan.length < 1) {
                                res.json(resultsValidPlan);
                            } else res.json(resultsValidPlan);
                        }
                    });
                } else {
                    connection.release();
                    res.status(400).json(resultsPlanDur);
                }
            }
        });
    });
});

// 신규 주문(플랜 구독) 추가
router.post('/order-history', useAuthCheck, (req, res, next) => {
    const { orderNo, planId, orderPrice, paymentPrice, startDate } = req.body;
    const academyCode = req.verified.academyCode;
    const addPlanOrderSql = `INSERT INTO order_history (no, name, plan_id, academy_code, order_price, payment_price, plan_start, billing_day, next_plan_id, payment_status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

    const planStartDate = new Date(startDate).eliminateTime();
    const currentDay = planStartDate.getDate();
    const billingDay = currentDay > 27 ? 31 : currentDay;

    dbctrl((connection) => {
        connection.query(
            addPlanOrderSql,
            [
                orderNo,
                makePlanOrderName(planStartDate.getMonth() + 1, planId),
                planId,
                academyCode,
                orderPrice,
                paymentPrice,
                planStartDate,
                billingDay,
                planId,
                null,
            ],
            (errorAddPlan, resultsAddPlan) => {
                if (errorAddPlan) {
                    connection.release();
                } else {
                    const updateAcademyPlanSql = `UPDATE academies SET plan_id=${planId} WHERE code='${academyCode}'`;
                    connection.query(updateAcademyPlanSql, (errorUpdatePlan, resultsUpdatePlan) => {
                        connection.release();
                        if (errorUpdatePlan) {
                            res.status(400).json(errorUpdatePlan);
                        } else {
                            res.json(resultsUpdatePlan);
                        }
                    });
                }
            },
        );
    });
});

// 현재 유효 플랜의 다음 플랜 변경
router.patch('/order-history/mod-next-plan', useAuthCheck, (req, res, next) => {
    const { orderIdx, nextPlanId } = req.body;
    const academyCode = req.verified.academyCode;
    const updatePlanSql = `UPDATE order_history SET next_plan_id=${nextPlanId} WHERE idx=${orderIdx} AND academy_code='${academyCode}'`;

    dbctrl((connection) => {
        connection.query(updatePlanSql, (errorUpdate, resultsUpdate) => {
            connection.release();
            if (errorUpdate) {
                res.status(400).json(errorUpdate);
            } else {
                res.json(resultsUpdate);
            }
        });
    });
});

// 쿠폰 조회
router.get('/coupon-menus', useAuthCheck, (req, res, next) => {
    const searchAll = req.query.searchAll;
    const getCouponsSql = `SELECT * FROM coupon_menus${searchAll === 'true' ? '' : ' WHERE CURDATE() < expired'}`;

    dbctrl((connection) => {
        connection.query(getCouponsSql, (errorGetCoupons, resultsGetCoupons) => {
            connection.release();
            if (errorGetCoupons) {
                res.status(400).json(errorGetCoupons);
            } else {
                res.json(resultsGetCoupons);
            }
        });
    });
});

// 쿠폰 생성
router.post('/coupon-menus', useAuthCheck, (req, res, next) => {
    const couponLists = req.body.couponLists;
    const coupons = couponLists.map((d) => [d.id, d.academyCode]);
    const giveCouponsSql = `INSERT INTO coupon_menus `;
});

router.get('/coupon-history', useAuthCheck, (req, res, next) => {
    const academyCode = req.verified.academyCode;

    const getCouponHistorySql = `SELECT coupon_history.*, coupon_menus.name, coupon_menus.discount, coupon_menus.type, coupon_menus.applied_plan, coupon_menus.expired FROM coupon_history
    JOIN coupon_menus ON coupon_history.coupon_id=coupon_menus.coupon_id
    WHERE coupon_history.academy_code='${academyCode}'`;

    dbctrl((connection) => {
        connection.query(getCouponHistorySql, (errGetCouponHistory, resultsCouponHistory) => {
            connection.release();
            if (errGetCouponHistory) {
                res.status(400).json(errGetCouponHistory);
            } else {
                res.json(resultsCouponHistory);
            }
        });
    });
});

// 쿠폰 사용자 발급 (중복 검사)
router.post('/coupon-history', useAuthCheck, (req, res, next) => {
    const academyCode = req.verified.academyCode;

    const couponIds = req.body.couponIds;
    const orderNos = req.body.orderNos;
    const status = req.body.status;
    const usedAfterStdDate = req.body.usedAfterStdDate;
    const usedAfterValues = req.body.usedAfterValues;
    const usedAfterUnits = req.body.usedAfterUnits;

    const currentDate = new Date().eliminateTime().format('yyyy-MM-dd');
    const couponDatas = couponIds.map((d, i) => ({
        couponId: d,
        academyCode: academyCode,
        orderNo: orderNos[i],
        status: status[i],
        usedAfterStdDate: new Date(usedAfterStdDate).eliminateTime().format('yyyy-MM-dd'),
        usedAfterValue: usedAfterValues[i],
        usedAfterUnit: usedAfterUnits[i],
    }));

    let giveACouponSql = '';
    dbctrl((connection) => {
        couponDatas.forEach((data) => {
            console.log(data);
            let dateCalced = '';
            if (data.usedAfterUnit === 'm') {
                dateCalced = `DATE_ADD('${data.usedAfterStdDate}', INTERVAL ${data.usedAfterValue} MONTH)`;
            } else {
                dateCalced = `DATE_ADD('${data.usedAfterStdDate}', INTERVAL ${data.usedAfterValue} DAY)`;
            }
            giveACouponSql += `INSERT INTO coupon_history (coupon_id, academy_code, order_no, status, used_at)
            SELECT ${connection.escape(data.couponId)}, ${connection.escape(data.academyCode)}, ${connection.escape(
                data.orderNo,
            )}, ${connection.escape(data.status)}, ${dateCalced} FROM DUAL WHERE NOT EXISTS (
                SELECT coupon_id, academy_code FROM coupon_history
                WHERE coupon_id=${connection.escape(data.couponId)} AND academy_code=${connection.escape(data.academyCode)}
            ); `;
        });

        connection.query(giveACouponSql, (errorGiveACoupon, resultsGiveACoupon) => {
            connection.release();
            if (errorGiveACoupon) {
                res.status(400).json(errorGiveACoupon);
            } else {
                res.json(resultsGiveACoupon);
            }
        });
    });
});

// success페이지 결제 완료 정보 조회
router.get('/payment-info', useAuthCheck, (req, res, next) => {
    if (req.verified.userType !== 'teachers')
        return res.status(403).json({ code: 'not-allowed-user-type', message: 'unauthorized-access :: not allowed user type.' });

    const academy_code = req.verified.academyCode;

    const sql = `SELECT card_company, card_number, pg_name, academies.email, academies.phone, auth_date
                FROM payments_info
                join academies on academies.code = '${academy_code}'
                WHERE academy_code = '${academy_code}'`;

    dbctrl((connection) => {
        connection.query(sql, (error, results, fields) => {
            connection.release();
            if (error) {
                res.status(400).json(error);
            } else res.json(results);
        });
    });
});

// 빌링키 발급
router.get('/billing-key', (req, res, next) => {
    const customerKey = req.query.customerKey;
    const authKey = req.query.authKey;
    console.log(customerKey, authKey);
    axios
        .post(
            `${tossPaymentsApiUrl}/v1/billing/authorizations/${authKey}`,
            { customerKey: customerKey },
            {
                auth: {
                    username: paymentsSecretKey,
                },
                headers: {
                    'Content-Type': 'application/json',
                },
            },
        )
        .then((r) => {
            console.log('성공!');
            res.status(r.status).json(r.data);
        })
        .catch((err) => {
            console.error('실패!', err);
            res.status(err.response.status).json(err);
        });
});

// 결제 정보 추가
router.post('/payment-info', useAuthCheck, (req, res, next) => {
    if (req.verified.userType !== 'teachers')
        return res.status(403).json({ code: 'not-allowed-user-type', message: 'unauthorized-access :: not allowed user type.' });

    const academyCode = req.verified.academyCode;
    const { mId, pgName, cardCompany, cardNumber, customerKey, billingKey, authenticatedAt } = req.body;

    const sql = `INSERT INTO payments_info (academy_code, merchant_id, pg_name, card_company, card_number, customer_key, billing_key, auth_date)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;

    dbctrl((connection) => {
        connection.query(
            sql,
            [academyCode, mId, pgName, cardCompany, cardNumber, customerKey, billingKey, new Date(authenticatedAt).format('yyyy-MM-dd')],
            (error, results) => {
                connection.release();
                if (error) {
                    res.status(400).json(error);
                } else {
                    res.status(201).json(results);
                }
            },
        );
    });
});

// 결제 정보 변경
router.patch('/payment-info', useAuthCheck, (req, res, next) => {});

// 결제 정보 삭제
router.delete('/payment-info', useAuthCheck, (req, res, next) => {});

// 결제 취소
router.post('/:payment_key/cancel', (req, res, next) => {
    const reason = req.body.reason;
    console.log(reason, req.params.payment_key);
    const sql = `SELECT payment_price FROM order_history WHERE payment_key='${req.params.payment_key}'`;
    dbctrl((connection) => {
        connection.query(sql, (errorSql, resultsSql) => {
            connection.release();
            if (errorSql) res.status(400).json(errorSql);
            else {
                axios
                    .post(
                        `${tossPaymentsApiUrl}/v1/payments/${req.params.payment_key}/cancel`,
                        {
                            cancelReason: reason,
                            cancelAmount: resultsSql[0].payment_price,
                        },
                        {
                            auth: {
                                username: paymentsSecretKey,
                            },
                            headers: {
                                'Content-Type': 'application/json',
                            },
                        },
                    )
                    .then((cancelRes) => {
                        console.log(cancelRes);
                    })
                    .catch((cancelError) => {
                        console.error(cancelError);
                    });
            }
        });
    });
});

// 결제 내역 조회
router.get('/payment-history', useAuthCheck, (req, res, next) => {
    const academyCode = req.verified.academyCode;
    const getHistorySql = `SELECT
            payment_history.*,
            order_history.name,
            order_history.plan_start,
            DATE_SUB(
                IF(
                    plan_menus.duration = 30,
                    IF(
                        DAY(order_history.plan_start) >= 28,
                        LAST_DAY(
                            order_history.plan_start + INTERVAL 1 MONTH
                        ),
                        DATE_ADD(
                            order_history.plan_start,
                            INTERVAL +1 MONTH
                        )
                    ),
                    DATE_ADD(
                        order_history.plan_start,
                        INTERVAL plan_menus.duration DAY
                    )
                ),
                INTERVAL 1 DAY
            ) AS plan_end,
            plan_menus.duration
        FROM
            payment_history
        JOIN
            order_history
        ON
            payment_history.order_no = order_history.no
        JOIN
            plan_menus
        ON
            order_history.plan_id = plan_menus.idx
        WHERE
            order_history.academy_code = '${academyCode}'`;

    dbctrl((connection) => {
        connection.query(getHistorySql, (errorGetHistory, resultsGetHistory) => {
            connection.release();
            if (errorGetHistory) {
                res.status(400).json(errorGetHistory);
            } else {
                res.json(resultsGetHistory);
            }
        });
    });
});

/** 정기 구독 결제 시스템 구축 (이미 결제를 해서 정보가 등록이 되어있는 상태여야 합니다.)
 * 1. 서버가 실행되면 우선 현재 날짜를 가져오고, 데이터베이스에서 금일 결제 예정인 자 목록 불러오기
 * 2. 현재 시간이 정해진 임의의 결제 시간대 이후인 경우 금일 결제 예정인 자 목록 결제 수행
 * 3. 현재 시간의 날짜가 변경되는 순간 다음날 결제 예정자 목록 업데이트
 */
const updateSubscription = {
    plans: null,
    todayLists: {},
    updateIntervalId: null,
    currentDate: new Date().eliminateTime(),
    getTodayLists(onSuccess = () => {}, onFailed = () => {}) {
        /** 여기에 데이터베이스에서 현재 날짜로 조회하고, 결제 가격, 쿠폰 할인 등등을 포함 조회하여
         * 최종 결제 금액까지 계산되어서 나오고,
         * 다음달치 토큰(결제내역)과, 베타기간한정 및 학원 소비자 쿠폰까지 발급이 이뤄져야 함.
         */

        /**
         * 1. 오늘 날짜조회 (1, 10, 25, 28, 30, 31…등등) / 이전 달의 마지막 날을 조회(28, 29, 20, 31)
         * 2. 오늘 날짜보다 이전 달의 마지막 날이 같거나 큰 경우 -> 오늘 날짜로 빌링 날짜 조회
         * 3. 작을 경우 이전 달의 마지막 날로 빌링 날짜 조회 */

        const thisDate = this.currentDate.getDate();
        const pastEndDate = new Date(this.currentDate.getFullYear(), this.currentDate.getMonth(), 0).getDate();

        let condBillingDate = null;
        if (thisDate <= pastEndDate) condBillingDate = thisDate;
        else condBillingDate = pastEndDate;

        // 먼저 기간 계산을 위해 플랜 정보 조회
        dbctrl((connection) => {
            const getPlanMenusSql = `SELECT * FROM plan_menus`;
            connection.query(getPlanMenusSql, (errorPlanMenus, resultsPlanMenus) => {
                if (errorPlanMenus) {
                    connection.release();
                    console.error(errorPlanMenus);
                    onFailed(errorPlanMenus);
                } else {
                    // temp method
                    resultsPlanMenus = resultsPlanMenus.filter((d) => d.name !== 'free').map((d) => ({ ...d, duration: 30 }));
                    // 플랜 메뉴를 가져왔으면 플랜별로 현재 날짜에 duration을 차감하여 order_history 에서 결제예정자 조회
                    this.plans = resultsPlanMenus;
                    let todayListsCondition = '';
                    const planMenusLength = resultsPlanMenus.length;
                    for (let i = 0; i < planMenusLength; i++) {
                        if (i > 0) todayListsCondition += ' OR ';
                        switch (resultsPlanMenus[i].duration) {
                            // 30이면 한달 후로 계산함
                            case 30:
                                todayListsCondition += `(order_history.plan_id=${
                                    resultsPlanMenus[i].idx
                                } AND IF(DAY(plan_start) >= 28, LAST_DAY(plan_start + INTERVAL 1 MONTH), DATE_ADD(plan_start, INTERVAL +1 MONTH)) <= DATE("${this.currentDate.format(
                                    'yyyy-MM-dd',
                                )}"))`;
                                break;
                            default:
                                todayListsCondition += `(order_history.plan_id=${
                                    resultsPlanMenus[i].idx
                                } AND IF(DAY(plan_start) >= 28, LAST_DAY(plan_start + INTERVAL ${
                                    resultsPlanMenus[i].duration
                                } DAY), DATE_ADD(plan_start, INTERVAL +${
                                    resultsPlanMenus[i].duration
                                } DAY)) <= DATE("${this.currentDate.format('yyyy-MM-dd')}"))`;
                                break;
                        }
                    }
                    const todayListsSql = `SELECT order_history.*, payments_info.customer_key, payments_info.billing_key, 
                    academies.email, academies.phone, academies.type AS academy_type, academies.approved AS academy_approved,
                    (SELECT COUNT(DISTINCT student_id) FROM students_in_class WHERE academy_code=academies.code) AS max_students
                    FROM order_history 
                    LEFT JOIN payments_info ON payments_info.academy_code=order_history.academy_code
                    JOIN academies ON academies.code=order_history.academy_code
                    WHERE (${todayListsCondition}) AND (order_history.payment_status IS NULL OR order_history.payment_status='failed')`;
                    // console.log(todayListsSql);
                    // console.log(this.plans);

                    connection.query(todayListsSql, (errorOrders, resultsOrders) => {
                        if (errorOrders) {
                            connection.release();
                            console.log(errorOrders);
                            onFailed(errorOrders);
                        } else {
                            const academyCodes = !resultsOrders.length ? "''" : resultsOrders.map((d) => `'${d.academy_code}'`);
                            const orderNos = resultsOrders.map((d) => `'${d.no}'`);
                            orderNos.push("'monthly'");
                            const couponsSql = `SELECT * FROM coupon_history 
                            JOIN coupon_menus ON coupon_history.coupon_id=coupon_menus.coupon_id AND DATE('${this.currentDate.format(
                                'yyyy-MM-dd',
                            )}') < coupon_menus.expired 
                            WHERE academy_code IN (${academyCodes}) AND 
                            (
                                (order_no='monthly' AND status IS NULL)
                                OR
                                (order_no IN (${orderNos}) AND status='queued' AND used_at <= DATE('${this.currentDate.format(
                                'yyyy-MM-dd',
                            )}'))
                            )`;

                            connection.query(couponsSql, (errorCoupons, resultsCoupons) => {
                                connection.release();
                                if (errorCoupons) {
                                    console.log(errorCoupons);
                                    onFailed(errorCoupons);
                                } else {
                                    // console.log(resultsCoupons);
                                    // 금일 결제 예정자 정리
                                    const todayLists = {};
                                    const todayListsLength = resultsOrders.length;
                                    for (let i = 0; i < todayListsLength; i++) {
                                        todayLists[resultsOrders[i].no] = resultsOrders[i];
                                        todayLists[resultsOrders[i].no].order_price = todayLists[resultsOrders[i].no].payment_price =
                                            this.plans.find((d) => d.idx === resultsOrders[i].plan_id).price *
                                            resultsOrders[i].max_students;
                                        todayLists[resultsOrders[i].no].plan_name = this.plans.find(
                                            (d) => d.idx === resultsOrders[i].plan_id,
                                        ).name;
                                        todayLists[resultsOrders[i].no].coupons = [];
                                        todayLists[resultsOrders[i].no].payment_status =
                                            resultsOrders[i].payment_status === null ? 'pending' : resultsOrders[i].payment_status;
                                    }
                                    // 계정 별로 쿠폰 먹이기
                                    const couponsLength = resultsCoupons.length;
                                    for (let i = 0; i < couponsLength; i++) {
                                        const _fdOrderNo = Object.keys(todayLists).find(
                                            (no) => todayLists[no].academy_code === resultsCoupons[i].academy_code,
                                        );
                                        if (resultsCoupons[i].coupon_id === 'personal_standard' && todayLists[_fdOrderNo].plan_id === 2) {
                                            todayLists[_fdOrderNo].coupons.push(resultsCoupons[i]);
                                        } else if (
                                            resultsCoupons[i].coupon_id === 'personal_premium' &&
                                            todayLists[_fdOrderNo].plan_id === 3
                                        ) {
                                            todayLists[_fdOrderNo].coupons.push(resultsCoupons[i]);
                                        } else if (
                                            resultsCoupons[i].coupon_id !== 'personal_standard' &&
                                            resultsCoupons[i].coupon_id !== 'personal_premium'
                                        ) {
                                            todayLists[_fdOrderNo].coupons.push(resultsCoupons[i]);
                                        }
                                    }

                                    for (const key in todayLists) {
                                        const couponList = todayLists[key].coupons;
                                        const length = couponList.length;
                                        for (let i = 0; i < length; i++) {
                                            const couponType = couponList[i].type;
                                            switch (couponType) {
                                                case 'absolute':
                                                    todayLists[key].payment_price -= couponList[i].discount * todayLists[key].max_students;

                                                    break;
                                                case 'percentage':
                                                    todayLists[key].payment_price -=
                                                        this.plans.find((d) => d.idx === todayLists[key].plan_id).price *
                                                        couponList[i].discount *
                                                        0.01 *
                                                        todayLists[key].max_students;
                                                    break;
                                                default:
                                                    break;
                                            }
                                            if (todayLists[key].payment_price < 0) todayLists[key].payment_price < 0;
                                        }
                                    }
                                    this.todayLists = todayLists;
                                    console.log('successful updated');
                                    onSuccess(todayLists);
                                }
                            });
                        }
                    });
                }
            });
        });
    },
    // 자동 결제 서비스 시작
    startService() {
        let updateCounts = 0;
        this.getTodayLists(
            (res) => {
                // 자동 결제를 위해 업데이트 함수 만들기
                if (!this.updateIntervalId)
                    this.updateIntervalId = setInterval(() => {
                        // 날짜 차이 비교 해서 날짜가 바뀌었는지 체크
                        const updatedDate = new Date().eliminateTime();
                        // 날짜가 바뀌었을 경우 결제 예정 목록 최신화

                        // 10초마다 업데이트 해서 날짜 변경이 감지되면 업데이트
                        if (updatedDate.getTime() > this.currentDate.getTime()) {
                            console.log('date changed...checking updates..');
                            this.getTodayLists();
                        }

                        // console.log(res);

                        // 30분 마다 체크
                        if (updateCounts >= 10) {
                            console.log('updating metas interval...');
                            console.log(this.todayLists);
                            this.getTodayLists((res) => {
                                // 지정된 시간(체크카드 공동 점검시간 고려)이 되면 결제 목록에서 결제 시도
                                if (new Date().getHours() >= 3) {
                                    // Axios 호출 및 결제 시도
                                    Object.keys(this.todayLists).forEach((orderNo) => {
                                        const currentOrder = this.todayLists[orderNo];
                                        // console.log(currentOrder);
                                        // console.log(currentOrder.billing_key, currentOrder.customer_key);
                                        // 빌링키가 있는 경우에만 결제 (없는 경우는 보류하고 넘김)
                                        if (currentOrder.billing_key && currentOrder.customer_key) {
                                            axios
                                                .post(
                                                    `${tossPaymentsApiUrl}/v1/billing/${currentOrder.billing_key}`,
                                                    {
                                                        amount: currentOrder.payment_price,
                                                        customerEmail: currentOrder.email,
                                                        customerKey: currentOrder.customer_key,
                                                        orderId: orderNo,
                                                        orderName: `${this.currentDate.getMonth() + 1}월 ${
                                                            currentOrder.plan_name
                                                        } 플랜 이용료`,
                                                        taxFreeAmount: 0,
                                                    },
                                                    {
                                                        auth: {
                                                            username: paymentsSecretKey,
                                                        },
                                                        headers: {
                                                            'Content-Type': 'application/json',
                                                        },
                                                    },
                                                )
                                                .then((res) => {
                                                    // 최종 결제에 성공한 경우 목록에서 지우고 payments 상태 완료로 변경
                                                    console.log('성공 입니다!');
                                                    // console.log(res);
                                                    // delete this.todayLists[res.data.orderId];

                                                    // 결제 내역 기록 및 다음 플랜 주문 등록
                                                    // 필요한 데이터 값 지정
                                                    const {
                                                        paymentKey,
                                                        orderId,
                                                        totalAmount,
                                                        balanceAmount,
                                                        status,
                                                        approvedAt,
                                                        method,
                                                        card,
                                                    } = res.data;
                                                    console.log(res.data);
                                                    dbctrl((connection) => {
                                                        // 결제 완료 내역 추가
                                                        const addPaymentsHistorySql = `INSERT INTO payment_history (order_no, payment_key, approved_at, payment_method, card_company, card_type, card_owner, card_number, payment_price, receipt_url)
                                                         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
                                                        connection.query(
                                                            addPaymentsHistorySql,
                                                            [
                                                                orderId,
                                                                paymentKey,
                                                                new Date(approvedAt).format('yyyy-MM-dd HH:mm:ss'),
                                                                method,
                                                                card.company,
                                                                card.cardType,
                                                                card.ownerType,
                                                                card.number,
                                                                balanceAmount,
                                                                card.receiptUrl,
                                                            ],
                                                            (errorAddPaymentHistory, resultsAddPaymentHistory) => {
                                                                if (errorAddPaymentHistory) {
                                                                    connection.release();
                                                                    console.error(
                                                                        '결제 내역을 추가하는 도중 오류가 발생했습니다!',
                                                                        errorAddPaymentHistory,
                                                                    );
                                                                } else {
                                                                    console.log('주문건 ' + orderId + ' 에 대한 결제 완료 내역이 추가됨!');
                                                                    // 주문 내역에 결제 사항 업데이트
                                                                    const updateOrdersSql = `UPDATE order_history SET order_price=${this.todayLists[orderId].order_price}, payment_price=${balanceAmount}, payment_status='${paymentKey}'
                                                        WHERE no='${orderId}'`;
                                                                    connection.query(
                                                                        updateOrdersSql,
                                                                        (errorUpdateOrders, resultsUpdateOrders) => {
                                                                            if (errorUpdateOrders) {
                                                                                connection.release();
                                                                                console.error(
                                                                                    '결제 정보를 업데이트 하는 도중 오류가 발생했습니다!',
                                                                                    errorUpdateOrders,
                                                                                );
                                                                            } else {
                                                                                // 다음 플랜 내역 추가 및 업데이트 (다음 플랜 아이디가 스탠다드나 프리미엄일때, 그리고 결제가 18시 전까지 정상적으로 처리된 경우에 한해서만)
                                                                                const generateUid = new shortUniqueId();
                                                                                const newOrderNo =
                                                                                    new Date().getTime() + '_' + generateUid(11);
                                                                                const newPlanId = this.todayLists[orderId].next_plan_id;
                                                                                const newOrderName = makePlanOrderName(
                                                                                    this.currentDate.getMonth() + 1,
                                                                                    newPlanId,
                                                                                );
                                                                                const newAcademyCode = this.todayLists[orderId]
                                                                                    .academy_code;
                                                                                const newPlanStart = this.currentDate.format(
                                                                                    'yyyy-MM-dd HH:mm:ss',
                                                                                );
                                                                                const newBillingDay = this.todayLists[orderId].billing_day;
                                                                                const newNextPlanId = newPlanId;
                                                                                const newPaymentStatus = null;

                                                                                if (
                                                                                    this.todayLists[orderId].payment_status === 'failed' ||
                                                                                    newPlanId === 1
                                                                                ) {
                                                                                    console.log(
                                                                                        orderId +
                                                                                            ' 주문건은 이전 결제 실패 이력이 있거나 다음 플랜이 무료 이므로 다음 구독 정보가 추가되지 않습니다.',
                                                                                    );
                                                                                    // 그 중 다음이 무료 플랜이면 학원 플랜 아이디만 업데이트 할 것.
                                                                                    if (newPlanId === 1) {
                                                                                        const updateAcademyFreePlanSql = `UPDATE academies SET plan_id=1`;
                                                                                        connection.query(
                                                                                            updateAcademyFreePlanSql,
                                                                                            (errorUpdate, resultsUpdate) => {
                                                                                                connection.release();
                                                                                                if (errorUpdate) {
                                                                                                    console.error(
                                                                                                        '학원 플랜 아이디 무료 버전으로 업데이트 도중 에러',
                                                                                                        errorUpdate,
                                                                                                    );
                                                                                                } else {
                                                                                                    console.log(
                                                                                                        '학원 무료 플랜으로 아이디 설정됨!',
                                                                                                    );
                                                                                                }
                                                                                            },
                                                                                        );
                                                                                    }
                                                                                } else {
                                                                                    const addNextPlanSql = `INSERT INTO order_history (no, name, plan_id, academy_code, plan_start, billing_day, next_plan_id, payment_status) VALUES (?, ?, ?, ?, ?, ?, ?);
                                                                    UPDATE academies SET plan_id=${newNextPlanId}`;

                                                                                    connection.query(
                                                                                        addNextPlanSql,
                                                                                        [
                                                                                            newOrderNo,
                                                                                            newOrderName,
                                                                                            newPlanId,
                                                                                            newAcademyCode,
                                                                                            newPlanStart,
                                                                                            newBillingDay,
                                                                                            newNextPlanId,
                                                                                            newPaymentStatus,
                                                                                        ],
                                                                                        (errorAddNextPlan, resultsAddNextPlan) => {
                                                                                            connection.release();
                                                                                            if (errorAddNextPlan) {
                                                                                                console.error(
                                                                                                    '결제 정보를 업데이트 하는 도중 오류가 발생했습니다!',
                                                                                                    errorAddNextPlan,
                                                                                                );
                                                                                            } else {
                                                                                                delete this.todayLists[orderId];
                                                                                                console.log(
                                                                                                    '모든 프로세스 성공적으로 완료됨!',
                                                                                                    resultsAddNextPlan,
                                                                                                );
                                                                                            }
                                                                                        },
                                                                                    );
                                                                                }
                                                                            }
                                                                        },
                                                                    );
                                                                }
                                                            },
                                                        );
                                                    });
                                                })
                                                .catch((err) => {
                                                    // 최종 결제에 실패한 경우 payments 상태 오류로 변경하고 일정시간 이후 재시도 함
                                                    console.log('실패 입니다.');
                                                    const configData = JSON.parse(err.response.config.data);
                                                    const responseMsg = err.response.data.message;
                                                    console.log(configData, responseMsg);

                                                    // 이미 결제가 성공한 주문건인 경우 결제완료 처리
                                                    if (responseMsg.includes('S007')) {
                                                        const updateCompletedSql = `UPDATE order_history SET payment_status='completed' WHERE no='${configData.orderId}'`;
                                                        dbctrl((connection) => {
                                                            connection.query(
                                                                updateCompletedSql,
                                                                (errorUpdateCompleted, resultsUpdateCompleted) => {
                                                                    connection.release();
                                                                    if (errorUpdateCompleted) {
                                                                        console.error(errorUpdateCompleted);
                                                                    } else {
                                                                        console.log(resultsUpdateCompleted);
                                                                    }
                                                                },
                                                            );
                                                        });
                                                    }
                                                });
                                        } else {
                                            console.log('주의::' + orderNo + ' 빌링키 없음!');
                                        }
                                        // 오후 6시(18)가 지나도 결제에 실패한 주문사항에 대해서는 일단 해당 학원의 플랜을 FREE로 돌림 (1회성으로 체크)
                                        // console.log(currentOrder);
                                        if (new Date().getHours() >= 18 && currentOrder.payment_status === 'pending') {
                                            this.todayLists[orderNo].payment_status = 'failed';
                                            dbctrl((connection) => {
                                                // 주문 목록 결제실패
                                                const updateFailedSql = `UPDATE order_history SET payment_status='failed' WHERE no='${currentOrder.no}'`;
                                                connection.query(updateFailedSql, (errorUpdateFailed, resultsUpdateFailed) => {
                                                    if (errorUpdateFailed) {
                                                        connection.release();
                                                        console.error(errorUpdateFailed);
                                                    } else {
                                                        // 학원의 플랜을 FREE 로 변경, STANDARD 또는 PREMIUM 해지
                                                        const updatePlanFreeSql = `UPDATE academies SET plan_id=1 WHERE code='${currentOrder.academy_code}'`;
                                                        connection.query(
                                                            updatePlanFreeSql,
                                                            (errorUpdatePlanFree, resultsUpdatePlanFree) => {
                                                                connection.release();
                                                                if (errorUpdatePlanFree) {
                                                                    console.error(errorUpdatePlanFree);
                                                                } else {
                                                                    console.log(
                                                                        '결제 실패처리 완료.',
                                                                        resultsUpdateFailed,
                                                                        resultsUpdatePlanFree,
                                                                    );
                                                                }
                                                            },
                                                        );
                                                    }
                                                });
                                            });
                                        }
                                    });
                                } else {
                                    console.log('----점검시간----');
                                }
                            });
                            updateCounts = 0;
                        }

                        // 날짜 갱신
                        this.currentDate = updatedDate;
                        updateCounts++;
                    }, 1000 * 1);
            },
            (err) => {
                console.error(err);
            },
        );
    },

    // 자동 결제 서비스 중단
    stopService() {
        if (this.updateIntervalId) clearInterval(this.updateIntervalId);
    },
};

updateSubscription.startService();

module.exports = router;
