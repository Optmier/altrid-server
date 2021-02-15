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

// 빌링키 발급
router.get('/billing-key', (req, res, next) => {
    const customerKey = req.query.customerKey;
    const authKey = req.query.authKey;
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
    console.log(customerKey, authKey);
});

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
                                    _condition.startDateToSearch = currentTimestamp.setMonth(currentTimestamp.getMonth() - 1);
                                    break;
                                default:
                                    _condition.startDateToSearch = currentTimestamp.setDate(currentTimestamp.getDate() - d.duration);
                                    break;
                            }
                            return _condition;
                        });
                    let searchConditionSql = '';
                    // 조회 조건 sql 만들기
                    for (let i = 0; i < searchCondition.length; i++) {
                        if (i > 0) searchConditionSql += ' OR ';
                        searchConditionSql += `(plan_id=${searchCondition[i].planId} AND DATE(plan_start)<DATE('${new Date(
                            searchCondition[i].startDateToSearch,
                        ).format('yyyy-MM-dd')}'))`;
                    }

                    // 플랜별로 고객 주문사항(플랜 아이디, 시작일, 사용된 쿠폰, 빌링 키 등등) 조회하고, order_price - 쿠폰 목록 가격 할 것
                    const getOrdersMeta = `SELECT order_history.no, order_history.plan_id,
                    order_history.academy_code, order_history.order_price, order_history.next_plan_id,
                    coupon_history.coupon_id, coupon_menus.discount, coupon_menus.type AS coupon_type,
                    academies.type AS academy_type, academies.approved AS academy_approved
                    FROM order_history
                    LEFT JOIN coupon_history
                    ON coupon_history.order_no=order_history.no
                    LEFT JOIN coupon_menus
                    ON coupon_menus.coupon_id=coupon_history.coupon_id
                    JOIN academies
                    ON academies.code=order_history.academy_code
                    WHERE ${searchConditionSql}`;
                    connection.query(getOrdersMeta, (errorOrdersMeta, resultsOrdersMeta) => {
                        connection.release();
                        if (errorOrdersMeta) {
                            console.error(errorOrdersMeta);
                            onFailed(error);
                        } else {
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
                                        customerKey: '',
                                        billingKey: '',
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
                                        // 쿠폰 발급
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

updateSubscription.startService();

module.exports = router;
