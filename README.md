# BLOOM · 꽃과 과일 마작

## [▶ 클릭해서 바로 게임하기](https://kimkirik.github.io/bloom-mahjong/)

설치나 로그인 없이 누구나 플레이할 수 있습니다. GitHub 실행 주소를 누르면 점수 저장 기능이 있는 공개 게임으로 바로 연결됩니다.

[공개 게임 직접 열기](https://bloom-mahjong-garden.kimkirik.chatgpt.site/) · [자동 검증 결과](https://github.com/kimkirik/bloom-mahjong/actions/workflows/ci.yml)

PC의 넓은 화면에서 즐기는 꽃·과일 연결 퍼즐입니다. 30종의 새로 제작한 3D 렌더 타일, 입체 타일 표면, Web Audio 효과음, 전체화면, 서버에 보관되는 점수 기록을 제공합니다.

게임24 [퍼즐마작2](http://www.game24.co.kr/game.php?gamecode=mahjong)의 실제 규칙을 확인해 새로 구현했습니다. 원본 코드·이미지·음원·Flash 파일을 이 저장소에 포함하지 않았습니다. 원작과 제휴한 서비스가 아닙니다.

## 플레이

- 같은 그림 두 개를 선택합니다. 다른 타일을 통과하지 않는 **직선 3개 이하(최대 두 번 꺾기)**로 연결되어야 합니다. 게임판 바깥 빈 공간을 이용할 수 있습니다.
- **15열 × 8행, 120장, 총 6단계**. 타일은 이동하거나 자동으로 섞이지 않습니다.
- 한 쌍을 제거하면 **200점, 시간 2초 추가**. 잘못된 선택은 **10초 감소**. 같은 타일을 두 번 선택해도 오답입니다.
- 힌트는 게임 전체에서 **3회**, 가능한 한 쌍을 자동으로 제거합니다.
- 단계별 시간: **240, 180, 240, 180, 240, 180초**. 그림 종류는 **20, 20, 25, 25, 30, 30종**입니다.
- 단계 완료 보너스: **단계 × 100 + 남은 초(올림) × 10점**.
- 시간이 끝나거나 연결할 짝이 없으면 종료합니다. 종료 후 이름을 입력해 점수를 저장합니다. 점수는 실제 플레이 기록에서 자동 계산됩니다.
- `H`: 힌트 · `P`/스페이스: 일시정지 · `F`: 전체화면 · `M`: 효과음. 탭을 떠나면 자동으로 일시정지합니다.

## 실행

Node.js **24 이상**과 npm이 필요합니다. GitHub Pages 같은 정적 호스팅만으로는 점수 저장 서버를 실행할 수 없습니다. 앱은 React 19 / Vinext / Cloudflare Workers와 D1을 사용합니다. 별도 AI API 키는 필요하지 않습니다.

```sh
npm ci
npm run build
npm run db:local
npm run dev
```

개발 주소는 `http://127.0.0.1:5173`입니다. `npm run db:local`은 처음 한 번 실행합니다. 이미 적용한 마이그레이션을 다시 실행하지 마세요. DB는 무시되는 `.wrangler/state`에 저장되며 브라우저를 새로고침해도 유지됩니다.

빌드 결과로 실행하려면:

```sh
npm run build
npm start
```

이때 주소는 `http://127.0.0.1:8787`입니다.

## 검증

```sh
npm test
npm run typecheck
# 위 개발 서버 또는 빌드 서버가 실행된 상태에서:
npm run test:api
# 빌드 서버를 검증할 때:
BASE_URL=http://127.0.0.1:8787 npm run test:api
```

API 테스트는 지정한 서버에 `QA 자동검증`이라는 테스트 기록을 만듭니다. **로컬 테스트 서버에서만 실행**하세요. 상세 검증 항목은 [검증 기록](docs/VERIFICATION.md)을 참고하세요.

## Cloudflare에 직접 배포

개인 Cloudflare 계정에서 Workers와 D1을 설정할 수 있습니다. GitHub에는 운영 데이터, 토큰 또는 계정 비밀이 포함되지 않습니다.

```sh
npx wrangler login
npx wrangler d1 create bloom-mahjong
npm run build
node scripts/configure-cloudflare.mjs --database-id <생성된-D1-ID> --name bloom-mahjong
npx wrangler d1 execute DB --remote --config dist/server/wrangler.json --file drizzle/0000_glossy_hulk.sql
npx wrangler deploy --config dist/server/wrangler.json
```

설정 스크립트는 빌드 결과만 수정하므로 새 빌드 뒤 다시 실행해야 합니다. 데이터베이스 마이그레이션은 처음 한 번만 적용하세요. Sites를 사용할 때는 `.openai/hosting.json`의 논리적 `DB` 바인딩을 플랫폼이 연결합니다. 공개 저장소에는 특정 Sites 프로젝트 ID가 포함되지 않습니다.

## 점수 저장 구조

서버가 게임별 난수 시드와 저장 토큰을 발급합니다. 종료 시 클라이언트가 선택 기록을 제출하면 서버가 연결·시간·힌트·보너스를 다시 계산합니다. 입력한 점수 숫자를 그대로 저장하지 않습니다. 게임 ID가 기본 키이므로 중복 클릭 및 동시 재시도는 한 기록만 생성합니다. 저장 오류 시 이름과 플레이 기록은 열린 화면에 남아 재시도할 수 있습니다.

캐주얼 게임용 기록 기능이며, 자동 플레이나 변조된 클라이언트에 대한 대회 수준의 부정행위 방지 시스템은 아닙니다. 게임 중 새로고침하면 진행 중인 판은 초기화됩니다. **저장된 점수는 유지**됩니다. 음량만 기기별 설정으로 브라우저에 저장합니다.

## 그래픽과 음향

- `public/tiles-1.png`, `public/tiles-2.png`: 이 프로젝트를 위해 AI로 새로 생성한 3D 렌더 스프라이트. 4×4 시트에서 총 30종 사용.
- 효과음: Web Audio로 실시간 합성. 외부 음원 파일을 사용하지 않습니다.
- 타일 입체감: CSS 원근·높이·그림자. WebGL 3D 모델 엔진은 사용하지 않습니다.
- 아이콘: Lucide. 빌드 도구의 별도 라이선스는 `build/`와 `vendor/`의 고지를 유지합니다.
