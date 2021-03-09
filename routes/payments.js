const express = require('express');
const router = express.Router();
const useAuthCheck = require('./middlewares/authCheck');
const axios = require('axios').default;
const dateformat = require('../modules/dateformat');
Date.prototype.format = dateformat;
const paymentsSecretKey = require('../configs/encryptionKey')[
    process.env.RUN_MODE === 'dev' ? 'tossPaymentsTestSecretKey' : 'tossPaymentsSecretKey'
];
console.log(paymentsSecretKey);
const tossPaymentsApiUrl = 'https://api.tosspayments.com';

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
                    let validPlanSql = `SELECT * FROM order_history WHERE academy_code='${academyCode}'`;
                    // 플랜 이용 기간이 30일, 한달이면
                    resultsPlanDur[0].duration = 30;
                    if (resultsPlanDur[0].duration === 30) {
                        validPlanSql += ` AND (DATE(plan_start) <= CURDATE() AND CURDATE() < DATE_ADD(plan_start, INTERVAL 1 MONTH))`;
                    } else {
                        validPlanSql += ` AND (DATE(plan_start) <= CURDATE() AND CURDATE() < DATE_ADD(plan_start, INTERVAL ${resultsPlanDur[0].duration} DAY))`;
                    }

                    connection.query(validPlanSql, (errorValidPlan, resultsValidPlan) => {
                        connection.release();
                        if (errorValidPlan) {
                            res.status(400).json(errorValidPlan);
                        } else {
                            res.json(resultsValidPlan);
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
    const addPlanOrderSql = `INSERT INTO order_history (no, plan_id, academy_code, order_price, payment_price, plan_start, billing_date, next_plan_id, payment_status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`;

    const planStartDate = new Date(startDate).eliminateTime();

    dbctrl((connection) => {
        connection.query(
            addPlanOrderSql,
            [orderNo, planId, academyCode, orderPrice, paymentPrice, planStartDate, planStartDate.getDate(), planId, 0],
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
                headers: {
                    Authorization: `Basic ${paymentsSecretKey}`,
                    'Content-Type': 'application/json',
                },
            },
        )
        .then((r) => {
            console.log('성공!');
            res.status(r.status).json(r.data);
        })
        .catch((err) => {
            console.error('실패!');
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
            [academyCode, mId, pgName, cardCompany, cardNumber, customerKey, billingKey, authenticatedAt],
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
                            headers: {
                                Authorization: `Basic ${paymentsSecretKey}`,
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
                    onFailed(error);
                } else {
                    // temp method
                    resultsPlanMenus = resultsPlanMenus.map((d) => ({ ...d, duration: 30 }));
                    // 플랜 메뉴를 가져왔으면 플랜별로 현재 날짜에 duration을 차감하여 order_history 에서 결제예정자 조회
                    const searchCondition = resultsPlanMenus
                        .filter((d) => d.name !== 'free')
                        .map((d) => {
                            const currentTimestamp = new Date();
                            const _condition = {
                                planId: d.idx,
                                planName: d.name,
                                startDateToSearch: null,
                            };
                            // 시간 제거
                            currentTimestamp.eliminateTime();
                            switch (d.duration) {
                                case 30:
                                    _condition.startDateToSearch = new Date(
                                        this.currentDate.getFullYear(),
                                        this.currentDate.getMonth() - 1,
                                        condBillingDate,
                                    );
                                    break;
                                default:
                                    _condition.startDateToSearch = this.currentDate.setDate(this.currentDate.getDate() - d.duration);
                                    break;
                            }
                            return _condition;
                        });
                    let searchConditionSql = '';
                    // 조회 조건 sql 만들기
                    for (let i = 0; i < searchCondition.length; i++) {
                        if (i > 0) searchConditionSql += ' OR ';
                        searchConditionSql += `(orders.plan_id=${searchCondition[i].planId} AND DATE(plan_start)<DATE('${new Date(
                            searchCondition[i].startDateToSearch,
                        ).format('yyyy-MM-dd')}'))`;
                    }

                    // 플랜별로 고객 주문사항(플랜 아이디, 시작일, 사용된 쿠폰, 빌링 키 등등) 조회하고, order_price - 쿠폰 목록 가격 할 것
                    const getOrdersMeta = `SELECT orders.no, orders.academy_code, orders.plan_id, orders.next_plan_id, orders.plan_start, orders.billing_date, orders.order_price, orders.payment_price, orders.payment_status
                    , coupon_menus.coupon_id, coupon_menus.name AS coupon_name, coupon_menus.discount, coupon_menus.type AS coupon_type
                    , payments_info.customer_key, payments_info.billing_key
                    , academies.type AS academy_type, academies.approved AS academy_approved
                    FROM order_history AS orders
                    LEFT JOIN coupon_history ON orders.no=coupon_history.order_no OR coupon_history.order_no='monthly'
                    JOIN coupon_menus ON coupon_menus.coupon_id=coupon_history.coupon_id AND DATE(coupon_menus.expired)>=DATE(NOW())
                    JOIN payments_info ON payments_info.academy_code=orders.academy_code
                    JOIN academies ON academies.code=orders.academy_code
                    WHERE ${searchConditionSql}`;
                    connection.query(getOrdersMeta, (errorOrdersMeta, resultsOrdersMeta) => {
                        connection.release();
                        if (errorOrdersMeta) {
                            console.error(errorOrdersMeta);
                            onFailed(error);
                        } else {
                            console.log(resultsOrdersMeta);
                            const _obj = {};
                            const dataLength = resultsOrdersMeta.length;
                            for (let i = 0; i < dataLength; i++) {
                                const orderNo = resultsOrdersMeta[i].no;
                                if (!_obj[orderNo]) {
                                    _obj[orderNo] = {
                                        academyCode: resultsOrdersMeta[i].academy_code,
                                        academyType: resultsOrdersMeta[i].academy_type,
                                        academyApproved: resultsOrdersMeta[i].academy_approved,
                                        currentPlanId: resultsOrdersMeta[i].plan_id,
                                        nextPlanId: resultsOrdersMeta[i].next_plan_id,
                                        planName:
                                            resultsPlanMenus[resultsPlanMenus.findIndex((d) => d.idx === resultsOrdersMeta[i].plan_id)]
                                                .name,
                                        paymentPrice: resultsOrdersMeta[i].order_price,
                                        customerKey: resultsOrdersMeta[i].customer_key,
                                        billingKey: resultsOrdersMeta[i].billing_key,
                                    };
                                }
                                switch (resultsOrdersMeta[i].coupon_type) {
                                    case 'absolute':
                                        _obj[orderNo].paymentPrice -= resultsOrdersMeta[i].discount;
                                        break;
                                    case 'percentage':
                                        _obj[orderNo].paymentPrice -= _obj[orderNo].paymentPrice * resultsOrdersMeta[i].discount * 0.01;
                                        break;
                                    default:
                                        break;
                                }
                            }
                            this.todayLists = dataLength < 1 ? [] : _obj;
                            console.log(this.todayLists);
                            onSuccess(dataLength < 1 ? [] : _obj);
                        }
                    });
                }
            });
        });
    },
    // 자동 결제 서비스 시작
    startService() {
        this.getTodayLists(
            (res) => {
                // 자동 결제를 위해 업데이트 함수 만들기
                if (!this.updateIntervalId)
                    this.updateIntervalId = setInterval(() => {
                        // 날짜 차이 비교 해서 날짜가 바뀌었는지 체크
                        const updatedDate = new Date().eliminateTime();
                        // 날짜가 바뀌었을 경우 결제 예정 목록 최신화
                        if (updatedDate.getTime() > this.currentDate.getTime()) {
                            this.getTodayLists();
                        }
                        // 지정된 시간이 되면 결제 목록에서 결제 시도
                        if (new Date().getHours() >= 9) {
                            // Axios 호출 및 결제 시도
                            Object.keys(this.todayLists).forEach((orderNo) => {
                                const currentOrder = this.todayLists[orderNo];
                                axios
                                    .post(
                                        `${tossPaymentsApiUrl}/v1/billing/${currentOrder.billingKey}`,
                                        {
                                            amount: currentOrder.paymentPrice,
                                            customerEmail: null,
                                            customerKey: currentOrder.customerKey,
                                            customerPhone: null,
                                            orderId: orderNo,
                                            orderName: `${this.currentDate.getMonth() + 1}월 ${currentOrder.planName} 플랜 이용료`,
                                            taxFreeAmount: 0,
                                        },
                                        {
                                            headers: {
                                                Authorization: `Basic ${paymentsSecretKey}`,
                                                'Content-Type': 'application/json',
                                            },
                                        },
                                    )
                                    .then((res) => {
                                        // 최종 결제에 성공한 경우 목록에서 지우고 payments 상태 완료로 변경
                                        console.log('성공 입니다!');
                                        console.log(res);
                                        delete this.todayLists[res.data.orderId];
                                        // 다음 플랜 주문 등록
                                    })
                                    .catch((err) => {
                                        // 최종 결제에 실패한 경우 payments 상태 오류로 변경하고 일정시간 이후 재시도 함
                                        console.log('실패 입니다.');
                                        console.error(err);
                                    });
                            });
                        }
                        // 날짜 갱신
                        this.currentDate = updatedDate;
                    }, 60 * 1000 * 10);
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

// updateSubscription.getTodayLists();

module.exports = router;
