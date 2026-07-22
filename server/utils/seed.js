require("dotenv").config({ path: "../.env" });
const mongoose = require("mongoose");
const bcrypt   = require("bcryptjs");
const Hotel    = require("../models/Hotel");
const Room     = require("../models/Room");
const User     = require("../models/User");

const MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/havenstay";

const HOTELS_DATA = [
  {
    name: "Azura Overwater Villas",
    city: "Malé",
    country: "Maldives",
    address: "North Malé Atoll, Maldives",
    description: "Suspended above the crystal lagoon, each villa offers a private plunge pool, glass floor panels revealing marine life below, and butler service at your beck and call.",
    photos: ["https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=800&q=85"],
    rating: 4.9, reviewCount: 312, cheapestPrice: 420,
    tag: "Beachfront", category: "Resort", featured: true,
    amenities: ["Private Pool","Ocean Butler","Spa","Dive Center","Sunset Dining","Helicopter Transfer"],
  },
  {
    name: "Verlaine Haussmann",
    city: "Paris",
    country: "France",
    address: "8 Rue du Faubourg Saint-Honoré, Paris 75008",
    description: "A restored Haussmann mansion steps from the Champs-Élysées. Marble corridors, Michelin-starred dining, and rooms with unobstructed Eiffel Tower views.",
    photos: ["https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?w=800&q=85"],
    rating: 4.8, reviewCount: 528, cheapestPrice: 380,
    tag: "City Palace", category: "Urban", featured: true,
    amenities: ["Michelin Dining","Champagne Bar","Rooftop Terrace","Concierge","Spa","Private Chauffeur"],
  },
  {
    name: "Sakura Zen Ryokan",
    city: "Kyoto",
    country: "Japan",
    address: "Arashiyama, Ukyo Ward, Kyoto 616-0007",
    description: "Centuries-old wooden inn nestled in the bamboo groves of Arashiyama. Private onsen baths, kaiseki cuisine prepared by master chefs, and serene meditation gardens.",
    photos: ["https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?w=800&q=85"],
    rating: 4.9, reviewCount: 204, cheapestPrice: 340,
    tag: "Cultural", category: "Heritage", featured: false,
    amenities: ["Private Onsen","Kaiseki Dining","Tea Ceremony","Zen Garden","Ikebana Class","Temple Tour"],
  },
  {
    name: "Meridian Sky Towers",
    city: "Dubai",
    country: "UAE",
    address: "Sheikh Zayed Road, Dubai, UAE",
    description: "The highest hotel in the Middle East. Infinity pool at 350m, seven award-winning restaurants, and butler-serviced suites that redefine the word lavish.",
    photos: ["https://images.unsplash.com/photo-1564501049412-61c2a3083791?w=800&q=85"],
    rating: 4.7, reviewCount: 891, cheapestPrice: 610,
    tag: "Iconic", category: "Urban", featured: true,
    amenities: ["Infinity Pool 350m","7 Restaurants","Private Beach","Helipad","Butler Service","Gold Spa"],
  },
  {
    name: "Castello Monteverdi",
    city: "Casole d'Elsa",
    country: "Italy",
    address: "Loc. Monteverdi, Casole d'Elsa, Siena, Tuscany",
    description: "A restored 12th-century Tuscan fortress crowned by olive groves and private vineyards. Wine tastings in ancient cellars, cooking with estate-grown produce.",
    photos: ["https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800&q=85"],
    rating: 4.9, reviewCount: 143, cheapestPrice: 720,
    tag: "Historic", category: "Heritage", featured: false,
    amenities: ["Private Vineyard","Cooking Classes","Pool","Wine Cellar","Truffle Hunting","Helipad"],
  },
  {
    name: "Amanpuri Hideaway",
    city: "Phuket",
    country: "Thailand",
    address: "Pansea Beach, Phuket",
    description: "Nestled in a coconut plantation facing the Andaman Sea. Traditional Thai pavilions, holistic wellness sanctuary, and secluded crescent beach.",
    photos: ["https://images.unsplash.com/photo-1549294413-26f195200c16?w=800&q=85"],
    rating: 4.8, reviewCount: 412, cheapestPrice: 550,
    tag: "Sanctuary", category: "Resort", featured: true,
    amenities: ["Holistic Spa", "Private Beach", "Yoga Pavilion", "Scuba Diving", "Thai Cooking Class", "Yacht Charter"],
  },
  {
    name: "The Plaza Landmark",
    city: "New York",
    country: "USA",
    address: "Fifth Avenue at Central Park South",
    description: "An icon of New York elegance since 1907. Offering legendary Palm Court afternoon tea, opulent suites, and unparalleled Central Park views.",
    photos: ["https://images.unsplash.com/photo-1517840901100-8179e982acb7?w=800&q=85"],
    rating: 4.7, reviewCount: 1205, cheapestPrice: 650,
    tag: "Iconic", category: "Urban", featured: false,
    amenities: ["Afternoon Tea", "Fifth Avenue Shopping", "Concierge", "Spa", "Jazz Club", "Limousine Service"],
  },
  {
    name: "Boulders Wilderness Lodge",
    city: "Kruger National Park",
    country: "South Africa",
    address: "Sabi Sand Game Reserve",
    description: "Luxury integrated into the wild. Glass-fronted lodges offer unimpeded views of the Sand River, where herds of elephants and leopards roam freely.",
    photos: ["https://images.unsplash.com/photo-1516426122078-c23e76319801?w=800&q=85"],
    rating: 4.9, reviewCount: 278, cheapestPrice: 1100,
    tag: "Safari", category: "Eco-Luxury", featured: true,
    amenities: ["Game Drives", "Bush Dinners", "Wine Tasting", "Plunge Pool", "Photography Hide", "Stargazing"],
  },
  {
    name: "Santorini Cliffhouse",
    city: "Oia",
    country: "Greece",
    address: "Oia Caldera Cliff, Santorini",
    description: "Carved into the volcanic caldera. Whitewashed walls, infinity pools melting into the Aegean Sea, and the most spectacular sunset views in Europe.",
    photos: ["https://images.unsplash.com/photo-1570077188670-e3a8d69ac5f1?w=800&q=85"],
    rating: 4.9, reviewCount: 642, cheapestPrice: 850,
    tag: "Romantic", category: "Resort", featured: true,
    amenities: ["Infinity Pool", "Caldera View", "Catamaran Cruise", "Wine Tour", "Cave Spa", "In-Suite Dining"],
  },
  {
    name: "Château de Villette",
    city: "Condécourt",
    country: "France",
    address: "Rue de la Maison Blanche, 95450 Condécourt",
    description: "Known as 'Le Petit Versailles'. Stroll through Le Nôtre gardens, sleep in period-furnished suites, and experience aristocratic French lifestyle.",
    photos: ["https://images.unsplash.com/photo-1469022563428-aa04fef9f5a2?w=800&q=85"],
    rating: 4.6, reviewCount: 89, cheapestPrice: 1200,
    tag: "Château", category: "Heritage", featured: false,
    amenities: ["Formal Gardens", "Private Chef", "Art Collection", "Helideck", "Equestrian Center", "Tennis Courts"],
  },
  {
    name: "Icehotel Auron",
    city: "Jukkasjärvi",
    country: "Sweden",
    address: "Marknadsvägen 63, 981 91 Jukkasjärvi",
    description: "A transient masterpiece rebuilt every winter. Sleep on ice beds under reindeer skins, drink from ice glasses, and watch the Northern Lights.",
    photos: ["https://images.unsplash.com/photo-1483366774565-c726b9f7cb25?w=800&q=85"],
    rating: 4.8, reviewCount: 455, cheapestPrice: 480,
    tag: "Unique", category: "Eco-Luxury", featured: false,
    amenities: ["Ice Bar", "Dog Sledding", "Northern Lights Tour", "Sauna Ritual", "Ice Sculpting", "Snowmobile"],
  },
  {
    name: "Taj Lake Palace",
    city: "Udaipur",
    country: "India",
    address: "Pichola, Udaipur, Rajasthan 313001",
    description: "Floating on the serene waters of Lake Pichola, this 18th-century marble palace offers a breathtaking royal experience with magnificent courtyards and Jharokha views.",
    photos: ["https://images.unsplash.com/photo-1596484552834-6a58f850d0d1?w=800&q=85"],
    rating: 4.9, reviewCount: 845, cheapestPrice: 550,
    tag: "Royal", category: "Heritage", featured: true,
    amenities: ["Spa Boat", "Heritage Walk", "Sunset Cruise", "Jiva Spa", "Fine Dining", "Butler Service"],
  },
  {
    name: "The Oberoi Udaivilas",
    city: "Udaipur",
    country: "India",
    address: "Badi Gorela Mulla Talai, Udaipur",
    description: "Sprawling across 30 acres of manicured gardens and interconnected domes, offering unparalleled luxury on the banks of Lake Pichola.",
    photos: ["https://images.unsplash.com/photo-1582610116397-edb318620f90?w=800&q=85"],
    rating: 4.9, reviewCount: 1120, cheapestPrice: 620,
    tag: "Palatial", category: "Resort", featured: true,
    amenities: ["Private Pool", "Yoga Session", "Ayurvedic Spa", "Cruises", "Wildlife Tour", "Gourmet Dining"],
  },
  {
    name: "Umaid Bhawan Palace",
    city: "Jodhpur",
    country: "India",
    address: "Circuit House Rd, Cantt Area, Jodhpur",
    description: "Perched high above the desert capital of Jodhpur, this golden-hued desert sandstone monument is one of the world's largest private residences.",
    photos: ["https://images.unsplash.com/photo-1576485290814-1c784405367b?w=800&q=85"],
    rating: 4.8, reviewCount: 654, cheapestPrice: 680,
    tag: "Historic", category: "Heritage", featured: false,
    amenities: ["Vintage Car Drive", "Palace Museum", "Jiva Grande Spa", "Squash Court", "Indoor Pool", "Billiards"],
  },
  {
    name: "Rambagh Palace",
    city: "Jaipur",
    country: "India",
    address: "Bhawani Singh Rd, Rambagh, Jaipur",
    description: "Once the residence of the Maharaja of Jaipur, the 'Jewel of Jaipur' offers intricately carved marbles, lush gardens, and regal extravagances.",
    photos: ["https://images.unsplash.com/photo-1601058497548-f247dfe3398c?w=800&q=85"],
    rating: 4.9, reviewCount: 932, cheapestPrice: 590,
    tag: "Royal", category: "Heritage", featured: true,
    amenities: ["Royal Dining", "Polo Bar", "Elephant Ride", "Heritage Walk", "Spa", "Yoga"],
  },
  {
    name: "The Taj Mahal Palace",
    city: "Mumbai",
    country: "India",
    address: "Apollo Bandar, Colaba, Mumbai",
    description: "A legendary luxury hotel facing the Gateway of India, combining Moorish, Oriental, and Florentine architectural styles with world-class hospitality.",
    photos: ["https://images.unsplash.com/photo-1566415732152-7f7226017ec0?w=800&q=85"],
    rating: 4.8, reviewCount: 3241, cheapestPrice: 350,
    tag: "Iconic", category: "Urban", featured: false,
    amenities: ["Sea View", "Art Tour", "Award-winning Dining", "Jiva Spa", "Yacht Booking", "Pool"],
  },
  {
    name: "The Oberoi Amarvilas",
    city: "Agra",
    country: "India",
    address: "Taj East Gate Rd, Agra",
    description: "Located just 600 meters from the Taj Mahal, every room offers an uninterrupted view of the iconic monument of love.",
    photos: ["https://images.unsplash.com/photo-1548013146-72479768bada?w=800&q=85"],
    rating: 4.9, reviewCount: 1540, cheapestPrice: 480,
    tag: "Romantic", category: "Heritage", featured: true,
    amenities: ["Taj Mahal View", "Mughal Gardens", "Spa", "Fine Dining", "Golf Cart Transfer", "Private Balcony"],
  },
  {
    name: "Kumarakom Lake Resort",
    city: "Kumarakom",
    country: "India",
    address: "North Post, Kavanattinkara, Kumarakom, Kerala",
    description: "Nestled along the serene banks of Lake Vembanad. Experience Kerala's heritage in reconstructed 16th-century traditional homesteads.",
    photos: ["https://images.unsplash.com/photo-1602216056096-3b40cc0c9944?w=800&q=85"],
    rating: 4.7, reviewCount: 421, cheapestPrice: 320,
    tag: "Backwaters", category: "Resort", featured: false,
    amenities: ["Houseboat Cruise", "Ayurvedic Treatment", "Infinity Pool", "Yoga", "Fishing", "Cultural Show"],
  },
  {
    name: "Taj Falaknuma Palace",
    city: "Hyderabad",
    country: "India",
    address: "Engine Bowli, Falaknuma, Hyderabad",
    description: "Elevated 2,000 feet above Hyderabad, this scorpion-shaped, marble palace offers a glimpse into the Nizam's extravagant lifestyle.",
    photos: ["https://images.unsplash.com/photo-1565319808940-02a8b94101e4?w=800&q=85"],
    rating: 4.9, reviewCount: 880, cheapestPrice: 650,
    tag: "Palace", category: "Heritage", featured: false,
    amenities: ["Horse Carriage Arrival", "Nizam's Dining", "Heritage Walk", "Qawwali Music", "Jiva Spa", "Library"],
  },
  {
    name: "Evolve Back, Kamalapura Palace",
    city: "Hampi",
    country: "India",
    address: "Kamalapura, Hospet, Karnataka",
    description: "Inspired by the architectural splendor of the Vijayanagara Empire, blending historical grandeur with modern luxury near the ruins of Hampi.",
    photos: ["https://images.unsplash.com/photo-1610017409605-64906f03fc71?w=800&q=85"],
    rating: 4.8, reviewCount: 305, cheapestPrice: 420,
    tag: "Historic", category: "Resort", featured: false,
    amenities: ["Jal Mahal", "Ayurveda", "Reading Lounge", "Ruins Tour", "Infinity Pool", "Gourmet Dining"],
  },
  {
    name: "Wildflower Hall",
    city: "Shimla",
    country: "India",
    address: "Charabra, Shimla, Himachal Pradesh",
    description: "Located at 8,250 feet above sea level within a cedar pine forest, this former residence of Lord Kitchener offers majestic Himalayan views.",
    photos: ["https://images.unsplash.com/photo-1543160161-5961d198d009?w=800&q=85"],
    rating: 4.8, reviewCount: 1100, cheapestPrice: 380,
    tag: "Mountain", category: "Resort", featured: false,
    amenities: ["Outdoor Jacuzzi", "Nature Walks", "Spa Pavilion", "Ice Skating", "Library", "Mountain Biking"],
  },
  {
    name: "Ananda in the Himalayas",
    city: "Rishikesh",
    country: "India",
    address: "The Palace Estate, Narendra Nagar Tehri - Garhwal",
    description: "An award-winning luxury destination spa retreat situated in a Maharaja's palace estate, surrounded by graceful Sal forests.",
    photos: ["https://images.unsplash.com/photo-1621245842813-fdfd4ccdd223?w=800&q=85"],
    rating: 4.7, reviewCount: 520, cheapestPrice: 510,
    tag: "Wellness", category: "Eco-Luxury", featured: false,
    amenities: ["Yoga", "Ayurvedic Spa", "Meditation", "Vedanta Lectures", "Himalayan View", "Golf"],
  },
  {
    name: "Suján Jawai",
    city: "Pali",
    country: "India",
    address: "Jawai Bandh, Pali District, Rajasthan",
    description: "Sophisticated luxury tented camp in the heart of leopard country, surrounded by billion-year-old granite rock formations.",
    photos: ["https://images.unsplash.com/photo-1534143026727-8178d85f8f53?w=800&q=85"],
    rating: 4.9, reviewCount: 156, cheapestPrice: 850,
    tag: "Wildlife", category: "Eco-Luxury", featured: true,
    amenities: ["Leopard Safari", "Wilderness Spa", "Bush Dining", "Bird Watching", "Rabari Village Walk", "Plunge Pool"],
  },
  {
    name: "Hotel Maurya",
    city: "Patna",
    country: "India",
    address: "South Gandhi Maidan, Patna, Bihar",
    description: "The premier luxury hotel in Bihar's capital, offering a blend of traditional hospitality and modern amenities right next to the historic Gandhi Maidan.",
    photos: ["https://images.unsplash.com/photo-1571003123894-1f0594d2b5d9?w=800&q=85"],
    rating: 4.6, reviewCount: 845, cheapestPrice: 120,
    tag: "Capital", category: "Urban", featured: false,
    amenities: ["Rooftop Dining", "Swimming Pool", "Banquet Halls", "City View", "Concierge", "Spa"],
  },
  {
    name: "The Royal Residency",
    city: "Bodhgaya",
    country: "India",
    address: "Domuhan Road, Bodhgaya, Bihar",
    description: "A tranquil sanctuary near the Mahabodhi Temple, designed with Japanese architectural influences, offering spiritual seekers exquisite comfort.",
    photos: ["https://images.unsplash.com/photo-1582719478250-c89fae4658c0?w=800&q=85"],
    rating: 4.7, reviewCount: 412, cheapestPrice: 140,
    tag: "Spiritual", category: "Heritage", featured: true,
    amenities: ["Meditation Garden", "Veg Fine Dining", "Library", "Temple Shuttle", "Wellness Center", "Courtyard"],
  },
  {
    name: "The Royal Ganges Retreat",
    city: "Bhagalpur",
    country: "India",
    address: "Vikramshila Setu Road, Bhagalpur, Bihar",
    description: "An elegant riverside property capturing the historic essence of the Silk City, featuring panoramic views of the sacred Ganges river.",
    photos: ["https://images.unsplash.com/photo-1445019980597-93fa8acb246c?w=800&q=85"],
    rating: 4.5, reviewCount: 201, cheapestPrice: 90,
    tag: "Riverside", category: "Resort", featured: false,
    amenities: ["Ganges View", "Silk Boutique", "Local Cuisine", "River Cruise", "Event Space", "Café"],
  }
];

