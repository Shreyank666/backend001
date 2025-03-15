const JWT_SECRET = 'bunneybet';
const express = require('express');
const app = express();
const cors = require('cors');
const User = require('./models/UserSignUp');
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const User_Wallet = require('./models/Wallet.js');
const jwt = require('jsonwebtoken');
const dotenv = require("dotenv");
const playerRouter = require("./Routes/cricket/playerRoutes");
dotenv.config();
const axios = require('axios');
const cheerio = require('cheerio');
const moment = require('moment'); // For Node.js
app.use(express.json());
const betRoutes = require('./Routes/betRoutes');
const matkaRouter = require('./Routes/matkaRoutes.js');
const Matka = require('./models/matkaModel.js')
const papuRouter = require("./Routes/pappuRoutes.js")
const AddPointRouter = require("./controller/addPointsController")
const withdraw = require("./Routes/withdrwaRoter.js")
const crickbetRoutes = require("./Routes/crickbetRoutes.js")
const minesRouter = require('./Routes/minesRoute.js')
const bankDetailsRouter = require("./controller/bankDetails.js")
const http = require("http");
const matchRouter = require("./Routes/matchRouter.js")
const socketIo = require("socket.io");
const server = http.createServer(app);
const aarParParchiRouter = require('./Routes/aarPaarParchiRoutes.js');
const avaitorRouter = require("./Routes/avaitorRoutes.js")
const crashAvaitorRouter = require('./Routes/crashAvaitorRoutes.js')
const titliWinnerRouter = require("./Routes/titliWinnerRoutes.js")
const io = socketIo(server, {
  cors: {
    origin: "*",
  },
});

port=5000
// CORS configuration

app.use(
  cors({
    origin: ["https://www.98fastbet.com", "https://admin.98fastbet.com"], // Replace '*' with the specific origin(s) you want to allow, e.g., 'https://yourdomain.com'
    methods: ['POST', 'GET', 'PUT', 'DELETE'], // Define allowed HTTP methods
    credentials: true, // Allow credentials like cookies to be sent
  })
);
// app.use(cors());

const MONGO_URI = process.env.mongodb_url;
// MongoDB connection
mongoose.connect(`mongodb+srv://infusion:oxPmrqHhXOdsBLPk@cluster0.rnz0y.mongodb.net/laxhmibook?retryWrites=true&w=majority&appName=Cluster0`)
  .then(() => console.log("MongoDB Connected Successfully!"))
  .catch(err => console.error("MongoDB Connection Error:", err));



const NodeCache = require('node-cache');
const cache = new NodeCache({ stdTTL: 60 });

const marketMapping = {
  1: "SRIDEVI MORNING",
  10: "MILAN MORNING",
  13: "KALYAN MORNING",
  16: "SRIDEVI",
  22: "TIME BAZAR",
  25: "MADHUR DAY",
  31: "RAJDHANI DAY",
  34: "MILAN DAY",
  40: "KALYAN",
  46: "SRIDEVI NIGHT",
  58: "MILAN NIGHT",
  61: "KALYAN NIGHT",
  64: "RAJDHANI NIGHT",
  // 71: "abc",
};

