export interface SeedPortfolioItemLinkType {
  id: number
  url: string
  label: string
  isInternal: boolean
}

export interface SeedPortfolioItemType {
  categories: string[]
  description: string
  githubLinks: SeedPortfolioItemLinkType[]
  homeImage: string
  id: number
  images: string[]
  name: string
  primaryImage: string
  productLinks: SeedPortfolioItemLinkType[]
  products: string[]
  projectId: string
}

const portfolioItemArray: SeedPortfolioItemType[] = [
  {
    categories: [ 'development' ],
    name: 'Fantasy Team Advice',
    id: 1,
    githubLinks: [],
    projectId: 'fantasyteamadvice',
    products: [ 'Fantasy Sports Platform' ],
    homeImage: 'https://ik.imagekit.io/l1kppwkihn2/Kelleghan_Design/fantasy-team-advice/tr:w-720,ar-1-1/ftasitemocks-quare_Nk9p8yTg9.jpeg',
    primaryImage: 'https://ik.imagekit.io/l1kppwkihn2/Kelleghan_Design/fantasy-team-advice/tr:w-720,ar-1-1/ftasitemocks-quare_Nk9p8yTg9.jpeg',
    images: [],
    productLinks: [{
      isInternal: false,
      id: 22,
      label: 'Visit Fantasy Team Advice',
      url: 'https://fantasyteamadvice.com/'
    }],
    description: 'The Fantasy Team Advice platform provides a comprehensive suite of fantasy tools, content, and advice for thousands of active fantasy sports players. It offers a subscription service with multiple tiers, lineup generators, and advanced sports data analysis tools for more than eight sports leagues. The front end is built on React served by a Node/Express back end and hosted on an AWS EC2 linux instance with Postgres and SQL. Several independent Node APIs are used to aggregate live sports data stored in the application database. Lineups are generated in an independent AWS Lambda Python function and relayed back to the client in real time using websockets. Recurring subscriptions are managed by Stripe and PayPal and synchronized with the application database via webhooks.'
  },
  {
    categories: [ 'development', 'design' ],
    name: 'Dropzio',
    id: 2,
    productLinks: [],
    projectId: 'dropzio',
    homeImage: 'https://ik.imagekit.io/l1kppwkihn2/Kelleghan_Design/dropzio/tr:w-720,ar-1-1/dropziomocksquare_b2vyb8lrkH.jpg',
    products: [ 'Logo', 'Mobile App' ],
    primaryImage: 'https://ik.imagekit.io/l1kppwkihn2/Kelleghan_Design/dropzio/tr:w-720,ar-1-1/dropzio_E0JxTuxn7.jpg',
    images: [ 'https://ik.imagekit.io/l1kppwkihn2/Kelleghan_Design/dropzio/tr:w-720,ar-1400-2022/dropziomock1_Bx_s99zIM.jpg', 'https://ik.imagekit.io/l1kppwkihn2/Kelleghan_Design/dropzio/tr:w-720,ar-1400-2022/dropziomock2_1ggb_UkV6.jpg', 'https://ik.imagekit.io/l1kppwkihn2/Kelleghan_Design/dropzio/tr:w-720,ar-1400-2022/dropziomock3_-eefbAb6j5.jpg', 'https://ik.imagekit.io/l1kppwkihn2/Kelleghan_Design/dropzio/tr:w-720,ar-1400-2022/dropziomock4_kMtxQ6n8Wd.jpg' ],
    githubLinks: [{
      isInternal: false,
      id: 1,
      url: 'https://github.com/kelleghan1/dropzioApp2/',
      label: 'View front end Github'
    }, {
      isInternal: false,
      id: 2,
      url: 'https://github.com/kelleghan1/dropzio_server/',
      label: 'View back end on Github'
    }],
    description: 'Dropzio is a geolocation hybrid app that allows users to post images and messages to their current location. The posts then become visible to other users in the vicinity. Dropzio was created with Cordova and Ionic and was written in AngularJS. The back end was created using Ruby on Rails and manages users, posts, and geographic data. The logo was created with Adobe Illustrator.'
  },
  {
    categories: [ 'design' ],
    name: 'Silverline Media',
    id: 3,
    projectId: 'silverlineMedia',
    githubLinks: [],
    productLinks: [],
    products: [ 'Logo' ],
    homeImage: 'https://ik.imagekit.io/l1kppwkihn2/Kelleghan_Design/silverline-media/tr:w-720,ar-1-1/silverlinemediagrey_ssSTGmmM-.jpg',
    primaryImage: 'https://ik.imagekit.io/l1kppwkihn2/Kelleghan_Design/silverline-media/tr:w-720,ar-1-1/silverlinemediagrey_ssSTGmmM-.jpg',
    images: [ 'https://ik.imagekit.io/l1kppwkihn2/Kelleghan_Design/silverline-media/tr:w-720,ar-1-1/silverlinemediawhite_jtQX8h3Oj.jpg', 'https://ik.imagekit.io/l1kppwkihn2/Kelleghan_Design/silverline-media/tr:w-720,ar-1-1/silverlinemediablack_YcYKRv3dX.jpg' ],
    description: 'Silverline Media offers photo and video production services. The logo was created using Adobe Illustrator.'
  },
  {
    categories: [ 'design', 'development' ],
    name: 'Carvell Design + Build',
    id: 4,
    githubLinks: [],
    projectId: 'carvell',
    products: [ 'Brand', 'Website' ],
    homeImage: 'https://ik.imagekit.io/l1kppwkihn2/Kelleghan_Design/carvell/tr:w-720,ar-1-1/carvellsitemock-square_jeQbNSMds.jpg',
    primaryImage: 'https://ik.imagekit.io/l1kppwkihn2/Kelleghan_Design/carvell/tr:w-720,ar-1-1/carvell_SElIRCSph.png',
    images: [ 'https://ik.imagekit.io/l1kppwkihn2/Kelleghan_Design/carvell/tr:w-720,ar-1-1/carvellsitemock-square_jeQbNSMds.jpg', 'https://ik.imagekit.io/l1kppwkihn2/Kelleghan_Design/carvell/tr:w-720,ar-1-1/carvellwhite__63zGVZDz.png' ],
    productLinks: [],
    description: 'Carvell Design + Build is a full service design and build firm that specializes in customized remodels and restoration, additions, and new construction work. The logo was created with Adobe Illustrator and the Carvell website was created using Wordpress.'
  },
  {
    categories: [ 'design', 'development' ],
    name: 'Flight Switch',
    id: 5,
    productLinks: [],
    projectId: 'flightswitch',
    homeImage: 'https://ik.imagekit.io/l1kppwkihn2/Kelleghan_Design/flightswitch/tr:w-720,ar-1-1/flightswitchblack_b_g4OmDsi.jpg',
    products: [ 'Logo', 'Shirt Designs', 'Online Store' ],
    primaryImage: 'https://ik.imagekit.io/l1kppwkihn2/Kelleghan_Design/flightswitch/tr:w-720,ar-1-1/flightswitchblack_b_g4OmDsi.jpg',
    images: [ 'https://ik.imagekit.io/l1kppwkihn2/Kelleghan_Design/flightswitch/tr:w-720,ar-1-1/flightswitchsitemock_NCHEmQYC-.jpg', 'https://ik.imagekit.io/l1kppwkihn2/Kelleghan_Design/flightswitch/tr:w-720,ar-1-1/flightswitchwhite_FFWX7SQ3d.jpg', 'https://ik.imagekit.io/l1kppwkihn2/Kelleghan_Design/flightswitch/tr:w-720,ar-1-1/shirtastro_OEW5cGtn-Q.png', 'https://ik.imagekit.io/l1kppwkihn2/Kelleghan_Design/flightswitch/tr:w-720,ar-1-1/shirtcity_Uki_5gzIZl.png', 'https://ik.imagekit.io/l1kppwkihn2/Kelleghan_Design/flightswitch/tr:w-720,ar-1-1/shirtflag_KX8rhDAT4y.png', 'https://ik.imagekit.io/l1kppwkihn2/Kelleghan_Design/flightswitch/tr:w-720,ar-1-1/shirtsoldier_yXcMkDynND.png' ],
    githubLinks: [{
      isInternal: false,
      id: 3,
      url: 'https://github.com/kelleghan1/flight-switch-store/',
      label: 'View on Github'
    }],
    description: 'Flight Switch is a Colorado based clothing company. The brand and products were created using Adobe Illustrator, Adobe Photoshop, and Adobe InDesign. The online store was created with JavaScript and Handlebars on the front end. The back end was created with Express, Bookshelf, and Knex to manage a robust inventory management system for administrators.'
  },
  {
    categories: [ 'design' ],
    name: 'Grillerz Pub',
    id: 7,
    githubLinks: [],
    productLinks: [],
    projectId: 'grillerzpub',
    products: [ 'Logo' ],
    homeImage: 'https://ik.imagekit.io/l1kppwkihn2/Kelleghan_Design/grillerz/tr:w-720,ar-1-1/grillerzflames_la6pwSJG1N.jpg',
    primaryImage: 'https://ik.imagekit.io/l1kppwkihn2/Kelleghan_Design/grillerz/tr:w-720,ar-1-1/grillerzflames_la6pwSJG1N.jpg',
    images: [ 'https://ik.imagekit.io/l1kppwkihn2/Kelleghan_Design/grillerz/tr:w-720,ar-1-1/grillerzsign_Kd5bvPsH2K.jpg', 'https://ik.imagekit.io/l1kppwkihn2/Kelleghan_Design/grillerz/tr:w-720,ar-1-1/grillerzwhite_X4Inkg-hp.jpg' ],
    description: 'Grillerz Pub is a bar and restaurant in Englewood, Colorado. The logo was created using Adobe Illustrator.'
  },
  {
    categories: [ 'development' ],
    name: 'Knight Moves',
    id: 8,
    projectId: 'knightmoves',
    homeImage: 'https://ik.imagekit.io/l1kppwkihn2/Kelleghan_Design/knight-moves/tr:w-720,ar-1-1/knightmovesmock_S03mdjcKr-.png',
    primaryImage: 'https://ik.imagekit.io/l1kppwkihn2/Kelleghan_Design/knight-moves/tr:w-720,ar-1-1/knightmoves_L8c2IAVwf.png',
    products: [ 'Side Project' ],
    images: [ 'https://ik.imagekit.io/l1kppwkihn2/Kelleghan_Design/knight-moves/tr:w-720,ar-1-1/knightmovesmock_S03mdjcKr-.png' ],
    productLinks: [{
      id: 4,
      url: '/project/knightmoves/demo',
      label: 'Try the app',
      isInternal: true
    }],
    githubLinks: [{
      isInternal: false,
      id: 5,
      label: 'View on Github (Angular)',
      url: 'https://github.com/kelleghan1/knight/'
    }, {
      isInternal: false,
      id: 6,
      label: 'View on Github (React, NPM package)',
      url: 'https://github.com/kelleghan1/knight_moves_2'
    }],
    description: 'Knight Moves is a web application that calculates the minimum number of moves needed for a chess knight to reach a given position. The app was written in Javascript and AngularJS in 2016, and rewritten with React as a public npm package in 2022.'
  },
  {
    categories: [ 'design' ],
    name: 'Sunshine Tree Farm',
    id: 9,
    githubLinks: [],
    productLinks: [],
    projectId: 'sunshinetreefarm',
    products: [ 'Logo' ],
    homeImage: 'https://ik.imagekit.io/l1kppwkihn2/Kelleghan_Design/sunshine-tree-farm/tr:w-720,ar-1-1/sunshinetreefarmwhite_S0yxmmJcN.jpg',
    primaryImage: 'https://ik.imagekit.io/l1kppwkihn2/Kelleghan_Design/sunshine-tree-farm/tr:w-720,ar-1-1/sunshinetreefarmwhite_S0yxmmJcN.jpg',
    images: [ 'https://ik.imagekit.io/l1kppwkihn2/Kelleghan_Design/sunshine-tree-farm/tr:w-720,ar-1-1/sunshinetreefarmgreen_FdpiJWA6P.jpg', 'https://ik.imagekit.io/l1kppwkihn2/Kelleghan_Design/sunshine-tree-farm/tr:w-720,ar-1-1/sunshinetreefarmblack_tYwOECyH8.jpg' ],
    description: 'Sunshine Tree Farm grows and sell a variety of trees in Colorado. The logo was created with Adobe Illustrator.'
  },
  {
    categories: [ 'design' ],
    name: 'Alchemist Labs',
    products: [ 'Logo' ],
    id: 10,
    githubLinks: [],
    productLinks: [],
    projectId: 'alchemistlabs',
    homeImage: 'https://ik.imagekit.io/l1kppwkihn2/Kelleghan_Design/alchemist-labs/tr:w-720,ar-1-1/alchemistlabswater_xIp3bElxN.jpeg',
    primaryImage: 'https://ik.imagekit.io/l1kppwkihn2/Kelleghan_Design/alchemist-labs/tr:w-720,ar-1-1/alchemistlabswater_xIp3bElxN.jpeg',
    images: [ 'https://ik.imagekit.io/l1kppwkihn2/Kelleghan_Design/alchemist-labs/tr:w-720,ar-1-1/alchemistlabsblue_PVxSKKBcN.jpeg' ],
    description: 'Alchemist Labs produces vapor concentrate for vaporizer products. The logo was created using Adobe Illustrator.'
  },
  {
    categories: [ 'development' ],
    name: 'Yodel',
    id: 11,
    projectId: 'yodel',
    productLinks: [],
    homeImage: 'https://ik.imagekit.io/l1kppwkihn2/Kelleghan_Design/yodel/tr:w-720,ar-1-1/yodelmocksquare_2yAPmk591j.jpg',
    primaryImage: 'https://ik.imagekit.io/l1kppwkihn2/Kelleghan_Design/yodel/tr:w-720,ar-1-1/yodel_KPmKL107I.jpg',
    products: [ 'Logo, Mobile App' ],
    githubLinks: [
      {
        isInternal: false,
        id: 7,
        label: 'View front end on Github',
        url: 'https://github.com/MSturges/YodelApp/'
      },
      {
        isInternal: false,
        id: 8,
        label: 'View back end on Github',
        url: 'https://github.com/MatieuB/yodel/'
      }
    ],
    images: [ 'https://ik.imagekit.io/l1kppwkihn2/Kelleghan_Design/yodel/tr:w-720,ar-1400-2022/yodelmock_CTau4Lccl.jpg', 'https://ik.imagekit.io/l1kppwkihn2/Kelleghan_Design/yodel/tr:w-720,ar-1400-2022/yodelmock1_mo_RtNbq4.jpg', 'https://ik.imagekit.io/l1kppwkihn2/Kelleghan_Design/yodel/tr:w-720,ar-1400-2022/yodelmock3_XLu48cQsx.jpg', 'https://ik.imagekit.io/l1kppwkihn2/Kelleghan_Design/yodel/tr:w-720,ar-1400-2022/yodelmock4_kSOp_TZZsL.jpg' ],
    description: 'Yodel is a social geolocation hybrid app designed to promote meeting new people and face to face interaction. The app allows users to see others within a custom range and send those users messages. It was created in Ionic and Cordova and written in AngularJS. It leverages an Express back end with Knex and SQL to manage users and their location data. The logo was created using Adobe Illustrator.'
  },
  {
    categories: [ 'design' ],
    name: 'Jam Factory',
    products: [ 'Logo' ],
    id: 12,
    githubLinks: [],
    productLinks: [],
    projectId: 'jamfactory',
    homeImage: 'https://ik.imagekit.io/l1kppwkihn2/Kelleghan_Design/jam-factory/tr:w-720,ar-1-1/jamfactorywhite_FSzRXarCc.jpg',
    primaryImage: 'https://ik.imagekit.io/l1kppwkihn2/Kelleghan_Design/jam-factory/tr:w-720,ar-1-1/jamfactorywhite_FSzRXarCc.jpg',
    images: [ 'https://ik.imagekit.io/l1kppwkihn2/Kelleghan_Design/jam-factory/tr:w-720,ar-1-1/jamfactoryblack_MnvFdJtCY7.jpg', 'https://ik.imagekit.io/l1kppwkihn2/Kelleghan_Design/jam-factory/tr:w-720,ar-1-1/jamfactoryblackandwhite_Q09rWb8wn.jpg' ],
    description: 'Jam Factory is a music and entertainment event coordination and promotion company. The logo was created using Adobe Illustrator.'
  },
  {
    categories: [ 'design' ],
    name: 'Revmatek',
    products: [ 'Logo' ],
    id: 168,
    githubLinks: [],
    productLinks: [],
    projectId: 'revmatek',
    homeImage: 'https://ik.imagekit.io/l1kppwkihn2/Kelleghan_Design/revmatek/tr:w-720,ar-1-1/revmatekorange_UYq3DUNd4.jpg',
    primaryImage: 'https://ik.imagekit.io/l1kppwkihn2/Kelleghan_Design/revmatek/tr:w-720,ar-1-1/revmatekorange_UYq3DUNd4.jpg',
    images: [ 'https://ik.imagekit.io/l1kppwkihn2/Kelleghan_Design/revmatek/tr:w-720,ar-1-1/revmatekblack_omDHIsiWP.jpg', 'https://ik.imagekit.io/l1kppwkihn2/Kelleghan_Design/revmatek/tr:w-720,ar-1-1/revmatekwhite_WPcaZtP4b.jpg' ],
    description: 'Revmatek offers peer to peer streaming service and solutions. The logo was created using Adobe Illustrator.'
  },
  {
    categories: [ 'design', 'development' ],
    name: 'Family Home Health',
    id: 13,
    githubLinks: [],
    productLinks: [],
    projectId: 'familyhomehealth',
    products: [ 'Brochure', 'Website' ],
    homeImage: 'https://ik.imagekit.io/l1kppwkihn2/Kelleghan_Design/family-home-health/tr:w-720,ar-1-1/fhhsite-square_fSanw_PqU.jpg',
    primaryImage: 'https://ik.imagekit.io/l1kppwkihn2/Kelleghan_Design/family-home-health/tr:w-720,ar-1-1/fhhsite-square_fSanw_PqU.jpg',
    images: [ 'https://ik.imagekit.io/l1kppwkihn2/Kelleghan_Design/family-home-health/tr:w-720,ar-1-1/fhhbrochuresquare-inside_lBILZhAJA.jpg', 'https://ik.imagekit.io/l1kppwkihn2/Kelleghan_Design/family-home-health/tr:w-720,ar-1-1/fhhbrochuresquare-outside_DQUbi1HuP.jpg' ],
    description: 'Family Home Health is a Colorado based company that offers health care at the homes of their patients. Their trifold brochure was created using Adobe Indesign, Adobe Illustrator, and Adobe Photoshop. The Family Home Health website was created in Wordpress.'
  },
  {
    categories: [ 'design' ],
    name: 'Purple State Productions',
    id: 14,
    githubLinks: [],
    productLinks: [],
    projectId: 'purplerstateproductions',
    products: [ 'Logo', 'Event Poster' ],
    homeImage: 'https://ik.imagekit.io/l1kppwkihn2/Kelleghan_Design/purple-state/tr:w-720,ar-1-1/purplestateblack_cQUWZop-B.jpg',
    primaryImage: 'https://ik.imagekit.io/l1kppwkihn2/Kelleghan_Design/purple-state/tr:w-720,ar-1-1/purplestateblack_cQUWZop-B.jpg',
    images: [ 'https://ik.imagekit.io/l1kppwkihn2/Kelleghan_Design/purple-state/tr:w-720,ar-1000-1318/purplestatepostermock_irUDvOs0M.png', 'https://ik.imagekit.io/l1kppwkihn2/Kelleghan_Design/purple-state/tr:w-720,ar-1-1/purplestatewhite_U7iHBf6fB.jpg' ],
    description: 'Purple State organizes shows and music related events. The logo was created using Adobe Illustrator. The event poster was created using Adobe Illustrator, Adobe Photoshop, and Adobe InDesign.'
  },
  {
    categories: [ 'design' ],
    name: 'Rising Sun',
    id: 15,
    githubLinks: [],
    productLinks: [],
    projectId: 'risingsun',
    products: [ 'Logo', 'Album Cover', 'Booklet' ],
    homeImage: 'https://ik.imagekit.io/l1kppwkihn2/Kelleghan_Design/rising-sun/tr:w-720,ar-1-1/risingsuncover_uJxKqrSp8.jpg',
    primaryImage: 'https://ik.imagekit.io/l1kppwkihn2/Kelleghan_Design/rising-sun/tr:w-720,ar-1-1/risingsuncover_uJxKqrSp8.jpg',
    images: [ 'https://ik.imagekit.io/l1kppwkihn2/Kelleghan_Design/rising-sun/tr:w-720,ar-1-1/risingsunbook_LWWfyLLFL.jpg', 'https://ik.imagekit.io/l1kppwkihn2/Kelleghan_Design/rising-sun/tr:w-720,ar-1-1/risingsundisc_-jBqOOSUH.jpg', 'https://ik.imagekit.io/l1kppwkihn2/Kelleghan_Design/rising-sun/tr:w-720,ar-1-1/risingsunlogo_27Oap8ULNG.jpg' ],
    description: 'Rising sun is an English DJ and producer. The album cover and logo were created using Adobe Illustrator, Adobe Photoshop, and Adobe InDesign.'
  },
  {
    categories: [ 'design' ],
    name: 'Teneo Talent',
    id: 16,
    githubLinks: [],
    productLinks: [],
    projectId: 'teneotalent',
    products: [ 'Logo' ],
    homeImage: 'https://ik.imagekit.io/l1kppwkihn2/Kelleghan_Design/teneo-talent/tr:w-720,ar-1-1/teneotalentwhite_wL6-VsPkR.jpg',
    primaryImage: 'https://ik.imagekit.io/l1kppwkihn2/Kelleghan_Design/teneo-talent/tr:w-720,ar-1-1/teneotalentwhite_wL6-VsPkR.jpg',
    images: [ 'https://ik.imagekit.io/l1kppwkihn2/Kelleghan_Design/teneo-talent/tr:w-720,ar-1-1/teneotalentblack_jZuCsP1tdH.jpg' ],
    description: 'Teneo Talent is a job placement service based in Colorado. The logo and the Teneo Talent website were redesigned using Adobe Illustrator.'
  },
  {
    categories: [ 'design' ],
    name: 'Proper Motion',
    id: 17,
    githubLinks: [],
    productLinks: [],
    projectId: 'propermotion',
    products: [ 'Album Cover' ],
    homeImage: 'https://ik.imagekit.io/l1kppwkihn2/Kelleghan_Design/proper-motion/tr:w-720,ar-1-1/propermotioncover_ijoAHV3l3.jpg',
    primaryImage: 'https://ik.imagekit.io/l1kppwkihn2/Kelleghan_Design/proper-motion/tr:w-720,ar-1-1/propermotioncover_ijoAHV3l3.jpg',
    images: [],
    description: 'Proper Motion is a music producer based in Colorado. The album cover was created using Adobe Photoshop and Adobe Illustrator.'
  },
  {
    categories: [ 'design' ],
    name: 'Craft Health',
    id: 18,
    githubLinks: [],
    projectId: 'crafthealth',
    products: [ 'Logo' ],
    homeImage: 'https://ik.imagekit.io/l1kppwkihn2/Kelleghan_Design/craft-health/tr:w-720,ar-1-1/crafthealthblue_GZqACGml-.jpg',
    primaryImage: 'https://ik.imagekit.io/l1kppwkihn2/Kelleghan_Design/craft-health/tr:w-720,ar-1-1/crafthealthblue_GZqACGml-.jpg',
    images: [ 'https://ik.imagekit.io/l1kppwkihn2/Kelleghan_Design/craft-health/tr:w-720,ar-1-1/crafthealthwhite_RxZ0iq96P.png' ],
    productLinks: [{
      isInternal: false,
      id: 9,
      label: 'Visit Craft Health',
      url: 'https://crafthealth.net/'
    }],
    description: 'Craft Health is a leading home health and hospice provider in Colorado offering Skilled Nursing, Physical Therapy, Speech Therapy, CNA services, and more. The logo was created in Adobe Illustrator.'
  },
  {
    categories: [ 'design', 'development' ],
    name: 'Family Hospice',
    id: 89,
    projectId: 'familyhospice',
    githubLinks: [],
    productLinks: [],
    products: [ 'Brochure', 'Website' ],
    homeImage: 'https://ik.imagekit.io/l1kppwkihn2/Kelleghan_Design/family-hospice/tr:w-720,ar-1-1/familyhospicesite-square_rwxgRVU8Q.jpg',
    primaryImage: 'https://ik.imagekit.io/l1kppwkihn2/Kelleghan_Design/family-hospice/tr:w-720,ar-1-1/familyhospicesite-square_rwxgRVU8Q.jpg',
    images: [ 'https://ik.imagekit.io/l1kppwkihn2/Kelleghan_Design/family-hospice/tr:w-720,ar-1-1/familyhospicebrochuresquare-inside_3lyerYFWo.jpg', 'https://ik.imagekit.io/l1kppwkihn2/Kelleghan_Design/family-hospice/tr:w-720,ar-1-1/familyhospicebrochuresquare-outside_HN-6nP7_s.jpg' ],
    description: 'Family Hospice is an end of life care service. They serve patients at their homes in order to maximize quality of life. Their brochure was creaed using Adobe Illustrator, Adobe InDesign, and Adobe Photoshop. The Family Hospice website was created using the Adobe Creative Suite and Wordpress.'
  },
  {
    categories: [ 'design' ],
    name: 'Moonwalkers',
    id: 77,
    githubLinks: [],
    productLinks: [],
    projectId: 'moonwalkers',
    products: [ 'Logo' ],
    homeImage: 'https://ik.imagekit.io/l1kppwkihn2/Kelleghan_Design/moonwalkers/tr:w-720,ar-1-1/moonwalkerswhite_DN4hyMRXz.jpg',
    primaryImage: 'https://ik.imagekit.io/l1kppwkihn2/Kelleghan_Design/moonwalkers/tr:w-720,ar-1-1/moonwalkerswhite_DN4hyMRXz.jpg',
    images: [ 'https://ik.imagekit.io/l1kppwkihn2/Kelleghan_Design/moonwalkers/tr:w-720,ar-1-1/moonwalkerspink_EH8gRDqaS.jpg', 'https://ik.imagekit.io/l1kppwkihn2/Kelleghan_Design/moonwalkers/tr:w-720,ar-1-1/moonwalkersblack_dC_jfmX3Q.jpg' ],
    description: 'Moonwalkers is an all cancer benefit and fundraising team. Their logo was created using Adobe Illustrator.'
  },
  {
    categories: [ 'design' ],
    name: 'Absinthe House',
    id: 22,
    githubLinks: [],
    productLinks: [],
    projectId: 'absinthehouse',
    products: [ 'Logo', 'Menu', 'Website' ],
    homeImage: 'https://ik.imagekit.io/l1kppwkihn2/Kelleghan_Design/absinthe-house/tr:w-720,ar-1-1/absinthehouseblack_5WIbDqnQ6.png',
    primaryImage: 'https://ik.imagekit.io/l1kppwkihn2/Kelleghan_Design/absinthe-house/tr:w-720,ar-1-1/absinthehouseblack_5WIbDqnQ6.png',
    images: [ 'https://ik.imagekit.io/l1kppwkihn2/Kelleghan_Design/absinthe-house/tr:w-720,ar-1-1/absinthehousesite-square_G5__dLkld.jpg', 'https://ik.imagekit.io/l1kppwkihn2/Kelleghan_Design/absinthe-house/tr:w-720,ar-1-1/absinthehousewhite_P7g4Vkk6g.png', 'https://ik.imagekit.io/l1kppwkihn2/Kelleghan_Design/absinthe-house/tr:w-720,ar-1200-800/absinthemenumockup_1DnD6-KNl.png' ],
    description: 'Absinthe House is a bar and nightclub in Boulder, Colorado. Adobe Illustrator and Adobe InDesign were used to create the vector banner and menu. The Absinthe House website was designed using Adobe Illustrator and built in Wix.'
  },
  {
    categories: [ 'design', 'development' ],
    name: 'Clarimatch',
    id: 169,
    githubLinks: [],
    productLinks: [],
    projectId: 'clarimatch',
    products: [ 'Brand', 'Mobile App', 'Website' ],
    homeImage: 'https://ik.imagekit.io/l1kppwkihn2/Kelleghan_Design/clarimatch/tr:w-720,ar-1-1/clarimatch_PLACEHOLDER.jpg',
    primaryImage: 'https://ik.imagekit.io/l1kppwkihn2/Kelleghan_Design/clarimatch/tr:w-720,ar-1-1/clarimatch_PLACEHOLDER.jpg',
    images: [],
    description: 'Clarimatch is a health-first dating app that removes the stress of how and when to share your health conditions, connecting members with people who are looking for them and share their experience. A user health conditions are never shown publicly and are only visible to people they have matched with. Users can mark a condition as preferred or required, which soft ranks matching profiles higher in the discovery feed rather than filtering anyone out. The product is a pnpm and Turborepo monorepo containing a Next.js web application that also serves as the single backend for both platforms, and a React Native and Expo mobile app for iOS and Android that shares the same logic and data. All profiles, photos, matches, messages, health conditions, and preferences are stored in PostgreSQL and accessed through Prisma. Cloud infrastructure is defined in Terraform on AWS, and a paid subscription tier unlocks additional features.'
  },
  {
    categories: [ 'development' ],
    name: 'Kelldev Agent',
    id: 170,
    githubLinks: [],
    productLinks: [],
    projectId: 'kelldevagent',
    products: [ 'Side Project' ],
    homeImage: 'https://ik.imagekit.io/l1kppwkihn2/Kelleghan_Design/kelldev-agent/tr:w-720,ar-1-1/kelldevagent_PLACEHOLDER.jpg',
    primaryImage: 'https://ik.imagekit.io/l1kppwkihn2/Kelleghan_Design/kelldev-agent/tr:w-720,ar-1-1/kelldevagent_PLACEHOLDER.jpg',
    images: [],
    description: 'Kelldev Agent is a Dockerized command line tool that uses Claude Code to work across multiple git repositories. Work is described in natural language, Claude plans it interactively against the real codebase, and then executes it headlessly, creating branches, making changes, and opening pull requests. It is written in TypeScript on Node.js using ESM, with SQLite accessed through Drizzle ORM for projects, tasks, executions, and todos. A background worker polls for queued tasks and runs them one at a time per project, and a static React, Vite, and Tailwind dashboard reports project, task, execution, and system log state.'
  }]

export default portfolioItemArray