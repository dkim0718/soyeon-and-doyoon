// ============================================================
//  SITE CONTENT — edit everything about your wedding here.
//  This file is plain data: change any text, add or remove
//  items, save, and refresh the page.
// ============================================================

window.SITE = {
  // — Site behavior (read by the shared Joy engine) —
  locale: "en",           // language for UI chrome (shared/i18n.js)
  rsvpKind: "afterparty", // English site collects the open (+1) RSVP
  designPanel: false,     // design is set from the admin site; ?design=1 shows the preview panel

  couple: {
    partner1: "Soyeon",
    partner2: "Doyoon",
    displayName: "Soyeon & Doyoon",
    monogram: "S & D",
  },

  wedding: {
    // Used for the countdown. Include the timezone offset (+09:00 = Seoul).
    dateISO: "2026-10-30T17:30:00+09:00",
    dateDisplay: "Friday, October 30, 2026",
    timeDisplay: "5:30 PM (KST)",
    venue: "Yeong Bin Gwan, The Shilla Seoul",
    venueAddress: "249 Dongho-ro, Jung District, Seoul, South Korea",
    city: "Seoul, South Korea",
    // Venue links shown on the Travel page.
    maps: [
      { label: "Google Maps", url: "https://www.google.com/maps/search/?api=1&query=The+Shilla+Seoul" },
      { label: "Kakao Map", url: "https://map.kakao.com/link/search/" + encodeURIComponent("신라호텔 영빈관") },
      { label: "Naver Map", url: "https://map.naver.com/p/search/" + encodeURIComponent("신라호텔 영빈관") },
    ],
  },

  welcome: {
    heading: "We're getting married!",
    message:
      "We're so excited to celebrate our big day with you in Seoul. Here you'll " +
      "find our schedule, where to stay, travel tips, and answers to common " +
      "questions. We can't wait to see you!",
  },

  story: {
    intro: "How we met",
    text:
      "For her, winter in Boston was proving to be quite gloomy, and he was " +
      "looking to move back to Korea in a year or two. That's when Soyeon " +
      "(same name, not the bride) introduced the two, and had their first " +
      "date at SRV.\n\n" +
      "One date turned into two, then into three, but just as the two were " +
      "getting close, Soyeon had to go abroad to Brussels for her secondment. " +
      "He offered to help, and to visit often. Distance notwithstanding, they " +
      "continued to bond over long conversations.\n\n" +
      "After countless trans-atlantic flights, trips to Korea and all over " +
      "Europe, these two are finally tying the knot.",
  },

  // Add, remove, or reorder schedule items freely.
  schedule: [
    {
      title: "Welcome Drinks",
      date: "Friday, October 30, 2026",
      time: "5:30 – 6:30 PM",
      location: "Yeong Bin Gwan, The Shilla Seoul",
      note: "Cocktail attire.",
    },
    {
      title: "Ceremony",
      date: "Friday, October 30, 2026",
      time: "6:30 – 7:00 PM",
      location: "Yeong Bin Gwan, The Shilla Seoul",
      note: "We're getting married! We can't wait to celebrate with you all. Cocktail attire.",
    },
    {
      title: "Dinner",
      date: "Friday, October 30, 2026",
      time: "7:00 – 9:00 PM",
      location: "Yeong Bin Gwan, The Shilla Seoul",
      note: "Dinner will be indoors or outdoors depending on the weather that evening.",
    },
    {
      title: "After Party",
      date: "Friday, October 30, 2026",
      time: "9:00 PM",
      location: "Yeong Bin Gwan, The Shilla Seoul",
      note: "",
    },
  ],

  stayIntro:
    "To make planning easier, we've listed a few hotels near the venue. " +
    "If you'll be staying overnight, we recommend booking your room early " +
    "while there's still availability.",

  hotels: [
    {
      name: "The Shilla Seoul",
      address: "249, Dongho-ro, Jung-gu · the venue",
      stars: 5,
      blurb:
        "This hotel is ideal for those seeking a luxurious and convenient stay. " +
        "Located in the heart of Seoul, The Shilla offers exquisite facilities " +
        "such as a spa, fitness center, and multiple dining options. Plus, its " +
        "stunning views of the city make it a great choice for anyone wanting " +
        "to experience Seoul's beauty.",
    },
    {
      name: "The Ambassador Seoul - A Pullman Hotel",
      address: "287, Dongho-ro, Jung-gu · 0.3 mi from venue",
      stars: 5,
      blurb:
        "The Ambassador Seoul - A Pullman Hotel is a modern, upscale hotel " +
        "located in the heart of the city. With sleek and stylish rooms, a " +
        "fitness center, and multiple dining options, it's a great choice for " +
        "guests looking for convenience and luxury during their stay.",
    },
    {
      name: "The Summit Hotel Seoul Dongdaemun",
      address: "198, Jangchungdan-ro · 0.4 mi from venue",
      stars: 3.5,
      blurb:
        "The Summit Hotel Seoul Dongdaemun is a great option for those who want " +
        "to stay in the heart of the bustling Dongdaemun area. Its convenient " +
        "location allows for easy access to shopping, dining, and cultural " +
        "experiences. Plus, the rooms are spacious and comfortable, perfect for " +
        "unwinding after a long day of exploring.",
    },
    {
      name: "Toyoko Inn Seoul Dongdaemun No.2",
      address: "325, Toegye-ro, Jung-gu · 0.6 mi from venue",
      stars: 3,
      blurb:
        "This hotel is a convenient and affordable option for those wanting to " +
        "explore the vibrant Dongdaemun neighborhood in Seoul. With clean and " +
        "comfortable rooms, free breakfast and friendly staff, it's a great " +
        "choice for budget-conscious travelers looking to experience the city.",
    },
  ],

  travel: [
    {
      title: "Getting In",
      body: "We recommend flying into Incheon Airport (ICN).",
    },
    {
      title: "Getting Downtown",
      body:
        "There are plenty of ways to get to the hotel.\n\n- Taxi: From " +
        "Incheon International Airport, about 1 hour and 30 minutes.\n- Bus: " +
        "Take 6702 K BUS -> get off at Jangchung Gymnasium stop\n- Subway: " +
        "Airport Railroad from Incheon Airport Station -> Transfer to Line " +
        "6 at Gongdeok Station -> Transfer to Line 3 at Yaksu Station -> " +
        "Get off at Dongguk University Station and use Exit 5.\n\nFor more " +
        "details, please visit the hotel website at " +
        "https://www.shillahotels.com/en/theshilla/seoul/introduction/location.do",
    },
    {
      title: "Our Favorite Restaurants",
      body:
        "- Woo Rae Ok (우래옥) – Arguably Seoul’s most famous pyeongyang " +
        "naengmyeon (cold noodles) spot, but the wait is no joke — go early " +
        "and get your name on the waitlist before you do anything else!\n- " +
        "Gyeongdong Market (경동시장) – One of the hottest traditional markets " +
        "right now; try tteokbokki, jeon, and yukhoe.\n- Frozen Samgyeopsal " +
        "spot near you (냉삼) – If you’ve already tried classic Korean BBQ, " +
        "give frozen pork belly a shot.\n- Taegeukdang (태극당) — serves famous " +
        "ice cream monaka as well as other baked goods.\n- Number One " +
        "Yangkkochi (넘버원양꼬치) – Lamb skewers, lamb ribs, and corn noodles — " +
        "the wait is worth it.",
    },
    {
      title: "Things to Do in Seoul",
      body:
        "- Seochon/Bukchon (서촌/북촌) – Explore royal palaces like " +
        "Gyeongbokgung and Changdeokgung, try on a hanbok, and wander " +
        "nearby temples and local eateries.\n- National Museum of Korea " +
        "(국립중앙박물관) – Korea’s largest museum, packed with stunning artifacts " +
        "and free admission — don’t miss the cool museum goods shop!\n- " +
        "Seongsu (성수) – A must-visit if you’re into shopping and all things " +
        "trendy.\n- Hangang Park (한강공원) – Perfect in fall for beer and Han " +
        "River ramyeon by the water.\n- N Seoul Tower (남산타워) — Enjoy great " +
        "views of Seoul.",
    },
  ],

  qanda: [
    // Rows whose q starts with "## " render as group headings.
    { q: "## The Logistics", a: "" },
    {
      q: "When is the RSVP deadline?",
      a: "Please RSVP by September 15 so we can get an accurate headcount. :)",
    },
    {
      q: "What will the weather be like?",
      a:
        "Late October is the loveliest stretch of Seoul's autumn — crisp, " +
        "dry, and cool. On October 30th over the past five years, the day " +
        "has averaged a high of about 18°C (64°F) and a low of 8°C (46°F). " +
        "Expect mild afternoons and cool evenings; a light layer is perfect " +
        "for the outdoor moments.",
    },
    {
      q: "Can I bring a date?",
      a: "Check your invitation to see if you have a plus-one.",
    },
    {
      q: "Are kids welcome?",
      a: "Yes - please let us know in advance so we can plan accordingly!",
    },
    {
      q: "Where can I park?",
      a: "The venue provides valet parking services.",
    },
    {
      q: "What should I wear?",
      a:
        "There's no formal dress code, but you are welcome to dress to " +
        "impress. Nighttime may get chilly, so bring a jacket or " +
        "scarf.\n\nLadies, please skip the stilettos—seriously! There's a lot " +
        "of grass and uneven ground, so go for block heels or sandals. We " +
        "want everyone's shoes (and ankles) to make it through the night.",
    },
    {
      q: "Is the wedding indoors or outdoors?",
      a:
        "Our wedding ceremony will be outdoors, and our dinner reception " +
        "will be right beside, indoors or outdoors (depending on the " +
        "weather) :)",
    },
    {
      q: "Can we use our phones and cameras to take photos during the wedding?",
      a:
        "Yes! We'd love for you to take photos and share them with us. We " +
        "will provide a link where you can upload photos.",
    },
    { q: "## About Us", a: "" },
    {
      q: "How did you two meet?",
      a: "Read Our Story!",
    },
    {
      q: "Who made the first move? How did it happen?",
      a:
        "Him: I made the first move by texting her \"I really enjoyed our " +
        "conversation and would love to treat you out to dinner " +
        "again!\"\nHer: His version isn’t quite how it happened lol! We had a " +
        "great dinner and I went home… and then didn’t hear from him for 4 " +
        "whole days, so I ended up texting him first!",
    },
    {
      q: "Who fell first?",
      a:
        "It was definitely Doyoon. He is the single reason that they got " +
        "beyond the first date.",
    },
    {
      q: "What's your most memorable date?",
      a:
        "Her: The day after Valentine’s Day — at that point, meeting up " +
        "with him ON Valentine’s Day itself felt like too much too soon, so " +
        "I asked him to meet the next day instead. We went to the Samuel " +
        "Adams Brewery in Boston while it was snowing like crazy, then " +
        "grabbed dinner. When we came out, the car was totally buried in " +
        "snow, so we just sat inside and watched YouTube together while it " +
        "melted!\nHim: Our first date was definitely the most memorable! A " +
        "close second: We went to a Celtics vs Lakers game and got to see " +
        "all our favorite players in one game.",
    },
    {
      q: "What's your favorite activity to do together?",
      a:
        "Playing with Soyeon’s toy Doremy, watching Doyoon play guitar and " +
        "sing to himself, competing on who can make the tastiest pourover, " +
        "crying after seeing ballet, and hunting down the most delicious " +
        "restaurants. Most of all, we love traveling to new places and " +
        "exploring the world together!",
    },
    {
      q: "What's the most memorable trip you've taken together?",
      a:
        "Last February, we went to Iceland to see the Northern lights. Not " +
        "only did we check off that from our bucketlist, we drove through a " +
        "sandstorm, blizzard, rain, and hailstorm all in the same day!",
    },
    {
      q: "Where are you going for your honeymoon?",
      a:
        "We are going to Tanzania, hopefully to catch the start of the " +
        "calving season! After watching the big 5, we're wrapping it up by " +
        "relaxing on the beach in the Maldives.",
    },
    {
      q: "What's the best meal you've shared together?",
      a:
        "Her: So hard to pick! We went to the Dolomites for Christmas and " +
        "had Christmas dinner at Hotel Grones. Nothing beats a meal someone " +
        "else makes for you!\nHim: Our best homemade meal was a delicious " +
        "tomato sauce pasta that she made. Outside, there are so many to " +
        "choose from, but Langosteria in Italy is one of them.",
    },
    { q: "## Tidbits", a: "" },
    {
      q: "Do you two want a dog?",
      a:
        "For now the head of our household is a stuffed toy Llama named " +
        "Doremy, and honestly she's already a handful (in addition to Pooh, " +
        "Binu, Byeoru, Dosuri...). A real dog is a someday-dream once we " +
        "settle into the new place — pending Doremy's approval, of course.",
    },
    {
      q: "An inside joke only you two get?",
      a:
        "We have our own baby-talk dialect where we call ourselves 됴니 and " +
        "쇼니 in the third person — and there's a llama named Doremy with " +
        "strong opinions.",
    },
    {
      q: "Each of your superpowers?",
      a:
        "Her: Making things actually happen — plans, bookings, " +
        "problem-solving all get finished once they reach her.\nHim: " +
        "Automatic wintertime hand warmer, 24/7 massage parlor, belly " +
        "dancer.",
    },
  ],

  registry: {
    note:
      "Your presence is enough of a present to us! But for those of you who " +
      "are stubborn, we've put together a wish-list to help you out.",
    links: [
      {
        label: "Browse Our Registry",
        url: "https://withjoy.com/soyeon-and-doyoon/registry",
        description: "Our wish-list — cash funds and gifts.",
      },
      // Add more registries like this:
      // { label: "Zola", url: "https://...", description: "..." },
    ],
  },

  rsvp: {
    email: "dkim0718@gmail.com", // RSVPs are sent to this address
    deadline: "September 15, 2026",
    message: "Please let us know if you can make it — we hope to see you there!",
  },

  moments: {
    intro:
      "A place for photos — engagement pictures now, wedding-day memories later. " +
      "We'll keep updating our engagement photos here, so check back often!",
  },

  // Curated photos, shared across all three sites (shared/photos/).
  // The gallery is the same set the 모청 shows (gallery-01..30).
  photos: {
    hero: "../shared/photos/hero.jpg",
    story: "../shared/photos/story.jpg",
  },
  galleryDefaults: Array.from({ length: 15 }, (_, i) =>
    "../shared/photos/gallery-" + String(i + 1).padStart(2, "0") + ".jpg"),

  // Pages appear in the navigation in this order.
  // Remove a line to hide that page.
  navigation: [
    { id: "welcome",  label: "Welcome" },
    { id: "story",    label: "Our Story" },
    { id: "schedule", label: "Schedule" },
    { id: "stay",     label: "Where to Stay" },
    { id: "travel",   label: "Travel" },
    { id: "qanda",    label: "Q & A" },
    // Registry page hidden for now — uncomment to bring it back
    // (the content above stays ready, e.g. for an Amazon registry link):
    // { id: "registry", label: "Registry" },
    { id: "moments",  label: "Moments" },
    { id: "rsvp",     label: "RSVP" },
  ],
};
