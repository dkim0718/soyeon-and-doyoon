/* =========================================================
 * 모바일 청첩장 설정 (Invitation configuration)
 * ---------------------------------------------------------
 * 이 파일의 값이 "기본값"입니다.
 * 관리자 페이지(admin/edit.html)에서 수정하면 브라우저
 * localStorage 에 덮어쓰기(override)로 저장되며, 이 파일은
 * 바뀌지 않습니다. 영구 반영하려면 이 파일을 직접 수정하거나
 * edit 페이지의 "JSON 내보내기"로 받은 내용을 반영하세요.
 * ========================================================= */
window.MOCHUNG_DEFAULTS = {
  meta: {
    title: '소연 ♥ 도윤 결혼식에 초대합니다',
    description: '2026년 10월 30일 금요일 오후 6시 30분 · 신라호텔 영빈관',
  },

  theme: {
    // classic | romantic | modern | bold | handwriting  (css/style.css 참고)
    fontPreset: 'classic',
    // 글자 크기 배율 (0.9 ~ 1.15 권장)
    fontScale: 1,
    effects: {
      stars: true,    // 메인 화면 별 반짝임 효과
      reveal: true,   // 스크롤 시 섹션 서서히 나타나기
    },
  },

  couple: {
    groom: {
      fullName: '김도윤',
      firstName: '도윤',
      enName: 'DOYOON',
      phone: '010-0000-0000',           // PLACEHOLDER — real value in config.private.js
      role: '아들',
      father: { name: '김효종', deceased: true, phone: '010-0000-0000' },
      mother: { name: '주영실', deceased: true, phone: '010-0000-0000' },
    },
    bride: {
      fullName: '김소연',
      firstName: '소연',
      enName: 'SOYEON',
      phone: '010-0000-0000',           // PLACEHOLDER — real value in config.private.js
      role: '딸',
      father: { name: '김성용', deceased: true, phone: '' },
      mother: { name: '박영식', deceased: true, phone: '' },
    },
  },

  wedding: {
    // ISO 형식 (초대장 전체에서 이 값 기준으로 D-day, 달력, ics 생성)
    dateISO: '2026-10-30T18:30:00+09:00',
    dateText: '2026. 10. 30. 금요일 오후 6시 30분',
    heroDateLine: '2026 . 10 . 30 . FRI',
    heroTimeLine: 'PM 6:30',
    venueName: '신라호텔 영빈관',
    venueHall: '영빈관',
    address: '서울 중구 동호로 249',
    venueTel: '02-2233-3131',
    // 지도 링크용 좌표 (신라호텔 영빈관)
    lat: 37.55583,
    lng: 127.00556,
  },

  greeting: {
    heading: '소중한 분들을 초대합니다',
    body: '서로가 마주보며 다져온 사랑을\n이제 함께 한 곳을 바라보며\n걸어갈 수 있는 큰 사랑으로 키우고자 합니다.\n\n저희 두 사람이 사랑의 이름으로\n지켜나갈 수 있게 앞날을\n축복해 주시면 감사하겠습니다.',
  },

  rsvp: {
    enabled: true,
    popupOnLoad: true,   // 접속 시 참석의사 안내 팝업 (오늘 그만보기 지원)
    askMeal: true,       // 식사여부 (예정/안함/미정)
    askCompanion: true,  // 동행인 성함
    askBus: false,       // 대절버스 탑승 여부
    notice: '축하의 마음으로 참석해 주실\n모든 분을 정중히 모시고자 하오니,\n참석 여부를 알려주시면 감사하겠습니다.',
  },

  gallery: {
    title: '우리의 순간들',
    photos: Array.from({ length: 15 }, (_, i) =>
      '../shared/photos/gallery-' + String(i + 1).padStart(2, '0') + '.jpg'),
  },

  accounts: {
    notice: '참석이 어려워 직접 축하를 전하지 못하는\n분들을 위해 기재했습니다.\n너그러운 마음으로 양해 부탁드립니다.',
    groom: [
      {
        label: '신랑',
        holder: '김도윤',
        bank: '신한은행',
        number: '0000000000000',   // PLACEHOLDER — real account # in config.private.js
        kakaopayUrl: '',   // 카카오페이 송금 링크 (https://qr.kakaopay.com/...)
        cardPayUrl: '',    // PLACEHOLDER (account-linked) — real URL in config.private.js
      },
    ],
    bride: [
      {
        label: '신부',
        holder: '김소연',
        bank: '',
        number: '',
        kakaopayUrl: '',
        cardPayUrl: '',
      },
    ],
  },

  flower: {
    enabled: false,
    title: '축하 화환 보내기',
    body: '두 사람 앞날에 화환으로 축복을 더해주세요.',
    url: '',
  },

  share: {
    // developers.kakao.com 에서 발급한 JavaScript 키.
    // 사이트 도메인 등록 후 입력하면 카카오톡 공유가 활성화됩니다.
    kakaoJsKey: '',
    // 공유에 사용할 대표 URL (배포 도메인)
    url: 'https://soyeondoyoon.com',
    title: '소연 ♥ 도윤 결혼식에 초대합니다',
    description: '2026년 10월 30일 금요일 오후 6시 30분\n신라호텔 영빈관',
    // 카카오톡 미리보기 이미지 (절대주소)
    imageUrl: 'https://soyeondoyoon.com/shared/photos/og.jpg',
  },

  admin: {
    // 관리자 페이지 접근 암호 (PLACEHOLDER for the public preview; real value in
    // config.private.js). NOTE: on the static/localStorage preview this passcode
    // is visible in page source and is only a demo gate — real protection comes
    // from Supabase Auth + RLS once the backend is enabled.
    passcode: '000000',
  },
};