const ROOMS_DATA = [
  // Azura
  { title: "Lagoon Villa",         price: 420,  maxPeople: 2, beds: 1, roomNumbers: [{ number: 101 },{ number: 102 }] },
  { title: "Ocean Sunrise Suite",  price: 680,  maxPeople: 3, beds: 2, roomNumbers: [{ number: 201 }] },
  { title: "Grand Reef Pavilion",  price: 980,  maxPeople: 4, beds: 3, roomNumbers: [{ number: 301 }] },
  // Verlaine
  { title: "Classic Parisienne",   price: 380,  maxPeople: 2, beds: 1, roomNumbers: [{ number: 101 },{ number: 102 },{ number: 103 }] },
  { title: "Tour Eiffel Suite",    price: 650,  maxPeople: 2, beds: 1, roomNumbers: [{ number: 201 },{ number: 202 }] },
  { title: "Grand Penthouse",      price: 1400, maxPeople: 6, beds: 4, roomNumbers: [{ number: 501 }] },
  // Sakura
  { title: "Tatami Garden Room",   price: 340,  maxPeople: 2, beds: 1, roomNumbers: [{ number: 101 },{ number: 102 }] },
  { title: "Bamboo Forest Suite",  price: 580,  maxPeople: 4, beds: 2, roomNumbers: [{ number: 201 }] },
  // Meridian
  { title: "Sky Deluxe Room",      price: 610,  maxPeople: 2, beds: 1, roomNumbers: [{ number: 101 },{ number: 102 },{ number: 103 }] },
  { title: "Cloud Penthouse",      price: 2200, maxPeople: 6, beds: 4, roomNumbers: [{ number: 801 }] },
  // Castello
  // Castello
  { title: "Estate Room",          price: 720,  maxPeople: 2, beds: 1, roomNumbers: [{ number: 101 },{ number: 102 }] },
  { title: "Tower Suite",          price: 1100, maxPeople: 2, beds: 1, roomNumbers: [{ number: 301 }] },
  // Amanpuri
  { title: "Pavilion Room",        price: 550,  maxPeople: 2, beds: 1, roomNumbers: [{ number: 101 },{ number: 102 }] },
  { title: "Ocean Pavilion",       price: 850,  maxPeople: 2, beds: 1, roomNumbers: [{ number: 201 }] },
  // The Plaza
  { title: "Fifth Avenue Room",    price: 650,  maxPeople: 2, beds: 1, roomNumbers: [{ number: 301 },{ number: 302 }] },
  { title: "Central Park Suite",   price: 1500, maxPeople: 4, beds: 2, roomNumbers: [{ number: 401 }] },
  // Boulders
  { title: "River Lodge Suite",    price: 1100, maxPeople: 2, beds: 1, roomNumbers: [{ number: 1 }] },
  { title: "Family Safari Villa",  price: 2800, maxPeople: 6, beds: 3, roomNumbers: [{ number: 2 }] },
  // Santorini
  { title: "Caldera Cave Suite",   price: 850,  maxPeople: 2, beds: 1, roomNumbers: [{ number: 10 },{ number: 11 }] },
  { title: "Infinity Pool Villa",  price: 1300, maxPeople: 2, beds: 1, roomNumbers: [{ number: 20 }] },
  // Château
  { title: "Aristocrat Room",      price: 1200, maxPeople: 2, beds: 1, roomNumbers: [{ number: 4 }] },
  { title: "Royal Chamber",        price: 2500, maxPeople: 2, beds: 1, roomNumbers: [{ number: 5 }] },
  // Icehotel
  { title: "Ice Room",             price: 480,  maxPeople: 2, beds: 1, roomNumbers: [{ number: 101 },{ number: 102 }] },
  { title: "Art Suite",            price: 750,  maxPeople: 2, beds: 1, roomNumbers: [{ number: 201 }] },
  // Taj Lake Palace
  { title: "Luxury Room",           price: 550, maxPeople: 2, beds: 1, roomNumbers: [{ number: 101 }] },
  { title: "Grand Royal Suite",     price: 1150, maxPeople: 2, beds: 1, roomNumbers: [{ number: 201 }] },
  // The Oberoi Udaivilas
  { title: "Premier Room",          price: 620, maxPeople: 2, beds: 1, roomNumbers: [{ number: 11 }] },
  { title: "Kohinoor Suite",        price: 3200, maxPeople: 4, beds: 2, roomNumbers: [{ number: 88 }] },
  // Umaid Bhawan Palace
  { title: "Historical Suite",      price: 680, maxPeople: 2, beds: 1, roomNumbers: [{ number: 33 }] },
  { title: "Maharaja Suite",        price: 4500, maxPeople: 4, beds: 2, roomNumbers: [{ number: 1 }] },
  // Rambagh Palace
  { title: "Palace Room",           price: 590, maxPeople: 2, beds: 1, roomNumbers: [{ number: 21 }] },
  { title: "Sukh Niwas",            price: 2100, maxPeople: 2, beds: 1, roomNumbers: [{ number: 22 }] },
  // The Taj Mahal Palace
  { title: "Tower Sea View",        price: 350, maxPeople: 2, beds: 1, roomNumbers: [{ number: 505 }] },
  { title: "Rajput Suite",          price: 1800, maxPeople: 2, beds: 1, roomNumbers: [{ number: 605 }] },
  // The Oberoi Amarvilas
  { title: "Premier Room Taj View", price: 480, maxPeople: 2, beds: 1, roomNumbers: [{ number: 312 }] },
  { title: "Kohinoor Suite",        price: 2600, maxPeople: 2, beds: 1, roomNumbers: [{ number: 500 }] },
  // Kumarakom Lake Resort
  { title: "Meandering Pool Villa", price: 320, maxPeople: 2, beds: 1, roomNumbers: [{ number: 41 }] },
  { title: "Heritage Villa",        price: 520, maxPeople: 2, beds: 1, roomNumbers: [{ number: 42 }] },
  // Taj Falaknuma Palace
  { title: "Palace Room",           price: 650, maxPeople: 2, beds: 1, roomNumbers: [{ number: 12 }] },
  { title: "Nizam Suite",           price: 3500, maxPeople: 4, beds: 2, roomNumbers: [{ number: 1 }] },
  // Evolve Back Hampi
  { title: "Nivasa",                price: 420, maxPeople: 2, beds: 1, roomNumbers: [{ number: 51 }] },
  { title: "Jal Mahal Suite",       price: 850, maxPeople: 2, beds: 1, roomNumbers: [{ number: 52 }] },
  // Wildflower Hall
  { title: "Premier Valley View",   price: 380, maxPeople: 2, beds: 1, roomNumbers: [{ number: 61 }] },
  { title: "Lord Kitchener Suite",  price: 900, maxPeople: 4, beds: 2, roomNumbers: [{ number: 65 }] },
  // Ananda
  { title: "Valley View Room",      price: 510, maxPeople: 2, beds: 1, roomNumbers: [{ number: 71 }] },
  { title: "Viceregal Suite",       price: 1500, maxPeople: 2, beds: 1, roomNumbers: [{ number: 72 }] },
  // Sujan Jawai
  { title: "Luxury Tent",           price: 850, maxPeople: 2, beds: 1, roomNumbers: [{ number: 1 }] },
  { title: "Royal Tented Suite",    price: 1500, maxPeople: 4, beds: 2, roomNumbers: [{ number: 2 }] },
  // Hotel Maurya
  { title: "Club Room",             price: 120, maxPeople: 2, beds: 1, roomNumbers: [{ number: 101 },{ number: 102 }] },
  { title: "Maurya Suite",          price: 250, maxPeople: 4, beds: 2, roomNumbers: [{ number: 201 }] },
  // The Royal Residency
  { title: "Lotus Room",            price: 140, maxPeople: 2, beds: 1, roomNumbers: [{ number: 11 }] },
  { title: "Nirvana Suite",         price: 320, maxPeople: 2, beds: 1, roomNumbers: [{ number: 15 }] },
  // Ganges Retreat (Bhagalpur)
  { title: "Silk Heritage Room",    price: 90,  maxPeople: 2, beds: 1, roomNumbers: [{ number: 21 }] },
  { title: "River View Suite",      price: 180, maxPeople: 2, beds: 1, roomNumbers: [{ number: 22 }] },
];

