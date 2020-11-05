module.exports = (name, verifUrl) => {
    return `
    <div style="font-family: 'Montserrat', 'Noto Sans KR'; padding: 48px;">
        <header>
            <img
                height="28px"
                style="padding-bottom: 24px;"
                src="cid:eduity_logo"
                alt="Eduity for Infinite Pioneer"/>
            <h1 style="font-size: 24px; margin: 16.5px 0;">안녕하세요 ${name}님!</h1>
        </header>
        <div style="color: #333333; font-size: 16px; padding: 0;">
            <p style="margin: 16px 0">아래 비밀번호 초기화 버튼을 클릭하시면 이메일 주소와 동일한 값으로 비밀번호가 초기화 됩니다.</p>
            <p style="margin: 16px 16px; font-size: 14px; color: #7b7b7b";>예) 이메일: user@eduityedu.com, 비밀번호: user@eduityedu.com</p>
            <p style="margin: 16px 0">초기화 후에는 반드시 로그인 하셔서 마이페이지 에서 비밀번호를 변경해 주세요.</p>
            <div style="width: 400px">
                <a 
                    href="${verifUrl}"
                    class="btn-verification"
                    style="
                        background-color: #00b179;
                        border: none;
                        border-radius: 4px;
                        color: #ffffff;
                        display: block;
                        font-size: 18px;
                        outline: none;
                        margin-top: 16px;
                        padding: 20px 0;
                        text-align: center;
                        text-decoration: none;
                    ">비밀번호 초기화</a>
            </div>
        </div>
        <footer style="color: #909090; font-size: 14px; padding: 24px 0; width: 400px;">
            <p style="margin: 16px 0">본 메일은 발송 시점으로 부터 3분 동안만 유효하며, 베타 서비스를 위해 임시 계정으로 발송되었습니다.</p>
            <a href="https://eduityedu.com" style="color: inherit; text-decoration: none; "margin: 14px 0"><span>© Eduity for Infinite Pioneer</span></a>
        </footer>
    </div>`;
};