const fetchMarketData = async () => {
  try {
    console.log('Fetching fresh market data...');
    const url = 'https://www.shrimatka.in';
    const { data } = await axios.get(url);
    const $ = cheerio.load(data);

    const markets = [];

    $('.clmn.clmn6.mblinbk.center').each((i, el) => {
      const marketNumber = i + 1;
      const marketName = marketMapping[marketNumber];

      if (!marketName) return; // Skip markets not in mapping

      const vCenterChildren = $(el).find('.v-center').children();
      const openNumber = vCenterChildren.eq(0)?.text().trim() || '*';
      const jodiDigit = vCenterChildren.eq(1)?.text().trim() || '*';
      const closeNumber = vCenterChildren.eq(2)?.text().trim() || '*';

      const openTime = $(el).find('.cmlo.font1 .clmn.clmn6.center.mblinbk span').first().text().trim();
      const closeTime = $(el).find('.cmlo.font1 .clmn.clmn6.center.mblinbk span').last().text().trim();

      if (!openTime || !closeTime || openTime === 'N/A' || closeTime === 'N/A') {
        return; // Skip markets without valid open/close times
      }

      const currentTime = moment();
      const openTimeMoment = moment(openTime, 'hh:mm a').subtract(5, 'hours').subtract(30, 'minutes');
      const closeTimeMoment = moment(closeTime, 'hh:mm a').subtract(5, 'hours').subtract(30, 'minutes');
      
      const isBeforeOpenTime = currentTime.isBefore(openTimeMoment);
      const isBeforeCloseTime = currentTime.isBefore(closeTimeMoment);
      
      let bidStatus;
      
      if (!isBeforeOpenTime && isBeforeCloseTime) {
        bidStatus = "Close";  // ✅ If open time has passed but close time has not
      } else if (!isBeforeOpenTime && !isBeforeCloseTime) {
        bidStatus = "Closed"; // ✅ If both open time and close time have passed
      } else if (isBeforeOpenTime && isBeforeCloseTime) {
        bidStatus = "Open | Close"; // ✅ If neither open time nor close time has passed
      }
      
     
      

      markets.push({
        marketNumber,
        marketName,
        openNumber,
        jodiDigit,
        closeNumber,
        openTime,
        closeTime,
        bidStatus
      });
    });

    const matkaData = await Matka.find();
  if (Array.isArray(matkaData)) {
    matkaData.forEach(data => {
      if (!Object.values(marketMapping).includes(data.marketName)) {
        return; // ✅ Skip if marketName is not in marketMapping
      }

      // ✅ Check if marketName already exists in `markets`
      const existingMarket = markets.find(m => m.marketName === data.marketName);
      if (!existingMarket) {
        const currentTime = moment();
        const openTimeMoment = moment(openTime, 'hh:mm a').subtract(5, 'hours').subtract(30, 'minutes');
        const closeTimeMoment = moment(closeTime, 'hh:mm a').subtract(5, 'hours').subtract(30, 'minutes');
        
        const isBeforeOpenTime = currentTime.isBefore(openTimeMoment);
        const isBeforeCloseTime = currentTime.isBefore(closeTimeMoment);
        
        let bidStatus;
        
        if (!isBeforeOpenTime && isBeforeCloseTime) {
          bidStatus = "Close";  // ✅ If open time has passed but close time has not
        } else if (!isBeforeOpenTime && !isBeforeCloseTime) {
          bidStatus = "Closed"; // ✅ If both open time and close time have passed
        } else if (isBeforeOpenTime && isBeforeCloseTime) {
          bidStatus = "Open | Close"; // ✅ If neither open time nor close time has passed
        }
        
       
        

        markets.push({
          marketName: data.marketName,
          openNumber: data.openNumber,
          jodiDigit: data.jodiDigit,
          closeNumber: data.closeNumber,
          openTime: data.openTime,
          closeTime: data.closeTime,
          bidStatus
        });
      }
    });
  } else {
    console.error("matkaData is not an array:", matkaData);
  }
    cache.set('marketData', markets);
    return markets;

  } catch (error) {
    console.error('Error fetching data:', error.message);
    return [];
  }
};

app.get('/api/subscription-state', async (req, res) => {
  let markets = cache.get('marketData');

  if (!markets) {
    markets = await fetchMarketData();
  }

  res.json({ markets });
});

setInterval(fetchMarketData, 60000);


