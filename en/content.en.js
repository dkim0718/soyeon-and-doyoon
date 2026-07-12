// ============================================================
//  SITE CONTENT — edit everything about your wedding here.
//  This file is plain data: change any text, add or remove
//  items, save, and refresh the page.
// ============================================================

window.SITE = {
  // — Site behavior (read by the shared Joy engine) —
  locale: "en",           // language for UI chrome (shared/i18n.js)
  rsvpKind: "afterparty", // English site collects the curated afterparty RSVP
  designPanel: true,      // font/design picker enabled for preview (set false before launch)

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
    "To make planning easier, we've listed a few hotels offering special rates " +
    "just for our guests. If you'll be staying overnight, we recommend booking " +
    "your room early while there's still availability.",

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
      body: "We recommend flying into Incheon Airport (ICN)!",
    },
    {
      title: "Getting Downtown",
      body:
        "There are plenty of ways to get downtown! You'll find several car " +
        "rental options, and taxis or ride services are both easy and convenient.",
    },
    {
      title: "Our Favorite Restaurants",
      body:
        "팔선 (Palsun) — a famous Chinese restaurant.\n" +
        "태극당 (Taegeukdang) — serves famous ice cream monaka as well as other baked goods.\n" +
        "오장동 흥남집 — serves cold buckwheat noodle dishes.",
    },
    {
      title: "Things to Do in Seoul",
      body:
        "광장시장 — A traditional market in Seoul, famous for snacks!\n" +
        "경복궁 — The old palace in Seoul. Try renting out 한복 (traditional Korean clothing) and doing a photoshoot!\n" +
        "N Seoul Tower — Enjoy great views of Seoul.",
    },
  ],

  qanda: [
    {
      q: "When is the RSVP deadline?",
      a: "Please RSVP by September 15 so we can get an accurate headcount. :)",
    },
    {
      q: "What will the weather be like?",
      a:
        "Welcome to Seoul! Late October is beautiful autumn weather — crisp and " +
        "clear, with daytime highs around 55–65°F (13–18°C) and noticeably " +
        "cooler evenings. Bring a light jacket or a layer for after sunset.",
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
      a: "Check our Schedule for dress code details.",
    },
    {
      q: "What shoes should I wear (or avoid)?",
      a:
        "Ladies, please skip the stilettos—seriously! There's a lot of grass and " +
        "uneven ground, so go for block heels or sandals. We want everyone's " +
        "shoes (and ankles) to make it through the night.",
    },
    {
      q: "Is the wedding indoors or outdoors?",
      a: "Our wedding ceremony will be outdoors, and our reception will be right beside, indoors :)",
    },
    {
      q: "Can we use our phones and cameras to take photos during the wedding?",
      a: "Yes! We'd love for you to take photos and share them with us.",
    },
    {
      q: "How did you two meet?",
      a: "Read Our Story!",
    },
    {
      q: "Who made the first move? How did it happen?",
      a:
        "Her:\n" +
        "Him: I made the first move by texting her \"I really enjoyed our " +
        "conversation and would love to treat you out to dinner again!\"",
    },
    {
      q: "Who takes out the trash?",
      a: "Whoever's closest to the trash :) But he tends to be closer to the trash, most of the times.",
    },
    {
      q: "What's your most memorable date?",
      a:
        "Her:\n" +
        "Him: Our first date was definitely the most memorable! A close second: " +
        "We went to a Celtics vs Lakers game and got to see all our favorite " +
        "players in one game.",
    },
    {
      q: "What's your favorite activity to do together?",
      a:
        "Watching movies, going to see ballet, and finding the most delicious " +
        "restaurants. Most of all, we love traveling to new places and exploring " +
        "the world!",
    },
    {
      q: "Where are you going for your honeymoon?",
      a: "We are going to Tanzania, hopefully to catch the start of the calving season!",
    },
    {
      q: "What's the best meal you've shared together?",
      a:
        "Her:\n" +
        "Him: Our best homemade meal was a delicious tomato sauce pasta that she " +
        "made. Outside, there are so many to choose from, but Langosteria in " +
        "Italy is one of them.",
    },
    {
      q: "What's the most memorable trip you've taken together?",
      a:
        "Last December, we went to Iceland to see the Northern lights. Not only " +
        "did we check off that from our bucketlist, we drove through a " +
        "sandstorm, blizzard, rain, and hailstorm all in the same day!",
    },
    {
      q: "Who fell first?",
      a: "Both of us insist it was the other one.",
    },
    {
      q: "Best trip so far?",
      a:
        "Christmas dinner at Hotel Grones in the Dolomites — nothing beats a " +
        "meal someone else cooks for you. (Napa, Cyprus, and Vienna are close " +
        "runners-up.)",
    },
    {
      q: "Do you two want a dog?",
      a:
        "For now the head of our household is a stuffed bear named Doremy, and " +
        "honestly she's already a handful. A real dog is a someday-dream once " +
        "we settle into the new place — pending Doremy's approval, of course.",
    },
    {
      q: "When did you know you were ready to marry?",
      a:
        "It wasn't a grand moment. The day after Valentine's, snow coming down " +
        "hard in Boston, the two of us in a snowed-in car watching YouTube " +
        "while it melted — that's when I realized I could do absolutely nothing " +
        "with this person and be happy. And once I noticed that even eight time " +
        "zones apart my day never felt over until we'd talked, I was sure.",
    },
    {
      q: "An inside joke only you two get?",
      a:
        "We have our own baby-talk dialect where we call ourselves 됴니 and 쇼니 " +
        "in the third person — and there's a bear named Doremy with strong " +
        "opinions.",
    },
    {
      q: "Your perfect weekend?",
      a:
        "Hunting down one great restaurant, catching a ballet, and an evening " +
        "of Doyoon playing guitar and singing to himself.",
    },
    {
      q: "Each of your superpowers?",
      a:
        "Soyeon: Making things actually happen — plans, bookings, " +
        "problem-solving all get finished once they reach her.\n" +
        "Doyoon: Keeping things calm — and a human map of every good restaurant.",
    },
    {
      q: "Your first-dance song?",
      a:
        "We're torn between Can't Take My Eyes Off You, Turning Page, Risk It " +
        "All, and Die With a Smile.",
    },
    {
      q: "Who is Doremy?",
      a:
        "Soyeon's stuffed bear and the unofficial third member of this " +
        "relationship. Her wedding invite was genuinely debated.",
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
    message:
      "Please let us know whether you can make it by the date below — it helps " +
      "us get an accurate headcount. We hope to see you there!",
  },

  moments: {
    intro:
      "A place for photos — engagement pictures now, wedding-day memories later. " +
      "Click any empty frame on the site to add a photo.",
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
    { id: "registry", label: "Registry" },
    { id: "moments",  label: "Moments" },
    { id: "rsvp",     label: "RSVP" },
  ],
};
