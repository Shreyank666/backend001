const Papu = require('../models/papuModel');
const User_Wallet = require('../models/Wallet');
const User = require("../models/UserSignUp");
const { default: mongoose } = require('mongoose');
const papuModel = require('../models/papuModel');


exports.postBet = async (req, res) => {
    try {
        // console.log("Received Data:", req.body);

        const { user, selectedCard, totalBets, gameId } = req.body;
        console.log("Selected Cards:", selectedCard);

        const wallet = await User_Wallet.findOne({ user })
        // console.log(wallet)
        if (wallet.balance < totalBets) {
            res.status(400).json({
                message: "Insufficient Balance"
            })
        }
        wallet.balance -= totalBets
        await wallet.save()
        const cards = selectedCard.map((card) => ({
            image: card.image,
            betAmount: card.betAmount
        }));

        // console.log("Cards before saving:", cards);

        const titliBet = new papuModel({
            titliGameId: gameId,
            user: user,
            totalBets: totalBets,
            selectedCard: cards,
        });
        await titliBet.save();
        res.status(201).json({ message: "Data saved successfully!", titliBet });

    } catch (error) {
        console.error("Error processing request:", error);
        res.status(500).json({ message: error.message });
    }
};

exports.updateBet = async (req, res) => {
    try {
        // console.log("Bet API Called");

        const { user, profit, isWin, totalBets, gameId, betAmount } = req.body;
console.log(profit)
        // Find existing game
        const existingGame = await papuModel.findOne({ titliGameId: gameId });

        if (!existingGame) {
            return res.status(404).json({ message: "Game not found" });
        }

        console.log("Bet Amount:", betAmount);

        // Find user wallet
        const wallet = await User_Wallet.findOne({ user });
        if (!wallet) {
            return res.status(404).json({ message: 'Wallet not found' });
        }

        // Update wallet balance
        if (isWin) {
            wallet.balance += profit;
        } 
        await wallet.save();

        // Update the existing game entry instead of creating a new one
        existingGame.user = user;
        // existingGame.betAmount = betAmount;
        existingGame.profit = profit;
        existingGame.isWin = isWin;
        existingGame.totalBets = totalBets;

        await existingGame.save();

        res.status(200).json({
            message: isWin ? "Won" : "Lost.",
            updatedGame: existingGame,
            newBalance: wallet.balance
        });

    } catch (error) {
        console.error("Error in updateBet:", error);
        res.status(500).json({ message: 'Server error', error });
    }
};



exports.getBetByUserId = async (req, res) => {
    try {
        const { userId } = req.params;
        console.log(userId)
        if (!mongoose.Types.ObjectId.isValid(userId)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid user ID',
            });
        }
        const bets = await papuModel.find({ user: new mongoose.Types.ObjectId(userId) }).sort({ createdAt: -1 });
        if (!bets || bets.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'No bets found for this user',
            });
        }
        res.status(200).json({
            success: true,
            bets,
        });
    } catch (err) {
        console.error('Error fetching bets:', err);
        res.status(500).json({
            success: false,
            message: 'Error fetching bets',
        });
    }
}

// Get all bets
exports.getBets = async (req, res) => {
    try {
        const bets = await Papu.find().populate('user', 'name email');
        res.status(200).json(bets);
    } catch (error) {
        res.status(500).json({ message: 'Server error', error });
    }
};

// Get a single bet by ID
exports.getBetById = async (req, res) => {
    try {
        const bet = await Papu.findById(req.params.id).populate('user', 'name email');
        if (!bet) return res.status(203).json({ message: 'Bet not found' });
        res.status(200).json(bet);
    } catch (error) {
        res.status(500).json({ message: 'Server error', error });
    }
};

// Update bet winnings
exports.updateWinnings = async (req, res) => {
    try {
        const { totalWinnings } = req.body;
        const bet = await Papu.findByIdAndUpdate(req.params.id, { totalWinnings }, { new: true });
        if (!bet) return res.status(404).json({ message: 'Bet not found' });
        res.status(200).json(bet);
    } catch (error) {
        res.status(500).json({ message: 'Server error', error });
    }
};

// Delete a bet
exports.deleteBet = async (req, res) => {
    try {
        const bet = await Papu.findByIdAndDelete(req.params.id);
        if (!bet) return res.status(404).json({ message: 'Bet not found' });
        res.status(200).json({ message: 'Bet deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error });
    }
};


exports.resetAll = async (req, res) => {
    try {
        await papuModel.deleteMany({});
        res.status(200).json({ message: "Game reset successfully" });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.getBets = async (req, res) => {
    try {
        const bets = await Papu.find().populate('user', 'username');
        res.status(200).json(bets);
    } catch (error) {
        res.status(500).json({ message: 'Server error', error });
    }
};