app.get('/api/name/:id', async (req, res) => {
  const { id } = req.params;

  try {
    // Find the user and wallet by ID
    const user = await User.findById(id);
    const wallet = await User_Wallet.findOne({ user: id });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Respond with username, wallet balance, and email
    res.json({ username: user.username, walletBalance: wallet.balance, email: user.email,userNo:user.userNo });
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});


// Sign Up Route
app.post('/api/signup', async (req, res) => {
  const { username, email, password } = req.body;

  // Ensure all fields are provided
  if (!username || !email || !password) {
    return res.status(400).json({ message: 'All fields are required' });
  }

  try {
    // Check if the user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists' });
    }

    let userNo;
    let count = 5000;
    do {
      userNo = `C${count}`;
      count++;
    } while (await User.findOne({ userNo }));

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create a new user
    const newUser = new User({
      username,
      email,
      password: hashedPassword,
      userNo,
    });

    const savedUser = await newUser.save();

    // Create a wallet for the new user
    const wallet = new User_Wallet({
      user: savedUser._id,
      balance: 0, // Set an initial wallet balance if desired
    });
    await wallet.save();

    // Link the wallet to the user
    savedUser.wallet = wallet._id;
    await savedUser.save();

    // Respond with success
    res.status(201).json({
      message: 'User registered successfully',
      user: { id: savedUser._id, username: savedUser.username, email: savedUser.email,userNo:savedUser.userNo },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Login Route
app.post('/api/login', async (req, res) => {
  const { userNo, password } = req.body;

  if (!userNo || !password) {
    return res.status(400).json({ message: 'Username and password are required' });
  }

  try {
    const user = await User.findOne({ userNo }).populate('wallet');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Invalid password' });
    }

    const token = jwt.sign({ id: user._id }, JWT_SECRET, { expiresIn: '1h' });

    res.status(200).json({
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        walletBalance: user.wallet?.balance || 0,
        userNo:user.userNo,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

app.use('/api', aarParParchiRouter);
app.use("/", matkaRouter)
app.use("/", playerRouter)
app.use("/",crickbetRoutes)
app.use('/api', AddPointRouter);
app.use(betRoutes);
app.use("/api",papuRouter)
app.use('/api', bankDetailsRouter);
app.use('/api', withdraw);
app.use('/api', minesRouter)
app.use('/api', matchRouter);
app.use('/api', avaitorRouter);
app.use('/api', crashAvaitorRouter);
app.use('/api', titliWinnerRouter);
let liveData = {
  matches: [],
  odds: {},
};

// Fetch ongoing matches every second
const fetchOngoingMatches = async () => {
  try {
    const response = await axios.post(
      "https://api.btx99.com/v1/sports/matchList",
      {},
      {
        headers: {
          Authorization: "Bearer YOUR_TOKEN_HERE",
          Accept: "application/json",
          Origin: "https://btx99.com",
        },
      }
    );

    liveData.matches = response.data.data.map((match) => ({
      eventId: match.eventId,
      matchName: match.matchName,
      marketId: match.marketId,
      scoreIframe: match.scoreIframe,
    }));

    io.emit("updateMatches", liveData.matches);
  } catch (error) {
    console.error("Error fetching ongoing matches:", error);
  }
};


const fetchOdds = async () => {
  try {
    const marketIds = liveData.matches.map((match) => match.marketId);
    if (marketIds.length === 0) return;

    for (const marketId of marketIds) {
      const response = await axios.get(
        `https://tvssocket.crickexpo.in/v2/api/oddsDataNew?market_id=${marketId}`
      );

      // Log the full response to debug
      // console.log(`Odds response for market ${marketId}:`, JSON.stringify(response.data, null, 2));

      if (response.data.result) {
        const matchData = liveData.matches.find(match => match.marketId === marketId);
        const matchName = matchData ? matchData.matchName : `Market ${marketId}`;

        liveData.odds[marketId] = {
          matchName,  // ✅ Store match name
          matchOdds: response.data.result.team_data || [],  // ✅ Match Odds (Lagai/Khai)
          fancyMarkets: response.data.result.session || [],
          commissionFancy: response.data.result.commission_fancy_data || [],
          noCommissionFancy: response.data.result.no_commission_fancy_data || []
        };
      }
    }

    io.emit("updateOdds", liveData.odds);
  } catch (error) {
    console.error("Error fetching odds:", error);
  }
};

// Run functions every second
setInterval(fetchOngoingMatches, 1000);
setInterval(fetchOdds, 1000);

// API Route: Fetch odds from backend cache
app.get("/api/odds", (req, res) => {
  const { market_id } = req.query;
  if (!market_id || !liveData.odds[market_id]) {
    return res.status(404).json({ error: "No odds available" });
  }
  res.json(liveData.odds[market_id]);
});

     // WebSocket: Live Score & Odds Updates
io.on("connection", (socket) => {
  console.log("Client connected");
  socket.emit("updateMatches", liveData.matches);
  socket.emit("updateOdds", liveData.odds);

  socket.on("disconnect", () => console.log("Client disconnected"));
});



const PORT = process.env.PORT || 5000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`Server started on port ${PORT}`);
});
