# Altrid(알트리드) 서비스 플랫폼 서버 소스
> [@Sain-Tech](https://github.com/Sain-Tech) 의 [altrid-server](https://github.com/Sain-Tech/altrid-server) 에서 옮겨짐.

## 실행 방법

```sh
### 프로젝트 가져오기 ###
$ git init
$ git remote add origin https://github.com/Optmier/altrid-server.git
$ git pull origin master

### 루트 디렉토리에 configs 디렉토리 생성 후 configs.zip 압축파일 내 폴더들 넣기

### 빌드 구성 설정 확인 ###
configs/modes.js 파일에 RUN_MODE: 'dev' 확인

### 모듈 설치 및 실행 ###
$ npm install
$ nodemon start
```

## 빌드 및 업로드
### SFTP Config
```json
{
    "name": "<서버 이름>",
    "host": "<서버 IP 주소>",
    "protocol": "sftp",
    "port": 22,
    "username": "<서버 계정 이름>",
    "password": "<서버 접속 암호>",
    "remotePath": "<업로드 할 디렉토리>",
    "uploadOnSave": false,
    "ignore": ["**/.vscode", "**/.git", "**/.DS_Store"]
}
```

### 빌드 구성 설정 확인
```sh
configs/modes.js 파일에 RUN_MODE: 'prod' 설정 확인
```

### 빌드 및 업로드
```sh
전체 폴더 선택, 우클릭 후 Upload Folder
```


## 프로젝트 구조
```sh
bin
    www - 서버 기본 세팅(인증서, dev / prod 분기, cors 등)
certs
    apis.altridedge.com.pfx - 인증서
configs - 데이터베이스 접속, 보안 키 설정 등
    dbconfigs.js - 데이터베이스 접속 설정
    encryptionKey.js - 인증서 암호, API 키, 사용자 토큰 인증 키 등 설정
    modes.js - 실행 / 개발 모드 분기 설정
    whitelists.js - API 접속 가능한 화이트리스트 설정
modules - 공통 함수
    cookieController.js - 쿠키 설정 함수 (로그인 토큰 설정)
    dateformat.js - 날짜 포맷 변환 함수
    encryption.js - 사용자 토큰 및 개인정보 암호화 및 검증 모듈
    regex.js - 이메일 등 정규식 검증 함수
    timestamp.js - 타임스탬프 생성
public - 공용 폴더 (사용하지 않음)
routes - API 함수 구현, 데이터베이스 테이블 별로 각각 기능 나누어서 구현하였음
    middlewares - API 미들웨어
        authCheck.js - 사용자 인증 여부 검사
UploadedFiles - 서버에 업로드된 파일
    ContentsRequests - 컨텐츠 파일
    ProfileImages - 프로필 이미지 설정시 저장되는 폴더
views - express 뷰 설정 (사용하지 않음)
app.js - 라우트 분기 설정
```
