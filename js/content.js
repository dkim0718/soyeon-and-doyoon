// ============================================================
//  SITE CONTENT — edit everything about your wedding here.
//  This file is plain data: change any text, add or remove
//  items, save, and refresh the page.
// ============================================================

const SITE = {
  couple: {
    partner1: "Soyeon",
    partner2: "Doyoon",
    displayName: "Soyeon & Doyoon",
    monogram: "S & D",
  },

  wedding: {
    // Used for the countdown. Include the timezone offset (+09:00 = Seoul).
    dateISO: "2026-10-30T12:00:00+09:00",
    dateDisplay: "Friday, October 30, 2026",
    timeDisplay: "12:00 PM (KST)", // placeholder — set your ceremony time
    venue: "Yeong Bin Gwan, The Shilla Seoul",
    venueAddress: "249 Dongho-ro, Jung District, Seoul, South Korea",
    city: "Seoul, South Korea",
  },

  welcome: {
    heading: "We're getting married!",
    message:
      "We are so excited to celebrate with you. Here you'll find everything you " +
      "need to know about our wedding weekend — the schedule, where to stay, " +
      "how to get there, and answers to common questions. We can't wait to see you in Seoul!",
  },

  story: {
    intro: "How we met",
    text: "The first time I saw him, we were both waiting at the same gate for a flight to Tokyo. I remember glancing over and thinking, Wow, he's cute. When I got to my seat, I noticed the seat next to me was empty and thought, how amazing would it be if he sat there?\n\nAnd he did. We started chatting, he asked for my number, and then we went our separate ways. I was sure I'd never hear from him again. I thought about him now and then, but eventually he just became another 'missed connection.' Then, a few months later, out of nowhere, he messaged me, 'Happy New Year.' From there, it was like nothing had ever changed.",
  },

  // Add, remove, or reorder schedule items freely.
  schedule: [
    {
      title: "Wedding Ceremony",
      date: "Friday, October 30, 2026",
      time: "12:00 PM", // placeholder — set your real time
      location: "Yeong Bin Gwan, The Shilla Seoul",
      note: "Ceremony followed by lunch reception. Formal attire.",
    },
    {
      title: "Reception",
      date: "Friday, October 30, 2026",
      time: "1:00 PM", // placeholder — set your real time
      location: "Yeong Bin Gwan, The Shilla Seoul",
      note: "Dinner, toasts, and time together with the people we love most.",
    },
  ],

  hotels: [
      {
          "name": "The Shilla Seoul",
          "address": "249, Dongho-ro, Jung-gu",
          "stars": 5,
          "blurb": "Don't miss out on the many recreational opportunities, including an indoor pool, a hot tub, and a sauna. Additional features at this hotel include complimentary wireless internet access, concierge services, and gift shops/newsstands. Guests can get to nearby shops on the complimentary shuttle."
      },
      {
          "name": "The Ambassador Seoul - A Pullman Hotel",
          "address": "287, Dongho-ro, Jung-gu",
          "stars": 5,
          "blurb": "Take advantage of recreational opportunities offered, including a health club, an outdoor pool, and an indoor pool. Additional features at this hotel include complimentary wireless internet access, concierge services, and wedding services."
      },
      {
          "name": "The Summit Hotel Seoul Dongdaemun",
          "address": "198, Jangchungdan-ro",
          "stars": 3.5,
          "blurb": "Take advantage of recreation opportunities such as a fitness center, or other amenities including complimentary wireless internet access and a banquet hall."
      },
      {
          "name": "Toyoko Inn Seoul Dongdaemun No.2",
          "address": "325, Toegye-ro, Jung-gu",
          "stars": 3,
          "blurb": "Make use of convenient amenities, which include complimentary wireless internet access and a vending machine."
      }
  ],

  travel: [
    {
      title: "Getting to Seoul",
      body:
        "Most international guests will fly into Incheon International Airport (ICN), " +
        "about 70–90 minutes from the venue by car or airport limousine bus. " +
        "Gimpo Airport (GMP) is closer — roughly 40 minutes — and handles many " +
        "regional flights from Japan, China, and Taiwan.",
    },
    {
      title: "Getting to the venue",
      body:
        "The Shilla Seoul is located at 249 Dongho-ro, Jung District. The nearest " +
        "subway stop is Dongguk University Station (Line 3). Taxis and ride apps " +
        "(Kakao T) are inexpensive and easy to use throughout the city.",
    },
    {
      title: "Parking",
      body: "There's plenty of free parking near the venue entrance.",
    },
  ],

  qanda: [
      {
          "q": "When is the RSVP deadline?",
          "a": "Please RSVP by September 15 so we can get an accurate headcount. :)"
      },
      {
          "q": "Can I bring a date?",
          "a": "Check your invitation to see if you have a plus one."
      },
      {
          "q": "Can kids come?",
          "a": "We adore your kids, but we’re keeping the ceremony and reception adults-only. That said, we know some of you are traveling with children—your little ones are more than welcome at the Friday cocktail reception and Sunday brunch! If you need childcare during the ceremony, we’ll have babysitting available onsite. If you have any questions, just let us know!"
      },
      {
          "q": "What will the weather be like?",
          "a": "Welcome to Seoul! Late October is beautiful autumn weather — crisp and clear, with daytime highs around 55–65°F (13–18°C) and noticeably cooler evenings. Bring a light jacket or a layer for after sunset."
      },
      {
          "q": "Where should I park?",
          "a": "There’s plenty of free parking near the venue entrance."
      },
      {
          "q": "Are the ceremony and reception areas wheelchair accessible?",
          "a": "Absolutely! We’ll have a cart available for anyone who needs help getting around the property."
      },
      {
          "q": "What’s the dress code?",
          "a": "Check our Schedule for dress code details."
      },
      {
          "q": "Will the wedding be held indoors or outdoors?",
          "a": "Our wedding ceremony is outdoors, but our reception will be in a tent :)"
      },
      {
          "q": "What shoes should I wear (or avoid)?",
          "a": "Ladies, skip the stilettos—seriously! There are lots of grassy and uneven spots, so go for block heels or sandals instead. We don’t want anyone ruining their shoes or twisting an ankle."
      },
      {
          "q": "Can we use our phones or cameras to take photos at the wedding?",
          "a": "Absolutely! We’d love for you to snap photos and share them on our Joy app. We just ask that you don’t take pictures during the ceremony."
      },
      {
          "q": "How did you two meet?",
          "a": "Read Our Story!"
      },
      {
          "q": "Who made the first move—and how did it happen?",
          "a": "He texted me first on New Year’s Day. A few hours later, we already had dinner plans for that week."
      },
      {
          "q": "Who can I contact if I have questions?",
          "a": "If you have any questions, please reach out to our amazing Maid of Honor, Aoi, at +81 90-1234-5678."
      },
      {
          "q": "Who’s taking out the trash?",
          "a": "Whoever’s closest to the trash :)"
      },
      {
          "q": "What’s your most memorable date?",
          "a": "One of our first dates was biking and then kayaking through the coves around the Izu Peninsula. Our guide joked that a few hours in a tandem kayak will test any relationship—he was right! But we made it, and that adventure is still one of our favorite memories."
      },
      {
          "q": "What’s your favorite thing to do together?",
          "a": "We love paddleboarding and biking in the park!"
      },
      {
          "q": "Where are you headed for your honeymoon?",
          "a": "Anywhere with beautiful beaches! Maybe the Maldives before it goes completely underwater?"
      },
      {
          "q": "What's the best meal you've had together?",
          "a": "We splurged on a five-course dinner in Paris. It was magical."
      },
      {
          "q": "What's the most memorable trip you've taken together?",
          "a": "Last April, we got to see the Northern Lights in Norway. It was amazing!"
      },
      {
          "q": "We’re on the same page about",
          "a": "What's important to us. And that's spending time with the people we love most. (You all!)"
      }
  ],

  registry: {
    note:
      "Your presence at our wedding is the greatest gift of all. If you'd like " +
      "to give something more, we've put together a registry below.",
    links: [
      {
        label: "Our Registry",
        url: "https://withjoy.com/soyeon-and-doyoon/registry",
        description: "Our existing registry — cash funds and gifts.",
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

  // Default photos — files in the photos/ folder, shown to every visitor.
  // A photo you upload in the browser overrides these on your device only;
  // replace the files (same names) to change them for everyone.
  photos: {
    hero: "photos/hero.jpg",
    story: "photos/story.jpg",
  },
  galleryDefaults: [
    "photos/gallery-1.jpg",
    "photos/gallery-2.jpg",
    "photos/gallery-3.jpg",
    "photos/gallery-4.jpg",
    "photos/gallery-5.jpg",
  ],

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
