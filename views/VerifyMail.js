// 다음 릴리즈 반영 사항
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
            <p style="margin: 16px 0">Eduity 베타 서비스 회원가입 감사드립니다.</p>
            <p style="margin: 16px 0">아래 이메일 인증하기 버튼을 클릭해서 이메일 인증 부탁드리겠습니다.</p>
            <p style="margin: 16px 0">감사합니다.</p>
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
                    ">이메일 인증하기</a>
            </div>
        </div>
        <footer style="color: #909090; font-size: 14px; padding: 24px 0; width: 400px;">
            <p style="margin: 16px 0">본 메일은 발송 시점으로 부터 12시간 동안만 유효하며, 베타 서비스 회원 가입을 위해 임시 계정으로 발송되었습니다.</p>
            <a href="https://eduityedu.com" style="color: inherit; text-decoration: none; "margin: 14px 0"><span>© Eduity for Infinite Pioneer</span></a>
        </footer>
    </div>`;
};