const HOTEL_ROOM_MAP = [0,0,0, 1,1,1, 2,2, 3,3, 4,4, 5,5, 6,6, 7,7, 8,8, 9,9, 10,10, 11,11, 12,12, 13,13, 14,14, 15,15, 16,16, 17,17, 18,18, 19,19, 20,20, 21,21, 22,22, 23,23, 24,24, 25,25]; // maps ROOMS_DATA index → HOTELS_DATA index

async function seed() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log("✅ Connected to MongoDB");

    // Clear existing data
    await Promise.all([Hotel.deleteMany({}), Room.deleteMany({}), User.deleteMany({})]);
    console.log("🗑  Cleared existing data");

    // Seed hotels
    const hotels = await Hotel.insertMany(HOTELS_DATA);
    console.log(`🏨 Inserted ${hotels.length} hotels`);

    // Seed rooms linked to hotels
    const roomsWithHotelIds = ROOMS_DATA.map((room, i) => ({
      ...room,
      hotelId: hotels[HOTEL_ROOM_MAP[i]]._id,
      description: `Elegant accommodation in ${hotels[HOTEL_ROOM_MAP[i]].name}.`,
    }));
    const rooms = await Room.insertMany(roomsWithHotelIds);
    console.log(`🛏  Inserted ${rooms.length} rooms`);

    // Seed admin user
    await User.create({
      name: "Admin",
      email: "admin@havenstay.com",
      password: "Admin@123",
      role: "admin",
    });

    // Seed demo user
    await User.create({
      name: "Demo User",
      email: "demo@havenstay.com",
      password: "Demo@1234",
      role: "user",
    });

    console.log("👤 Created admin (admin@havenstay.com / Admin@123) and demo user (demo@havenstay.com / Demo@1234)");
    console.log("✅ Seed complete!");
    process.exit(0);
  } catch (err) {
    console.error("❌ Seed failed:", err.message);
    process.exit(1);
  }
}

seed();
