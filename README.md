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

```
