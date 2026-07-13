/* =========================================================
 * i18n — fixed UI micro-copy for the shared Joy engine.
 * ---------------------------------------------------------
 * Page CONTENT (prose, schedule, Q&A, section titles) lives in
 * the per-locale content file (en/content.en.js, kr/content.ko.js).
 * Only engine chrome (countdown units, RSVP widget labels) is here.
 *
 * t('rsvp.welcome', { name: 'Soyeon' })  → interpolates {name}.
 * The active locale comes from window.SITE.locale.
 * ========================================================= */
window.STRINGS = {
  en: {
    count: { days: 'Days', hours: 'Hours', minutes: 'Minutes', seconds: 'Seconds' },
    respondBy: 'Kindly respond by {date}.',
    rsvp: {
      submit: 'Send RSVP', edit: 'Edit response', saving: 'Sending…',
      attendQuestion: 'Will you attend?',
      attendingYes: 'Joyfully accepts', attendingNo: 'Regretfully declines',
      name: 'Your name', email: 'Email', phone: 'Phone',
      messageLabel: 'A note for us (optional)',
      required: 'Please enter your name.',
      done: 'Response saved.',
      // wedding (open self-report)
      side: 'Which side?', sideGroom: "Groom's side", sideBride: "Bride's side",
      partySize: 'Number of guests (including you)',
      thanksWedding: 'Thank you — your RSVP has been sent! 💛',
      plusOneOk: 'Your invitation includes up to {n} seats.',
      plusOneInfo: 'One seat per RSVP. If you were told you have a companion seat, enter the exact name from your invitation.',
      // afterparty (open RSVP + allotment)
      lookupHeading: '',
      lookupHint: 'Enter your name to begin.',
      lookupBtn: 'Continue',
      lookupByCode: 'Have a personal RSVP link? Just open it.',
      notFound: "We couldn't find that link — enter your name below to RSVP.",
      ambiguous: 'More than one guest shares that name — please use the personal link from your invitation.',
      welcome: 'Welcome, {name}!',
      allotment: 'Your invitation includes up to {n} guests.',
      alreadyResponded: 'You already responded — you can update it below.',
      companionsLabel: 'Who are you bringing? (names)',
      companionPlaceholder: 'Guest name',
      overLimit: 'That is more than your invitation allows ({n}).',
      contactEmail: 'Email (so we can reach you)',
      thanksYes: "You're on the list — see you there! 🎉",
      thanksNo: "Thanks for letting us know — we'll miss you!",
    },
  },
  ko: {
    count: { days: '일', hours: '시', minutes: '분', seconds: '초' },
    respondBy: '{date}까지 회신 부탁드립니다.',
    rsvp: {
      submit: '참석의사 전달', edit: '응답 수정', saving: '전송 중…',
      attendQuestion: '참석하시나요?',
      attendingYes: '참석합니다', attendingNo: '참석이 어렵습니다',
      name: '성함', email: '이메일', phone: '연락처',
      messageLabel: '전하고 싶은 말 (선택)',
      required: '성함을 입력해 주세요.',
      done: '응답이 저장되었습니다.',
      side: '어느 쪽이신가요?', sideGroom: '신랑 측', sideBride: '신부 측',
      partySize: '참석 인원 (본인 포함)',
      thanksWedding: '참석의사가 전달되었습니다. 감사합니다! 💛',
      plusOneOk: '동반 포함 최대 {n}명까지 선택하실 수 있어요.',
      plusOneInfo: '참석 인원은 본인 1인 기준입니다. 동반 안내를 받으신 분은 초대장의 성함 그대로 입력해 주세요.',
      lookupHeading: '',
      lookupHint: '성함을 입력해 주세요.',
      lookupBtn: '다음',
      lookupByCode: '개인 초대 링크가 있으시면 그대로 열어 주세요.',
      notFound: '링크를 확인하지 못했어요 — 아래에 성함을 입력해 주세요.',
      ambiguous: '같은 성함이 여러 분 계세요. 초대장의 개인 링크를 이용해 주세요.',
      welcome: '{name}님, 환영합니다!',
      allotment: '최대 {n}명까지 초대되셨습니다.',
      alreadyResponded: '이미 응답하셨습니다 — 아래에서 수정할 수 있어요.',
      companionsLabel: '동행하시는 분 성함',
      companionPlaceholder: '동행인 성함',
      overLimit: '초대 인원({n}명)을 초과했습니다.',
      contactEmail: '연락처 이메일',
      thanksYes: '참석 명단에 등록되었습니다 — 그날 뵐게요! 🎉',
      thanksNo: '알려주셔서 감사합니다 — 함께하지 못해 아쉬워요!',
    },
  },
};

window.t = function (key, vars) {
  var loc = (window.SITE && window.SITE.locale) || 'en';
  function dig(table) {
    return String(key).split('.').reduce(function (o, k) { return o == null ? o : o[k]; }, table);
  }
  var val = dig(window.STRINGS[loc]);
  if (val == null) val = dig(window.STRINGS.en);
  if (typeof val !== 'string') return key;
  if (vars) {
    val = val.replace(/\{(\w+)\}/g, function (m, k) { return vars[k] != null ? vars[k] : m; });
  }
  return val;
};
